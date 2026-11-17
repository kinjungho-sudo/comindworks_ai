# 홈페이지 칼럼 시안 F (블로그형): python3 src/build_homepage_blog.py
# 피드백(2026-11-17): "이것도 아니야. 블로그 좀 봐봐. 다른 블로그를 학습하고 시작해."
# 학습 근거: docs/research/2026-11-17_clinic-column-patterns.md
#   AI 답변이 인용한 병원 칼럼 페이지(유앤아이·스노우·참진·하이엔드 등)의 공통 틀:
#   좁은 한 단, 흰 바탕, 분류·날짜·제목·작성자, 한두 줄 요약, 대표 그림, 목차,
#   질문형 소제목 + 첫 문장 강조, 한두 문장 문단, 소제목마다 큰 그림 1장 + 설명 캡션,
#   단순 표, 상담 안내 상자, 참고 자료, 함께 읽으면 좋은 글.
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
POST = HERE.parent
OUT = POST / "homepage"
SITE = "OO피부과"
ILLU = "AI로 만든 일러스트이며 실제 환자가 아닙니다."


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" rel="noopener">\1</a>', s)
    s = re.sub(r"\[(원장님 확인|추후 기입): ([^\]]+)\]", r'<mark class="ph">\1: \2</mark>', s)
    s = re.sub(r"(?:\[\d+\])+", lambda m: '<sup class="cite">' + ",".join(
        f'<a href="#ref-{n}">{n}</a>' for n in re.findall(r"\d+", m[0])) + "</sup>", s)
    return s


def sentences(t):
    return [x for x in re.split(r"(?<=[.!?])\s+(?=\S)", t.strip()) if x]


def paras(text, lead=False):
    """원고 문단을 한두 문장씩 끊어 블로그 문단으로. lead=True면 첫 문장을 강조."""
    ss, out, i = sentences(text), [], 0
    if lead and ss:
        out.append(f'<p class="lead">{inline(ss[0])}</p>'); i = 1
    while i < len(ss):
        chunk = ss[i:i + 2]
        # 한 문장이 길면 혼자 둔다
        if len(chunk) == 2 and len(chunk[0]) + len(chunk[1]) > 150:
            chunk = chunk[:1]
        out.append(f"<p>{inline(' '.join(chunk))}</p>"); i += len(chunk)
    return "".join(out)


def figure(path, alt, cap, cls=""):
    return (f'<figure class="{cls}"><img src="../{path}" alt="{html.escape(alt)}" loading="lazy">'
            f'<figcaption>{cap}</figcaption></figure>')


# ---------- 원고 파싱 ----------
src = (POST / "enlarged-pores-column.md").read_text()
_, fm, body = src.split("---", 2)
meta = dict(re.findall(r'^(\w+): "?(.*?)"?$', fm, re.M))
body_part, ref_part = body.strip("\n").split("\n---\n", 1)
chunks = re.split(r"^## ", body_part, flags=re.M)
intro_lines = chunks[0].split("\n")
sec = {}
for ch in chunks[1:]:
    head, *rest = ch.split("\n")
    m = re.match(r"Q(\d+)\. (.+)", head)
    sec[int(m[1]) if m else 0] = {"q": m[2] if m else head, "lines": rest}
refs = [(int(n), inline(r)) for n, r in (l.split(". ", 1) for l in ref_part.split("\n") if re.match(r"\d+\. ", l))]
DISC = html.escape(next(l for l in ref_part.split("\n") if l.startswith("※")))
cards_md = (POST / "enlarged-pores.md").read_text()
card_alt = {int(n): a for a, n in re.findall(r"!\[(.*?)\]\(images/cards/pores-0(\d)\.png\)", cards_md)}


