#!/usr/bin/env python3
"""의료광고 관련 법령 원문을 국가법령정보센터(law.go.kr)에서 받아 저장하고, 바뀐 조문을 알려 준다.

사용:
    python3 law_sync.py            # 받아서 references/law/ 갱신 + 바뀐 조문 출력
    python3 law_sync.py --check    # 저장본과 비교만 (바뀌었으면 종료 코드 1, 파일은 그대로)
    python3 law_sync.py show 법56-2-8 령23-1-8   # 저장된 조문 보기

저장 파일:
    references/law/medical_ad_law.json   검사기가 읽는 조문 사전 (키 → 원문)
    references/law/조문_원문.md           사람이 읽는 원문 모음

law.go.kr robots.txt는 전체 허용(2026-11-19 확인). 그래도 요청은 법령당 2회, 3초 간격으로만 한다.
법령 본문은 저작권법 제7조에 따라 보호 대상이 아니므로 원문을 그대로 보관한다.
"""
import html, json, re, sys, time, urllib.parse, urllib.request
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE.parent / "references" / "law"
JSON_PATH = OUT_DIR / "medical_ad_law.json"
MD_PATH = OUT_DIR / "조문_원문.md"
UA = "Mozilla/5.0 (compatible; CoMindWorks-LawCheck/1.0; medical-ad compliance reference)"
BASE = "https://www.law.go.kr"

# (법령명, 키 접두어, 가져올 조, 조마다 가져올 항 (None=전부))
TARGETS = [
    ("의료법", "법", [
        ("19", ["1"]),          # 정보 누설 금지 (리뷰 답글)
        ("27", ["3"]),          # 환자 유인 금지
        ("56", None),           # 의료광고 금지
        ("57", ["1", "3"]),     # 사전심의 대상·면제
        ("64", ["1"]),          # 업무정지 등 (제5호: 제56조 위반)
        ("88", None),           # 벌칙 (제27조제3항 위반)
        ("89", None),           # 벌칙 (제56조 위반)
    ]),
    ("의료법 시행령", "령", [
        ("23", None),           # 의료광고 금지 기준
        ("24", ["1", "2"]),     # 심의 대상 인터넷 매체·SNS
    ]),
    ("정보통신망 이용촉진 및 정보보호 등에 관한 법률", "망", [
        ("44의2", None),        # 권리 침해 정보 삭제·임시조치 요청 (허위 리뷰 대응)
        ("44의3", None),        # 임의의 임시조치
        ("70", ["1", "2"]),     # 명예훼손 벌칙
    ]),
]
CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"


def get(url, referer=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **({"Referer": referer} if referer else {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="ignore")


def to_text(page):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "", t))
    t = re.sub(r"[ \t\xa0]+", " ", t)
    return re.sub(r"\s*\n\s*", "\n", t)


def fetch_law(name):
    """법령 이름 → (머리말 '[시행 …] [법률 제…]', 본문 텍스트, 원문 주소)."""
    landing = f"{BASE}/{urllib.parse.quote('법령')}/{urllib.parse.quote(name.replace(' ', ''))}"  # 띄어쓰기 없는 정식 명칭
    page = get(landing)
    seq = re.search(r'id="lsiSeq" value="(\d+)"', page)
    ef = re.search(r"efYd = '(\d{8})'", page)
    if not seq or not ef:
        raise RuntimeError(f"{name}: 법령 번호를 찾지 못했습니다 (law.go.kr 화면 구조 변경?)")
    time.sleep(3)
    body_url = (f"{BASE}/LSW/lsInfoR.do?lsiSeq={seq.group(1)}&efYd={ef.group(1)}"
                f"&chrClsCd=010202&urlMode=lsInfoR&viewCls=lsInfoR&ancYnChk=0")
    text = to_text(get(body_url, referer=landing))
    head = re.search(r"\[시행 [^\]]+\] \[[^\]]+\]", text)
    if not head:
        raise RuntimeError(f"{name}: 본문을 읽지 못했습니다")
    return head.group(0), text, landing


def cut_article(text, jo):
    head = f"제{jo.split('의')[0]}조의{jo.split('의')[1]}" if "의" in jo else f"제{jo}조"
    m = re.search(rf"(?m)^{head}\(([^)]*)\)", text)
    if not m:
        raise RuntimeError(f"제{jo}조를 찾지 못했습니다")
    nxt = re.search(r"(?m)^(제\d+조(의\d+)?\(|제\d+조(의\d+)? 삭제|제\d+장 |부칙)", text[m.end():])
    body = text[m.start(): m.end() + (nxt.start() if nxt else 2000)].strip()
    return m.group(1), body


