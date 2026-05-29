#!/usr/bin/env bash
# 처음 개발할 때와 동일: npm install → npm start (터미널 QR)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo ""
echo "=== 헤어 다이어리 — 처음 개발 방식 ==="
echo "  npm start  (이 스크립트와 동일)"
echo ""
echo "같은 Wi-Fi: 터미널에 나온 QR 스캔"
echo "Wi-Fi 다름: Ctrl+C 후 npm run start:phone → npm run share"
echo ""

exec npx expo start --clear