def render(lines, lead=True):
    """원고 한 섹션을 블로그 본문으로. 그림 줄은 건너뛰고(섹션별로 따로 배치), 나머지는 그대로."""
    out, i, first = [], 0, lead
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            i += 1; continue
        if ln.startswith("!["):
            i += 1
            if i < len(lines) and lines[i].startswith("*") and not lines[i].startswith("**"):
                i += 1
            continue
        if ln.startswith(">"):
            q = []
            while i < len(lines) and lines[i].startswith(">"):
                q.append(re.sub(r"^> ?", "", lines[i].rstrip())); i += 1
            title = re.sub(r"\*\*(.+)\*\*", r"\1", q[0])
            items = "".join(f"<li>{inline(x[2:])}</li>" for x in q[1:] if x.startswith("- "))
            rest = "".join(f"<p>{inline(x)}</p>" for x in q[1:] if x and not x.startswith("- "))
            out.append(f'<aside class="summary"><b>{html.escape(title)}</b>{"<ul>" + items + "</ul>" if items else ""}{rest}</aside>')
            continue
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            head, rows_ = rows[0], [r for r in rows[1:] if not re.fullmatch(r"[-: ]+", "".join(r))]
            th = "".join(f"<th>{inline(c)}</th>" for c in head)
            tr = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows_)
            out.append(f'<div class="tbl"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>')
            continue
        if ln.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                t = lines[i][2:].strip()
                m = re.match(r"\*\*(.+?)\*\*: ?(.*)", t)
                items.append(f"<li><b>{html.escape(m[1])}</b>{inline(m[2])}</li>" if m else f"<li>{inline(t)}</li>")
                i += 1
            out.append(f'<ul class="points">{"".join(items)}</ul>')
            continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r"(>|\||- |!\[)", lines[i]):
            para.append(lines[i].strip()); i += 1
        txt = " ".join(para)
        if re.fullmatch(r"\*\*.+\*\*", txt):  # 굵은 한 줄 = 강조 문장
            out.append(f'<p class="lead">{inline(txt[2:-2])}</p>'); first = False; continue
        out.append(paras(txt, lead=first)); first = False
    return "".join(out)


def card(n, cap):
    return figure(f"images/cards/pores-0{n}.png", card_alt[n], cap, "card")


# 섹션별 그림과 캡션 (참고 칼럼처럼 소제목마다 큰 그림 1장, 캡션은 그림 내용 설명)
FIG = {
    1: card(2, "눈에 보이는 모공은 얕게 파인 자리이고, 그 안에 맨눈에 안 보이는 입구가 있어요."),
    2: None,  # 표 뒤에 원고의 단면 그림(pore-types)을 원래 자리에 둔다
    3: None,
    4: card(4, "셀프 체크는 짐작일 뿐이에요. 원인은 진료로 확인해요."),
    5: card(6, "네 가지 방법 모두 모공을 없애지는 못해요. 덜 보이게 하는 쪽으로 기대치를 잡아요."),
    6: card(7, "흔한 반응부터 바로 연락해야 할 증상까지 순서대로 정리했어요."),
    7: card(5, "집에서 하는 기본 관리. 자세한 설명은 아래 목록에 있어요."),
    8: card(8, "상담 전에 메모해 두면 좋은 질문이에요."),
}


def section_html(n):
    s = sec[n]
    lines = s["lines"]
    body = render(lines)
    if n == 2:  # 원고 순서: 문단 → 표 → 표 설명 → 단면 그림
        body += figure("images/pore-types.png",
                       "피부 단면 두 칸 비교 그림: 왼쪽은 피지샘이 크고 모공 안에 피지가 찬 모습, 오른쪽은 주변 탄력 섬유가 성글어지며 모공 입구가 꺼진 모습",
                       "왼쪽: 피지 분비가 많은 경우 · 오른쪽: 모공 주변 탄력이 떨어진 경우<br>AI로 만든 이해용 그림이며 실제 피부 사진이 아닙니다.", "wide")
        # 원인 카드는 첫 문단 바로 뒤에
        cut = body.find('<div class="tbl">')
        body = body[:cut] + card(3, "모공이 넓어 보이는 주요 원인 세 가지와 더 도드라지게 하는 막힘·자극.") + body[cut:]
    elif n == 4:  # 노란 돌기 문단은 주의 상자로
        k = body.find("<p>모공처럼 보이는 <strong>작은 노란 돌기</strong>")
        if k < 0:
            k = body.find('<p class="lead">모공처럼')
        if k >= 0:
            body = body[:k] + '<div class="note"><b>잠깐, 모공이 아닐 수도 있어요</b>' + body[k:] + "</div>"
    fig = FIG.get(n)
    if fig and n != 2:
        # 첫 강조 문장 뒤에 그림 (참고 칼럼의 '답 → 그림 → 설명' 순서)
        k = body.find("</p>") + 4
        body = body[:k] + fig + body[k:]
    return (f'<section id="q{n}"><h2><span class="qn">Q{n}</span>{html.escape(s["q"])}</h2>{body}</section>')


