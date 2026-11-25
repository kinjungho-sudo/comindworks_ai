"""병원·한의원 네이버 블로그 형식 학습 — 하루 20개.

    python3 tools/blog-study/study.py            # 오늘 몫(키워드 4개 × 글 5개) 수집·측정·보고
    python3 tools/blog-study/study.py --report   # 수집 없이 누적 요약만 다시 만들기

하는 일
1. keywords.json에서 오늘 차례 키워드 4개를 고른다(state.json의 cursor).
2. 네이버 블로그 검색 상위 글 중 병원·한의원 글로 보이는 것, 아직 안 본 것 5개씩.
3. 모바일 화면에서 형식만 잰다(measure.js): 글자 수, 부품 순서, 이미지 수·크기, 인용구 모양, 정렬,
   한 줄 길이, 글꼴·글자 크기·색, 소제목, 첫·끝 문장 일부, 태그.
4. 본문은 의료광고 검사기(tools/medad_check.py)로 돌려 '따라 하면 안 되는 표현'을 센다. 본문 전체는 저장하지 않는다.
5. data/blog-study/posts.jsonl에 한 줄씩 쌓고, output/blog-study/<날짜>.md(오늘)와
   docs/research/blog-study-summary.md(누적)를 만든다.

글 문장·이미지는 가져오지 않는다. 형식만 배운다(저작권). 공개 글을 하루 20개만 천천히 연다.
"""
import html, json, os, re, statistics as st, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from collections import Counter
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJ = HERE.parents[1]
DATA = PROJ / "data" / "blog-study"
OUT = PROJ / "output" / "blog-study"
SUMMARY = PROJ / "docs" / "research" / "blog-study-summary.md"
NODE_PATH = os.environ.get("NODE_PATH") or str(PROJ.parents[0] / "geo-doctor" / "node_modules")
sys.path.insert(0, str(PROJ / "tools"))
import medad_check  # noqa: E402

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def search(q, pages=2):
    found, seen = [], set()
    for start in range(1, pages * 15, 15):
        u = "https://search.naver.com/search.naver?" + urllib.parse.urlencode({"ssc": "tab.blog.all", "query": q, "start": start})
        h = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=15).read().decode("utf-8", "ignore")
        for m in re.finditer(r'href="https://blog\.naver\.com/([A-Za-z0-9_\-]+)/(\d+)"[^>]*>(.*?)</a>', h, re.S):
            a, pid, t = m.groups()
            t = html.unescape(re.sub(r"<[^>]+>", "", t)).replace("새 창 열림", "").strip()
            key = f"{a}/{pid}"
            if key in seen or not t:
                continue
            seen.add(key)
            found.append({"author": a, "url": f"https://m.blog.naver.com/{a}/{pid}", "search_title": t, "rank": len(found) + 1})
        time.sleep(1.5)
    return found


def load_json(p, default):
    try:
        return json.loads(Path(p).read_text())
    except (OSError, json.JSONDecodeError):
        return default


def medad_counts(title, text):
    rules, taboo = medad_check.load_rules(), medad_check.brand_taboo_phrases()
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
        f.write(f"# {title}\n\n{text}\n")
        path = f.name
    try:
        fs = medad_check.check_file(path, rules, taboo)
    finally:
        os.unlink(path)
    c = Counter()
    for x in fs:
        if x["id"] in ("S-marker", "N-realname", "BRAND-taboo"):
            continue  # 우리 병원 전용 규칙은 남의 글에 적용하지 않는다
        c[f'{x["severity"]}:{x["id"]}'] += 1
    return dict(c)


