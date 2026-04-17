#!/bin/bash
# Wiki 변경사항을 git commit & push 한다.

set -e

MSG="${1:-wiki: 자동 저장}"
REPO_ROOT="$(git rev-parse --show-toplevel)"

cd "$REPO_ROOT"

# 변경된 wiki/ 파일만 스테이징
git add wiki/ CLAUDE.md 2>/dev/null || true

# 변경사항 없으면 종료
if git diff --cached --quiet; then
    echo "변경사항 없음 — 커밋 스킵"
    exit 0
fi

git commit -m "$MSG"
git push

echo "✅ Git push 완료: $MSG"
