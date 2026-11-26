#!/usr/bin/env bash
# MediBridge 를 Vercel 에 배포한다. 먼저 `npx vercel login` 으로 로그인해 두어야 한다.
# .env.local 의 값을 화면에 찍지 않고 Vercel 환경변수(운영)로 옮긴 뒤 운영 배포한다.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env.local ] || { echo ".env.local 이 없습니다"; exit 1; }

npx -y vercel link --yes --project medibridge-desk </dev/null >/dev/null 2>&1

# 파일을 먼저 다 읽는다 (아래 명령들이 파일 내용을 입력으로 가로채지 않게)
lines=()
while IFS= read -r line || [ -n "$line" ]; do lines+=("$line"); done < .env.local

for line in "${lines[@]}"; do
  [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
  key="${line%%=*}"; val="${line#*=}"
  [[ "$key" == VERCEL_* ]] && continue   # vercel link 가 넣는 토큰은 올리지 않는다
  printf '%s' "$val" | npx -y vercel env add "$key" --environment production --force --sensitive --yes >/dev/null 2>&1
  echo "환경변수 등록: $key"
done

npx -y vercel deploy --prod --yes </dev/null 2>&1 | grep -E "Production URL|Error|error" || true