def collect():
    kw = load_json(HERE / "keywords.json", {})
    state = load_json(DATA / "state.json", {"cursor": 0, "seen": []})
    seen = set(state["seen"])
    K, per, n = kw["keywords"], kw["per_keyword"], kw["keywords_per_day"]
    hint = re.compile(kw["clinic_hint"])
    today_kw = [K[(state["cursor"] + i) % len(K)] for i in range(n)]
    picks = []
    for q in today_kw:
        cand = [c for c in search(q) if c["url"] not in seen]
        clinic = [c for c in cand if hint.search(c["search_title"])]
        chosen = (clinic + [c for c in cand if c not in clinic])[:per]
        for c in chosen:
            c["keyword"] = q
            c["clinic_like"] = c in clinic
        picks += chosen
        print(f"[검색] {q}: 후보 {len(cand)}개, 병원 글로 보이는 것 {len(clinic)}개 → {len(chosen)}개")
    DATA.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        inp, outp = Path(td) / "in.json", Path(td) / "out.json"
        inp.write_text(json.dumps([p["url"] for p in picks]))
        subprocess.run(["node", str(HERE / "measure.js"), str(inp), str(outp)], check=True, env={**os.environ, "NODE_PATH": NODE_PATH})
        measured = json.loads(outp.read_text())
    day = date.today().isoformat()
    rows = []
    for p, m in zip(picks, measured):
        row = {"date": day, **p, **{k: v for k, v in m.items() if k not in ("text", "url")}}
        if m.get("ok"):
            row["medad"] = medad_counts(m.get("title", ""), m.get("text", ""))
        rows.append(row)
        seen.add(p["url"])
    with open(DATA / "posts.jsonl", "a") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    state["cursor"] = (state["cursor"] + n) % len(K)
    state["seen"] = sorted(seen)
    (DATA / "state.json").write_text(json.dumps(state, ensure_ascii=False, indent=1))
    ok = sum(1 for r in rows if r.get("ok"))
    print(f"[측정] {ok}/{len(rows)}개 성공")
    return day, rows


# ---------- 요약 ----------
def q(vals, p):
    vals = sorted(vals)
    if not vals:
        return 0
    k = (len(vals) - 1) * p
    lo = int(k)
    return round(vals[lo] + (vals[min(lo + 1, len(vals) - 1)] - vals[lo]) * (k - lo))


def rng(vals, unit=""):
    return f"{q(vals, .25):,}~{q(vals, .75):,}{unit} (중앙값 {q(vals, .5):,})" if vals else "-"


def pct(n, d):
    return f"{round(100 * n / d)}%" if d else "-"


RULE_NAME = {}
for r in medad_check.load_rules()["pattern_rules"]:
    RULE_NAME[r["id"]] = r["title"]
RULE_NAME.update({"S07-sideeffect": "시술을 다루면서 부작용 정보 없음", "S-disclaimer": "개인차 고지 없음", "S-sources": "수치는 있는데 출처 없음"})

FONT_NAME = {"se-ff-": "기본서체", "se-ff-nanummaruburi": "나눔마루부리", "se-ff-nanumgothic": "나눔고딕", "se-ff-nanumbarungothic": "나눔바른고딕", "se-ff-nanummyeongjo": "나눔명조", "se-ff-nanumsquare": "나눔스퀘어",
             "se-ff-nanumbareunhipi": "나눔바른히피", "se-ff-nanumdasisijaghae": "나눔다시시작해", "se-ff-nanumgaram": "나눔가람", "se-ff-system": "기본서체",
             "se-ff-maruburi": "마루부리", "se-ff-nanumsquareround": "나눔스퀘어라운드", "se-ff-nanumbarunpen": "나눔바른펜", "se-ff-nanumdahaengce": "나눔다행체"}


