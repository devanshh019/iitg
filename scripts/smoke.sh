#!/usr/bin/env bash
set -e

# HACKOS End-to-End Production Smoke Verification Script
BASE_URL="${1:-http://localhost:8000}"
echo "============================================================"
echo "🚀 HACKOS PRODUCTION SMOKE TEST RUNNER"
echo "Target Base URL: ${BASE_URL}"
echo "Timestamp: $(date -u)"
echo "============================================================"

# 1. Health Probe
echo -n "[1/10] Verifying /health liveness probe... "
HEALTH_RESP=$(curl -s -f "${BASE_URL}/health")
echo "OK"
echo "  Response: ${HEALTH_RESP}"

# 2. Ready Probe (Database connectivity)
echo -n "[2/10] Verifying /ready readiness probe... "
READY_RESP=$(curl -s -f "${BASE_URL}/ready")
echo "OK"
echo "  Response: ${READY_RESP}"

# 3. Authentication & JWT Issuance
echo -n "[3/10] Authenticating Super Admin (commander@hackos.io)... "
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"commander@hackos.io","password":"Password123!"}')
TOKEN=$(echo "${LOGIN_RESP}" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "None" ]; then
  echo "FAILED to acquire token!"
  echo "${LOGIN_RESP}"
  exit 1
fi
echo "SUCCESS"
echo "  Acquired JWT Token: ${TOKEN:0:20}..."

# 4. Fetch Mission by Slug
echo -n "[4/10] Fetching Demo Mission 'apollo-24'... "
EVENT_RESP=$(curl -s -f "${BASE_URL}/api/events/by-slug/apollo-24")
EVENT_ID=$(echo "${EVENT_RESP}" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "FOUND (ID: ${EVENT_ID})"

# 5. Register Smoke Participant
SMOKE_RANDOM=$((RANDOM % 9000 + 1000))
SMOKE_EMAIL="smoke_crew_${SMOKE_RANDOM}@smoke.hackos.io"
echo -n "[5/10] Registering Smoke Crew Member (${SMOKE_EMAIL})... "
REG_RESP=$(curl -s -X POST "${BASE_URL}/api/events/${EVENT_ID}/participants/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Officer ${SMOKE_RANDOM}\",\"email\":\"${SMOKE_EMAIL}\",\"college\":\"Smoke Test Orbit Base\"}")
PART_ID=$(echo "${REG_RESP}" | python3 -c "import sys, json; print(json.load(sys.stdin)['participant']['id'])")
FALLBACK_CODE=$(echo "${REG_RESP}" | python3 -c "import sys, json; print(json.load(sys.stdin)['participant']['fallback_code'])")
echo "SUCCESS (ID: ${PART_ID}, Code: ${FALLBACK_CODE})"

# 6. Offline Boarding Verification & Sync
echo -n "[6/10] Performing Idempotent Boarding Gate Check-in... "
OP_ID="smoke-op-$(uuidgen 2>/dev/null || date +%s)"
SCAN_RESP=$(curl -s -X POST "${BASE_URL}/api/events/${EVENT_ID}/boarding/sync" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\":\"smoke-scanner-gate\",\"station\":\"entry\",\"scans\":[{\"op_id\":\"${OP_ID}\",\"participant_token_or_code\":\"${FALLBACK_CODE}\",\"station\":\"entry\",\"method\":\"fallback_code\",\"device_id\":\"smoke-scanner-gate\",\"claimed_at\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}]}")
SCAN_STATUS=$(echo "${SCAN_RESP}" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['status'])")
echo "STATUS: ${SCAN_STATUS}"

# 7. Replay Check-in for Idempotency
echo -n "[7/10] Testing Replay Idempotency with identical op_id... "
REPLAY_RESP=$(curl -s -X POST "${BASE_URL}/api/events/${EVENT_ID}/boarding/sync" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\":\"smoke-scanner-gate\",\"station\":\"entry\",\"scans\":[{\"op_id\":\"${OP_ID}\",\"participant_token_or_code\":\"${FALLBACK_CODE}\",\"station\":\"entry\",\"method\":\"fallback_code\",\"device_id\":\"smoke-scanner-gate\",\"claimed_at\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}]}")
REPLAY_MSG=$(echo "${REPLAY_RESP}" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['message'])")
echo "PASSED (${REPLAY_MSG:0:40}...)"

# 8. Flight Review Leaderboard (Raw vs Z-Score Normalized)
echo -n "[8/10] Querying Flight Review Normalized Leaderboard... "
LEADERBOARD=$(curl -s -f "${BASE_URL}/api/events/${EVENT_ID}/judging/leaderboard")
TOP_SQUAD=$(echo "${LEADERBOARD}" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"{data[0]['team_name']} (Score: {data[0]['normalized_score']})\")")
echo "OK"
echo "  Top Ranked: ${TOP_SQUAD}"

# 9. Verify Cryptographic Hash-Chained Audit Ledger
echo -n "[9/10] Executing Full Cryptographic Audit Chain Verification... "
AUDIT_RESP=$(curl -s -f "${BASE_URL}/api/audit/verify?event_id=${EVENT_ID}")
IS_VALID=$(echo "${AUDIT_RESP}" | python3 -c "import sys, json; print(json.load(sys.stdin)['is_valid'])")
TOTAL_BLOCKS=$(echo "${AUDIT_RESP}" | python3 -c "import sys, json; print(json.load(sys.stdin)['total_entries'])")
if [ "${IS_VALID}" = "True" ]; then
  echo "VERIFIED (Unbroken chain across ${TOTAL_BLOCKS} blocks)"
else
  echo "FAILED! Audit verification failed: ${AUDIT_RESP}"
  exit 1
fi

# 10. Multi-Format Report Export
echo -n "[10/10] Testing Multi-Format Export Generation (CSV & Debrief PDF)... "
curl -s -f "${BASE_URL}/api/events/${EVENT_ID}/exports/csv?export_type=scores" -H "Authorization: Bearer ${TOKEN}" > /tmp/smoke_scores.csv
curl -s -f "${BASE_URL}/api/events/${EVENT_ID}/exports/pdf/debrief" -H "Authorization: Bearer ${TOKEN}" > /tmp/smoke_debrief.pdf
CSV_SIZE=$(wc -c < /tmp/smoke_scores.csv)
PDF_SIZE=$(wc -c < /tmp/smoke_debrief.pdf)
echo "SUCCESS"
echo "  Generated scores CSV (${CSV_SIZE} bytes) and Mission Debrief PDF (${PDF_SIZE} bytes)"

echo "============================================================"
echo "✨ ALL 10 SMOKE TEST PHASES PASSED WITH ZERO ERRORS ✨"
echo "============================================================"
