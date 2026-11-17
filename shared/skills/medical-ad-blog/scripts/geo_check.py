#!/usr/bin/env python3
"""블로그 글 한 편의 GEO(AI 검색 인용) 준비도 검사기.

의료광고 검사(medad_check.py)를 통과한 원고에만 쓴다. 의료광고 규정이 항상 우선이며,
이 점수를 올리려고 효과 수치·후기·비교를 넣지 않는다.

사용법: python3 geo_check.py <원고.md> [--json]
결과: 항목별 통과/미달과 100점 환산 점수. 85점 미만이면 종료 코드 1.
"""
import json
import re
import sys
from pathlib import Path

IMG_RE = re.compile(r"!\[([^\]]*)\]\(([^)]*)\)")
CITE_RE = re.compile(r"\[\d+\](?!\()")
MARKER_RE = re.compile(r"\[(IMAGE|CHART|VIDEO|추후 기입|원장님 확인)[^\]]*\]")


def parse(text):
    fm, body = {}, text
    if text.startswith("---"):
        end = text.find("\n---", 3)
        for line in text[3:end].splitlines():
            m = re.match(r"(\w+):\s*\"?(.*?)\"?\s*$", line)
            if m:
                fm[m.group(1)] = m.group(2)
        body = text[end + 4:]
    ref_at = re.search(r"^\*\*참고 문헌\*\*|^## 참고 문헌", body, re.M)
    main = body[:ref_at.start()] if ref_at else body
    refs = body[ref_at.start():] if ref_at else ""
    return fm, main, refs


def sections(main):
    """H2 단위로 (제목, 본문) 목록."""
    parts = re.split(r"^## ", main, flags=re.M)
    out = []
    for p in parts[1:]:
        title, _, content = p.partition("\n")
        out.append((title.strip(), content.strip()))
    return out


def first_sentence(content):
    para = next((l for l in content.splitlines() if l.strip() and not l.startswith(("|", "!", "[", ">"))), "")
    para = re.sub(r"^[-*]\s*", "", para)
    return re.split(r"(?<=[.?!요다])\s", para.strip(), maxsplit=1)[0]


