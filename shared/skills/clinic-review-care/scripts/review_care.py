#!/usr/bin/env python3
"""병원 리뷰 관리 — 리뷰를 분류하고(긴급·불만·질문·칭찬·확인 필요), 답글 초안을 의료법 기준으로 검사하고, 주간 보고서를 만든다.

사용 (병원 폴더에서):
    python3 review_care.py run review_watch.json          # 분류 + 답글 검사 + 보고서
    python3 review_care.py check "답글 문장"               # 답글 하나만 검사
    python3 review_care.py selftest                        # 회귀 시험

입력: review_watch.json의 input_dir 안 *.csv (UTF-8). 열: platform,date,rating,author,text,reply,reply_draft
    - reply: 이미 게시한 답글 (있으면 '답변 완료')
    - reply_draft: Claude가 쓴 답글 초안 (사람이 확인 후 게시)
리뷰는 사람이 플랫폼 관리자 화면에서 복사하거나 내보낸 파일로 넣는다. 이 도구는 리뷰 사이트를 긁지 않고, 답글을 올리지 않는다.
종료 코드: 답글 초안에 block이 있으면 1.
"""
import csv, hashlib, html, json, re, sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
LAW_JSON = HERE.parents[1] / "medical-ad-blog" / "references" / "law" / "medical_ad_law.json"
MEDAD_RULES = HERE.parents[1] / "medical-ad-blog" / "scripts" / "medad_rules.json"

# ── 분류 ─────────────────────────────────────────────────────────────
CATS = [  # (코드, 이름, 정규식) — 위에 있을수록 우선
    ("urgent", "긴급", r"부작용|화상|물집|흉터가?\s*(생|남)|염증|고름|감염|안\s*빠져|안\s*가라앉|계속\s*(아프|붓|빨개)|"
                       r"색소\s*침착|환불|소송|고소|신고|보건소|의료\s*사고|손해\s*배상|변호사|소비자원|피해\s*(를|봤|입)|응급"),
    ("complaint", "불만", r"불친절|무성의|기다|대기|늦게|늦어|강매|강요|권유가?\s*심|추가\s*(결제|비용)|비싸|바가지|"
                          r"효과\S*\s*(아직\s*)?(잘\s*)?(없|별로|모르)|별로|실망|최악|다시는|두\s*번\s*다시|설명\s*(이|도)?\s*(없|부족)|아팠|성의"),
    ("question", "질문", r"\?|궁금|문의|가능한가요|얼마|되나요|있나요|알려\s*주"),
    ("praise", "칭찬", r"친절|만족|좋아요|좋았|감사|추천|꼼꼼|깔끔|편안|자세히|또\s*(올|갈|방문)"),
]
PII = re.compile(r"01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}|\d{6}\s*-\s*[1-4]\d{6}|[\w.+-]+@[\w-]+\.[\w.]+")


def classify(r):
    text = r["text"]
    rating = float(r["rating"]) if str(r.get("rating", "")).strip() else None
    cat = next((c for c, _, p in CATS if re.search(p, text)), "other")
    if cat == "praise" and rating is not None and rating <= 2:
        cat = "complaint"
    if cat == "other" and rating is not None:
        cat = "complaint" if rating <= 2 else "praise" if rating >= 4 else "other"
    flags = []
    if PII.search(text):
        flags.append("리뷰에 연락처·개인정보 노출 → 플랫폼에 가림 요청")
    if rating is not None and rating <= 2 and len(re.sub(r"\s", "", text)) < 15:
        flags.append("짧은 저평점 → 실제 내원 여부 확인 (허위면 정보통신망법 제44조의2 삭제·임시조치 요청 검토)")
    if re.search(r"다른\s*(병원|곳|데)\s*(가세요|추천)|○○\s*(피부과|의원)", text):
        flags.append("다른 병원 유도 문구 → 경쟁 업체 의심 시 내원 기록 확인")
    return cat, rating, flags


