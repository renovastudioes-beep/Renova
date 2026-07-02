#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

NODE_DIR="$ROOT/.tools/node-v22.14.0-darwin-arm64/bin"
if [[ -x "$NODE_DIR/node" ]]; then
  export PATH="$NODE_DIR:$PATH"
fi

echo "══════════════════════════════════════════"
echo "  RENVOA CLINIC — Go Live"
echo "══════════════════════════════════════════"
echo ""
echo "Fastest (≈2 min) — Vercel:"
echo "  npx vercel login"
echo "  npx vercel --prod"
echo ""
echo "Alternative — Netlify:"
echo "  npx netlify-cli login"
echo "  npx netlify-cli deploy --prod --dir=."
echo ""
echo "Free — GitHub Pages:"
echo "  1. Create repo at github.com/new"
echo "  2. git remote add origin git@github.com:YOU/renvoa-clinic.git"
echo "  3. git push -u origin main"
echo "  4. Repo → Settings → Pages → Source: GitHub Actions"
echo ""
echo "Before production: set a new adminPassword in js/config.js"
echo "══════════════════════════════════════════"

if command -v npx >/dev/null 2>&1 && [[ -n "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN found — deploying…"
  npx vercel --prod --yes --token "$VERCEL_TOKEN"
fi