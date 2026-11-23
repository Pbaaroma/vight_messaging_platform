#!/bin/bash
set -euo pipefail

echo "=================================="
echo "    VIGHT FIREWALL ALLOW TEST"
echo "=================================="

echo ""
echo "[TEST] Client network to Rust API (172.25.20.2:8000)"

if docker exec vight-client-test wget -q -T 5 \
    -O /dev/null http://172.25.20.2:8000/api/auth/me; then
    echo "[PASS] API connection allowed"
else
    # The API requires authentication, so HTTP 401 is expected.
    # Check whether the TCP connection succeeds.
    if docker exec vight-client-test sh -c \
        'nc -z -w 5 172.25.20.2 8000'; then
        echo "[PASS] API TCP connection allowed"
    else
        echo "[FAIL] API connection blocked"
        exit 1
    fi
fi

echo ""
echo "VIGHT FIREWALL ALLOW TEST: PASSED"
