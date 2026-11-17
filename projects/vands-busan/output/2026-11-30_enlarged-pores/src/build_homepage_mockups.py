# 홈페이지 칼럼 시안 3종 만들기: python3 build_homepage_mockups.py
# enlarged-pores-column.md(본문)와 enlarged-pores.md(카드 설명)를 읽어 ../homepage/ 에 HTML 3개를 쓴다.
# 본문은 모두 글자(HTML)로 넣는다. AI는 이미지 속 글자를 못 읽기 때문이다.
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
POST = HERE.parent
OUT = POST / "homepage"
OUT.mkdir(exist_ok=True)

SITE = "OO피부과"  # 실명 정책이 정해질 때까지 자리표시

# 각 질문의 짧은 답 (본문에 있는 내용만 줄여 씀, 새 주장 없음)
SHORT = {
    1: "구멍이라기보다 피부 표면의 얕은 함몰이에요. 거울로 보이는 모공은 0.25~0.5mm 정도이고, 그 안에 맨눈에 안 보이는 피지·땀 입구가 여러 개 있어요.",
    2: "피지 분비가 많거나, 모공 주변 탄력이 떨어졌거나, 모낭이 원래 큰 경우가 주된 원인이에요. 막힘과 자극은 모공을 더 커 보이게 해요.",
    3: "사람마다 달라요. 한 다국적 연구에서는 40세 무렵부터 크기가 비슷하게 유지된 경우가 많았지만, 피부가 처지면 더 커 보일 수 있어요.",
    4: "여러 원인이 섞인 경우가 많아 진료로 피부를 보고 가려요. 번들거림, 처짐, 블랙헤드·여드름 중 무엇이 신경 쓰이는지 떠올려 보면 짐작에 도움이 돼요.",
    5: "피지를 줄이거나, 피부 탄력을 돕거나, 모낭 크기를 겨냥해요. 다만 모공을 줄이는 효과는 크지 않다고 알려져 있어 '없애기'보다 '덜 보이게'로 기대치를 잡아요.",
    6: "붉어짐·화끈거림이 흔하고 색소침착이 생길 수 있어요. 드물게 오래가거나 심각한 합병증도 보고돼 있고, 피부 상태와 시술 강도에 따라 사람마다 달라요.",
    7: "하루 두 번 미지근한 물로 순하게 씻고, 모공을 막지 않는 제품과 자외선 차단제를 쓰고, 짜거나 뜯지 않는 것이 기본이에요.",
    8: "처짐이 함께 신경 쓰이거나, 여드름이 계속되거나, 노란 돌기처럼 모공과 달라 보이는 것이 있으면 진료로 확인해 보세요.",
}
CARD_FOR = {1: 2, 2: 3, 4: 4, 5: 6, 6: 7, 7: 5, 8: 8}  # 질문 번호 → 카드 번호 (시안 C)


# ---------- 마크다운 → HTML (이 원고에 쓰인 문법만) ----------
def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" rel="noopener">\1</a>', s)
    s = re.sub(r"\[(원장님 확인|추후 기입): ([^\]]+)\]", r'<mark class="ph">\1: \2</mark>', s)
    s = re.sub(r"(?:\[\d+\])+", lambda m: '<sup class="cite">' + ",".join(
        f'<a href="#ref-{n}">{n}</a>' for n in re.findall(r"\d+", m[0])) + "</sup>", s)
    return s


def img_path(src):
    return "../" + src