def check(path):
    text = Path(path).read_text(encoding="utf-8")
    fm, main, refs = parse(text)
    secs = sections(main)
    qa = [s for s in secs if s[0].startswith("Q") or s[0].endswith("?") or s[0].endswith("요?")]
    card = fm.get("format", "") == "card"   # 카드형 블로그: 카드 이미지 중심, 본문 번호 인용 없이 글 끝 참고 문헌
    results = []

    def item(cid, weight, ok, detail):
        results.append({"id": cid, "weight": weight, "ok": bool(ok), "detail": detail})

    AUTH = ("pubmed", "ncbi.nlm.nih.gov", "doi.org", "kdca.go.kr", "derma.or.kr", "aad.org",
            "nih.gov", "who.int", "amc.seoul.kr", "dermnetnz.org", "nhs.uk", "aafp.org")

    # 1. 제목·설명
    title = fm.get("title", "")
    item("G01-title", 5, 15 <= len(title) <= 45, f"제목 {len(title)}자 (15~45자, 핵심 키워드 포함)")
    desc = fm.get("description", "")
    item("G02-description", 3, 60 <= len(desc) <= 160, f"설명 {len(desc)}자 (60~160자)")

    # 2. 도입: 정의문으로 시작 + 핵심 정리
    lead = main.split("\n## ")[0]
    lead_paras = [l for l in lead.splitlines() if l.strip() and not l.startswith(("#", ">", "!", "[", "|"))]
    first = first_sentence(lead_paras[0]) if lead_paras else ""
    item("G03-definition-first", 8, bool(re.search(r"(는|은)\s.{3,90}(예요|이에요|입니다|말해요|뜻해요|가리켜요)", first)),
         f"첫 문장이 정의문: '{first[:40]}…'")
    item("G04-summary", 6, any(k in main for k in ("핵심 정리", "한눈에 보기", "Key Takeaways")), "핵심 정리 박스")

    # 3. 질문형 소제목 + 직답
    need_q = 4 if card else 5
    item("G05-question-headings", 6, len(qa) >= need_q, f"질문형 소제목 {len(qa)}개 ({need_q}개 이상)")
    direct = [s for s in qa if len(first_sentence(s[1])) <= 120]
    item("G06-answer-first", 8, qa and len(direct) / len(qa) >= 0.8,
         f"질문 섹션 첫 문장 직답 비율 {len(direct)}/{len(qa)}")
    heads = " ".join(t for t, _ in secs)
    item("G07-sideeffect-section", 8, bool(re.search(r"부작용|반응|주의", heads)), "부작용·주의 독립 섹션")
    item("G08-care-signal", 4, bool(re.search(r"진료가 필요|물어볼|상담", heads)), "진료가 필요한 신호·상담 질문 섹션")

    # 4. 근거
    cites = CITE_RE.findall(main)
    ref_items = re.findall(r"^\d+\.\s*\[(.+?)\]\((https?://[^)]+)\)", refs, re.M)
    if card:
        item("G09-citations", 8, len(ref_items) >= 5, f"카드형: 글 끝 참고 문헌 {len(ref_items)}건 (5건 이상, 본문 번호 생략)")
    else:
        item("G09-citations", 8, len(cites) >= 6, f"본문 인용 표시 {len(cites)}개 (6개 이상)")
    item("G10-references", 6, len(ref_items) >= 3, f"참고 문헌 {len(ref_items)}건 (3건 이상)")
    full = [t for t, u in ref_items if re.search(r"(19|20)\d{2}", t) and "(" in t]
    item("G11-ref-format", 4, ref_items and len(full) == len(ref_items), f"서지(저자·학술지·연도) 완전 {len(full)}/{len(ref_items)}")
    auth = [u for _, u in ref_items if any(d in u for d in AUTH)]
    item("G12-authority", 5, len(auth) >= 2, f"기관·학회·PubMed 출처 {len(auth)}건 (2건 이상)")
    uncited = []
    for m in re.finditer(r"\d+(\.\d+)?\s*(%|mm)", main):
        window = main[max(0, m.start() - 400):m.end() + 120]
        if not CITE_RE.search(window):
            uncited.append(m.group(0))
    if card:
        item("G13-numbers-cited", 5, bool(ref_items), "카드형: 수치 근거는 글 끝 참고 문헌으로 (원문 대조는 검수 기록에)")
    else:
        item("G13-numbers-cited", 5, not uncited, f"출처 없는 수치 {len(uncited)}개")

    # 5. 구조화
    imgs = IMG_RE.findall(main)
    if card:
        item("G14-table", 4, len(imgs) >= 6, f"카드형: 이미지 {len(imgs)}장 (6장 이상)")
    else:
        item("G14-table", 4, bool(re.search(r"^\|.+\|\s*$\n^\|[-| :]+\|", main, re.M)), "비교·정리 표")
    item("G15-image-alt", 3, imgs and all(len(a) >= 20 for a, _ in imgs), "이미지 설명(alt) 20자 이상")

    # 6. 신뢰 신호
    item("G16-dates", 4, bool(fm.get("date")) and bool(fm.get("lastUpdated")), "작성일·수정일")
    item("G17-review-cycle", 3, bool(fm.get("nextReview")), "다음 검토 예정일 (frontmatter nextReview)")
    rv = fm.get("reviewer", "")
    item("G18-reviewer", 6, bool(rv) and "not provided" not in rv and "원장님 확인" not in rv,
         "의학 감수 표기 (frontmatter reviewer)")
    item("G19-info-box", 3, "작성 정보" in main, "본문 상단 작성 정보 박스")
    item("G20-disclaimer", 3, "개인에 따라" in text or "개인차" in text, "개인차·일반 정보 고지")
    item("G21-ai-disclosure", 2, "AI" in main and ("보조" in main or "도움" in main), "AI 보조 작성 고지")

    # 6-1. 분량 (반드시 글자 수로 센다. wc -m은 C 로케일에서 바이트를 세므로 쓰지 않는다)
    plain = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", main)
    plain = re.sub(r"\]\([^)]*\)", "]", plain)
    plain = re.sub(r"^\[IMAGE[^\]]*\]", "", plain, flags=re.M)
    n_chars = len(re.sub(r"[\s|*#>\-]", "", plain))
    lo, hi = (1500, 3000) if card else (2500, 4000)
    item("G23-length", 5, lo <= n_chars <= hi, f"본문 {n_chars}자 (공백 제외, {lo:,}~{hi:,}자)")

    # 7. 완성도
    markers = MARKER_RE.findall(text)
    item("G22-complete", 6, not markers, f"채워지지 않은 자리표시 {len(markers)}개")

    total = sum(r["weight"] for r in results)
    got = sum(r["weight"] for r in results if r["ok"])
    return {"score": round(got * 100 / total), "items": results}


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 2
    worst = 0
    out = {}
    for p in args:
        r = check(p)
        out[p] = r
        if r["score"] < 85:
            worst = 1
        if "--json" not in argv:
            print(f"\n== GEO 준비도: {p}\n   점수 {r['score']}/100 (85점 이상 통과)\n")
            for it in r["items"]:
                print(f" [{'OK ' if it['ok'] else '미달'}] {it['id']:<24} {it['detail']}")
    if "--json" in argv:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    return worst


if __name__ == "__main__":
    sys.exit(main(sys.argv))
