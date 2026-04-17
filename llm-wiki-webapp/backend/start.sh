#!/bin/bash
# LLM Wiki Backend 시작 스크립트 (Mac Mini용)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export WIKI_ROOT="$REPO_ROOT/wiki"
export REPO_ROOT="$REPO_ROOT"

# .env 파일 로드
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

# 가상환경 활성화 (있을 경우)
if [ -d "$SCRIPT_DIR/venv" ]; then
  source "$SCRIPT_DIR/venv/bin/activate"
fi

cd "$SCRIPT_DIR"
echo "Starting LLM Wiki Backend on port 3000..."
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