# ── 답글 검사 ─────────────────────────────────────────────────────────
REPLY_RULES = [
    # (id, 심각도, 제목, 정규식, 근거 키, 고치는 법)
    ("RP19-record", "block", "진료 기록·내원 사실을 드러냄",
     r"(진료|시술|상담)\s*기록|차트|기록을?\s*(확인|보니|살펴)|내원\s*(하신|했던|일)|방문\s*하신\s*날|\d+\s*월\s*\d+\s*일|"
     r"받으신\s*\S*\s*(시술|치료|레이저|주사)|(시술|치료|처방|진단)\s*(받으신|하신|드린|해\s*드린)|처방(해|하)|진단(명|을\s*받)",
     ["법19-1"], "리뷰에 쓴 내용 밖의 진료 정보(시술명·날짜·기록·진단)를 답글에 쓰지 않는다. '말씀 주신 불편'처럼 쓴다"),
    ("RP19-name", "block", "환자를 알아볼 수 있는 정보",
     r"(?:^|[^가-힣])(?!원장|선생|고객|실장|팀장|상담|간호|의사|여러|모든)[가-힣]{2,3}님\s*(께서|은|이|의)|성함|연락처를|전화번호로|010", ["법19-1"],
     "닉네임 외 이름·연락처를 쓰지 않는다. 연락은 '병원 대표번호로 연락 주시면'으로"),
    ("RP27-offer", "block", "공개 답글에서 금품·할인·무료 제안",
     r"할인|무료|쿠폰|적립|포인트|사은품|선물|보상\s*(해|을)|환불\s*(해\s*드|처리\s*해\s*드|도와)|재시술|다음\s*(방문|내원)\s*(시|때)\s*\S*(혜택|서비스)|서비스로",
     ["법27-3", "법56-2-13"], "보상·환불은 공개 답글에서 약속하지 않고 개별 연락으로 옮긴다"),
    ("RP56-promo", "warn", "답글이 광고처럼 읽힘",
     r"이벤트|예약\s*(은|하세요|주세요)|많은\s*분(들)?(이|께서)\s*(만족|찾)|다른\s*분들도|효과(를|가)\s*(보|좋)|추천\s*(드려|합니다)|저희\s*병원만",
     ["법56-2-2", "법56-2-8"], "감사·사과·안내만 쓴다. 시술 홍보·효과·예약 유도는 빼고, 받은 칭찬을 홍보에 쓰지 않는다"),
    ("RP-argue", "warn", "공개 다툼·위협",
     r"사실이\s*아닙|사실과\s*다르|거짓|허위|법적\s*(조치|대응)|고소|신고\s*하겠|명예\s*훼손|악의적", ["망44의2-1", "망70-1"],
     "공개 답글에서 반박·위협하지 않는다. 허위가 확실하면 답글 대신 플랫폼에 삭제·임시조치 요청"),
]
MEDAD_REUSE = {"R08-superlative", "R02-certain-effect", "R04-compare", "R05-defame", "R07-no-sideeffect", "R13-discount"}
PRIVATE = re.compile(r"연락|전화|대표\s*번호|문의\s*(주|해)|직접\s*(말씀|확인)|개별")


def load_law():
    try:
        return json.loads(LAW_JSON.read_text(encoding="utf-8"))["articles"]
    except Exception:
        return {}


LAW = load_law()


def medad_rules():
    try:
        rules = json.loads(MEDAD_RULES.read_text(encoding="utf-8"))["pattern_rules"]
        return [r for r in rules if r["id"] in MEDAD_REUSE]
    except Exception:
        return []


MEDAD = medad_rules()


def cite(keys):
    out = []
    for k in keys:
        a = LAW.get(k)
        if a:
            t = a["text"].split("\n")[0]
            out.append(f"{a['label']}: {t[:100]}{'…' if len(t) > 100 else ''}")
    return out


def check_reply(text, cat=None):
    finds = []
    for rid, sev, title, pat, keys, fix in REPLY_RULES:
        m = re.search(pat, text)
        if m:
            finds.append({"id": rid, "severity": sev, "title": title, "hit": m.group(0), "fix": fix, "cite": cite(keys)})
    for r in MEDAD:
        if r["id"] == "R13-discount" and any(f["id"] == "RP27-offer" for f in finds):
            continue
        exc = [re.compile(x) for x in r.get("exceptions", [])]
        for pat in r["patterns"]:
            m = re.search(pat, text)
            if m and not any(x.search(text) for x in exc):
                finds.append({"id": r["id"], "severity": r["severity"], "title": r["title"], "hit": m.group(0),
                              "fix": "의료광고 금지 표현. 빼거나 낮춘다", "cite": cite(r.get("cite", []))})
                break
    if cat in ("urgent", "complaint") and not PRIVATE.search(text):
        finds.append({"id": "RP-private", "severity": "warn", "title": "개별 연락 안내 없음", "hit": "",
                      "fix": "불편·부작용 리뷰는 '병원 대표번호로 연락 주시면 원장님이 직접 확인하겠습니다'처럼 개별 창구로 옮긴다",
                      "cite": []})
    if len(text) > 400:
        finds.append({"id": "RP-long", "severity": "warn", "title": "답글이 김 (400자 넘음)", "hit": "", "fix": "3~5문장으로 줄인다", "cite": []})
    return finds