# ---------- 상단 ----------
intro_text = " ".join(l.strip() for l in intro_lines if l.strip() and not re.match(r"(#|>|!\[|\*)", l))
summary_lines = []
on = False
for l in intro_lines:
    if l.startswith("> **핵심 정리**"):
        on = True; continue
    if on and l.startswith("> - "):
        summary_lines.append(l[4:])
    elif on and not l.startswith(">"):
        on = False
SUMMARY = "".join(f"<li>{inline(x)}</li>" for x in summary_lines)

TOC = "".join(f'<li><a href="#q{n}"><span>{n}</span>{html.escape(sec[n]["q"])}</a></li>' for n in range(1, 9))
SECTIONS = "".join(section_html(n) for n in range(1, 9))
END = render(sec[0]["lines"], lead=False)
REFS = "".join(f'<li id="ref-{n}">{t}</li>' for n, t in refs)

RELATED = [
    ("피부 정보", "여드름 흉터, 종류별 원인과 치료 선택지"),
    ("피부 정보", "기미와 잡티, 어떻게 구분하나요? 처음 알아보는 분을 위한 8가지 질문"),
    ("시술 정보", "겨울에 색소 레이저를 시작하기 전 알아둘 점"),
]
REL = "".join(f'<li><a href="#"><em>{c}</em>{t}</a></li>' for c, t in RELATED)

SHORT = {
    1: "피부 표면의 얕은 오목한 자리로, 그 안에 맨눈에 안 보이는 피지·땀 입구가 여러 개 있어요.",
    2: "피지 분비가 많거나, 모공 주변 탄력이 떨어졌거나, 모낭이 원래 커서예요. 막힘과 자극은 더 도드라지게 해요.",
    3: "사람과 피부 특성에 따라 달라요. 피부가 처지면 더 커 보일 수 있어요.",
    4: "여러 원인이 섞인 경우가 많아 진료로 피부를 보고 원인을 가려요.",
    5: "피지를 줄이거나, 피부 탄력을 돕거나, 모낭 크기를 줄이는 쪽을 겨냥하지만 효과는 크지 않다고 알려져 있어요.",
    6: "붉어짐·화끈거림이 흔하고, 색소침착이 생길 수 있으며, 드물게 오래가거나 심각한 경우도 있어요.",
    7: "순하게 세안하고, 모공을 막지 않는 제품과 자외선 차단제를 쓰고, 짜거나 뜯지 않아요.",
    8: "피부 처짐이 함께 신경 쓰이거나, 여드름이 계속되거나, 모공과 다른 돌기가 보이면 진료로 확인해요.",
}
LD = json.dumps({"@context": "https://schema.org", "@graph": [
    {"@type": "MedicalWebPage", "headline": meta["title"], "description": meta["description"],
     "datePublished": meta["date"], "dateModified": meta["lastUpdated"], "inLanguage": "ko",
     "about": {"@type": "MedicalCondition", "name": "넓은 모공"}, "lastReviewed": meta["lastUpdated"],
     "author": {"@type": "Organization", "name": SITE}},
    {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": sec[n]["q"],
     "acceptedAnswer": {"@type": "Answer", "text": SHORT[n]}} for n in range(1, 9)]},
    {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "홈"},
        {"@type": "ListItem", "position": 2, "name": "피부 칼럼"},
        {"@type": "ListItem", "position": 3, "name": "모공"}]}]}, ensure_ascii=False, indent=1)