def summarize(rows, title):
    R = [r for r in rows if r.get("ok")]
    n = len(R)
    if not n:
        return f"# {title}\n\n측정된 글이 없습니다.\n"
    chars = [r["chars"] for r in R]
    imgs = [r["n_images"] for r in R]
    per1k = [round(1000 * r["n_images"] / max(1, r["chars"])) for r in R]
    lines = [r["avg_line"] for r in R]
    center = [r["align"].get("center", 0) / max(1, sum(r["align"].values())) for r in R]
    font = Counter(); size = Counter(); color = Counter(); qs = Counter(); md = Counter(); md_posts = Counter()
    for r in R:
        top = max(r["fonts"], key=r["fonts"].get) if r["fonts"] else "se-ff-system"
        font[FONT_NAME.get(top, top.replace("se-ff-", ""))] += 1
        if r["sizes"]:
            size[max(r["sizes"], key=r["sizes"].get).replace("se-fs-", "").replace("fs", "") or "기본(15)"] += 1
        for c in r["colors"]:
            color[c] += 1
        for s in r["quote_styles"]:
            qs[s or "기본"] += 1
        for k, v in (r.get("medad") or {}).items():
            md[k] += v; md_posts[k] += 1
    out = [f"# {title}", "",
           f"측정 글 {n}개 (병원·한의원 글로 보이는 것 {sum(1 for r in R if r.get('clinic_like'))}개). 문장·이미지는 저장하지 않고 형식만 셌습니다.", "",
           "## 형식", "",
           "| 항목 | 값 |", "|---|---|",
           f"| 글자 수(공백 제외) | {rng(chars, '자')} |",
           f"| 이미지 수 | {rng(imgs, '장')} |",
           f"| 1,000자당 이미지 | {rng(per1k, '장')} |",
           f"| 한 줄 평균 길이 | {rng(lines, '자')} |",
           f"| 가운데 정렬이 절반 넘는 글 | {pct(sum(1 for c in center if c > .5), n)} |",
           f"| 인용구 블록 사용 | {pct(sum(1 for r in R if r['n_quote']), n)} (모양: {', '.join(f'{k} {v}' for k, v in qs.most_common(4)) or '-'}) |",
           f"| 표 사용 | {pct(sum(1 for r in R if r['n_table']), n)} |",
           f"| 구분선 사용 | {pct(sum(1 for r in R if r['n_hr']), n)} |",
           f"| 스티커 사용 | {pct(sum(1 for r in R if r['n_sticker']), n)} |",
           f"| 동영상 | {pct(sum(1 for r in R if r['n_video']), n)} |",
           f"| 지도(병원 위치) | {pct(sum(1 for r in R if r['n_map']), n)} |",
           f"| 태그 수 | {rng([len(r['tags']) for r in R], '개')} |",
           f"| 굵은 글씨 | {rng([r['n_bold'] for r in R], '곳')} |",
           "", "## 글꼴·글자 크기·색", "",
           f"- 본문 글꼴: {', '.join(f'{k} {v}' for k, v in font.most_common(5))}",
           f"- 본문 글자 크기(가장 많이 쓴 크기): {', '.join(f'{k} {v}' for k, v in size.most_common(5))}",
           f"- 강조 색(쓴 글 수): {', '.join(f'{k} {v}' for k, v in color.most_common(6)) or '-'}",
           "", "## 의료광고 검사기로 본 위험 표현 (따라 하지 말 것)", "",
           "| 표현 | 쓴 글 | 비율 |", "|---|---|---|"]
    for k, v in md_posts.most_common(12):
        sev, rid = k.split(":", 1)
        out.append(f"| {'금지' if sev == 'block' else '확인'} · {RULE_NAME.get(rid, rid)} | {v}개 | {pct(v, n)} |")
    out += ["", "상위 노출 글이라도 이 표현은 의료법상 금지이거나 확인이 필요합니다. 형식만 배우고 표현은 따르지 않습니다.", "",
            "## 소제목 예시 (인용구·큰 글씨에서)", ""]
    ex = []
    for r in R:
        for h in (r["heads"] + r["big_paras"])[:3]:
            if 6 <= len(h) <= 50:
                ex.append(f"- {h}  _({r['keyword']})_")
    out += ex[:24] + ["", "## 글별", "", "| 키워드 | 순위 | 제목 | 글자 | 이미지 | 인용구 | 표 | 위험(금지) |", "|---|---|---|---|---|---|---|---|"]
    for r in R:
        blocks = sum(v for k, v in (r.get("medad") or {}).items() if k.startswith("block:"))
        t = r["title"].replace("|", "/")[:40]
        out.append(f"| {r['keyword']} | {r['rank']} | [{t}]({r['url']}) | {r['chars']:,} | {r['n_images']} | {r['n_quote']} | {r['n_table']} | {blocks} |")
    return "\n".join(out) + "\n"


def main():
    if "--report" not in sys.argv:
        day, rows = collect()
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"{day}.md").write_text(summarize(rows, f"블로그 형식 학습 {day} (오늘 {len(rows)}개)"))
        print(f"[보고] {OUT / f'{day}.md'}")
    allrows = [json.loads(l) for l in open(DATA / "posts.jsonl")] if (DATA / "posts.jsonl").exists() else []
    days = sorted({r["date"] for r in allrows})
    SUMMARY.write_text(summarize(allrows, f"병원·한의원 블로그 형식 누적 요약 ({days[0] if days else '-'} ~ {days[-1] if days else '-'}, {len(allrows)}개)"))
    print(f"[누적] {SUMMARY} ({len(allrows)}개)")


if __name__ == "__main__":
    main()
