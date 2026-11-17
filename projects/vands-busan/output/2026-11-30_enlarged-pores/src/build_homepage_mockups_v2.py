# 홈페이지 칼럼 시안 2차 (D 그림 가이드형, E 카드 슬라이드형): python3 build_homepage_mockups_v2.py
# 피드백(2026-11-17): "글이 너무 많고 책 같다. 이미지 추가, 쉽고 깔끔하게."
# → 화면에는 짧은 답·그림·아이콘만 보이고, 원고 전문은 접힌 '자세히 보기' 안에 HTML 글자로 둔다(AI·검색엔진은 읽음).
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
POST = HERE.parent
OUT = POST / "homepage"
SITE = "OO피부과"

# ---------- 원고 파싱 (1차 스크립트와 같은 규칙) ----------
def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" rel="noopener">\1</a>', s)
    s = re.sub(r"\[(원장님 확인|추후 기입): ([^\]]+)\]", r'<mark class="ph">\1: \2</mark>', s)
    s = re.sub(r"(?:\[\d+\])+", lambda m: '<sup class="cite">' + ",".join(
        f'<a href="#ref-{n}">{n}</a>' for n in re.findall(r"\d+", m[0])) + "</sup>", s)
    return s


def blocks(lines):
    out, i = [], 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            i += 1; continue
        if re.match(r"!\[", ln):  # 그림은 화면 쪽에서 따로 보여 주므로 접힌 본문에서는 뺀다
            i += 1
            if i < len(lines) and lines[i].startswith("*") and not lines[i].startswith("**"):
                i += 1
            continue
        if ln.startswith(">"):
            q = []
            while i < len(lines) and lines[i].startswith(">"):
                q.append(re.sub(r"^> ?", "", lines[i].rstrip())); i += 1
            out.append(f'<aside class="box">{blocks(q)}</aside>'); continue
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            head, body = rows[0], [r for r in rows[1:] if not re.fullmatch(r"[-: ]+", "".join(r))]
            th = "".join(f"<th>{inline(c)}</th>" for c in head)
            tr = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
            out.append(f'<div class="tbl"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'); continue
        if ln.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:].strip())}</li>"); i += 1
            out.append(f"<ul>{''.join(items)}</ul>"); continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r"(>|\||- |!\[)", lines[i]):
            para.append(lines[i].strip()); i += 1
        out.append(f"<p>{inline(' '.join(para))}</p>")
    return "".join(out)


src = (POST / "enlarged-pores-column.md").read_text()
_, fm, body = src.split("---", 2)
meta = dict(re.findall(r'^(\w+): "?(.*?)"?$', fm, re.M))
body_part, ref_part = body.strip("\n").split("\n---\n", 1)
chunks = re.split(r"^## ", body_part, flags=re.M)
sec = {}
for ch in chunks[1:]:
    head, *rest = ch.split("\n")
    m = re.match(r"Q(\d+)\. (.+)", head)
    sec[int(m[1]) if m else 0] = {"q": m[2] if m else head, "html": blocks(rest)}
refs = [(int(n), inline(r)) for n, r in (l.split(". ", 1) for l in ref_part.split("\n") if re.match(r"\d+\. ", l))]
REFS = "".join(f'<li id="ref-{n}">{t}</li>' for n, t in refs)
DISC = html.escape(next(l for l in ref_part.split("\n") if l.startswith("※")))
cards_md = (POST / "enlarged-pores.md").read_text()
card_alt = {int(n): a for a, n in re.findall(r"!\[(.*?)\]\(images/cards/pores-0(\d)\.png\)", cards_md)}

# 화면에 보이는 짧은 답 (원고에 있는 내용만 줄임, 새 주장 없음)
SHORT = {
    1: "구멍이라기보다 피부 표면의 얕은 오목한 자리예요. 그 안에 맨눈에 안 보이는 피지·땀 입구가 여러 개 있어요.",
    2: "피지가 많거나, 주변 탄력이 떨어졌거나, 모낭이 원래 커서예요. 막힘과 자극은 더 도드라지게 해요.",
    3: "사람마다 달라요. 40세 무렵부터 크기가 비슷하게 유지된 연구도 있지만, 피부가 처지면 더 커 보일 수 있어요.",
    4: "여러 원인이 섞인 경우가 많아요. 아래 셋 중 어디에 가까운지 떠올려 보세요. 정확한 건 진료로 확인해요.",
    5: "방법은 여러 가지지만, 모공을 줄이는 효과는 크지 않다고 알려져 있어요.",
    6: "효과와 부작용은 피부 상태와 시술 강도에 따라 사람마다 달라요.",
    7: "순하게 씻고, 막지 않고, 자외선을 막는 것. 이 기본부터 챙겨요.",
    8: "처짐이 함께 신경 쓰이거나, 여드름이 계속되거나, 모공과 달라 보이는 돌기가 있다면 확인해 보세요.",
}
LABEL = {1: "모공이란", 2: "원인", 3: "나이", 4: "셀프 체크", 5: "치료", 6: "부작용", 7: "집에서", 8: "진료·상담"}
CARD_FOR = {1: 2, 2: 3, 3: 3, 4: 4, 5: 6, 6: 7, 7: 5, 8: 8}