CSS = """
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
:root{--ink:#222;--sub:#666;--mute:#999;--line:#e8e8e8;--soft:#f7f5f2;--acc:#c4553a;--acc2:#8a5a44;--note:#fff8e6}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:#fff;color:var(--ink);font-family:Pretendard,-apple-system,'Apple SD Gothic Neo',sans-serif;font-size:16px;line-height:1.85;word-break:keep-all}
a{color:inherit}
.gnb{border-bottom:1px solid var(--line);height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 28px}
.gnb b{font-size:18px;letter-spacing:-.02em}.gnb nav{display:flex;gap:26px;font-size:14px;color:var(--sub)}.gnb nav .on{color:var(--acc);font-weight:700}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
.crumb{font-size:13px;color:var(--mute);margin:28px 0 0}
.meta{margin-top:36px;font-size:13px;color:var(--mute)}.meta .cat{color:var(--acc);font-weight:700;margin-right:10px}
h1{font-size:30px;line-height:1.4;letter-spacing:-.03em;margin:10px 0 18px}
.by{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--sub);padding-bottom:22px;border-bottom:1px solid var(--line)}
.by i{width:34px;height:34px;border-radius:50%;background:var(--acc);color:#fff;font-style:normal;font-size:11px;font-weight:700;display:grid;place-items:center}
.by small{display:block;font-size:12px;color:var(--mute)}
.desc{color:#444;margin:24px 0}
figure{margin:34px 0}figure img{display:block;width:100%;height:auto;border-radius:6px}
figure.card img{max-width:440px;margin:0 auto;border-radius:10px;box-shadow:0 1px 0 var(--line),0 0 0 1px var(--line)}
figcaption{font-size:13px;color:var(--mute);text-align:center;margin-top:10px;line-height:1.6}
.summary{background:var(--soft);border-radius:8px;padding:22px 26px;margin:30px 0}
.summary b{display:block;font-size:15px;margin-bottom:8px}
.summary ul{margin:0;padding-left:18px}.summary li{margin:6px 0;font-size:15px}
.toc{border:1px solid var(--line);border-radius:10px;padding:22px 26px;margin:30px 0 56px}
.toc b{display:block;font-size:15px;border-left:3px solid var(--acc);padding-left:10px;margin-bottom:12px}
.toc ol{list-style:none;margin:0;padding:0}.toc li{border-top:1px dashed var(--line)}.toc li:first-child{border-top:0}
.toc a{display:flex;gap:12px;align-items:center;padding:9px 0;text-decoration:none;font-size:15px;color:#333}
.toc a span{flex:none;width:22px;height:22px;border-radius:4px;background:#fbefe9;color:var(--acc);font-size:12px;font-weight:700;display:grid;place-items:center}
section{padding-top:20px;margin-bottom:56px}
h2{font-size:22px;line-height:1.45;letter-spacing:-.02em;margin:0 0 22px;padding-bottom:14px;border-bottom:1px solid var(--line)}
h2 .qn{color:var(--acc);margin-right:8px}
p{margin:0 0 20px}
p.lead{font-weight:700;color:var(--acc2);font-size:17px}
sup.cite{font-size:11px;line-height:0;margin-left:1px}sup.cite a{color:var(--mute);text-decoration:none}
.tbl{overflow-x:auto;margin:26px 0}
table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;min-width:520px}
th{background:var(--soft);font-weight:700;border:1px solid var(--line);padding:11px 12px;text-align:center}
td{border:1px solid var(--line);padding:11px 12px;vertical-align:top}td:first-child{font-weight:700;white-space:nowrap}
ul.points{list-style:none;padding:0;margin:22px 0}
ul.points li{position:relative;padding:0 0 14px 18px;margin-bottom:14px;border-bottom:1px solid #f1f1f1}
ul.points li:last-child{border-bottom:0}
ul.points li:before{content:"";position:absolute;left:2px;top:12px;width:6px;height:6px;border-radius:50%;background:var(--acc)}
ul.points b{display:block;font-size:16px}
.note{background:var(--note);border-left:3px solid #e2a93b;padding:18px 22px;border-radius:0 6px 6px 0;margin:24px 0}
.note b{display:block;margin-bottom:6px}.note p{margin:0 0 8px}.note p:last-child{margin:0}
mark.ph{background:#fff1b8;padding:1px 4px;border-radius:3px;font-size:14px}
.cta{background:#faf3ef;border-radius:12px;padding:30px;margin:50px 0;text-align:center}
.cta h3{margin:0 0 6px;font-size:19px}.cta p{color:var(--sub);font-size:15px;margin:0 0 18px}
.cta a{display:inline-block;padding:11px 22px;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none;margin:4px}
.cta .pri{background:var(--acc);color:#fff}.cta .sec{border:1px solid var(--acc);color:var(--acc);background:#fff}
.refs{border-top:1px solid var(--line);padding-top:24px;margin-top:40px}
.refs b,.rel b{font-size:15px}.refs ol{padding-left:20px;font-size:13px;color:var(--sub);line-height:1.7}.refs li{margin:6px 0;word-break:break-all}
.disc{font-size:13px;color:var(--mute);background:var(--soft);padding:14px 18px;border-radius:6px;margin:24px 0}
.rel{margin:44px 0 80px}.rel ul{list-style:none;padding:0;margin:12px 0 0;border-top:2px solid var(--ink)}
.rel li{border-bottom:1px solid var(--line)}.rel a{display:block;padding:14px 4px;text-decoration:none;font-size:15px}
.rel em{font-style:normal;color:var(--acc);font-size:13px;font-weight:700;margin-right:10px}
footer{background:#f4f4f4;color:#888;font-size:13px;padding:30px;text-align:center}
.badge{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);background:#222;color:#fff;font-size:12px;padding:7px 14px;border-radius:999px;opacity:.85}
@media(max-width:640px){body{font-size:15.5px}h1{font-size:24px}h2{font-size:19px}.gnb nav{display:none}.summary,.toc{padding:18px 18px}figure.card img{max-width:100%}}
"""

