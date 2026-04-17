"""수집된 자료의 품질을 평가한다. Claude가 주 판단자이고 이 스크립트는 보조 휴리스틱."""

import sys
import re

# 실질적 내용이 있어야 하는 키워드 (단독으로 충분하지 않은 단어는 제외)
COMINDWORKS_KEYWORDS = [
    "에이전트", "자동화", "n8n", "claude", "llm", "창업",
    "콘텐츠", "유튜브", "블로그", "python", "api", "리서치", "스타트업",
    "워크플로우", "프롬프트", "gpt", "make", "zapier", "노코드",
    "수익화", "퍼널", "랜딩페이지", "ai에이전트", "챗봇",
]

# 단독으로는 의미없는 광범위 단어 (다른 키워드와 함께일 때만 유효)
WEAK_KEYWORDS = ["AI", "비즈니스", "개발", "수익", "서비스"]

SPAM_PATTERNS = [
    r"대출|도박|카지노|성인|불법",
    r"(.)(\1{10,})",
]

# 포털/검색엔진처럼 내용 없는 사이트 패턴
EMPTY_SITE_PATTERNS = [
    r"^(Google|Naver|Daum|Bing|Yahoo)",
    r"Gmail|로그인|검색|약관|개인정보처리방침",
]

PERSONAL_TYPES = ["diary", "thought", "experience", "retrospect"]

MIN_CONTENT_LENGTH = 200  # 최소 200자 이상이어야 실질 내용으로 판단


def check_quality(content: str, content_type: str = "url") -> dict:
    if content_type in PERSONAL_TYPES:
        return {"pass": True, "reason": "개인 자료 — 품질 검사 면제", "score": 100}

    stripped = content.strip()

    # 1. 최소 길이 검사 (강화: 200자)
    if len(stripped) < MIN_CONTENT_LENGTH:
        return {
            "pass": False,
            "reason": f"내용이 너무 짧습니다 ({len(stripped)}자 — 최소 {MIN_CONTENT_LENGTH}자 필요). 포털/검색엔진 홈페이지일 가능성이 높습니다.",
            "score": 0,
        }

    # 2. 스팸 패턴
    for pattern in SPAM_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            return {"pass": False, "reason": "스팸/불법 콘텐츠 감지", "score": 0}

    # 3. 내용 없는 사이트 패턴 (포털 홈페이지 등)
    for pattern in EMPTY_SITE_PATTERNS:
        if re.search(pattern, stripped[:100], re.IGNORECASE):
            if len(stripped) < 500:
                return {
                    "pass": False,
                    "reason": "포털/검색엔진 홈페이지로 판단됩니다. 실질적인 내용이 없습니다.",
                    "score": 5,
                }

    content_lower = content.lower()

    # 4. 실질 키워드 검사
    strong_hits = sum(1 for kw in COMINDWORKS_KEYWORDS if kw.lower() in content_lower)
    weak_hits = sum(1 for kw in WEAK_KEYWORDS if kw.lower() in content_lower)

    # 강한 키워드 0개 + 약한 키워드만 있으면 거부
    if strong_hits == 0 and weak_hits <= 1:
        return {
            "pass": False,
            "reason": "코마인드웍스 사업(AI에이전트/자동화/창업/콘텐츠/개발)과 연관성이 없습니다.",
            "score": 10,
        }

    # 5. 점수 계산
    score = min(100, 40 + strong_hits * 12 + weak_hits * 3)

    # 길이 보너스
    if len(stripped) > 1000:
        score = min(100, score + 10)

    return {"pass": True, "reason": f"품질 기준 통과 (핵심키워드 {strong_hits}개, 점수 {score})", "score": score}


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
