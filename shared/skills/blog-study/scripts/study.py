"""병원 네이버 블로그 형식·트렌드 학습 (공용).

    python3 shared/skills/blog-study/scripts/study.py <설정.json>            # 오늘 몫 수집·측정·보고
    python3 shared/skills/blog-study/scripts/study.py <설정.json> --report   # 수집 없이 누적 요약만

설정(json) 키
  keywords            검색어 목록. 매일 앞에서부터 keywords_per_day개씩 돌아간다(state.json cursor).
  keywords_per_day    하루에 쓸 검색어 수
  per_keyword         검색어당 '관련도순' 상위 글 수
  per_keyword_recent  검색어당 '최근 1개월 최신순' 글 수 (트렌드용)
  clinic_hint         제목에 이 정규식이 맞으면 병원 글로 본다(우선 선택)
  clinic_only         true면 병원 글만 고른다(모자라면 그날은 적게 모은다)
  exclude_authors     학습에서 뺄 블로그 아이디(우리 병원 블로그 등)
  watch_blogs         지정 벤치마킹 블로그 [{"id": "블로그아이디", "name": "이름", "per_day": 5}].
                      매일 안 본 글을 최신순으로 per_day개 측정하고, 글 목록으로 발행 주기·글 종류를 본다.
                      --backfill N 을 붙이면 이번 실행만 블로그당 N개까지 측정(처음 등록할 때)
  data_dir, output_dir, summary_path, project_dir   설정 파일 기준 상대 경로

하는 일: 네이버 블로그 검색 → 안 본 글 선택 → 모바일 화면에서 형식 측정(measure.js) →
말투(문장 끝)·제목 낱말·이미지 모양·위치 계산 → 의료광고 검사기로 위험 표현 집계 →
data_dir/posts.jsonl 누적, output_dir/<날짜>.md(오늘), summary_path(누적·트렌드).
글 문장·이미지는 저장하지 않는다(첫·끝 문장 짧은 발췌만). 형식만 배운다.
"""
import html, json, os, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
NODE_PATH = os.environ.get("NODE_PATH") or str(ROOT / "projects" / "geo-doctor" / "node_modules")
sys.path.insert(0, str(ROOT / "shared" / "skills" / "medical-ad-blog" / "scripts"))
import medad_check  # noqa: E402

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def search(q, recent=False, pages=2):
    found, seen = [], set()
    for start in range(1, pages * 15, 15):
        params = {"ssc": "tab.blog.all", "query": q, "start": start}
        if recent:
            params.update({"nso": "so:dd,p:1m", "sm": "tab_opt"})
        u = "https://search.naver.com/search.naver?" + urllib.parse.urlencode(params)
        h = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=15).read().decode("utf-8", "ignore")
        for m in re.finditer(r'href="https://blog\.naver\.com/([A-Za-z0-9_\-]+)/(\d+)"[^>]*>(.*?)</a>', h, re.S):
            a, pid, t = m.groups()
            t = html.unescape(re.sub(r"<[^>]+>", "", t)).replace("새 창 열림", "").strip()
            if f"{a}/{pid}" in seen or not t:
                continue
            seen.add(f"{a}/{pid}")
            found.append({"author": a, "url": f"https://m.blog.naver.com/{a}/{pid}", "search_title": t, "rank": len(found) + 1})
        time.sleep(1.5)
    return found


def load_json(p, default):
    try:
        return json.loads(Path(p).read_text())
    except (OSError, json.JSONDecodeError):
        return default


def watch_list(bid, pages=3):
    """블로그 글 목록(제목·날짜). 글 본문은 열지 않는다."""
    items = []
    for page in range(1, pages + 1):
        u = f"https://m.blog.naver.com/api/blogs/{bid}/post-list?categoryNo=0&itemCount=30&page={page}"
        req = urllib.request.Request(u, headers={"User-Agent": UA, "Referer": f"https://m.blog.naver.com/{bid}"})
        try:
            d = json.loads(urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "ignore"))
        except (OSError, json.JSONDecodeError):
            break
        got = (d.get("result") or {}).get("items") or []
        for it in got:
            items.append({"logNo": str(it.get("logNo")), "date": date.fromtimestamp(int(it.get("addDate", 0)) / 1000).isoformat(),
                          "title": html.unescape(re.sub(r"<[^>]+>", "", it.get("titleWithInspectMessage") or it.get("title") or ""))})
        if len(got) < 30:
            break
        time.sleep(1)
    return items