PAGE = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(meta['title'])} | {SITE} 피부 칼럼</title>
<meta name="description" content="{html.escape(meta['description'])}">
<script type="application/ld+json">{LD}</script>
<style>{CSS}</style></head><body>
<header class="gnb"><b>{SITE}</b><nav><span>병원 소개</span><span>진료 안내</span><span class="on">피부 칼럼</span><span>예약·상담</span></nav></header>
<main class="wrap">
<div class="crumb">홈 › 피부 칼럼 › 모공</div>
<div class="meta"><span class="cat">피부 정보</span>{meta['date'].replace('-', '.')}</div>
<h1>{html.escape(meta['title'])}</h1>
<div class="by"><i>OO</i><div>블로그 편집팀<small>의학 감수 <mark class="ph">원장님 확인: 감수 표기 방식</mark> · 최종 검토 {meta['lastUpdated']} · 다음 검토 {meta['nextReview']}</small></div></div>
<p class="desc">{inline(intro_text)}</p>
{figure('images/pore-mirror.png', '수채화 일러스트: 욕실 거울 앞에서 코 옆 볼을 손가락으로 짚으며 피부결을 살펴보는 사람', ILLU)}
<aside class="summary"><b>이 글의 핵심</b><ul>{SUMMARY}</ul></aside>
<nav class="toc"><b>목차</b><ol>{TOC}</ol></nav>
{SECTIONS}
<section id="end"><h2>마무리하며</h2>{END}</section>
<div class="cta"><h3>내 모공은 어떤 원인일까요?</h3><p>진료로 피부 상태부터 확인해 보셔도 괜찮아요.</p>
<a class="pri" href="#">진료 예약</a><a class="sec" href="#">상담 문의</a></div>
<div class="refs"><b>참고 문헌</b><ol>{REFS}</ol></div>
<p class="disc">{DISC}<br>일반 정보 제공 목적의 글이며, AI의 도움을 받아 초안을 작성하고 사람이 검토했어요.</p>
<div class="rel"><b>함께 읽으면 좋은 글</b><ul>{REL}</ul></div>
</main>
<footer>{SITE} · <mark class="ph">추후 기입: 위치·진료 시간·연락처</mark></footer>
<div class="badge">시안 F · 블로그형 칼럼</div>
</body></html>"""

OUT.mkdir(exist_ok=True)
(OUT / "option-f-blog.html").write_text(PAGE)

# 검사기용 화면 글자
vis = re.sub(r"<script.*?</script>|<style.*?</style>", "", PAGE, flags=re.S)
vis = re.sub(r"<sup.*?</sup>", "", vis, flags=re.S)
vis = re.sub(r"<(br|/p|/li|/h\d|/figcaption|/div|/b)>", "\n", vis)
vis = html.unescape(re.sub(r"<[^>]+>", "", vis))
vis = "\n".join(l.strip() for l in vis.split("\n") if l.strip())
(HERE / "homepage-f-visible.md").write_text("# 시안 F 화면 글자 (검사용)\n\n" + vis + "\n")
print("ok", len(PAGE))
