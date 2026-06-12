#!/usr/bin/env bash
# Build + (re)launch The Big Event on the VPS. Run from the repo root:
#   ./deploy/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies"
npm install
npm install --prefix "The Big Event"
npm install --prefix server

echo "==> Checking server/.env"
if [ ! -f server/.env ]; then
  echo "!! server/.env is missing. Create it with your Anthropic key:"
  echo "     printf 'ANTHROPIC_API_KEY=sk-ant-...\\nPORT=4000\\n' > server/.env"
  exit 1
fi

echo "==> Building frontend"
npm run build --prefix "The Big Event"

echo "==> Starting/reloading PM2 process"
if pm2 describe bigevent >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo "==> Done. App is running on port \${PORT:-4000}."
