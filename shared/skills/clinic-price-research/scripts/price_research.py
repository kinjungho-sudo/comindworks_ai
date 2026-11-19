#!/usr/bin/env python3
"""강남언니 공개 이벤트 가격 조사 도구 (내부 조사용).

사용법
  python3 price_research.py run      <병원폴더>/price_watch.json [날짜]  # 조사 + 보고서
  python3 price_research.py collect  <병원폴더>/price_watch.json [날짜]  # 조사 → data/…/<날짜>/snapshot.json
  python3 price_research.py report   <병원폴더>/price_watch.json [날짜]  # 스냅샷 → HTML 보고서 + summary.json
  python3 price_research.py selftest                                     # 파서 회귀 시험

동작
  1) 「검색어 + 시술명」 이벤트 목록을 정렬 몇 가지로 1장씩 연다(표본).
  2) 제목에 시술명이 있고 위치가 지역 기준 역인 이벤트만 남긴다.
  3) 그 이벤트의 공개 상세 화면을 열어 옵션별 가격(예: 300샷 99만 원, 600샷 204만 원)을 읽는다.
  4) 옵션 단위로 단품/패키지를 나누고 최저·중앙값·샷(cc·유닛)당 가격을 계산한다.

원칙 (references/rules.md)
  - 사람이 요청할 때만 실행한다. 정기 자동 수집(cron)에 걸지 않는다.
  - 비로그인 공개 화면만 읽는다. 로그인·후기 본문·쿠폰은 건드리지 않는다.
  - 요청 사이 4~7초 쉬고, 목록·상세 각각 상한까지만 연다. 같은 날 같은 주소는 저장본을 다시 쓴다.
  - 차단·로그인 화면이 나오면 우회하지 않고 멈춘다.
  - 결과는 내부 참고용. 블로그·광고에 타 병원 가격을 싣지 않는다(타 병원 비교 금지).
표준 라이브러리만 사용한다.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import html
import json
import math
import random
import re
import statistics
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CATALOG = SKILL_DIR / "assets" / "procedures_derm.json"
BASE = "https://unni.app"
UA = "Mozilla/5.0 (compatible; CoMindWorks-PriceCheck/1.0; on-demand research)"
SORTS = {
    "": "추천순",
    "LOWEST_DISCOUNTED_COST": "낮은가격순",
    "HIGHEST_POPULARITY": "인기순",
    "HIGHEST_RATING_COUNT": "리뷰많은순",
}
TEASER = re.compile(r"첫\s*방문|첫방|체험가|체험|1인\s*1회|신규\s*고객|초진")
PACKAGE_HINTS = ("패키지", "&", "+", "＋", "세트", "콤보", "올인원", "모음")
SCHEMA = 2


# ───────────────────────── 공통 ─────────────────────────

def _txt(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def _won(s: str) -> int | None:
    m = re.search(r"([\d,]+)\s*원", s or "")
    return int(m.group(1).replace(",", "")) if m else None


UNIT_PATTERNS = {
    "샷": r"(\d[\d,]*)\s*(?:샷|shot|SHOT|Shot|라인)",
    "cc": r"(\d+(?:\.\d+)?)\s*(?:cc|CC|Cc|ml|mL|ML)",
    "유닛": r"(\d+)\s*(?:유닛|unit|Unit|UNIT|U\b|u\b)",
    "회": r"(\d+)\s*회",
}


def extract_qty(text: str, unit: str) -> float | None:
    pat = UNIT_PATTERNS.get(unit)
    if not pat:
        return None
    nums = {n.replace(",", "") for n in re.findall(pat, text or "")}
    if len(nums) != 1:  # 0개 또는 서로 다른 수량이 여러 개면 판단하지 않음
        return None
    v = float(nums.pop())
    return v if v > 0 else None


def has_kw(text: str, proc: dict) -> bool:
    return any(k in text for k in proc["include"]) and not any(k in text for k in proc.get("exclude", []))


OTHER_PRODUCTS: list[str] = []  # 카탈로그 밖 다른 시술·제품명(assets의 other_products)


def other_procs(text: str, proc: dict, catalog: list[dict]) -> list[str]:
    hits = [p["name"] for p in catalog if p["id"] != proc["id"] and any(k in text for k in p["include"])]
    hits += [w for w in OTHER_PRODUCTS if w in text and not any(w in k or k in w for k in proc["include"])]
    return hits


# ───────────────────────── 파서 ─────────────────────────

def parse_events_page(page: str) -> list[dict]:
    """이벤트 목록 HTML에서 카드(product-unit)를 뽑는다."""
    out = []
    for u in page.split('data-slot="product-unit"')[1:]:
        link = re.search(r'href="(/events/(\d+)[^"]*)"', u)
        if not link:
            continue
        title = re.search(r'data-slot="product-unit-title".*?<h2>(.*?)</h2>', u, re.S)
        loc = re.search(r'data-slot="product-unit-location".*?<span><span>(.*?)</span>', u, re.S)
        price = re.search(r'data-slot="product-unit-pricing-price".*?<h3>(.*?)</h3>', u, re.S)
        orig_block = re.search(r'data-slot="product-unit-pricing-original"(.*?)data-slot="product-unit-pricing-total"', u, re.S)
        total_block = re.search(r'data-slot="product-unit-pricing-total"(.*?)data-slot="product-unit-pricing-price"', u, re.S)
        score = re.search(r'data-slot="rating-score"[^>]*>(.*?)<', u, re.S)
        rcount = re.search(r'data-slot="review-count-text"[^>]*>(.*?)<', u, re.S)
        tags = [_txt(t) for t in re.findall(r'data-slot="tag-label"[^>]*>(.*?)<', u)]

        location = _txt(loc.group(1)) if loc else ""
        station, hospital = "", location
        if "・" in location:
            station, hospital = [p.strip() for p in location.split("・", 1)]
        orig_txt = _txt(orig_block.group(1)) if orig_block else ""
        disc = re.search(r"(\d+)\s*%", _txt(total_block.group(1)) if total_block else "")
        rc = re.search(r"([\d,]+)", rcount.group(1)) if rcount else None
        try:
            rating = float(_txt(score.group(1))) if score else None
        except ValueError:
            rating = None
        out.append({
            "event_id": link.group(2),
            "url": BASE + html.unescape(link.group(1)).split("?")[0],
            "title": _txt(title.group(1)) if title else "",
            "station": station,
            "hospital": hospital,
            "price": _won(_txt(price.group(1))) if price else None,
            "original_price": _won(orig_txt),
            "discount_pct": int(disc.group(1)) if disc else None,
            "rating": rating,
            "review_count": int(rc.group(1).replace(",", "")) if rc else 0,
            "tags": tags,
        })
    return out


def page_total(page: str) -> int | None:
    m = re.search(r"<title[^>]*>.*?([\d,]+)건", page, re.S)
    return int(m.group(1).replace(",", "")) if m else None


OPT_START = re.compile(r'id="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"[^>]*>\s*<span[^>]*>(\d+)</span>')


def parse_event_detail(page: str) -> dict:
    """이벤트 상세 HTML에서 옵션 목록과 마취비·사후관리비 표기를 뽑는다."""
    starts = list(OPT_START.finditer(page))
    options = []
    for i, m in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else m.end() + 4000
        blk = page[m.end():end]
        name = re.search(r"<h3[^>]*>(.*?)</h3>", blk, re.S)
        if not name:
            continue
        orig = re.search(r"<del[^>]*>(.*?)</del>", blk, re.S)
        tail = blk[blk.find("</del>"):] if orig else blk
        tail = tail.split("KRW")[0]
        prices = [int(x.replace(",", "")) for x in re.findall(r">\s*([\d,]+)\s*원\s*<", tail)]
        disc = re.search(r">\s*(\d+)%\s*<", tail)
        if not prices:
            continue
        options.append({
            "option_id": m.group(1),
            "name": _txt(name.group(1)),
            "price": prices[-1],
            "original_price": _won(_txt(orig.group(1))) if orig else None,
            "discount_pct": int(disc.group(1)) if disc else None,
        })
    def fee(label):
        mm = re.search(r"<span[^>]*>%s</span>\s*<span[^>]*>(.*?)</span>" % label, page)
        return _txt(mm.group(1)) if mm else None
    return {"options": options, "anesthesia": fee("마취비"), "aftercare": fee("사후관리비")}


def classify_event(ev: dict, proc: dict, catalog: list[dict]) -> dict | None:
    """목록 카드가 해당 시술 이벤트인지 판단한다."""
    t = ev["title"]
    if not has_kw(t, proc):
        return None
    others = other_procs(t, proc, catalog)
    e = dict(ev)
    e.update({
        "procedure": proc["id"],
        "is_package": bool(others) or any(h in t for h in PACKAGE_HINTS),
        "also_matches": others,
        "qty": extract_qty(t, proc.get("unit", "")),
    })
    return e


def classify_option(opt: dict, single_event: bool, proc: dict, catalog: list[dict]) -> dict | None:
    """옵션 하나가 이 시술에 해당하는지, 단품인지, 수량은 얼마인지.
    옵션명에 시술명이 없으면, 이벤트 자체가 그 시술 하나만 다루는 경우(single_event)에만 인정한다."""
    name = opt["name"]
    if any(k in name for k in proc.get("exclude", [])):
        return None
    mine = has_kw(name, proc)
    others = other_procs(name, proc, catalog)
    if not mine and (others or not single_event):
        return None  # 다른 시술 옵션
    o = dict(opt)
    unit = proc.get("unit", "")
    qty = extract_qty(name, unit)
    o.update({
        "is_package": bool(others) or any(h in name for h in PACKAGE_HINTS),
        "with": others,
        "qty": qty,
        "price_per_unit": round(opt["price"] / qty) if (qty and unit != "회" and opt.get("price")) else None,
    })
    return o


# ───────────────────────── 수집 ─────────────────────────

class Fetcher:
    def __init__(self, cache_dir: Path, budgets: dict, delay=(4.0, 7.0)):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.budgets = dict(budgets)
        self.used = defaultdict(int)
        self.delay = delay
        self.requests = 0
        self.cache_hits = 0
        self.errors: list[str] = []
        self.stopped = False

    def get(self, url: str, kind: str) -> str | None:
        key = hashlib.sha1(url.encode()).hexdigest()[:16]
        f = self.cache_dir / f"{key}.html"
        if f.exists():
            self.cache_hits += 1
            return f.read_text(encoding="utf-8")
        if self.stopped:
            return None
        if self.used[kind] >= self.budgets.get(kind, 0):
            self.errors.append(f"{kind} 요청 상한({self.budgets.get(kind)}) 도달 — 건너뜀: {url}")
            return None
        if self.requests:
            time.sleep(random.uniform(*self.delay))
        self.requests += 1
        self.used[kind] += 1
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read().decode("utf-8", errors="ignore")
        except Exception as e:  # 차단·오류는 우회하지 않고 기록
            self.errors.append(f"{type(e).__name__}: {e} — {url}")
            if "429" in str(e) or "403" in str(e):
                self.stopped = True
                self.errors.append("접근 제한 응답 — 이번 조사는 여기서 멈춤")
            return None
        if "captcha" in body.lower():
            self.errors.append(f"보안 확인 화면 — 이번 조사는 여기서 멈춤: {url}")
            self.stopped = True
            return None
        f.write_text(body, encoding="utf-8")
        return body


def load_config(path: Path) -> dict:
    cfg = json.loads(path.read_text(encoding="utf-8"))
    cfg["_dir"] = path.resolve().parent
    base = json.loads(DEFAULT_CATALOG.read_text(encoding="utf-8"))["procedures"]
    procs = cfg.get("procedures") or base
    by_id = {p["id"]: p for p in base}
    cfg["procedures"] = [by_id[p] if isinstance(p, str) else p for p in procs if not isinstance(p, str) or p in by_id]
    _load_other_products()
    return cfg


def _load_other_products():
    OTHER_PRODUCTS[:] = json.loads(DEFAULT_CATALOG.read_text(encoding="utf-8")).get("other_products", [])


def collect(cfg: dict, today: str | None = None) -> Path:
    today = today or dt.date.today().isoformat()
    day_dir = cfg["_dir"] / cfg.get("output_dir", "data/prices") / today
    fetcher = Fetcher(day_dir / "raw", {"list": int(cfg.get("max_requests", 60)),
                                        "detail": int(cfg.get("max_detail_requests", 150))})
    area = cfg["area_keyword"]
    keywords = cfg.get("search_keywords") or [area]
    stations = set(cfg.get("area_stations", []))
    catalog = cfg["procedures"]
    sorts = cfg.get("sorts", list(SORTS.keys()))

    events: dict[tuple, dict] = {}
    queries = []
    print("[1/2] 이벤트 목록", file=sys.stderr)
    for proc in catalog:
        for kw in keywords:
            q = f"{kw} {proc['query']}"
            for s in sorts:
                url = f"{BASE}/events?q={urllib.parse.quote_plus(q)}" + (f"&s={s}" if s else "")
                page = fetcher.get(url, "list")
                n_cards = matched = in_area = 0
                total = None
                if page:
                    total = page_total(page)
                    cards = parse_events_page(page)
                    n_cards = len(cards)
                    for c in cards:
                        e = classify_event(c, proc, catalog)
                        if not e:
                            continue
                        matched += 1
                        e["in_area"] = (not stations) or (e["station"] in stations)
                        in_area += e["in_area"]
                        k = (proc["id"], e["event_id"])
                        if k in events:
                            events[k]["found_by"].append(f"{kw}/{SORTS.get(s, s)}")
                        else:
                            e["found_by"] = [f"{kw}/{SORTS.get(s, s)}"]
                            events[k] = e
                queries.append({"procedure": proc["id"], "query": q, "sort": SORTS.get(s, s), "url": url,
                                "site_total": total, "cards": n_cards, "matched": matched, "in_area": in_area})
                print(f"  {proc['name']:<8} {q:<12} {SORTS.get(s, s):<6} 카드 {n_cards:>2} → 시술 {matched:>2} · 지역 {in_area:>2}", file=sys.stderr)

    # 지역 안 이벤트만 상세 옵션을 연다 (같은 이벤트는 한 번만)
    want = sorted({e["event_id"]: e["url"] for e in events.values() if e["in_area"]}.items())
    print(f"[2/2] 상세 옵션 {len(want)}건", file=sys.stderr)
    details = {}
    for i, (eid, url) in enumerate(want, 1):
        page = fetcher.get(url, "detail")
        if page:
            details[eid] = parse_event_detail(page)
        if i % 10 == 0:
            print(f"  {i}/{len(want)}", file=sys.stderr)

    for (pid, eid), e in events.items():
        d = details.get(eid)
        if not d:
            e["options"] = None
            continue
        proc = next(p for p in catalog if p["id"] == pid)
        opts = [classify_option(o, not e["is_package"], proc, catalog) for o in d["options"]]
        e["options"] = [o for o in opts if o]
        e["anesthesia"] = d["anesthesia"]
        e["aftercare"] = d["aftercare"]

    snap = {
        "schema": SCHEMA,
        "source": "강남언니(unni.app) 비로그인 공개 이벤트 목록·상세",
        "collected_at": dt.datetime.now().isoformat(timespec="seconds"),
        "date": today,
        "client": cfg.get("client_label", ""),
        "area_keyword": area,
        "search_keywords": keywords,
        "area_stations": sorted(stations),
        "own_hospitals": cfg.get("own_hospitals", []),
        "procedures": [{k: p.get(k) for k in ("id", "name", "query", "unit")} for p in catalog],
        "fetch": {"requests": fetcher.requests, "cache_hits": fetcher.cache_hits,
                  "details": len(details), "details_wanted": len(want), "errors": fetcher.errors},
        "queries": queries,
        "events": sorted(events.values(), key=lambda e: (e["procedure"], e["price"] or 0)),
    }
    day_dir.mkdir(parents=True, exist_ok=True)
    p = day_dir / "snapshot.json"
    p.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"저장: {p}\n  새 요청 {fetcher.requests}회 · 저장본 재사용 {fetcher.cache_hits}회 · 이벤트 {len(events)}건 "
          f"(지역 {len(want)}) · 상세 {len(details)}건 · 오류 {len(fetcher.errors)}건", file=sys.stderr)
    return p


# ───────────────────────── 분석 ─────────────────────────

def _q(vals, q):
    vals = sorted(vals)
    if not vals:
        return None
    i = (len(vals) - 1) * q
    lo, hi = int(i), min(int(i) + 1, len(vals) - 1)
    return round(vals[lo] + (vals[hi] - vals[lo]) * (i - lo))


def price_rows(e: dict) -> list[dict]:
    """이벤트 하나를 가격 행 목록으로. 상세 옵션이 있으면 옵션, 없으면 목록 대표가."""
    base = {"event_id": e["event_id"], "url": e["url"], "title": e["title"], "hospital": e["hospital"],
            "station": e["station"], "review_count": e["review_count"], "rating": e["rating"]}
    if e.get("options"):
        return [dict(base, **{"key": o.get("option_id") or o["name"], "name": o["name"], "price": o["price"], "original_price": o.get("original_price"),
                              "is_package": o["is_package"], "qty": o["qty"], "price_per_unit": o["price_per_unit"],
                              "teaser": bool(TEASER.search(o["name"]) or TEASER.search(e["title"])), "from": "옵션"}) for o in e["options"] if o.get("price")]
    if not e.get("price"):
        return []
    return [dict(base, **{"key": "list", "name": e["title"], "price": e["price"], "original_price": e.get("original_price"),
                          "is_package": e["is_package"], "qty": None, "price_per_unit": None,
                          "teaser": bool(TEASER.search(e["title"])), "from": "대표가"})]


def summarize(snap: dict) -> dict:
    own = [o for o in snap.get("own_hospitals", []) if o]
    is_own = lambda h: any(o in h for o in own)
    res = {}
    for proc in snap["procedures"]:
        evs = [e for e in snap["events"] if e["procedure"] == proc["id"] and e["in_area"]]
        rows = [r for e in evs for r in price_rows(e)]
        all_singles = [r for r in rows if not r["is_package"]]
        teasers = [r for r in all_singles if r["teaser"]]
        regular = [r for r in all_singles if not r["teaser"]]
        singles = regular if len(regular) >= 3 else all_singles  # 첫방문·체험가는 따로 본다
        base = singles if len(singles) >= 3 else rows
        prices = [r["price"] for r in base]
        ppu = [r["price_per_unit"] for r in singles if r.get("price_per_unit")]
        groups = defaultdict(list)
        for r in singles:
            if r["qty"]:
                groups[r["qty"]].append(r)
        n_single_all = len(all_singles)
        qty_groups = sorted(
            ({"qty": q, "n": len(g), "hospitals": len({r["hospital"] for r in g}),
              "min": min(r["price"] for r in g), "median": round(statistics.median(r["price"] for r in g)),
              "max": max(r["price"] for r in g)} for q, g in groups.items()),
            key=lambda g: (-g["hospitals"], g["qty"]))
        hosp: dict[str, dict] = {}
        for e in evs:
            h = hosp.setdefault(e["hospital"], {"hospital": e["hospital"], "station": e["station"], "events": 0,
                                                "min_single": None, "min_any": None, "reviews": 0,
                                                "own": is_own(e["hospital"]), "anesthesia": e.get("anesthesia")})
            h["events"] += 1
            h["reviews"] += e["review_count"]
            for r in price_rows(e):
                h["min_any"] = r["price"] if h["min_any"] is None else min(h["min_any"], r["price"])
                if not r["is_package"]:
                    h["min_single"] = r["price"] if h["min_single"] is None else min(h["min_single"], r["price"])
        res[proc["id"]] = {
            "name": proc["name"], "unit": proc["unit"],
            "n_events": len(evs), "n_hospitals": len(hosp), "n_rows": len(rows), "n_single": n_single_all,
            "n_detail": sum(1 for e in evs if e.get("options") is not None),
            "basis": ("단품 옵션" if singles is regular else "단품 옵션(체험가 포함)") if base is singles else "전체(단품 부족)",
            "teaser_n": len(teasers), "teaser_min": min((r["price"] for r in teasers), default=None),
            "teaser_hospitals": len({r["hospital"] for r in teasers}),
            "min": min(prices) if prices else None, "p25": _q(prices, .25),
            "median": round(statistics.median(prices)) if prices else None,
            "p75": _q(prices, .75), "max": max(prices) if prices else None,
            "ppu_median": round(statistics.median(ppu)) if ppu else None,
            "ppu_min": min(ppu) if ppu else None, "ppu_max": max(ppu) if ppu else None, "ppu_n": len(ppu),
            "qty_groups": qty_groups[:4],
            "hospitals": sorted(hosp.values(), key=lambda h: (h["min_single"] or h["min_any"] or 0)),
            "popular": sorted(evs, key=lambda e: -e["review_count"])[:5],
            "events": sorted(evs, key=lambda e: min([r["price"] for r in price_rows(e)] or [0])),
            "rows": sorted(rows, key=lambda r: r["price"]),  # 그림용: 패키지·체험가 포함 전체
        }
    return res


def previous_snapshot(day_dir: Path) -> dict | None:
    root = day_dir.parent
    prev = sorted(d for d in root.iterdir() if d.is_dir() and d.name < day_dir.name and (d / "snapshot.json").exists())
    return json.loads((prev[-1] / "snapshot.json").read_text(encoding="utf-8")) if prev else None


def diff(cur: dict, prev: dict | None) -> dict:
    if not prev:
        return {}
    s_cur, s_prev = summarize(cur), summarize(prev)
    out = {"prev_date": prev["date"], "procedures": {}}
    for pid, c in s_cur.items():
        p = s_prev.get(pid)
        if not p:
            continue
        ev_c = {e["event_id"]: e for e in c["events"]}
        ev_p = {e["event_id"]: e for e in p["events"]}
        old = {(r["event_id"], r["key"]): r["price"] for e in p["events"] for r in price_rows(e)}
        changed = [{"hospital": r["hospital"], "name": r["name"], "from": old[(r["event_id"], r["key"])], "to": r["price"]}
                   for e in c["events"] for r in price_rows(e)
                   if (r["event_id"], r["key"]) in old and old[(r["event_id"], r["key"])] != r["price"]]
        out["procedures"][pid] = {
            "median_prev": p["median"], "median_cur": c["median"],
            "ppu_prev": p["ppu_median"], "ppu_cur": c["ppu_median"],
            "new": [ev_c[i] for i in ev_c if i not in ev_p],
            "gone": [ev_p[i] for i in ev_p if i not in ev_c],
            "changed": changed,
        }
    return out


# ───────────────────────── 보고서 ─────────────────────────

def won(v):
    if v is None:
        return "–"
    if v < 10000:
        return f"{v:,}원"
    s = f"{v / 10000:,.1f}".rstrip("0").rstrip(".")
    return f"{s}만원"


def esc(s):
    return html.escape(str(s if s is not None else ""))


def qty_s(q, unit):
    return f"{int(q) if float(q).is_integer() else q}{unit}"


def strip_svg(rows, own):
    """가격 점 그림(로그 눈금). 단품=채운 점, 패키지=빈 점, 우리 병원=주황."""
    if not rows:
        return ""
    W, H, pad = 640, 58, 16
    lo = max(min(r["price"] for r in rows), 1000)
    hi = max(max(r["price"] for r in rows), lo * 2)
    lo_l, hi_l = math.log10(lo) - 0.05, math.log10(hi) + 0.05
    x = lambda v: pad + (math.log10(max(v, 1000)) - lo_l) / (hi_l - lo_l) * (W - 2 * pad)
    dots = []
    for i, r in enumerate(rows):
        mine = any(o in r["hospital"] for o in own)
        cls = "dot own" if mine else ("dot pkg" if (r["is_package"] or r.get("teaser")) else "dot")
        dots.append(f'<circle class="{cls}" cx="{x(r["price"]):.1f}" cy="{20 + (i % 4) * 6}" r="{6 if mine else 4.2}">'
                    f'<title>{esc(r["hospital"])} · {esc(r["name"])} · {won(r["price"])}</title></circle>')
    ticks = []
    for t in (1e3, 3e3, 1e4, 3e4, 1e5, 3e5, 1e6, 3e6, 1e7):
        if lo_l <= math.log10(t) <= hi_l:
            ticks.append(f'<line class="tick" x1="{x(t):.1f}" x2="{x(t):.1f}" y1="12" y2="44"/>'
                         f'<text class="tl" x="{x(t):.1f}" y="56" text-anchor="middle">{won(int(t))}</text>')
    return f'<svg viewBox="0 0 {W} {H}" class="strip" role="img" aria-label="가격 분포">{"".join(ticks)}{"".join(dots)}</svg>'


CSS = """
:root{--bg:#f7f6f2;--card:#fff;--ink:#1c1c1a;--mute:#6a6963;--line:#e5e2da;--accent:#2b6c66;--accent2:#c4561a;--pkg:#9aa39f;--chip:#ecf2f0}
@media (prefers-color-scheme:dark){:root{--bg:#121413;--card:#1b1e1d;--ink:#ebeae5;--mute:#a19f98;--line:#313533;--accent:#6cc0b6;--accent2:#f09358;--pkg:#6c7370;--chip:#21302d}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 -apple-system,BlinkMacSystemFont,"Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif}
main{max-width:920px;margin:0 auto;padding:28px 16px 72px}
h1{font-size:24px;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:19px;margin:40px 0 10px;letter-spacing:-.01em}h3{font-size:17px;margin:0}
.sub{color:var(--mute);font-size:13px}.note{background:var(--chip);border-radius:10px;padding:12px 14px;font-size:13.5px;margin:16px 0}
.note b{color:var(--accent)}table{width:100%;border-collapse:collapse;font-size:14px}
th,td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{font-size:12px;color:var(--mute);font-weight:600;white-space:nowrap}
td.n,th.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:14px 0}
.head{display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin:12px 0 4px}
.kpi .v{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.3}.kpi .l{font-size:12px;color:var(--mute)}
.strip{width:100%;height:auto;margin:8px 0 2px}.dot{fill:var(--accent);opacity:.85}.dot.pkg{fill:none;stroke:var(--pkg);stroke-width:1.6}.dot.own{fill:var(--accent2)}
.tick{stroke:var(--line)}.tl{fill:var(--mute);font-size:11px}
details{margin-top:10px}summary{cursor:pointer;color:var(--accent);font-size:14px;padding:2px 0}
.tag{display:inline-block;font-size:11px;padding:0 7px;border-radius:99px;background:var(--chip);color:var(--mute);margin-left:4px;vertical-align:1px}
tr.own td{background:color-mix(in srgb,var(--accent2) 12%,transparent)}a{color:var(--accent)}
.up{color:var(--accent2);font-size:12.5px}.down{color:var(--accent);font-size:12.5px}
.legend{font-size:12px;color:var(--mute)}.legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 4px 0 10px;vertical-align:middle}
ul.opts{margin:4px 0 0;padding-left:16px;font-size:13px;color:var(--mute)}ul.opts b{color:var(--ink);font-weight:600}
table.sum td{white-space:nowrap}
.insight{border-left:3px solid var(--accent);padding:2px 0 2px 12px;margin:10px 0}
"""


def pct(a, b):
    if not a or not b:
        return ""
    r = (b - a) / a * 100
    if abs(r) < 1:
        return ""
    return f' <span class="{"up" if r > 0 else "down"}">{"▲" if r > 0 else "▼"}{abs(r):.0f}%</span>'


def render(snap: dict, summ: dict, dif: dict) -> str:
    own = [o for o in snap.get("own_hospitals", []) if o]
    dp = dif.get("procedures", {})
    rows = []
    for pid, s in summ.items():
        d = dp.get(pid, {})
        qg = s["qty_groups"][0] if s["qty_groups"] else None
        rep = f"{qty_s(qg['qty'], s['unit'])} 중앙 {won(qg['median'])} <span class=sub>({qg['hospitals']}곳)</span>" if qg and qg["hospitals"] >= 2 else "–"
        ppu = (f"{won(s['ppu_median'])}{pct(d.get('ppu_prev'), d.get('ppu_cur'))}" if s["ppu_median"] else "–")
        rows.append(f"<tr><td><a href='#{pid}'>{esc(s['name'])}</a></td><td class=n>{s['n_hospitals']}</td>"
                    f"<td class=n>{won(s['min'])}</td><td class=n><b>{won(s['median'])}</b>{pct(d.get('median_prev'), d.get('median_cur'))}</td>"
                    f"<td class=n>{won(s['max'])}</td><td class=n>{ppu}</td><td>{rep}</td><td class=n>{won(s['teaser_min'])}</td></tr>")

    cards = []
    for pid, s in summ.items():
        if not s["n_events"]:
            cards.append(f"<section class=card id='{pid}'><h3>{esc(s['name'])}</h3><p class=sub>이번 표본에서 지역 안 공개 이벤트를 찾지 못했습니다.</p></section>")
            continue
        unitk = (f"<div class=kpi><div class=v>{won(s['ppu_median'])}</div><div class=l>{esc(s['unit'])}당 중앙값 ({s['ppu_n']}개 옵션, {won(s['ppu_min'])}~{won(s['ppu_max'])})</div></div>"
                 if s["ppu_median"] else "")
        teaserk = (f"<div class=kpi><div class=v>{won(s['teaser_min'])}</div><div class=l>첫방문·체험가 최저 ({s['teaser_hospitals']}곳, 통계 제외)</div></div>"
                   if s["teaser_n"] else "")
        qtbl = ""
        if s["qty_groups"]:
            qtbl = ("<div class=wrap><table><tr><th>용량(단품)</th><th class=n>병원</th><th class=n>최저</th><th class=n>중앙값</th><th class=n>최고</th></tr>"
                    + "".join(f"<tr><td>{qty_s(g['qty'], s['unit'])}</td><td class=n>{g['hospitals']}</td><td class=n>{won(g['min'])}</td>"
                              f"<td class=n><b>{won(g['median'])}</b></td><td class=n>{won(g['max'])}</td></tr>" for g in s["qty_groups"])
                    + "</table></div>")
        hrows = "".join(
            f"<tr class='{'own' if h['own'] else ''}'><td>{esc(h['hospital'])}<div class=sub>{esc(h['station'].replace('부산 ', ''))}"
            f"{' · 마취비 ' + esc(h['anesthesia']) if h.get('anesthesia') else ''}</div></td>"
            f"<td class=n>{won(h['min_single'])}</td><td class=n>{won(h['min_any'])}</td><td class=n>{h['events']}</td><td class=n>{h['reviews']:,}</td></tr>"
            for h in s["hospitals"])
        erows = []
        for e in s["events"]:
            pr = price_rows(e)
            opts = "".join(f"<li>{esc(r['name'])} — <b>{won(r['price'])}</b>{'<span class=tag>패키지</span>' if r['is_package'] else ''}{'<span class=tag>체험가</span>' if r['teaser'] else ''}</li>"
                           for r in sorted(pr, key=lambda r: r["price"])[:8])
            more = f"<li>…외 {len(pr) - 8}개</li>" if len(pr) > 8 else ""
            src = "" if e.get("options") is not None else "<span class=tag>대표가만</span>"
            erows.append(f"<tr class='{'own' if any(o in e['hospital'] for o in own) else ''}'><td><a href='{esc(e['url'])}' target=_blank rel=noopener>{esc(e['title'])}</a>{src}"
                         f"<div class=sub>{esc(e['hospital'])} · 평점 {e['rating'] if e['rating'] is not None else '–'} · 리뷰 {e['review_count']:,}</div>"
                         f"<ul class=opts>{opts}{more}</ul></td></tr>")
        pop = "".join(f"<li>{esc(e['hospital'])} · {esc(e['title'])} — 리뷰 {e['review_count']:,}건</li>" for e in s["popular"] if e["review_count"] >= 10)
        d = dp.get(pid)
        dhtml = ""
        if d and (d["new"] or d["gone"] or d["changed"]):
            items = [f"<li>가격 변경: {esc(c['hospital'])} · {esc(c['name'])} {won(c['from'])} → <b>{won(c['to'])}</b></li>" for c in d["changed"][:12]]
            items += [f"<li>새 이벤트: {esc(e['hospital'])} · {esc(e['title'])}</li>" for e in d["new"][:8]]
            items += [f"<li>사라진 이벤트: {esc(e['hospital'])} · {esc(e['title'])}</li>" for e in d["gone"][:8]]
            dhtml = f"<details open><summary>지난 조사({esc(dif['prev_date'])}) 대비 변동</summary><ul class=sub>{''.join(items)}</ul></details>"
        cards.append(f"""<section class=card id='{pid}'>
<div class=head><h3>{esc(s['name'])}</h3><span class=sub>병원 {s['n_hospitals']}곳 · 이벤트 {s['n_events']}건 · 가격 {s['n_rows']}개(단품 {s['n_single']})</span></div>
<div class=kpis><div class=kpi><div class=v>{won(s['min'])}</div><div class=l>가장 낮은 단품(일반)</div></div>
<div class=kpi><div class=v>{won(s['median'])}</div><div class=l>중앙값 ({esc(s['basis'])})</div></div>
<div class=kpi><div class=v>{won(s['p25'])}~{won(s['p75'])}</div><div class=l>가운데 50% 구간</div></div>{unitk}{teaserk}</div>
{strip_svg(s['rows'], own)}
<div class=legend><i style="background:var(--accent)"></i>단품<i style="border:1.6px solid var(--pkg)"></i>패키지·체험가{'<i style="background:var(--accent2)"></i>우리 병원' if own else ''}</div>
{qtbl}
{f'<p class=sub style="margin:12px 0 0">리뷰가 많이 쌓인 이벤트 (찾는 사람이 많다는 신호)</p><ul class=sub style="margin:2px 0">{pop}</ul>' if pop else ''}
{dhtml}
<details><summary>병원별 최저가 ({s['n_hospitals']}곳)</summary><div class=wrap><table><tr><th>병원</th><th class=n>단품 최저</th><th class=n>전체 최저</th><th class=n>이벤트</th><th class=n>리뷰 합</th></tr>{hrows}</table></div></details>
<details><summary>이벤트와 옵션 전체 ({s['n_events']}건)</summary><div class=wrap><table>{''.join(erows)}</table></div></details>
</section>""")

    f = snap["fetch"]
    errs = f["errors"]
    own_note = "" if own else "<li>우리 병원 강조: <code>price_watch.json</code>의 <code>own_hospitals</code>에 강남언니에 표시되는 병원명을 넣으면 주황색으로 표시됩니다.</li>"
    vs = f" · {esc(dif['prev_date'])} 조사와 비교" if dif else ""
    kw = " / ".join(snap.get("search_keywords") or [snap["area_keyword"]])
    sorts = "·".join(dict.fromkeys(q["sort"] for q in snap["queries"]))
    return f"""<!doctype html><html lang=ko><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<meta name=robots content="noindex"><title>{esc(snap['area_keyword'])} 시술가 조사 {esc(snap['date'])}</title><style>{CSS}</style></head><body><main>
<h1>{esc(snap['area_keyword'])} 피부과 시술가 조사</h1>
<div class=sub>{esc(snap['date'])} 조사{vs} · 출처: 강남언니 공개 이벤트(로그인 없이 보이는 화면) · 지역: {esc(', '.join(s.replace('부산 ', '') for s in snap['area_stations']))}</div>
<div class=note><b>내부 참고용입니다.</b> 블로그·광고·SNS에 다른 병원 가격을 싣거나 비교하면 안 됩니다(의료광고 타 병원 비교 금지, BRAND.md).
여기 가격은 강남언니 <b>앱 결제 이벤트가</b>라 병원 정가나 상담 후 실제 가격과 다를 수 있고, 강남언니에 이벤트를 올리지 않은 병원은 빠져 있습니다.</div>
<h2>한눈에 보기</h2>
<div class=wrap><table class=sum><tr><th>시술</th><th class=n>병원</th><th class=n>최저</th><th class=n>중앙값</th><th class=n>최고</th><th class=n>단위당 중앙값</th><th>가장 흔한 용량</th><th class=n>체험가 최저</th></tr>{''.join(rows)}</table></div>
<p class=sub>최저·중앙값·최고는 다른 시술이 섞이지 않은 단품 옵션 기준이며, '첫방문·체험가' 옵션은 미끼성 가격이라 따로 표시하고 통계에서 뺐습니다(일반 단품이 3개 미만이면 포함). 단위당 가격은 옵션명에 샷·cc·유닛 수가 하나만 적힌 단품으로 계산했습니다.</p>
<h2>시술별 상세</h2>
{''.join(cards)}
<h2>조사 방법과 한계</h2>
<ul class=sub>
<li>「{esc(kw)} + 시술명」 이벤트 목록을 {esc(sorts)}으로 1장(최대 20건)씩 열어 합친 표본입니다. 강남언니 전체 목록이 아닙니다.</li>
<li>제목에 시술명이 있고 위치가 위 지역인 이벤트만 남긴 뒤, 각 이벤트 상세 화면의 옵션별 가격을 읽었습니다(상세 {f['details']}/{f['details_wanted']}건).</li>
<li>옵션명에 다른 시술이 같이 있거나 '+·&amp;·패키지'가 있으면 패키지로 분류했습니다. 분류는 자동이라 틀릴 수 있으니 의사결정 전에는 원문 링크를 확인하세요.</li>
<li>새 요청 {f['requests']}회 · 같은 날 저장본 재사용 {f['cache_hits']}회{f' · 오류 {len(errs)}건' if errs else ''}.</li>
{own_note}
</ul>
{('<details><summary>오류 기록</summary><ul class=sub>' + ''.join(f'<li>{esc(e)}</li>' for e in errs) + '</ul></details>') if errs else ''}
</main></body></html>"""


def report(cfg: dict, date: str | None = None) -> Path:
    root = cfg["_dir"] / cfg.get("output_dir", "data/prices")
    days = sorted(d for d in root.iterdir() if d.is_dir() and (d / "snapshot.json").exists())
    day = (root / date) if date else days[-1]
    snap = json.loads((day / "snapshot.json").read_text(encoding="utf-8"))
    summ = summarize(snap)
    dif = diff(snap, previous_snapshot(day))
    rdir = cfg["_dir"] / cfg["report_dir"] if cfg.get("report_dir") else day
    rdir.mkdir(parents=True, exist_ok=True)
    out = rdir / (f"{snap['date']}_price-report.html" if cfg.get("report_dir") else "report.html")
    out.write_text(render(snap, summ, dif), encoding="utf-8")
    lite = {pid: {k: v for k, v in s.items() if k not in ("events", "hospitals", "popular", "rows")} for pid, s in summ.items()}
    (day / "summary.json").write_text(json.dumps({"date": snap["date"], "area": snap["area_keyword"], "vs": dif.get("prev_date"),
                                                  "procedures": lite}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"보고서: {out}", file=sys.stderr)
    return out


# ───────────────────────── 시험 ─────────────────────────

def selftest() -> int:
    tdir = SKILL_DIR / "tests"
    cat = json.loads(DEFAULT_CATALOG.read_text(encoding="utf-8"))["procedures"]
    _load_other_products()
    P = {p["id"]: p for p in cat}
    fails = []
    def check(cond, msg):
        if not cond:
            fails.append(msg)

    page = (tdir / "fixture_events.html").read_text(encoding="utf-8")
    cards = parse_events_page(page)
    check(len(cards) == 20, f"카드 20개 기대, {len(cards)}개")
    c0 = cards[0]
    check(c0["price"] == 4400 and c0["original_price"] == 7700 and c0["discount_pct"] == 42, f"첫 카드 가격: {c0}")
    check(c0["station"] == "부산 서면역" and c0["hospital"].startswith("유앤아이"), f"위치: {c0['station']} / {c0['hospital']}")
    check(c0["rating"] == 8.4 and c0["review_count"] == 180, f"평점: {c0['rating']} {c0['review_count']}")
    check(page_total(page) == 384, f"전체 건수 {page_total(page)}")
    check(not any(classify_event(c, P["pico-toning"], cat) and "제모" in c["title"] for c in cards), "제모가 피코토닝으로 잡힘")

    det = parse_event_detail((tdir / "fixture_detail.html").read_text(encoding="utf-8"))
    names = [o["name"] for o in det["options"]]
    check(len(det["options"]) == 4, f"옵션 4개 기대: {names}")
    if det["options"]:
        o0 = det["options"][0]
        check(o0["price"] == 990000 and o0["original_price"] == 1911800 and o0["discount_pct"] == 48, f"옵션 가격: {o0}")
        u = [classify_option(o, True, P["ulthera"], cat) for o in det["options"]]
        check(u[0]["qty"] == 300 and u[0]["price_per_unit"] == 3300 and not u[0]["is_package"], f"300샷 단품: {u[0]}")
        check(u[2]["is_package"], "울쎄라+LDM 옵션은 패키지")
    check(det["anesthesia"] is not None, "마취비 표기")

    check(extract_qty("울쎄라 300샷", "샷") == 300, "샷 수량")
    check(bool(TEASER.search("첫방문고객) 인모드 FX 1부위 1회 체험가")) and not TEASER.search("인모드 FX 얼굴전체"), "체험가 판별")
    check(extract_qty("울쎄라 300샷, 600샷", "샷") is None, "수량 여러 개면 None")
    check(extract_qty("리쥬란힐러 2CC_1회", "cc") == 2, "cc 수량")
    check(extract_qty("승모근보톡스 100U", "유닛") == 100, "유닛 수량")
    check(classify_option({"name": "쥬베룩 스킨 2cc", "price": 1}, True, P["rejuran"], cat) is None, "다른 시술 옵션 제외")
    check(classify_option({"name": "레디어스 1팩", "price": 1}, True, P["botox"], cat) is None, "카탈로그 밖 제품 옵션 제외")
    check(classify_option({"name": "수분,진정시너지케어", "price": 1}, False, P["ulthera"], cat) is None, "패키지 이벤트의 이름 없는 옵션 제외")
    check(classify_option({"name": "얼굴전체 1회", "price": 1}, True, P["inmode"], cat) is not None, "단일 시술 이벤트의 이름 없는 옵션 인정")
    check(classify_option({"name": "리쥬란 헤어부스터 3cc", "price": 1}, True, P["rejuran"], cat) is None, "두피 리쥬란 제외")
    for f in fails:
        print("실패:", f)
    print("selftest:", "통과" if not fails else f"{len(fails)}건 실패")
    return 1 if fails else 0


def main(argv):
    if len(argv) < 2 or argv[1] not in ("run", "collect", "report", "selftest"):
        print(__doc__)
        return 2
    if argv[1] == "selftest":
        return selftest()
    if len(argv) < 3:
        print(__doc__)
        return 2
    cfg = load_config(Path(argv[2]))
    date = argv[3] if len(argv) > 3 else None
    if argv[1] in ("collect", "run"):
        collect(cfg, date)
    if argv[1] in ("report", "run"):
        report(cfg, date)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