# ── 실행 ─────────────────────────────────────────────────────────────
def rid(r):
    return hashlib.sha1("|".join([r.get("platform", ""), r.get("date", ""), r.get("author", ""), r["text"][:200]]).encode()).hexdigest()[:10]


def load_reviews(folder):
    rows, seen = [], set()
    for p in sorted(Path(folder).glob("*.csv")):
        with open(p, encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                r = {k.strip(): (v or "").strip() for k, v in r.items() if k}
                if not r.get("text"):
                    continue
                r["id"] = rid(r)
                if r["id"] in seen:
                    continue
                seen.add(r["id"])
                r["source_file"] = p.name
                rows.append(r)
    return rows


def analyze(rows, today):
    for r in rows:
        r["cat"], r["rating_num"], r["flags"] = classify(r)
        r["answered"] = bool(r.get("reply"))
        target = r.get("reply_draft") or ("" if r["answered"] else None)
        r["draft_check"] = check_reply(r["reply_draft"], r["cat"]) if r.get("reply_draft") else []
        r["posted_check"] = check_reply(r["reply"], r["cat"]) if r.get("reply") else []
        try:
            r["age"] = (today - datetime.strptime(r["date"][:10], "%Y-%m-%d").date()).days
        except ValueError:
            r["age"] = None
    return rows


def esc(s):
    return html.escape(str(s))


CAT_NAME = {c: n for c, n, _ in CATS} | {"other": "기타"}
CAT_ORDER = ["urgent", "complaint", "question", "praise", "other"]
STOP = set("너무 정말 진짜 그리고 그냥 조금 좀 있어요 했어요 합니다 같아요 이번 처음 병원 피부과 원장님 선생님 시술 받았는데 받고 해서 해주셔서 주셔서 좋았어요 감사합니다".split())


def render(cfg, rows, today):
    since = today - timedelta(days=cfg.get("report_days", 7))
    recent = [r for r in rows if r["age"] is not None and r["age"] <= cfg.get("report_days", 7)]
    rated = [r["rating_num"] for r in rows if r["rating_num"] is not None]
    rated_recent = [r["rating_num"] for r in recent if r["rating_num"] is not None]
    unanswered = [r for r in rows if not r["answered"]]
    urgent_open = [r for r in rows if r["cat"] == "urgent" and not r["answered"]]
    by_month = defaultdict(list)
    for r in rows:
        if r["rating_num"] is not None and r["date"][:7]:
            by_month[r["date"][:7]].append(r["rating_num"])
    by_plat = defaultdict(Counter)
    for r in rows:
        by_plat[r.get("platform") or "미표기"][r["cat"]] += 1
    words = Counter()
    for r in rows:
        if r["cat"] in ("complaint", "urgent"):
            words.update(w for w in re.findall(r"[가-힣]{2,}", r["text"]) if w not in STOP)

    def kpi(label, val, sub=""):
        return f'<div class="kpi"><div class="kl">{label}</div><div class="kv">{val}</div><div class="ks">{sub}</div></div>'

    def checks(fs):
        if not fs:
            return '<span class="ok">검사 통과</span>'
        return "".join(f'<div class="f {f["severity"]}"><b>{"고쳐야 함" if f["severity"] == "block" else "확인"}</b> {esc(f["title"])}'
                       f'{(" — 「" + esc(f["hit"]) + "」") if f["hit"] else ""}<div class="fx">{esc(f["fix"])}</div>'
                       + "".join(f'<div class="cite">{esc(c)}</div>' for c in f["cite"]) + "</div>" for f in fs)

    def card(r):
        star = f'★{r["rating_num"]:g}' if r["rating_num"] is not None else "별점 없음"
        flags = "".join(f'<div class="flag">⚑ {esc(x)}</div>' for x in r["flags"])
        body = f'<div class="rv">{esc(r["text"])}</div>{flags}'
        if r.get("reply"):
            body += f'<div class="rp"><span class="lab">게시한 답글</span>{esc(r["reply"])}{checks(r["posted_check"])}</div>'
        if r.get("reply_draft"):
            body += f'<div class="rp draft"><span class="lab">답글 초안 (확인 후 게시)</span>{esc(r["reply_draft"])}{checks(r["draft_check"])}</div>'
        elif not r["answered"]:
            body += '<div class="rp none">답글 초안 없음 — "리뷰 답글 써줘"로 요청</div>'
        return (f'<article class="card c-{r["cat"]}"><header><span class="tag t-{r["cat"]}">{CAT_NAME[r["cat"]]}</span>'
                f'<span>{esc(r.get("platform", ""))}</span><span>{esc(r["date"])}</span><span>{star}</span>'
                f'<span class="who">{esc(r.get("author", ""))}</span></header>{body}</article>')

    months = sorted(by_month)[-6:]
    trend = "".join(
        f'<div class="bar"><div class="bl">{m}</div><div class="bt"><div class="bf" style="width:{sum(by_month[m]) / len(by_month[m]) / 5 * 100:.0f}%"></div></div>'
        f'<div class="bv">{sum(by_month[m]) / len(by_month[m]):.2f} ({len(by_month[m])}건)</div></div>' for m in months)
    plat_rows = "".join(f'<tr><td>{esc(p)}</td>' + "".join(f"<td>{c[k]}</td>" for k in CAT_ORDER) + f"<td>{sum(c.values())}</td></tr>"
                        for p, c in sorted(by_plat.items()))
    draft_block = sum(any(f["severity"] == "block" for f in r["draft_check"]) for r in rows)
    sections = []
    for cat in CAT_ORDER:
        items = sorted([r for r in rows if r["cat"] == cat], key=lambda r: (r["answered"], -(r["age"] is None), r["age"] or 0))
        if items:
            sections.append(f'<h2>{CAT_NAME[cat]} <small>{len(items)}건 · 미답변 {sum(not r["answered"] for r in items)}</small></h2>'
                            + "".join(card(r) for r in items))
    css = """
:root{--bg:#faf8f5;--fg:#24211d;--mute:#776f66;--line:#e6dfd6;--card:#fff;--urgent:#b3261e;--complaint:#b0651a;--question:#2f5f8f;--praise:#3d7a4f;--other:#777;--ok:#2e7d4f;--warnbg:#fff6e5;--blockbg:#fdecea}
@media (prefers-color-scheme:dark){:root{--bg:#171513;--fg:#ece6de;--mute:#a89f94;--line:#3a342d;--card:#221f1b;--warnbg:#3a2f1a;--blockbg:#3d1f1c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 -apple-system,"Apple SD Gothic Neo","Pretendard",sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 60px}h1{font-size:22px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 10px;border-bottom:1px solid var(--line);padding-bottom:6px}h2 small{color:var(--mute);font-weight:400;font-size:13px}
.note{color:var(--mute);font-size:13px}.warnbox{background:var(--warnbg);border-radius:8px;padding:10px 14px;margin:12px 0;font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0}.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}
.kl{font-size:12px;color:var(--mute)}.kv{font-size:24px;font-weight:700}.ks{font-size:12px;color:var(--mute)}
table{border-collapse:collapse;width:100%;font-size:13px;background:var(--card)}td,th{border:1px solid var(--line);padding:6px 8px;text-align:center;white-space:nowrap}th:first-child,td:first-child{text-align:left}
.tw{overflow-x:auto}.bar{display:grid;grid-template-columns:70px 1fr 110px;gap:8px;align-items:center;font-size:13px;margin:4px 0}.bt{background:var(--line);height:10px;border-radius:5px}.bf{background:var(--praise);height:10px;border-radius:5px}
.card{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--other);border-radius:8px;padding:12px 14px;margin:10px 0}
.c-urgent{border-left-color:var(--urgent)}.c-complaint{border-left-color:var(--complaint)}.c-question{border-left-color:var(--question)}.c-praise{border-left-color:var(--praise)}
.card header{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--mute);margin-bottom:6px}.tag{color:#fff;border-radius:4px;padding:0 6px;font-weight:600}
.t-urgent{background:var(--urgent)}.t-complaint{background:var(--complaint)}.t-question{background:var(--question)}.t-praise{background:var(--praise)}.t-other{background:var(--other)}
.rv{white-space:pre-wrap}.rp{margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--bg);white-space:pre-wrap;font-size:14px}.rp .lab{display:block;font-size:11px;color:var(--mute)}.rp.none{color:var(--mute);font-size:13px}
.f{margin-top:6px;padding:6px 8px;border-radius:6px;font-size:12px;white-space:normal}.f.block{background:var(--blockbg)}.f.warn{background:var(--warnbg)}.fx{color:var(--mute)}.cite{color:var(--mute);font-size:11px}
.ok{display:block;margin-top:4px;color:var(--ok);font-size:12px}.flag{margin-top:6px;font-size:12px;color:var(--complaint)}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:2px 10px;font-size:13px}
"""
    avg = f"{sum(rated) / len(rated):.2f}" if rated else "-"
    avg_r = f"{sum(rated_recent) / len(rated_recent):.2f}" if rated_recent else "-"
    doc = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>리뷰 관리 보고서</title><style>{css}</style></head><body><main>
<h1>리뷰 관리 보고서 — {esc(cfg.get('client_label', ''))}</h1>
<div class="note">{today.isoformat()} 기준 · 최근 {cfg.get('report_days', 7)}일({since.isoformat()}~) · 입력 파일 {len({r['source_file'] for r in rows})}개</div>
<div class="warnbox">내부용. 리뷰 원문과 닉네임이 들어 있으니 외부로 보내지 않는다. 답글은 사람이 플랫폼에서 직접 게시한다. 리뷰를 블로그·SNS·광고에 옮겨 싣지 않는다(의료법 제56조 제2항 제2호, 치료경험담).</div>
<div class="kpis">{kpi('전체 리뷰', len(rows), f'최근 {len(recent)}건')}{kpi('평균 별점', avg, f'최근 {avg_r}')}{kpi('미답변', len(unanswered), f'긴급 {len(urgent_open)}건')}{kpi('초안 수정 필요', draft_block, '답글 초안 block')}</div>
{('<h2>오늘 바로 할 일</h2>' + ''.join(f'<div class="flag">⚑ {esc(r["date"])} {esc(r.get("platform", ""))} — {esc(r["text"][:60])}… → 원장님 당일 확인, 공개 답글 전에 개별 연락</div>' for r in urgent_open)) if urgent_open else ''}
<h2>채널별 분류</h2><div class="tw"><table><tr><th>채널</th>{''.join(f'<th>{CAT_NAME[k]}</th>' for k in CAT_ORDER)}<th>합계</th></tr>{plat_rows}</table></div>
<h2>월별 평균 별점</h2>{trend or '<div class="note">별점 자료 없음</div>'}
<h2>불만·긴급 리뷰에 자주 나온 말</h2><div class="chips">{''.join(f'<span class="chip">{esc(w)} {n}</span>' for w, n in words.most_common(15)) or '<span class="note">없음</span>'}</div>
{''.join(sections)}
</main></body></html>"""
    return doc


def run(cfg_path):
    cfg_path = Path(cfg_path)
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    base = cfg_path.parent
    today = date.today()
    rows = analyze(load_reviews(base / cfg.get("input_dir", "data/reviews")), today)
    out = base / cfg.get("report_dir", "output/reviews")
    out.mkdir(parents=True, exist_ok=True)
    rep = out / f"{today.isoformat()}_review-report.html"
    rep.write_text(render(cfg, rows, today), encoding="utf-8")
    state = [{k: r[k] for k in ("id", "platform", "date", "rating_num", "cat", "answered", "flags")} |
             {"draft_block": [f["id"] for f in r["draft_check"] if f["severity"] == "block"]} for r in rows]
    (out / f"{today.isoformat()}_triage.json").write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")
    c = Counter(r["cat"] for r in rows)
    print(f"리뷰 {len(rows)}건 · " + " · ".join(f"{CAT_NAME[k]} {c[k]}" for k in CAT_ORDER if c[k]))
    print(f"미답변 {sum(not r['answered'] for r in rows)} · 긴급 미답변 {sum(r['cat'] == 'urgent' and not r['answered'] for r in rows)}")
    bad = [r for r in rows if any(f["severity"] == "block" for f in r["draft_check"])]
    for r in bad:
        print(f"  초안 block: {r['date']} {r.get('platform', '')} — " + ", ".join(f["title"] for f in r["draft_check"] if f["severity"] == "block"))
    print(f"보고서: {rep}")
    return 1 if bad else 0


def selftest():
    cases = [  # (답글, 리뷰 분류, 기대: B/W/P)
        ("소중한 말씀 감사합니다. 불편을 드려 죄송합니다. 병원 대표번호로 연락 주시면 원장님이 직접 확인하겠습니다.", "complaint", "P"),
        ("진료 기록을 확인해 보니 11월 3일 레이저 받으셨네요. 다시 내원해 주세요.", "complaint", "B"),
        ("다음 방문 시 할인해 드릴게요. 죄송합니다. 연락 주세요.", "complaint", "B"),
        ("환불 도와드리겠습니다. 연락 주세요.", "urgent", "B"),
        ("말씀하신 내용은 사실이 아닙니다. 법적 조치를 검토하겠습니다.", "complaint", "W"),
        ("좋게 봐 주셔서 감사합니다. 편하게 다녀가실 수 있도록 더 살피겠습니다.", "praise", "P"),
        ("감사합니다! 저희 병원은 부산 최고의 리프팅 효과를 자랑합니다.", "praise", "B"),
        ("감사합니다. 이벤트 중이니 예약하세요.", "praise", "W"),
        ("불편을 드려 죄송합니다.", "urgent", "W"),
        ("김민지님께서 남겨 주신 말씀 감사합니다.", "praise", "B"),
    ]
    rev = [("시술 후 물집이 생겼고 계속 아파요. 환불해 주세요", 1, "urgent"), ("대기가 너무 길었어요", 2, "complaint"),
           ("원장님이 꼼꼼하게 설명해 주셔서 좋았어요", 5, "praise"), ("주차 되나요?", None, "question"), ("별로", 1, "complaint")]
    miss = 0
    for text, cat, exp in cases:
        fs = check_reply(text, cat)
        got = "B" if any(f["severity"] == "block" for f in fs) else "W" if fs else "P"
        if got != exp:
            miss += 1
            print(f"MISS 답글 기대 {exp} → {got} | {text} | {[f['id'] for f in fs]}")
    for text, rating, exp in rev:
        got, _, _ = classify({"text": text, "rating": rating if rating is not None else ""})
        if got != exp:
            miss += 1
            print(f"MISS 분류 기대 {exp} → {got} | {text}")
    total = len(cases) + len(rev)
    print(f"정답 {total - miss}/{total}")
    return 1 if miss else 0


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    if argv[0] == "run" and len(argv) > 1:
        return run(argv[1])
    if argv[0] == "check" and len(argv) > 1:
        fs = check_reply(" ".join(argv[1:]), argv[argv.index("--cat") + 1] if "--cat" in argv else None)
        for f in fs:
            print(f"[{f['severity']}] {f['title']} {('「' + f['hit'] + '」') if f['hit'] else ''}\n   → {f['fix']}")
            for c in f["cite"]:
                print(f"     조문: {c}")
        print("검사 통과" if not fs else "")
        return 1 if any(f["severity"] == "block" for f in fs) else 0
    if argv[0] == "json" and len(argv) > 1:  # 앱용: 분석 결과를 JSON으로
        cfg_path = Path(argv[1]); cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        rows = analyze(load_reviews(cfg_path.parent / cfg.get("input_dir", "data/reviews")), date.today())
        keep = ("id", "platform", "date", "rating", "author", "text", "reply", "reply_draft", "cat", "rating_num",
                "flags", "answered", "draft_check", "posted_check", "age", "source_file")
        print(json.dumps([{k: r.get(k) for k in keep} for r in rows], ensure_ascii=False))
        return 0
    if argv[0] == "check-stdin":  # 앱용: 표준입력 {"text":…, "cat":…} → 검사 결과 JSON
        req = json.loads(sys.stdin.read())
        fs = check_reply(req.get("text", ""), req.get("cat"))
        print(json.dumps({"findings": fs, "block": any(f["severity"] == "block" for f in fs)}, ensure_ascii=False))
        return 0
    if argv[0] == "classify-stdin":  # 앱용: 표준입력 [{"text","rating"}] → 분류
        items = json.loads(sys.stdin.read())
        print(json.dumps([dict(zip(("cat", "rating_num", "flags"), classify(i))) for i in items], ensure_ascii=False))
        return 0
    if argv[0] == "selftest":
        return selftest()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