# ---------- 아이콘 (선 하나짜리 단순 SVG) ----------
def ic(d, extra=""):
    return f'<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{d}</g>{extra}</svg>'

I = {
    "drop": ic('<path d="M12 3.5c3.2 4.2 6 7.4 6 10.8a6 6 0 0 1-12 0c0-3.4 2.8-6.6 6-10.8z"/><path d="M9.5 15a2.6 2.6 0 0 0 2.5 2.4"/>'),
    "sag": ic('<path d="M3 7c4 0 4 4 9 4s5 5 9 5"/><path d="M3 12c4 0 4 3 9 3s5 3 9 3" opacity=".45"/>'),
    "ring": ic('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/>'),
    "clog": ic('<circle cx="12" cy="12" r="8"/><path d="M8.5 12h7M12 8.5v7"/>'),
    "wash": ic('<path d="M7 4.5c1.6 2.1 3 3.7 3 5.4a3 3 0 0 1-6 0c0-1.7 1.4-3.3 3-5.4zM16.5 9c1.6 2.1 3 3.7 3 5.4a3 3 0 0 1-6 0c0-1.7 1.4-3.3 3-5.4z"/><path d="M4 20h16"/>'),
    "bottle": ic('<path d="M10 3h4v3l2 2v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8l2-2z"/><path d="M8 12h8"/>'),
    "moon": ic('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'),
    "flask": ic('<path d="M9.5 3h5M10.5 3v6L5 19a1.3 1.3 0 0 0 1.1 2h11.8a1.3 1.3 0 0 0 1.1-2l-5.5-10V3"/><path d="M7.5 15h9"/>'),
    "sun": ic('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),
    "nohand": ic('<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'),
    "tube": ic('<path d="M8 3h8l-1 4H9z"/><path d="M9 7h6l1 13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/>'),
    "layers": ic('<path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M3 13l9 4.5 9-4.5" opacity=".5"/>'),
    "dots": ic('', '<g fill="currentColor"><circle cx="6" cy="6" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="18" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/></g>'),
    "needle": ic('<path d="M6 4v9M12 4v12M18 4v9"/><path d="M3 20c3-2 6-2 9 0s6 2 9 0"/>'),
}


def tile(icon, title, text, cls=""):
    return f'<div class="tile {cls}"><span class="tic">{I[icon]}</span><b>{title}</b><span>{text}</span></div>'


def img(path, alt, cls="", note=""):
    n = f'<figcaption>{note}</figcaption>' if note else ""
    return f'<figure class="{cls}"><img src="../{path}" alt="{html.escape(alt)}" loading="lazy">{n}</figure>'


ILLU = "AI로 만든 일러스트이며 실제 환자가 아닙니다."
DIAG = "AI로 만든 이해용 그림이며 실제 피부 사진이 아닙니다."
STILL = "AI로 만든 그림이에요."
HERO_ALT = "수채화 일러스트: 둥근 욕실 거울 앞에서 코 옆 볼을 손가락으로 가볍게 짚으며 피부결을 살펴보는 사람"
TYPES_ALT = "피부 단면 두 칸 비교 일러스트: 왼쪽은 커진 피지샘과 피지가 찬 둥근 모공, 오른쪽은 탄력 섬유가 성글어지고 피부가 처지며 모공 입구가 꺼진 모습"

# ---------- 질문별 시각 요소 ----------
VIS = {
    1: f"""<div class="scale"><div><i style="width:96px;height:96px"></i><b>0.25~0.5mm</b><span>거울로 보이는 모공</span></div>
<div><i style="width:16px;height:16px"></i><b>40~80μm</b><span>털·피지가 나오는 입구<br>(맨눈엔 안 보여요)</span></div>
<div><i style="width:4px;height:4px"></i><b>5~10μm</b><span>땀구멍</span></div></div>
<p class="fine">μm(마이크로미터)는 1mm의 1,000분의 1이에요. 원 크기는 대략적인 비율이에요.</p>""",
    2: f"""<div class="tiles t4">{tile("drop", "피지가 많아요", "번들거림이 잦은 편")}{tile("sag", "탄력이 떨어졌어요", "처지면 더 커 보여요")}{tile("ring", "모낭이 원래 커요", "타고난 체질")}{tile("clog", "막힘·자극", "블랙헤드, 뜨거운 물, 짜기")}</div>
{img("images/pore-types.png", TYPES_ALT, "wide", DIAG)}""",
    3: """<ol class="steps"><li><b>18~29세</b><span>연구에서 모공이 가장 작았던 나이</span></li>
<li><b>40세 무렵부터</b><span>크기가 더 늘지 않고 비슷하게 유지</span></li>
<li><b>처짐이 생기면</b><span>크기와 별개로 더 커 '보일' 수 있어요</span></li></ol>
<p class="fine">중국·프랑스·인도·일본 여성 2,585명 연구예요. 인도 여성은 나이가 들수록 커졌고, 한국인은 포함되지 않았어요.</p>""",
    4: f"""<div class="split">{img("images/raw/spot-check-ai.png", "수채화 그림: 손거울과 체크박스가 그려진 메모장, 연필", "still", STILL)}
<div class="checks"><div><span class="k">오후마다 코·이마가 번들거린다면</span><b>피지 쪽</b></div>
<div><span class="k">볼이 예전보다 처진 느낌이라면</span><b>탄력 쪽</b></div>
<div><span class="k">블랙헤드·여드름이 잦다면</span><b>막힘 쪽</b></div>
<p class="alert"><b>잠깐!</b> 3mm 안팎의 노란 돌기는 모공이 아닐 수 있어요. 다른 질환과 헷갈릴 수 있어 진료로 구분해 보세요.</p></div></div>""",
    5: f"""<div class="tiles t4">{tile("tube", "바르는 약", "비타민 A 계열 처방 약")}{tile("layers", "화학 박피", "피부 겉층을 벗겨 내요")}{tile("dots", "프랙셔널 레이저", "작은 점 모양으로 나눠 쏴요")}{tile("needle", "고주파 미세침", "가는 바늘로 열을 전달해요")}</div>
<p class="banner">그래서 목표는 <b>'없애기'</b>보다 <b>'덜 보이게'</b>가 현실적이에요.</p>""",
    6: """<div class="ladder"><div class="l1"><em>흔해요</em><b>붉어짐 · 화끈거림 · 붓기</b><span>대개 가라앉지만 몇 달 가기도 해요</span></div>
<div class="l2"><em>주의해요</em><b>색소침착</b><span>아시아인처럼 피부색이 어두울수록 위험이 커요</span></div>
<div class="l3"><em>드물어요</em><b>오래가거나 심각한 합병증</b><span>흉터 등. 위험 요인이 있으면 더 생기기 쉬워요</span></div>
<div class="l4"><em>바로 연락</em><b>진물 · 물집 · 점점 심해지는 붉어짐</b><span>색이 오래 짙어질 때도 바로 알려 주세요</span></div></div>""",
    7: f"""<div class="split">{img("images/raw/spot-homecare-ai.png", "수채화 그림: 수건, 세안 거품, 튜브와 스포이트 병", "still", STILL)}
<div class="tiles t2">{tile("wash", "하루 두 번 미지근한 물", "뜨거운 물·문지르기는 피해요")}{tile("bottle", "모공을 막지 않는 제품", "'논코메도제닉' 표시 확인")}{tile("sun", "자외선 차단제", "SPF 30 이상, 자외선 A·B 모두")}{tile("moon", "레티놀 화장품은 밤에", "임신·수유 중에는 쓰지 않아요")}{tile("flask", "여드름엔 살리실산 세안제", "막힌 모공에 도움이 될 수 있어요")}{tile("nohand", "짜거나 뜯지 않기", "오히려 더 도드라져요")}</div></div>
<p class="myth"><b>"뜨거운 물로 열고 찬물로 닫는다"?</b> 학회 안내에는 없는 말이에요. 뜨거운 물은 오히려 자극이 될 수 있어요.</p>""",
    8: f"""<div class="split">{img("images/raw/spot-consult-ai.png", "수채화 그림: 창가의 둥근 테이블과 의자 두 개, 펼친 노트", "still", STILL)}
<ol class="ask"><li>제 모공은 피지·탄력·모낭 크기·막힘 중 무엇의 영향이 큰가요?</li><li>집 관리로 충분한가요, 시술을 고려할 상태인가요?</li>
<li>권하시는 방법과 횟수·간격, 그 이유는요?</li><li>제 피부의 색소침착 위험은 어느 정도인가요?</li>
<li>붉어짐·각질은 얼마나 가고, 화장은 언제부터 되나요?</li><li>전체 비용은 어떻게 되나요?</li></ol></div>
<p class="fine center">메모해 오시면 상담이 한결 수월해져요.</p>""",
}

# ---------- 공통 ----------
def schema(faq=True):
    d = [{
        "@context": "https://schema.org", "@type": "MedicalWebPage", "headline": meta["title"],
        "description": meta["description"], "inLanguage": "ko", "datePublished": meta["date"],
        "dateModified": meta["lastUpdated"], "lastReviewed": meta["lastUpdated"],
        "author": {"@type": "Organization", "name": f"{SITE} 블로그 편집팀"},
        "reviewedBy": {"@type": "Person", "name": "[원장님 성함·전문의 표기]"},
        "publisher": {"@type": "MedicalClinic", "name": SITE, "url": "[홈페이지 주소]"},
        "about": {"@type": "MedicalCondition", "name": "넓은 모공 (enlarged facial pores)"},
        "citation": re.findall(r'href="(https?://[^"]+)"', REFS)}]
    if faq:
        d.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": sec[n]["q"], "acceptedAnswer": {"@type": "Answer", "text": SHORT[n]}} for n in range(1, 9)]})
    return "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in d)


FONTS = "".join(
    f'@font-face{{font-family:A2Z;font-weight:{w};src:url(../../../assets/fonts/a2z/A2Z-{n}.woff2) format("woff2")}}'
    for w, n in [(400, "4Regular"), (500, "5Medium"), (600, "6SemiBold"), (700, "7Bold"), (800, "8ExtraBold")])
BASE = FONTS + """
:root{--bg:#fff;--warm:#FBF4EF;--ink:#2E2522;--sub:#7D6F68;--line:#EFE4DC;--accent:#CF6A4F;--accent2:#F6DED3;--sage:#E4EEE6;--sageink:#3C6B55}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:A2Z,'Apple SD Gothic Neo',sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;word-break:keep-all;overflow-wrap:break-word}
img{max-width:100%;display:block}a{color:inherit}
.site{border-bottom:1px solid #eee}.site .in{max-width:1120px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:28px;font-size:14px;color:#666}
.site .logo{font-weight:800;font-size:18px;color:#222}.site nav{display:flex;gap:22px;flex-wrap:wrap}.site nav b{color:#222}
.site .tag{margin-left:auto;font-size:11px;color:#999;border:1px dashed #bbb;border-radius:4px;padding:3px 7px;white-space:nowrap}
.mock{position:fixed;left:50%;transform:translateX(-50%);bottom:12px;z-index:9;background:#222;color:#fff;font-size:12px;padding:6px 12px;border-radius:999px;opacity:.82;white-space:nowrap}
mark.ph{background:#FFF1B8;color:#6B5200;border-radius:3px;padding:1px 4px;font-size:.92em}
sup.cite{font-size:.68em}sup.cite a{text-decoration:none;color:var(--accent);font-weight:700}
figure{margin:0}figcaption{font-size:12px;color:var(--sub);margin-top:8px}
.ic{width:26px;height:26px}
details.more{margin-top:26px;border-top:1px dashed var(--line);padding-top:14px}
details.more summary{cursor:pointer;list-style:none;font-size:14px;font-weight:700;color:var(--sub);display:inline-flex;align-items:center;gap:6px}
details.more summary::-webkit-details-marker{display:none}
details.more summary::after{content:"+";font-size:18px;line-height:1;color:var(--accent)}details.more[open] summary::after{content:"−"}
.morebody{font-size:15.5px;line-height:1.85;color:#4a3f3a;margin-top:12px}.morebody p{margin:0 0 12px}.morebody ul{padding-left:20px}.morebody li{margin:5px 0}
.morebody .box{background:var(--warm);border-radius:10px;padding:12px 16px;margin:12px 0}
.tbl{overflow-x:auto;margin:14px 0}table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.6;min-width:520px}
th,td{text-align:left;vertical-align:top;padding:9px 10px;border-bottom:1px solid var(--line)}th{background:var(--warm)}
.refs{font-size:13px;line-height:1.7;color:var(--sub);padding-left:20px}.refs a{color:var(--sub)}.disc{font-size:12.5px;color:var(--sub);line-height:1.7}
.vis-disc{text-align:center;margin:16px 0 0}
.foot{background:#2b2b2b;color:#aaa;font-size:13px;text-align:center;padding:26px 16px 60px;margin-top:70px}
@media(max-width:700px){.site .tag{display:none}.site .in{gap:12px;flex-wrap:wrap}.site nav{gap:14px}}
"""
JS = """<script>document.querySelectorAll('sup.cite a').forEach(a=>a.addEventListener('click',()=>{const r=document.getElementById('refbox');if(r)r.open=true}));</script>"""


def page(v, name, css, main):
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(meta["title"])} | {SITE} 피부 칼럼</title><meta name="description" content="{html.escape(meta["description"])}">
<link rel="canonical" href="[칼럼 주소]">{schema()}<style>{BASE}{css}</style></head><body>
<header class="site"><div class="in"><span class="logo">{SITE}</span><nav><span>병원소개</span><span>진료안내</span><b>피부 칼럼</b><span>예약·상담</span></nav><span class="tag">홈페이지 기존 상단 메뉴 자리</span></div></header>
{main}<footer class="foot">{SITE} · 홈페이지 기존 하단 정보 자리</footer><div class="mock">시안 {v} · {name}</div>{JS}</body></html>"""


def more(n, label="자세히 보기"):
    return f'<details class="more"><summary>{label}</summary><div class="morebody">{sec[n]["html"]}</div></details>'


TRUST = (f'<span>작성 {html.escape(meta["author"])}</span><span>의학 감수 <mark class="ph">원장님 확인</mark></span>'
         f'<span>최종 검토 <time datetime="{meta["lastUpdated"]}">{meta["lastUpdated"].replace("-", ".")}</time></span><span>논문·학회 자료 {len(refs)}편 참고</span>')
REFBOX = f'<details class="more refbox" id="refbox"><summary>참고 문헌 {len(refs)}편 보기</summary><div class="morebody"><ol class="refs">{REFS}</ol><p class="disc">{DISC}<br>일반 정보 제공 목적의 글이며, AI의 도움을 받아 초안을 작성하고 사람이 검토했어요.</p></div></details>'
CTA = ('<div class="cta"><div><h3>내 모공은 어떤 원인일까요?</h3><p>피부 상태를 보고 원인과 관리 방향을 함께 정해요.</p>'
       '<mark class="ph">추후 기입: 위치·진료 시간·예약 방법·시술 후 이상 시 연락 방법</mark></div><a class="btn" href="#">상담 예약 안내</a></div>'
       f'<p class="disc vis-disc">{DISC}</p>')

# ---------- 시안 D: 그림 가이드형 ----------
nav = "".join(f'<a href="#q{n}">{LABEL[n]}</a>' for n in range(1, 9))
qs = ""
for n in range(1, 9):
    qs += (f'<section class="q" id="q{n}"><div class="in"><p class="qn">Q{n} · {LABEL[n]}</p><h2>{html.escape(sec[n]["q"])}</h2>'
           f'<p class="short">{html.escape(SHORT[n])}</p><div class="vis">{VIS[n]}</div>{more(n)}</div></section>')
D_CSS = """
.hero{background:var(--warm)}.hero .in{max-width:1120px;margin:0 auto;padding:56px 20px;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.hero figure img{border-radius:24px}.cat{display:inline-block;font-size:13px;font-weight:700;color:var(--accent);background:#fff;border-radius:999px;padding:6px 12px}
h1{font-size:clamp(28px,4vw,44px);line-height:1.3;font-weight:800;letter-spacing:-.03em;margin:16px 0 14px}
.hero .sub{font-size:18px;line-height:1.7;color:var(--sub);margin:0}
.trust{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--sub);margin-top:22px}
.glance{max-width:1120px;margin:-34px auto 0;padding:0 20px;position:relative}
.glance .g{background:#fff;border-radius:22px;box-shadow:0 12px 40px rgba(90,50,30,.10);display:grid;grid-template-columns:repeat(3,1fr)}
.glance .g div{padding:26px 28px}.glance .g div+div{border-left:1px solid var(--line)}
.glance em{font-style:normal;font-size:13px;font-weight:800;color:var(--accent)}.glance b{display:block;font-size:18px;line-height:1.5;margin-top:6px}
.qnav{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.94);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);margin-top:40px}
.qnav .in{max-width:1120px;margin:0 auto;padding:12px 20px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}
.qnav a{flex:none;text-decoration:none;font-size:14px;font-weight:600;padding:8px 14px;border-radius:999px;background:var(--warm);color:var(--ink)}.qnav a:hover{background:var(--accent);color:#fff}
.q{padding:72px 0;scroll-margin-top:60px}.q:nth-of-type(even){background:var(--warm)}
.q .in{max-width:880px;margin:0 auto;padding:0 20px}
.qn{font-size:13px;font-weight:800;color:var(--accent);letter-spacing:.04em;margin:0}
.q h2{font-size:clamp(24px,3.2vw,32px);line-height:1.4;font-weight:800;letter-spacing:-.025em;margin:8px 0 12px}
.short{font-size:18.5px;line-height:1.75;margin:0;color:#4a3f3a;max-width:720px}
.vis{margin-top:32px}
.tiles{display:grid;gap:14px}.t4{grid-template-columns:repeat(4,1fr)}.t2{grid-template-columns:1fr 1fr}
.tile{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px 18px;display:flex;flex-direction:column;gap:6px}
.q:nth-of-type(odd) .tile{background:var(--warm);border-color:transparent}
.tile .tic{width:46px;height:46px;border-radius:14px;background:var(--accent2);color:var(--accent);display:grid;place-items:center;margin-bottom:6px}
.tile b{font-size:16.5px;line-height:1.45}.tile span:last-child{font-size:14px;color:var(--sub);line-height:1.55}
.t2 .tile{flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px 12px;padding:14px 16px}.t2 .tile .tic{margin:0;width:40px;height:40px}.t2 .tile b{flex:1;font-size:15.5px}.t2 .tile span:last-child{flex-basis:100%;padding-left:52px;margin-top:-4px}
figure.wide{margin-top:26px}figure.wide img{border-radius:18px;background:#fff}
.scale{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:end}
.scale div{background:var(--warm);border-radius:18px;padding:24px 16px 18px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:200px;justify-content:flex-end}
.scale i{display:block;border-radius:50%;background:radial-gradient(circle at 40% 35%,#E9A58F,#C9654B);margin-bottom:auto;margin-top:auto}
.scale b{font-size:20px;color:var(--accent)}.scale span{font-size:14px;color:var(--sub);line-height:1.5}
.fine{font-size:13px;color:var(--sub);line-height:1.6;margin:12px 0 0}.center{text-align:center}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;counter-reset:s}
.steps li{position:relative;background:#fff;border-radius:18px;padding:22px 20px 20px}
.steps li::before{counter-increment:s;content:counter(s);display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;font-weight:800;font-size:14px;margin-bottom:10px}
.steps b{display:block;font-size:18px;margin-bottom:4px}.steps span{font-size:14.5px;color:var(--sub);line-height:1.55}
.split{display:grid;grid-template-columns:300px 1fr;gap:32px;align-items:center}
figure.still img{border-radius:22px}figure.still figcaption{text-align:center}
.checks{display:flex;flex-direction:column;gap:10px}
.checks>div{display:flex;justify-content:space-between;align-items:center;gap:14px;background:#fff;border-radius:14px;padding:16px 18px}
.checks .k{font-size:15.5px}.checks b{flex:none;background:var(--accent2);color:var(--accent);border-radius:999px;padding:5px 12px;font-size:14px}
.alert{background:#FFF7E0;border-radius:14px;padding:14px 18px;font-size:14.5px;line-height:1.6;margin:4px 0 0}.alert b{color:#9A6B00}
.banner{margin:22px 0 0;background:var(--ink);color:#fff;border-radius:16px;padding:20px 24px;font-size:18px;text-align:center}.banner b{color:#F5B9A5}
.ladder{display:grid;gap:10px}
.ladder div{display:grid;grid-template-columns:96px 1fr;column-gap:16px;align-items:center;background:#fff;border-radius:16px;padding:16px 18px;border-left:6px solid}
.ladder em{grid-row:span 2;font-style:normal;font-weight:800;font-size:14px;text-align:center;border-radius:999px;padding:6px 0}
.ladder b{font-size:16.5px}.ladder span{font-size:14px;color:var(--sub)}
.l1{border-color:#8FB59E!important}.l1 em{background:var(--sage);color:var(--sageink)}
.l2{border-color:#E8B65A!important}.l2 em{background:#FBEFD5;color:#94650F}
.l3{border-color:#E39A88!important}.l3 em{background:#F9E1DA;color:#A6452C}
.l4{border-color:#C84B3A!important}.l4 em{background:#C84B3A;color:#fff}
.myth{margin:18px 0 0;background:#fff;border-radius:14px;padding:14px 18px;font-size:14.5px;line-height:1.6}
.q:nth-of-type(odd) .myth{background:var(--warm)}
.ask{margin:0;padding:0;list-style:none;counter-reset:a;display:flex;flex-direction:column;gap:8px}
.ask li{counter-increment:a;background:#fff;border-radius:12px;padding:12px 16px 12px 50px;position:relative;font-size:15.5px;line-height:1.5}
.ask li::before{content:counter(a);position:absolute;left:14px;top:11px;width:24px;height:24px;border-radius:50%;background:var(--accent2);color:var(--accent);font-weight:800;font-size:13px;display:grid;place-items:center}
.end{max-width:880px;margin:0 auto;padding:60px 20px 0}
.end .close{font-size:18px;line-height:1.75;text-align:center;margin:0 0 30px}
.cta{background:var(--ink);color:#fff;border-radius:24px;padding:34px 36px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
.cta h3{margin:0 0 6px;font-size:22px}.cta p{margin:0 0 10px;color:#d9cfc6}.cta .btn{background:var(--accent);color:#fff;border-radius:999px;padding:14px 26px;font-weight:700;text-decoration:none;white-space:nowrap}
@media(max-width:860px){.hero .in{grid-template-columns:1fr;gap:28px;padding:34px 20px 60px}.glance .g{grid-template-columns:1fr}.glance .g div+div{border-left:0;border-top:1px solid var(--line)}
.t4{grid-template-columns:1fr 1fr}.split{grid-template-columns:minmax(0,1fr)}figure.still{max-width:260px;margin:0 auto}.steps,.scale{grid-template-columns:1fr}.scale div{min-height:0;flex-direction:row;justify-content:flex-start;text-align:left;gap:14px;padding:16px}.scale i{margin:0 10px 0 0;flex:none}.scale div>span{flex:1}
.cta{grid-template-columns:1fr}.q{padding:52px 0}.short{font-size:17px}}
@media(max-width:480px){.t4{grid-template-columns:1fr}.tile{flex-direction:row;flex-wrap:wrap;align-items:center;gap:2px 12px}.tile .tic{margin:0}.tile b{flex:1}.tile span:last-child{flex-basis:100%;padding-left:58px}.ladder div{grid-template-columns:1fr;row-gap:6px}.ladder em{grid-row:auto;width:90px}.checks>div{flex-direction:column;align-items:flex-start;gap:8px}}
"""
D_MAIN = f"""<section class="hero"><div class="in">{img("images/pore-mirror.png", HERO_ALT, "", ILLU)}
<div><span class="cat">피부 칼럼 · 모공</span><h1>{html.escape(meta["title"])}</h1>
<p class="sub">모공이 넓어 보이는 이유는 사람마다 달라요. 원인부터 알면 관리 방향이 보여요.</p><div class="trust">{TRUST}</div></div></div></section>
<div class="glance"><div class="g"><div><em>원인</em><b>피지 · 탄력 · 모낭 크기<br>여기에 막힘과 자극</b></div><div><em>관리</em><b>원인이 섞여 있어<br>원인에 맞춰 정해요</b></div><div><em>시술</em><b>줄이는 효과는 크지 않고<br>부작용도 알아 둬요</b></div></div></div>
<nav class="qnav"><div class="in">{nav}</div></nav>
{qs}
<div class="end"><p class="close">모공은 아주 흔한 피부 구조예요.<br>헷갈리신다면 피부 상태부터 확인해 보셔도 괜찮아요.</p>{CTA}{REFBOX}</div>"""
(OUT / "option-d-visual.html").write_text(page("D", "그림 가이드형", D_CSS, D_MAIN))

# ---------- 시안 E: 카드 슬라이드형 ----------
slides = "".join(f'<li>{img(f"images/cards/pores-0{k}.png", card_alt[k])}</li>' for k in range(1, 9))
acc = "".join(
    f'<details class="acc" id="q{n}"><summary><span class="n">Q{n}</span><span class="t">{html.escape(sec[n]["q"])}</span>'
    f'<img src="../images/cards/pores-0{CARD_FOR[n]}.png" alt="" loading="lazy"></summary>'
    f'<div class="ab"><p class="short">{html.escape(SHORT[n])}</p>{more(n, "원문 전체 읽기")}</div></details>' for n in range(1, 9))
E_CSS = """
body{background:#FBF6F2}
.top{max-width:1000px;margin:0 auto;padding:48px 20px 0;text-align:center}
.cat{font-size:13px;font-weight:700;color:var(--accent)}
h1{font-size:clamp(26px,3.6vw,38px);line-height:1.35;font-weight:800;letter-spacing:-.03em;margin:10px auto 12px;max-width:760px}
.sub{font-size:17px;color:var(--sub);margin:0}
.trust{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;font-size:13px;color:var(--sub);margin-top:16px}
.deck{margin:36px 0 0;position:relative}
.deck ul{list-style:none;margin:0;padding:6px max(20px,calc(50vw - 500px)) 22px;display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin}
.deck li{flex:none;width:300px;scroll-snap-align:center}.deck img{border-radius:18px;box-shadow:0 10px 30px rgba(90,50,30,.13)}
.hint{text-align:center;font-size:13px;color:var(--sub);margin:4px 0 0}
.arrows{display:flex;justify-content:center;gap:10px;margin-top:12px}.arrows button{width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:18px;cursor:pointer;color:var(--ink)}
.list{max-width:820px;margin:50px auto 0;padding:0 20px}
.list h2{font-size:22px;margin:0 0 6px}.list .lsub{color:var(--sub);font-size:15px;margin:0 0 18px}
.acc{background:#fff;border-radius:18px;margin:10px 0;overflow:hidden;scroll-margin-top:14px}
.acc summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:14px 16px 14px 20px}
.acc summary::-webkit-details-marker{display:none}
.acc .n{flex:none;font-weight:800;color:var(--accent);font-size:14px}.acc .t{flex:1;font-size:17px;font-weight:700;line-height:1.45}
.acc summary img{flex:none;width:52px;height:65px;object-fit:cover;border-radius:8px}
.acc[open] summary img{display:none}
.ab{padding:0 22px 22px 52px}.ab .short{font-size:17px;line-height:1.75;margin:0;background:var(--warm);border-radius:12px;padding:14px 16px}
.ab details.more{margin-top:14px}
.end{max-width:820px;margin:40px auto 0;padding:0 20px}
.cta{background:var(--ink);color:#fff;border-radius:22px;padding:30px 32px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center}
.cta h3{margin:0 0 6px;font-size:21px}.cta p{margin:0 0 10px;color:#d9cfc6}.cta .btn{background:var(--accent);color:#fff;border-radius:999px;padding:13px 24px;font-weight:700;text-decoration:none;white-space:nowrap}
@media(max-width:640px){.deck li{width:78vw}.ab{padding:0 16px 18px}.cta{grid-template-columns:1fr}.acc .t{font-size:16px}}
"""
E_JS = """<script>const u=document.querySelector('.deck ul');document.querySelectorAll('.arrows button').forEach(b=>b.onclick=()=>u.scrollBy({left:(b.dataset.d==='1'?1:-1)*318,behavior:'smooth'}));</script>"""
E_MAIN = f"""<div class="top"><span class="cat">피부 칼럼 · 모공</span><h1>{html.escape(meta["title"])}</h1>
<p class="sub">카드 8장으로 먼저 보고, 궁금한 질문만 펼쳐 보세요.</p><div class="trust">{TRUST}</div></div>
<div class="deck"><ul>{slides}</ul><div class="arrows"><button data-d="-1" aria-label="이전 카드">‹</button><button data-d="1" aria-label="다음 카드">›</button></div><p class="hint">옆으로 넘겨 보세요</p></div>
<div class="list"><h2>질문 8개로 자세히 보기</h2><p class="lsub">질문을 누르면 짧은 답이 열려요.</p>{acc}</div>
<div class="end">{CTA}{REFBOX}</div>{E_JS}"""
(OUT / "option-e-slides.html").write_text(page("E", "카드 슬라이드형", E_CSS, E_MAIN))

# 의료광고 검사용: 화면에 보이는 글자 + 접힌 원고는 이미 검사된 원고와 같으므로 보이는 부분만 뽑는다
def visible_text():
    parts = [meta["title"], "모공이 넓어 보이는 이유는 사람마다 달라요. 원인부터 알면 관리 방향이 보여요.",
             "피지 · 탄력 · 모낭 크기 여기에 막힘과 자극", "원인이 섞여 있어 원인에 맞춰 정해요", "줄이는 효과는 크지 않고 부작용도 알아 둬요",
             "카드 8장으로 먼저 보고, 궁금한 질문만 펼쳐 보세요.", "내 모공은 어떤 원인일까요? 피부 상태를 보고 원인과 관리 방향을 함께 정해요.",
             "모공은 아주 흔한 피부 구조예요. 헷갈리신다면 피부 상태부터 확인해 보셔도 괜찮아요.", html.unescape(DISC)]
    for n in range(1, 9):
        parts += [f"## {sec[n]['q']}", SHORT[n], re.sub(r"<[^>]+>", " ", VIS[n])]
    return "\n\n".join(re.sub(r"[ \t]+", " ", p).strip() for p in parts)


(HERE / "homepage-v2-visible.md").write_text("---\ntitle: 시안 D·E 화면 글자\n---\n\n" + visible_text() + "\n")
print("시안 D·E →", OUT)