# ---------- 글 하나에서 계산 ----------
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")


def tone(text):
    sents = [s.strip() for s in re.split(r"(?<=[.?!])\s+|\n", text) if len(s.strip()) > 4]
    end = Counter()
    for s in sents:
        s2 = re.sub(r"[\s.!?~^​)\]”\"']+$", "", s)
        if re.search(r"(니다|니까)$", s2): end["합니다체"] += 1
        elif re.search(r"요$", s2): end["해요체"] += 1
        elif re.search(r"(다|죠|지)$", s2): end["평서·기타"] += 1
    n = max(1, sum(end.values()))
    return {
        "endings": {k: round(v / n, 2) for k, v in end.items()},
        "question_rate": round(sum(1 for s in sents if s.endswith("?")) / max(1, len(sents)), 2),
        "emoji": len(EMOJI.findall(text)),
        "first_person": len(re.findall(r"저희|본원|원장|제가|한의사로서|의료진", text)),
        "sentences": len(sents),
    }


def image_profile(m):
    sizes = [s for s in m.get("img_sizes", []) if s.get("w")]
    shape = Counter()
    for s in sizes:
        r = s["h"] / s["w"]
        shape["세로형" if r > 1.15 else "정사각" if r > 0.87 else "가로형"] += 1
    comps = m.get("components", [])
    idx = [i for i, c in enumerate(comps) if c.startswith("image")]
    after_head = sum(1 for i in idx if i > 0 and comps[i - 1] in ("quotation", "horizontalLine"))
    return {"shape": dict(shape), "first_comp_is_image": bool(comps and comps[0].startswith("image")),
            "after_heading_rate": round(after_head / max(1, len(idx)), 2)}


def medad_counts(project, title, text):
    rules, taboo = medad_check.load_rules(project), medad_check.brand_taboo_phrases(project)
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
        f.write(f"# {title}\n\n{text}\n")
        path = f.name
    try:
        fs = medad_check.check_file(path, rules, [])
    finally:
        os.unlink(path)
    c = Counter()
    for x in fs:
        if x["id"] in ("S-marker", "N-realname", "BRAND-taboo"):
            continue  # 우리 병원 전용 규칙은 남의 글에 적용하지 않는다
        c[f'{x["severity"]}:{x["id"]}'] += 1
    return dict(c)