def blocks(lines):
    out, i = [], 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            i += 1
            continue
        m = re.match(r"!\[(.*?)\]\((.+?)\)", ln)
        if m:
            cap = ""
            if i + 1 < len(lines) and lines[i + 1].startswith("*") and not lines[i + 1].startswith("**"):
                cap = lines[i + 1].strip().strip("*")
                i += 1
            out.append(figure(m[2], m[1], cap))
            i += 1
            continue
        if ln.startswith(">"):
            q = []
            while i < len(lines) and lines[i].startswith(">"):
                q.append(re.sub(r"^> ?", "", lines[i].rstrip()))
                i += 1
            title = ""
            if q and re.fullmatch(r"\*\*(.+)\*\*", q[0].strip()):
                title = q.pop(0).strip("* ")
            out.append(f'<aside class="box"><p class="box-t">{html.escape(title)}</p>{blocks(q)}</aside>')
            continue
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, body = rows[0], [r for r in rows[1:] if not re.fullmatch(r"[-: ]+", "".join(r))]
            th = "".join(f"<th>{inline(c)}</th>" for c in head)
            tr = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
            out.append(f'<div class="tbl"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>')
            continue
        if ln.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:].strip())}</li>")
                i += 1
            out.append(f"<ul>{''.join(items)}</ul>")
            continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r"(>|\||- |!\[)", lines[i]):
            para.append(lines[i].strip())
            i += 1
        out.append(f"<p>{inline(' '.join(para))}</p>")
    return "".join(out)


def figure(src, alt, cap, cls=""):
    c = f"<figcaption>{html.escape(cap)}</figcaption>" if cap else ""
    return f'<figure class="{cls}"><img src="{img_path(src)}" alt="{html.escape(alt)}" loading="lazy">{c}</figure>'


# ---------- 원고 읽기 ----------
src = (POST / "enlarged-pores-column.md").read_text()
_, fm, body = src.split("---", 2)
meta = dict(re.findall(r'^(\w+): "?(.*?)"?$', fm, re.M))
lines = body.strip("\n").split("\n")

body_part, ref_part = "\n".join(lines).split("\n---\n", 1)
chunks = re.split(r"^## ", body_part, flags=re.M)
intro = chunks[0].split("\n")
sections = []
for ch in chunks[1:]:
    head, *rest = ch.split("\n")
    m = re.match(r"Q(\d+)\. (.+)", head)
    sections.append({"n": int(m[1]) if m else None, "q": m[2] if m else head, "lines": rest})

# 도입부: 첫 문단, 대표 그림, 핵심 정리를 따로 뽑는다 (작성 정보 상자는 바이라인으로 대체)
lead, hero, takeaways = [], None, []
i = 0
while i < len(intro):
    ln = intro[i]
    if ln.startswith("# ") or not ln.strip():
        i += 1
        continue
    if ln.startswith(">"):
        q = []
        while i < len(intro) and intro[i].startswith(">"):
            q.append(intro[i])
            i += 1
        if "핵심 정리" in q[0]:
            takeaways = [re.sub(r"^> ?", "", x) for x in q[1:]]
        continue
    m = re.match(r"!\[(.*?)\]\((.+?)\)", ln)
    if m:
        hero = (m[2], m[1], intro[i + 1].strip().strip("*"))
        i += 2
        continue
    lead.append(ln)
    i += 1

refs_lines = [l for l in ref_part.split("\n") if re.match(r"\d+\. ", l)]
refs = []
for l in refs_lines:
    n, rest = l.split(". ", 1)
    refs.append((int(n), inline(rest)))
disclaimer = next(l for l in ref_part.split("\n") if l.startswith("※"))

cards_md = (POST / "enlarged-pores.md").read_text()
card_alt = {int(n): a for a, n in re.findall(r"!\[(.*?)\]\(images/cards/pores-0(\d)\.png\)", cards_md)}

LEAD = blocks(lead)
TAKE = blocks(takeaways)
REFS = "".join(f'<li id="ref-{n}">{t}</li>' for n, t in refs)
BYLINE = (
    f'<span>작성 {html.escape(meta["author"])}</span>'
    f'<span>의학 감수 <mark class="ph">원장님 확인: 감수 표기 방식</mark></span>'
    f'<span>작성일 <time datetime="{meta["date"]}">{meta["date"].replace("-", ".")}</time></span>'
    f'<span>최종 검토 <time datetime="{meta["lastUpdated"]}">{meta["lastUpdated"].replace("-", ".")}</time></span>'
)
AI_NOTE = "일반 정보 제공 목적의 글이며, AI의 도움을 받아 초안을 작성하고 사람이 검토했어요."
CONTACT = '<mark class="ph">추후 기입: 위치·진료 시간·예약 방법·시술 후 이상 시 연락 방법</mark>'


