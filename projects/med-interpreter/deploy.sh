#!/usr/bin/env bash
# MediBridge 를 Vercel 에 배포한다. 먼저 `npx vercel login` 으로 로그인해 두어야 한다.
# .env.local 의 값을 화면에 찍지 않고 Vercel 환경변수로 옮긴 뒤 운영 배포한다.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env.local ] || { echo ".env.local 이 없습니다"; exit 1; }

npx -y vercel link --yes --project medibridge-desk >/dev/null

while IFS= read -r line || [ -n "$line" ]; do
  [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
  key="${line%%=*}"; val="${line#*=}"
  for target in production; do
    npx -y vercel env rm "$key" "$target" --yes >/dev/null 2>&1 || true
    printf '%s' "$val" | npx -y vercel env add "$key" "$target" >/dev/null
  done
  echo "환경변수 등록: $key"
done < .env.local

npx -y vercel deploy --prod --yes