# ---------- 수집 ----------
def collect(cfg, base):
    data = base / cfg["data_dir"]
    data.mkdir(parents=True, exist_ok=True)
    state = load_json(data / "state.json", {"cursor": 0, "seen": []})
    seen = set(state["seen"])
    K, n = cfg["keywords"], cfg["keywords_per_day"]
    hint = re.compile(cfg.get("clinic_hint", "병원|의원"))
    excl = set(cfg.get("exclude_authors", []))
    today_kw = [K[(state["cursor"] + i) % len(K)] for i in range(n)]
    picks = []
    for q in today_kw:
        for mode, k in (("관련도", cfg.get("per_keyword", 5)), ("최신", cfg.get("per_keyword_recent", 0))):
            if not k:
                continue
            taken = {p["url"] for p in picks}
            cand = [c for c in search(q, recent=(mode == "최신")) if c["url"] not in seen and c["url"] not in taken and c["author"] not in excl]
            clinic = [c for c in cand if hint.search(c["search_title"])]
            chosen = (clinic + ([] if cfg.get("clinic_only") else [c for c in cand if c not in clinic]))[:k]
            for c in chosen:
                c.update(keyword=q, mode=mode, clinic_like=c in clinic)
            picks += chosen
            print(f"[검색] {q} ({mode}): 후보 {len(cand)}, 병원 글 {len(clinic)} → {len(chosen)}개")
    backfill = int(sys.argv[sys.argv.index("--backfill") + 1]) if "--backfill" in sys.argv else 0
    for w in cfg.get("watch_blogs", []):
        lst = watch_list(w["id"])
        snap = load_json(data / f"watch_{w['id']}.json", {})
        for it in lst:
            snap[it["logNo"]] = it
        (data / f"watch_{w['id']}.json").write_text(json.dumps(snap, ensure_ascii=False, indent=1))
        k = max(backfill, w.get("per_day", 5))
        new = [it for it in lst if f"https://m.blog.naver.com/{w['id']}/{it['logNo']}" not in seen][:k]
        for it in new:
            picks.append({"author": w["id"], "url": f"https://m.blog.naver.com/{w['id']}/{it['logNo']}", "search_title": it["title"], "rank": 0,
                          "keyword": f"[지정] {w.get('name', w['id'])}", "mode": "지정", "clinic_like": True, "posted": it["date"]})
        print(f"[지정] {w.get('name', w['id'])}: 목록 {len(lst)}개, 이번에 측정 {len(new)}개")
    with tempfile.TemporaryDirectory() as td:
        inp, outp = Path(td) / "in.json", Path(td) / "out.json"
        inp.write_text(json.dumps([p["url"] for p in picks]))
        subprocess.run(["node", str(HERE / "measure.js"), str(inp), str(outp)], check=True, env={**os.environ, "NODE_PATH": NODE_PATH})
        measured = json.loads(outp.read_text())
    day = date.today().isoformat()
    project = base / cfg.get("project_dir", ".")
    rows = []
    for p, m in zip(picks, measured):
        row = {"date": day, **p, **{k: v for k, v in m.items() if k not in ("text", "url")}}
        if m.get("ok"):
            row["tone"] = tone(m.get("text", ""))
            row["img"] = image_profile(m)
            row["medad"] = medad_counts(project, m.get("title", ""), m.get("text", ""))
        rows.append(row)
        seen.add(p["url"])
    with open(data / "posts.jsonl", "a") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    state["cursor"] = (state["cursor"] + n) % len(K)
    state["seen"] = sorted(seen)
    (data / "state.json").write_text(json.dumps(state, ensure_ascii=False, indent=1))
    print(f"[측정] {sum(1 for r in rows if r.get('ok'))}/{len(rows)}개 성공")
    return day, rows


# ---------- 요약 ----------
def q(vals, p):
    vals = sorted(vals)
    if not vals:
        return 0
    k = (len(vals) - 1) * p
    lo = int(k)
    return round(vals[lo] + (vals[min(lo + 1, len(vals) - 1)] - vals[lo]) * (k - lo), 2 if isinstance(vals[0], float) and vals[-1] <= 1 else None)


def rng(vals, unit=""):
    if not vals:
        return "-"
    f = (lambda x: f"{x:,}") if not isinstance(vals[0], float) else (lambda x: f"{x}")
    return f"{f(q(vals, .25))}~{f(q(vals, .75))}{unit} (중앙값 {f(q(vals, .5))})"


def pct(n, d):
    return f"{round(100 * n / d)}%" if d else "-"


RULE_NAME = {r["id"]: r["title"] for r in json.loads((ROOT / "shared/skills/medical-ad-blog/scripts/medad_rules.json").read_text())["pattern_rules"]}
RULE_NAME.update({"S07-sideeffect": "시술을 다루면서 부작용 정보 없음", "S-disclaimer": "개인차 고지 없음", "S-sources": "수치는 있는데 출처 없음"})
FONT_NAME = {"se-ff-": "기본서체", "se-ff-nanummaruburi": "나눔마루부리", "se-ff-nanumgothic": "나눔고딕", "se-ff-nanumbarungothic": "나눔바른고딕",
             "se-ff-nanummyeongjo": "나눔명조", "se-ff-nanumsquare": "나눔스퀘어", "se-ff-nanumsquareround": "나눔스퀘어라운드", "se-ff-nanumbarunpen": "나눔바른펜",
             "se-ff-nanumdasisijaghae": "나눔다시시작해", "se-ff-nanumgaram": "나눔가람", "se-ff-system": "기본서체"}