def schema(extra_faq=False):
    d = {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "headline": meta["title"],
        "description": meta["description"],
        "inLanguage": "ko",
        "datePublished": meta["date"],
        "dateModified": meta["lastUpdated"],
        "lastReviewed": meta["lastUpdated"],
        "author": {"@type": "Organization", "name": f"{SITE} 블로그 편집팀"},
        "reviewedBy": {"@type": "Person", "name": "[원장님 성함·전문의 표기]"},
        "publisher": {"@type": "MedicalClinic", "name": SITE, "url": "[홈페이지 주소]"},
        "about": {"@type": "MedicalCondition", "name": "넓은 모공 (enlarged facial pores)"},
        "citation": re.findall(r'href="(https?://[^"]+)"', REFS),
    }
    out = [d]
    if extra_faq:
        out.append({
            "@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": s["q"], "acceptedAnswer": {"@type": "Answer", "text": SHORT[s["n"]]}}
                           for s in sections if s["n"]],
        })
    return "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in out)


FONTS = "".join(
    f'@font-face{{font-family:A2Z;font-weight:{w};src:url(../../../assets/fonts/a2z/A2Z-{n}.woff2) format("woff2")}}'
    for w, n in [(300, "3Light"), (400, "4Regular"), (500, "5Medium"), (600, "6SemiBold"), (700, "7Bold"), (800, "8ExtraBold")]
)
BASE_CSS = FONTS + """
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:A2Z,'Apple SD Gothic Neo',sans-serif;background:var(--bg);color:var(--ink);font-weight:400;-webkit-font-smoothing:antialiased;word-break:keep-all;overflow-wrap:break-word}
a{color:inherit}img{max-width:100%;display:block}
.site{background:#fff;border-bottom:1px solid #e6e6e6}
.site .in{max-width:1180px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:28px;font-size:14px;color:#555}
.site .logo{font-weight:800;font-size:18px;color:#222;letter-spacing:-.02em}
.site nav{display:flex;gap:22px;flex-wrap:wrap}.site nav b{color:#222}
.site .tag{margin-left:auto;font-size:11px;color:#999;border:1px dashed #bbb;border-radius:4px;padding:3px 7px;white-space:nowrap}
.mock{position:fixed;right:14px;bottom:14px;z-index:9;background:#222;color:#fff;font-size:12px;padding:7px 11px;border-radius:999px;opacity:.85}
mark.ph{background:#FFF1B8;color:#6B5200;border-radius:3px;padding:1px 4px;font-size:.92em}
sup.cite{font-size:.68em;margin-left:1px}sup.cite a{text-decoration:none;color:var(--accent);font-weight:600}
.tbl{overflow-x:auto;margin:22px 0}table{border-collapse:collapse;width:100%;font-size:15px;line-height:1.6;min-width:520px}
th,td{text-align:left;vertical-align:top;padding:11px 12px;border-bottom:1px solid var(--line)}th{font-weight:700;background:var(--soft)}
figure{margin:28px 0}figcaption{font-size:13px;color:var(--sub);margin-top:8px}
.refs{font-size:13.5px;line-height:1.7;color:var(--sub);padding-left:20px}.refs li{margin:4px 0}.refs a{color:var(--sub)}
.disc{font-size:13px;color:var(--sub);line-height:1.7}
@media(max-width:700px){.site .tag{display:none}.site .in{gap:12px;flex-wrap:wrap}.site nav{gap:14px}}
.foot{background:#2b2b2b;color:#aaa;font-size:13px;text-align:center;padding:26px 16px;margin-top:70px}
"""


