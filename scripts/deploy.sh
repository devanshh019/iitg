#!/usr/bin/env bash
set -e

echo "============================================================"
echo "🚀 HACKOS ONE-COMMAND PRODUCTION DEPLOY SCRIPT"
echo "============================================================"

# Check for required deployment environment variables
MISSING=""
[ -z "$VERCEL_TOKEN" ] && MISSING="${MISSING} VERCEL_TOKEN"
[ -z "$RENDER_API_KEY" ] && MISSING="${MISSING} RENDER_API_KEY"

if [ -n "$MISSING" ]; then
  echo "⚠️ MISSING DEPLOYMENT CREDENTIALS:"
  for var in $MISSING; do
    echo "  - $var"
  done
  echo ""
  echo "Refer to docs/ENV.md and NEEDED FROM HUMAN in the project report."
  echo "To run locally, execute:"
  echo "  docker compose up --build"
  exit 1
fi

echo "1. Deploying Backend Blueprint to Render..."
# Render deploy trigger
curl -s -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json"

echo "2. Building & Deploying Frontend to Vercel..."
cd frontend
npx vercel --prod --token "$VERCEL_TOKEN" --yes

echo "3. Running live production smoke test..."
cd ..
./scripts/smoke.sh "https://hackos-backend.onrender.com"

echo "============================================================"
echo "✨ PRODUCTION DEPLOYMENT COMPLETE ✨"
echo "============================================================"