def split_article(body):
    """조 본문 → [(항번호|None, 항 첫 문장, [(호번호, 호 본문)])]."""
    body = re.sub(r"^제\d+조(의\d+)?\([^)]*\)\s*", "", body)
    parts = re.split(rf"(?:^|\n)\s*([{CIRCLED}])\s*", body)
    out = []
    chunks = [(None, parts[0])] if parts[0].strip() else []
    chunks += [(str(CIRCLED.index(parts[i]) + 1), parts[i + 1]) for i in range(1, len(parts) - 1, 2)]
    for hang, chunk in chunks:
        lines = chunk.strip().split("\n")
        lead, items = [], []
        for ln in lines:
            m = re.match(r"^(\d+(?:의\d+)?)\.\s*(.*)", ln)
            if m:
                items.append([m.group(1), m.group(2)])
            elif items and re.match(r"^[가-하]\.\s", ln):
                items[-1][1] += "\n" + ln
            elif items:
                items[-1][1] += " " + ln if not ln.startswith("[") else ""
            else:
                lead.append(ln)
        out.append((hang, " ".join(lead).strip(), [tuple(x) for x in items]))
    return out


def clean(s):
    return re.sub(r"\s*<(개정|신설)[^>]*>", "", s).strip()


def build():
    articles, sources, md = {}, [], []
    for name, pre, jos in TARGETS:
        head, text, url = fetch_law(name)
        sources.append({"law": name, "version": head, "url": url})
        md.append(f"## {name}\n\n{head} · 원문: {url}\n")
        for jo, hangs in jos:
            title, body = cut_article(text, jo)
            jo_label = jo.replace("의", "조의") if "의" in jo else jo + "조"
            md.append(f"### 제{jo_label}({title})\n")
            for hang, lead, items in split_article(body):
                if hangs and hang not in hangs:
                    continue
                key = f"{pre}{jo}" + (f"-{hang}" if hang else "")
                label = f"{name} 제{jo_label}" + (f" 제{hang}항" if hang else "")
                articles[key] = {"label": label, "title": title, "text": clean(lead)}
                md.append(f"- **{key}** ({label}) {clean(lead)}")
                for ho, t in items:
                    k = f"{key}-{ho}"
                    articles[k] = {"label": f"{label} 제{ho}호", "title": title, "text": clean(t)}
                    md.append(f"  - **{k}** {clean(t)}".replace("\n", "\n    "))
            md.append("")
        time.sleep(3)
    data = {"_about": "의료광고 관련 조문 원문. law_sync.py가 law.go.kr에서 받아 만든다. 손으로 고치지 않는다.",
            "_fetched": date.today().isoformat(), "_sources": sources, "articles": articles}
    head = ("# 의료광고 관련 조문 원문\n\n_`scripts/law_sync.py`가 국가법령정보센터에서 받아 만든 파일. "
            f"손으로 고치지 않는다. 받은 날: {data['_fetched']}_\n\n"
            "키 읽는 법: `법56-2-8` = 의료법 제56조 제2항 제8호, `령23-1-2` = 시행령 제23조 제1항 제2호\n\n")
    return data, head + "\n".join(md) + "\n"


def diff(old, new):
    oa, na = old.get("articles", {}), new["articles"]
    changes = [f"  추가 {k}" for k in na if k not in oa]
    changes += [f"  삭제 {k}" for k in oa if k not in na]
    changes += [f"  변경 {k}: {oa[k]['text'][:60]} → {na[k]['text'][:60]}" for k in na
                if k in oa and oa[k]["text"] != na[k]["text"]]
    ov = {s["law"]: s["version"] for s in old.get("_sources", [])}
    for s in new["_sources"]:
        if ov.get(s["law"]) != s["version"]:
            changes.insert(0, f"  판 변경 {s['law']}: {ov.get(s['law'], '(없음)')} → {s['version']}")
    return changes


def show(keys):
    arts = json.loads(JSON_PATH.read_text(encoding="utf-8"))["articles"]
    for k in keys:
        a = arts.get(k)
        print(f"{k} ({a['label']}) {a['text']}" if a else f"{k}: 저장된 조문 없음")


def main(argv):
    if argv[:1] == ["show"]:
        return show(argv[1:]) or 0
    new, md = build()
    old = json.loads(JSON_PATH.read_text(encoding="utf-8")) if JSON_PATH.exists() else {}
    changes = diff(old, new)
    for s in new["_sources"]:
        print(f"{s['law']}: {s['version']}")
    print(f"조문 {len(new['articles'])}개")
    print("바뀐 조문:\n" + "\n".join(changes) if changes else "저장본과 같습니다.")
    if "--check" in argv:
        return 1 if changes else 0
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(new, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    MD_PATH.write_text(md, encoding="utf-8")
    print(f"저장: {JSON_PATH}\n      {MD_PATH}")
    if changes and old:
        print("※ 조문이 바뀌었습니다. medad_rules.json의 law·cite 필드와 references/medical-ad-law.md를 다시 확인하세요.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