def page(variant, title, css, main):
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(meta["title"])} | {SITE} 피부 칼럼</title>
<meta name="description" content="{html.escape(meta["description"])}">
<link rel="canonical" href="[칼럼 주소]">
{schema(variant == "B")}
<style>{BASE_CSS}{css}</style></head><body>
<header class="site"><div class="in"><span class="logo">{SITE}</span>
<nav><span>병원소개</span><span>진료안내</span><b>피부 칼럼</b><span>예약·상담</span></nav>
<span class="tag">홈페이지 기존 상단 메뉴 자리</span></div></header>
{main}
<footer class="foot">{SITE} · 홈페이지 기존 하단 정보 자리</footer>
<div class="mock">시안 {variant} · {title}</div>
</body></html>"""


def sec_body(s):
    return blocks(s["lines"])


# ---------- 시안 A: 매거진형 ----------
toc = "".join(f'<li><a href="#q{s["n"] or "end"}">{html.escape(s["q"])}</a></li>' for s in sections)
art = "".join(
    f'<section id="q{s["n"] or "end"}"><h2>{"<span class=qn>Q" + str(s["n"]) + "</span>" if s["n"] else ""}{html.escape(s["q"])}</h2>{sec_body(s)}</section>'
    for s in sections
)
A_CSS = """:root{--bg:#FFFCF8;--ink:#2F241E;--sub:#7A6A60;--line:#EADFD2;--accent:#C8573A;--soft:#F6EEE4}
.crumb{max-width:1180px;margin:26px auto 0;padding:0 20px;font-size:13px;color:var(--sub)}
.hero{max-width:1180px;margin:0 auto;padding:18px 20px 0}
.cat{display:inline-block;font-size:13px;font-weight:600;color:var(--accent);letter-spacing:.04em}
h1{font-size:clamp(28px,4.4vw,46px);line-height:1.3;font-weight:800;letter-spacing:-.03em;margin:12px 0 16px;max-width:860px}
.desc{font-size:18px;line-height:1.7;color:var(--sub);max-width:760px;margin:0}
.by{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13.5px;color:var(--sub);margin:22px 0 0;padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.heroimg{margin:30px 0 0}.heroimg img{width:100%;aspect-ratio:21/9;object-fit:cover;border-radius:6px}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:minmax(0,700px) 280px;gap:70px;justify-content:space-between}
article{font-size:17.5px;line-height:1.95}
article p{margin:0 0 18px}
.lead{margin-top:34px}.lead p{font-size:19px;line-height:1.9}
h2{font-size:26px;line-height:1.45;font-weight:800;letter-spacing:-.02em;margin:64px 0 18px;scroll-margin-top:20px}
h2 .qn{display:block;font-size:14px;color:var(--accent);font-weight:700;letter-spacing:.06em;margin-bottom:6px}
.box{background:var(--soft);border-left:4px solid var(--accent);padding:20px 24px;margin:30px 0;border-radius:0 6px 6px 0}
.box-t{font-weight:800;margin:0 0 8px!important}.box ul{margin:0;padding-left:20px}.box li{margin:4px 0}
article ul{padding-left:22px}article li{margin:6px 0}
aside.toc{position:sticky;top:24px;align-self:start;margin-top:40px;font-size:14px}
.toc p{font-weight:800;margin:0 0 10px}.toc ol{margin:0;padding-left:18px;line-height:1.6;color:var(--sub)}.toc li{margin:7px 0}.toc a{text-decoration:none}.toc a:hover{color:var(--accent)}
.toc .meta{margin-top:24px;padding-top:16px;border-top:1px solid var(--line);color:var(--sub);line-height:1.7;font-size:13px;font-weight:400}
.next{max-width:1180px;margin:60px auto 0;padding:0 20px}.next h3{font-size:20px;margin:0 0 16px}
.next .g{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.next .c{border:1px solid var(--line);border-radius:8px;padding:18px;font-size:15px;color:var(--sub);min-height:110px}
.next .c b{display:block;color:var(--ink);margin-bottom:6px}
.ref-sec h2{font-size:18px;margin-top:56px}
@media(max-width:960px){.wrap{grid-template-columns:minmax(0,1fr);gap:0}aside.toc{display:none}.next .g{grid-template-columns:1fr}.heroimg img{aspect-ratio:16/10}}
@media(max-width:600px){article{font-size:16.5px}.lead p{font-size:17px}h2{font-size:22px}.desc{font-size:16px}}
"""
A_MAIN = f"""<div class="crumb">홈 › 피부 칼럼 › 모공</div>
<div class="hero"><span class="cat">피부 칼럼 · 모공</span>
<h1>{html.escape(meta["title"])}</h1><p class="desc">{html.escape(meta["description"])}</p>
<div class="by">{BYLINE}</div>
{figure(hero[0], hero[1], hero[2], "heroimg")}</div>
<div class="wrap"><article>
<div class="lead">{LEAD}</div>
<aside class="box"><p class="box-t">핵심 정리</p>{TAKE}</aside>
{art}
<section class="ref-sec"><h2>참고 문헌</h2><ol class="refs">{REFS}</ol><p class="disc">{html.escape(disclaimer)}<br>{AI_NOTE}</p></section>
</article>
<aside class="toc"><p>이 글의 목차</p><ol>{toc}</ol><div class="meta">참고 문헌 {len(refs)}편 · 다음 검토 예정 {meta["nextReview"].replace("-", ".")}</div></aside></div>
<div class="next"><h3>다른 피부 칼럼</h3><div class="g">
<div class="c"><b>다음 칼럼 자리</b>기미와 잡티, 어떻게 다른가요?</div>
<div class="c"><b>다음 칼럼 자리</b>여드름 흉터의 종류</div>
<div class="c"><b>다음 칼럼 자리</b>레이저 시술 전 알아둘 것</div></div></div>"""
(OUT / "option-a-magazine.html").write_text(page("A", "매거진형", A_CSS, A_MAIN))


# ---------- 시안 B: 질문·답 가이드형 ----------
chips = "".join(f'<a href="#q{s["n"]}"><span>Q{s["n"]}</span>{html.escape(s["q"])}</a>' for s in sections if s["n"])
qa = ""
for s in sections:
    if s["n"]:
        qa += (f'<section class="qa" id="q{s["n"]}"><h2><span class="qn">Q{s["n"]}</span>{html.escape(s["q"])}</h2>'
               f'<div class="ans"><span class="lab">짧은 답</span><p>{html.escape(SHORT[s["n"]])}</p></div>'
               f'<details open><summary>자세히 보기</summary><div class="more">{sec_body(s)}</div></details></section>')
    else:
        qa += f'<section class="qa end" id="qend"><h2>{html.escape(s["q"])}</h2>{sec_body(s)}</section>'
B_CSS = """:root{--bg:#F4F6F3;--ink:#1F2A26;--sub:#5F6B66;--line:#DDE3DE;--accent:#2E6B57;--soft:#EAF0EB}
.top{background:#fff;border-bottom:1px solid var(--line)}
.top .in{max-width:880px;margin:0 auto;padding:40px 20px 34px}
.cat{font-size:13px;font-weight:700;color:var(--accent);background:var(--soft);padding:5px 10px;border-radius:999px}
h1{font-size:clamp(26px,4vw,40px);line-height:1.35;font-weight:800;letter-spacing:-.03em;margin:18px 0 12px}
.desc{font-size:17px;line-height:1.7;color:var(--sub);margin:0}
.trust{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:24px}
.trust div{background:var(--bg);border-radius:10px;padding:12px 14px;font-size:13px;color:var(--sub);line-height:1.5}
.trust b{display:block;color:var(--ink);font-size:15px;margin-bottom:2px}
.in2{max-width:880px;margin:0 auto;padding:0 20px}
.sum{background:var(--accent);color:#fff;border-radius:14px;padding:24px 28px;margin:30px 0 0}
.sum .box-t{font-weight:800;font-size:17px;margin:0 0 10px}.sum ul{margin:0;padding-left:20px;line-height:1.8;font-size:16px}
.chips-t{font-weight:800;margin:36px 0 12px;font-size:17px}
.chips{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.chips a{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:10px;padding:13px 15px;text-decoration:none;font-size:15px;line-height:1.5}
.chips a:hover{border-color:var(--accent)}.chips span{color:var(--accent);font-weight:800;flex:none}
.lead{font-size:17px;line-height:1.9;margin-top:30px}
.qa{background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px 30px;margin:20px 0;scroll-margin-top:16px}
.qa h2{font-size:23px;line-height:1.45;font-weight:800;letter-spacing:-.02em;margin:0 0 16px;display:flex;gap:12px}
.qa .qn{flex:none;background:var(--accent);color:#fff;font-size:14px;border-radius:8px;padding:4px 9px;height:fit-content;margin-top:3px}
.ans{background:var(--soft);border-radius:10px;padding:16px 18px}
.ans .lab{font-size:12.5px;font-weight:800;color:var(--accent);letter-spacing:.04em}
.ans p{margin:6px 0 0;font-size:17px;line-height:1.75;font-weight:500}
details{margin-top:14px}summary{cursor:pointer;font-size:14px;font-weight:700;color:var(--accent);padding:6px 0;list-style:none}
summary::before{content:"▾ "}details:not([open]) summary::before{content:"▸ "}
.more,.end{font-size:16.5px;line-height:1.9}.more p,.end p{margin:0 0 15px}.more ul{padding-left:20px}.more li{margin:6px 0}
.box{border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:18px 0}.box-t{font-weight:800;margin:0 0 6px!important}
.ref-sec{margin-top:36px}.ref-sec h2{font-size:18px}
@media(max-width:700px){.trust,.chips{grid-template-columns:1fr 1fr}.chips{grid-template-columns:1fr}.qa{padding:22px 18px}.qa h2{font-size:20px}}
"""
B_MAIN = f"""<div class="top"><div class="in"><span class="cat">피부 칼럼 · 모공 · 질문 8개</span>
<h1>{html.escape(meta["title"])}</h1><p class="desc">{html.escape(meta["description"])}</p>
<div class="trust"><div><b>작성</b>{html.escape(meta["author"])}</div><div><b>의학 감수</b><mark class="ph">원장님 확인</mark></div>
<div><b>최종 검토</b><time datetime="{meta["lastUpdated"]}">{meta["lastUpdated"].replace("-", ".")}</time></div><div><b>참고 문헌</b>{len(refs)}편 (논문·학회 자료)</div></div></div></div>
<div class="in2">
<aside class="sum"><p class="box-t">30초 요약</p>{TAKE}</aside>
<p class="chips-t">이 글에서 답하는 질문</p><nav class="chips">{chips}</nav>
<div class="lead">{LEAD}</div>
{qa}
<section class="ref-sec"><h2>참고 문헌</h2><ol class="refs">{REFS}</ol><p class="disc">{html.escape(disclaimer)}<br>{AI_NOTE}</p></section>
</div>"""
(OUT / "option-b-qna.html").write_text(page("B", "질문·답 가이드형", B_CSS, B_MAIN))


# ---------- 시안 C: 카드 + 본문 혼합형 ----------
rows = ""
for k, s in enumerate(sections):
    cn = CARD_FOR.get(s["n"])
    pic = figure(f"images/cards/pores-0{cn}.png", card_alt[cn], "", "card") if cn else ""
    cls = "row" + (" flip" if k % 2 else "") + ("" if pic else " solo")
    qn = f'<span class="qn">Q{s["n"]}</span>' if s["n"] else ""
    rows += f'<section class="{cls}" id="q{s["n"] or "end"}">{pic}<div class="txt"><h2>{qn}{html.escape(s["q"])}</h2>{sec_body(s)}</div></section>'
C_CSS = """:root{--bg:#F7EFE6;--ink:#33261F;--sub:#7A6A60;--line:#E4D6C6;--accent:#C8573A;--soft:#F2DCD0}
.hero{max-width:1120px;margin:0 auto;padding:44px 20px 10px;display:grid;grid-template-columns:380px 1fr;gap:50px;align-items:center}
.hero figure{margin:0}.hero img{border-radius:18px;box-shadow:0 14px 40px rgba(80,50,30,.15)}
.cat{font-size:13px;font-weight:700;color:var(--accent)}
h1{font-size:clamp(26px,3.8vw,42px);line-height:1.32;font-weight:800;letter-spacing:-.03em;margin:12px 0 14px}
.desc{font-size:17px;line-height:1.75;color:var(--sub);margin:0}
.by{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--sub);margin-top:20px}
.doc{max-width:1120px;margin:30px auto 0;padding:0 20px}
.doc .in{background:var(--paper,#FFFCF8);border-radius:18px;padding:26px 30px;display:flex;gap:22px;align-items:center}
.doc .ph-img{flex:none;width:84px;height:84px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-size:12px;color:var(--sub);text-align:center;line-height:1.3}
.doc b{display:block;margin-bottom:6px}
.main{max-width:1120px;margin:0 auto;padding:0 20px}
.lead,.take{max-width:760px;margin:40px auto 0;font-size:17px;line-height:1.9}
.box{background:#fff;border-radius:16px;padding:22px 26px}.box-t{font-weight:800;margin:0 0 8px!important;color:var(--accent)}.box ul{margin:0;padding-left:20px;line-height:1.8}
.row{display:grid;grid-template-columns:400px 1fr;gap:50px;align-items:start;background:#fff;border-radius:22px;padding:36px;margin:28px 0;scroll-margin-top:16px}
.row.flip{grid-template-columns:1fr 400px}.row.flip figure.card{order:2}
.row.solo{grid-template-columns:minmax(0,1fr)}.row.solo .txt{max-width:760px;margin:0 auto}
figure.card{margin:0;position:sticky;top:20px}figure.card img{border-radius:14px}
.txt{font-size:16.5px;line-height:1.9}.txt p{margin:0 0 15px}.txt ul{padding-left:20px}.txt li{margin:6px 0}
.txt h2{font-size:24px;line-height:1.45;font-weight:800;letter-spacing:-.02em;margin:0 0 16px}
.txt .qn{display:inline-block;background:var(--accent);color:#fff;font-size:13px;border-radius:999px;padding:3px 10px;margin-right:8px;vertical-align:4px}
.txt .box{background:var(--bg)}
.cta{background:var(--ink);color:#fff;border-radius:22px;padding:34px 36px;margin:40px 0;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
.cta h3{margin:0 0 8px;font-size:22px}.cta p{margin:0;color:#d9cfc6;line-height:1.7}
.cta .btn{background:var(--accent);color:#fff;border-radius:999px;padding:14px 26px;font-weight:700;text-decoration:none;white-space:nowrap}
.cta mark.ph{display:inline-block;margin-top:10px}
.ref-sec{max-width:760px;margin:0 auto}.ref-sec h2{font-size:18px}
@media(max-width:900px){.hero,.row,.row.flip{grid-template-columns:minmax(0,1fr);gap:24px}.hero figure{max-width:320px}.row.flip figure.card{order:0}figure.card{position:static;max-width:420px}.row{padding:24px 20px}.cta{grid-template-columns:1fr}.doc .in{flex-direction:column;align-items:flex-start}}
"""
C_MAIN = f"""<div class="hero">{figure("images/cards/pores-01.png", card_alt[1], "")}
<div><span class="cat">피부 칼럼 · 모공</span><h1>{html.escape(meta["title"])}</h1><p class="desc">{html.escape(meta["description"])}</p><div class="by">{BYLINE}</div></div></div>
<div class="doc"><div class="in"><div class="ph-img">원장님<br>사진 자리</div><div><b>원장님 한마디</b><mark class="ph">원장님 확인: 모공 상담 때 자주 드리는 말 1~2문장 (효과 약속 없이)</mark></div></div></div>
<div class="main">
<div class="lead">{LEAD}</div>
<div class="take"><aside class="box"><p class="box-t">핵심 정리</p>{TAKE}</aside></div>
{rows}
<div class="cta"><div><h3>내 모공은 어떤 원인일까요?</h3><p>진료로 피부 상태를 보고 원인과 관리 방향을 함께 정해요. 효과와 부작용은 사람마다 달라요.</p>{CONTACT}</div><a class="btn" href="#">상담 예약 안내</a></div>
<section class="ref-sec"><h2>참고 문헌</h2><ol class="refs">{REFS}</ol><p class="disc">{html.escape(disclaimer)}<br>{AI_NOTE}</p></section>
</div>"""
(OUT / "option-c-cards.html").write_text(page("C", "카드+본문 혼합형", C_CSS, C_MAIN))

print("시안 3개 →", OUT)