STOP = set("그리고 하지만 이유 방법 관리 치료 효과 위한 대한 있는 없는 어떻게 무엇 정리 알아보기 알아보세요 이것 경우 가지 필요 정보 함께 위해 때문 이후 이전 우리 저희".split())


def title_terms(rows):
    c = Counter()
    for r in rows:
        t = re.sub(r"[^\w가-힣 ]", " ", r.get("title", ""))
        for w in t.split():
            w = re.sub(r"(은|는|이|가|을|를|의|에|에서|으로|로|와|과|도|만|까지|부터|하는|하면|할|한|된|되는)$", "", w)
            if len(w) >= 2 and w not in STOP and not w.isdigit():
                c[w] += 1
    return c


def watch_section(cfg, data, allrows):
    out = []
    for w in cfg.get("watch_blogs", []):
        snap = list(load_json(data / f"watch_{w['id']}.json", {}).values())
        if not snap:
            continue
        name = w.get("name", w["id"])
        today = date.today()
        d30 = sum(1 for it in snap if it["date"] >= (today - timedelta(days=30)).isoformat())
        d90 = sum(1 for it in snap if it["date"] >= (today - timedelta(days=90)).isoformat())
        series = Counter()
        for it in snap:
            m = re.match(r"\s*[\[〔(]([^\]〕)]+)[\]〕)]", it["title"])
            series[re.sub(r"\s*[①-⑳\d]+$", "", m.group(1)).strip() if m else "정보 글(꺾쇠 없음)"] += 1
        mine = [r for r in allrows if r.get("ok") and r.get("author") == w["id"]]
        out += [f"## 지정 블로그: {name} ([블로그](https://m.blog.naver.com/{w['id']}))", "",
                f"- 글 목록 {len(snap)}개 기준 발행: 최근 30일 {d30}편, 최근 90일 {d90}편 (주 {round(d90 / 13, 1)}편)",
                "- 글 종류(제목 앞 꺾쇠 기준): " + ", ".join(f"{k} {v}" for k, v in series.most_common(6))]
        if mine:
            T = [r.get("tone") or {} for r in mine]
            out += [f"- 측정 {len(mine)}개: 글자 {rng([r['chars'] for r in mine], '자')}, 이미지 {rng([r['n_images'] for r in mine], '장')}, "
                    f"인용구 {rng([r['n_quote'] for r in mine], '개')}, 표 사용 {pct(sum(1 for r in mine if r['n_table']), len(mine))}, "
                    f"지도 {pct(sum(1 for r in mine if r['n_map']), len(mine))}",
                    "- 주된 말투: " + ", ".join(f"{k} {v}" for k, v in Counter(max(t['endings'], key=t['endings'].get) for t in T if t.get('endings')).most_common()),
                    "- 위험 표현이 잡힌 글: " + ", ".join(f"{RULE_NAME.get(k.split(':', 1)[1], k)} {v}" for k, v in Counter(k for r in mine for k in (r.get('medad') or {}) if k.startswith('block:')).most_common(5)) or "- 위험 표현: 없음"]
        out += ["", "### 최근 글 제목", ""] + [f"- {it['date']} {it['title'][:70]}" for it in sorted(snap, key=lambda x: x["date"], reverse=True)[:15]] + [""]
    return out


