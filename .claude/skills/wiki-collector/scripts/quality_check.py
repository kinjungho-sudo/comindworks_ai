"""수집된 자료의 품질을 평가한다. Claude가 주 판단자이고 이 스크립트는 보조 휴리스틱."""

import sys
import re

COMINDWORKS_KEYWORDS = [
    "AI", "에이전트", "자동화", "n8n", "claude", "llm", "창업", "비즈니스",
    "콘텐츠", "유튜브", "블로그", "개발", "python", "api", "리서치", "스타트업",
    "수익", "워크플로우", "프롬프트", "gpt", "make", "zapier",
]

SPAM_PATTERNS = [
    r"광고|스팸|무료체험|구독신청|클릭하세요|지금바로",
    r"대출|도박|카지노|성인|불법",
    r"(.)(\1{10,})",  # 같은 문자 10개 이상 반복
]

PERSONAL_TYPES = ["diary", "thought", "experience", "retrospect"]


def check_quality(content: str, content_type: str = "url") -> dict:
    if content_type in PERSONAL_TYPES:
        return {"pass": True, "reason": "개인 자료 — 품질 검사 면제", "score": 100}

    if len(content.strip()) < 50:
        return {"pass": False, "reason": "내용이 너무 짧습니다 (50자 미만)", "score": 0}

    for pattern in SPAM_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            return {"pass": False, "reason": "스팸/광고성 콘텐츠 감지", "score": 0}

    content_lower = content.lower()
    keyword_hits = sum(1 for kw in COMINDWORKS_KEYWORDS if kw.lower() in content_lower)

    if keyword_hits == 0:
        return {
            "pass": False,
            "reason": "코마인드웍스 사업(AI/자동화/창업/콘텐츠/개발)과 연관성이 없습니다",
            "score": 10,
        }

    score = min(100, 40 + keyword_hits * 10)

    if len(content) < 200:
        score = max(score - 20, 30)
        if score < 40:
            return {"pass": False, "reason": "내용이 너무 짧고 구체성이 부족합니다", "score": score}

    return {"pass": True, "reason": f"품질 기준 통과 (키워드 {keyword_hits}개, 점수 {score})", "score": score}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quality_check.py <content_file> [type]")
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        content = f.read()

    content_type = sys.argv[2] if len(sys.argv) > 2 else "url"
    result = check_quality(content, content_type)

    status = "✅ 통과" if result["pass"] else "❌ 거부"
    print(f"{status} | 점수: {result['score']} | 사유: {result['reason']}")
    sys.exit(0 if result["pass"] else 1)
