#!/bin/bash
set -euo pipefail

echo "=================================="
echo "       VIGHT TLS SECURITY TEST"
echo "=================================="

FAILED=0

echo ""
echo "[TEST 1] Checking HTTPS frontend..."

STATUS=$(curl -k -s --max-time 5 -o /dev/null \
    -w '%{http_code}' https://localhost:8443/ || true)

if [ "$STATUS" = "200" ]; then
    echo "[PASS] HTTPS frontend is responding"
else
    echo "[FAIL] HTTPS frontend returned: $STATUS"
    FAILED=1
fi

echo ""
echo "[TEST 2] Checking TLS handshake..."

TLS_OUTPUT=$(echo | timeout 8 openssl s_client \
    -connect localhost:8443 \
    -servername localhost 2>&1 || true)

if echo "$TLS_OUTPUT" | grep -Eq 'Protocol *: TLSv1\.[23]|New, TLSv1\.[23]'; then
    echo "[PASS] TLS 1.2/1.3 handshake successful"
else
    echo "[FAIL] TLS handshake unsuccessful"
    FAILED=1
fi

echo ""
echo "[TEST 3] Checking HTTPS API..."

API_STATUS=$(curl -k -s --max-time 5 -o /dev/null \
    -w '%{http_code}' https://localhost:8443/api/auth/me || true)

if [ "$API_STATUS" = "401" ]; then
    echo "[PASS] API accessible through HTTPS (401 expected)"
else
    echo "[FAIL] HTTPS API returned: $API_STATUS"
    FAILED=1
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
    echo "VIGHT TLS SECURITY TEST: PASSED"
else
    echo "VIGHT TLS SECURITY TEST: FAILED"
    exit 1
fi