def summarize(rows, title, trend_rows=None, extra=None):
    R = [r for r in rows if r.get("ok")]
    n = len(R)
    if not n:
        return f"# {title}\n\n측정된 글이 없습니다.\n"
    chars = [r["chars"] for r in R]
    font, size, color, qs, md_posts, shape, end = Counter(), Counter(), Counter(), Counter(), Counter(), Counter(), Counter()
    for r in R:
        top = max(r["fonts"], key=r["fonts"].get) if r["fonts"] else "se-ff-"
        font[FONT_NAME.get(top, top.replace("se-ff-", ""))] += 1
        if r["sizes"]:
            size[max(r["sizes"], key=r["sizes"].get).replace("se-fs-", "").replace("fs", "") or "기본(15)"] += 1
        for c in r["colors"]:
            color[c] += 1
        for s in r["quote_styles"]:
            qs[s or "기본"] += 1
        for k in (r.get("medad") or {}):
            md_posts[k] += 1
        shape.update((r.get("img") or {}).get("shape", {}))
        e = (r.get("tone") or {}).get("endings", {})
        if e:
            end[max(e, key=e.get)] += 1
    T = [r.get("tone") or {} for r in R]
    I = [r.get("img") or {} for r in R]
    out = [f"# {title}", "",
           f"측정 글 {n}개 (병원 글로 보이는 것 {sum(1 for r in R if r.get('clinic_like'))}개, 최근 1개월 최신순 {sum(1 for r in R if r.get('mode') == '최신')}개). 문장·이미지는 저장하지 않고 형식만 셌습니다.", "",
           "## 구조", "", "| 항목 | 값 |", "|---|---|",
           f"| 글자 수(공백 제외) | {rng(chars, '자')} |",
           f"| 인용구 블록(소제목) 사용 | {pct(sum(1 for r in R if r['n_quote']), n)} · 글당 {rng([r['n_quote'] for r in R], '개')} · 모양 {', '.join(f'{k} {v}' for k, v in qs.most_common(4)) or '-'} |",
           f"| 큰 글씨 소제목 사용 | {pct(sum(1 for r in R if r['big_paras']), n)} |",
           f"| 표 | {pct(sum(1 for r in R if r['n_table']), n)} |",
           f"| 구분선 | {pct(sum(1 for r in R if r['n_hr']), n)} |",
           f"| 동영상 | {pct(sum(1 for r in R if r['n_video']), n)} |",
           f"| 지도(병원 위치) | {pct(sum(1 for r in R if r['n_map']), n)} |",
           f"| 다른 글·사이트 링크 카드 | {pct(sum(1 for r in R if r['n_link']), n)} |",
           f"| 태그 수 | {rng([len(r['tags']) for r in R], '개')} |",
           "", "## 말투", "", "| 항목 | 값 |", "|---|---|",
           f"| 주된 문장 끝 | {', '.join(f'{k} {v}개' for k, v in end.most_common())} |",
           f"| 질문 문장 비율 | {rng([t.get('question_rate', 0.0) for t in T])} |",
           f"| 이모지 쓴 글 | {pct(sum(1 for t in T if t.get('emoji')), n)} |",
           f"| '저희·본원·원장·의료진' 언급 | {rng([t.get('first_person', 0) for t in T], '번')} |",
           f"| 한 줄 평균 길이 | {rng([r['avg_line'] for r in R], '자')} |",
           f"| 가운데 정렬이 절반 넘는 글 | {pct(sum(1 for r in R if r['align'].get('center', 0) > sum(r['align'].values()) / 2), n)} |",
           f"| 굵은 글씨 | {rng([r['n_bold'] for r in R], '곳')} |",
           "", "## 글꼴·글자 크기·색", "",
           f"- 본문 글꼴: {', '.join(f'{k} {v}' for k, v in font.most_common(6))}",
           f"- 본문 글자 크기: {', '.join(f'{k} {v}' for k, v in size.most_common(5))}",
           f"- 글자 색(쓴 글 수): {', '.join(f'{k} {v}' for k, v in color.most_common(8)) or '-'}",
           "", "## 이미지", "", "| 항목 | 값 |", "|---|---|",
           f"| 이미지 수 | {rng([r['n_images'] for r in R], '장')} |",
           f"| 1,000자당 | {rng([round(1000 * r['n_images'] / max(1, r['chars'])) for r in R], '장')} |",
           f"| 모양(전체 장수) | {', '.join(f'{k} {v}' for k, v in shape.most_common())} |",
           f"| 글이 이미지로 시작 | {pct(sum(1 for i in I if i.get('first_comp_is_image')), n)} |",
           f"| 소제목·구분선 바로 뒤 이미지 비율 | {rng([i.get('after_heading_rate', 0.0) for i in I])} |",
           "", "## 의료광고 검사기로 본 위험 표현 (따라 하지 말 것)", "", "| 표현 | 쓴 글 | 비율 |", "|---|---|---|"]
    for k, v in md_posts.most_common(12):
        sev, rid = k.split(":", 1)
        out.append(f"| {'금지' if sev == 'block' else '확인'} · {RULE_NAME.get(rid, rid)} | {v}개 | {pct(v, n)} |")
    out += ["", "상위 노출 글이라도 이 표현은 의료법상 금지이거나 확인이 필요합니다. 형식만 배웁니다.", ""]
    if trend_rows is not None:
        recent = [r for r in trend_rows if r.get("ok")]
        old = [r for r in R if r not in recent]
        cr, co = title_terms(recent), title_terms(old)
        nr, no = max(1, len(recent)), max(1, len(old))
        rising = sorted(((w, c) for w, c in cr.items() if c >= 2), key=lambda x: -(x[1] / nr - co.get(x[0], 0) / no))[:15]
        out += ["## 트렌드: 최근 7일에 모은 최신 글 제목에서 늘어난 낱말", "",
                f"최근 7일 최신순 글 {len(recent)}개 vs 그 밖의 글 {len(old)}개. 낱말: 최근 비율 / 이전 비율", ""]
        out += [f"- {w}: {round(100 * c / nr)}% / {round(100 * co.get(w, 0) / no)}%" for w, c in rising] or ["- (아직 자료가 적어요)"]
        out += ["", "### 최근 최신 글 제목", ""] + [f"- {r['title'][:60]}  _({r['keyword']}, {r['date']})_" for r in recent[-25:]] + [""]
    out += extra or []
    out += ["## 소제목 예시 (인용구·큰 글씨에서)", ""]
    ex = [f"- {h}  _({r['keyword']})_" for r in R for h in (r["heads"] + r["big_paras"])[:3] if 6 <= len(h) <= 50]
    out += ex[:30] + ["", "## 첫 문장 유형을 볼 발췌 (짧게)", ""]
    out += [f"- {r['opening'][:90]}…  _({r['keyword']})_" for r in R[:12]]
    out += ["", "## 글별", "", "| 키워드 | 방식 | 제목 | 글자 | 이미지 | 인용구 | 표 | 금지 표현 |", "|---|---|---|---|---|---|---|---|"]
    for r in R:
        blocks = sum(1 for k in (r.get("medad") or {}) if k.startswith("block:"))
        out.append(f"| {r['keyword']} | {r.get('mode', '')} | [{r['title'].replace('|', '/')[:38]}]({r['url']}) | {r['chars']:,} | {r['n_images']} | {r['n_quote']} | {r['n_table']} | {blocks} |")
    return "\n".join(out) + "\n"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__); sys.exit(1)
    cfgp = Path(args[0]).resolve()
    cfg, base = json.loads(cfgp.read_text()), cfgp.parent
    out, summary, data = base / cfg["output_dir"], base / cfg["summary_path"], base / cfg["data_dir"]
    if "--report" not in sys.argv:
        day, rows = collect(cfg, base)
        out.mkdir(parents=True, exist_ok=True)
        (out / f"{day}.md").write_text(summarize(rows, f"블로그 학습 {day} (오늘 {len(rows)}개)"))
        print(f"[보고] {out / f'{day}.md'}")
    allrows = [json.loads(l) for l in open(data / "posts.jsonl")] if (data / "posts.jsonl").exists() else []
    cut = (date.today() - timedelta(days=7)).isoformat()
    recent = [r for r in allrows if r.get("mode") == "최신" and r["date"] >= cut]
    days = sorted({r["date"] for r in allrows})
    summary.parent.mkdir(parents=True, exist_ok=True)
    summary.write_text(summarize(allrows, f"{cfg.get('name', '블로그')} 학습 누적 요약 ({days[0] if days else '-'} ~ {days[-1] if days else '-'}, {len(allrows)}개)", trend_rows=recent, extra=watch_section(cfg, data, allrows)))
    print(f"[누적] {summary} ({len(allrows)}개)")


if __name__ == "__main__":
    main()
