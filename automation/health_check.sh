#!/bin/bash
set -euo pipefail

echo "=================================="
echo "     VIGHT HEALTH MONITOR"
echo "=================================="

FAILED=0

check_container() {
    local name="$1"

    if [ "$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null)" = "true" ]; then
        echo "[PASS] $name is running"
    else
        echo "[FAIL] $name is not running"
        FAILED=1
    fi
}

echo ""
echo "Checking Docker containers..."

check_container vight-mongodb
check_container vight-api
check_container vight-router
check_container vight-client-test
check_container vight-nginx


echo ""
echo "Checking MongoDB..."

if docker exec vight-mongodb mongosh \
    --quiet --eval 'db.adminCommand({ping:1}).ok' 2>/dev/null | grep -qx '1'; then
    echo "[PASS] MongoDB is responding"
else
    echo "[FAIL] MongoDB is not responding"
    FAILED=1
fi

echo ""
echo "Checking Rust API..."

if curl --silent --max-time 5 \
    --output /dev/null \
    --write-out '%{http_code}' \
    http://127.0.0.1:8001/api/auth/me | grep -qx '401'; then
    echo "[PASS] Rust API is responding (401 expected without login)"
else
    echo "[FAIL] Rust API is not responding as expected"
    FAILED=1
fi

echo ""
if [ "$FAILED" -eq 0 ]; then

echo ""
echo "Checking HTTPS frontend..."

if curl --insecure --silent --max-time 5 \
    --output /dev/null \
    --write-out '%{http_code}' \
    https://127.0.0.1:8443/ | grep -qx '200'; then
    echo "[PASS] VIGHT HTTPS frontend is responding"
else
    echo "[FAIL] VIGHT HTTPS frontend is not responding"
    FAILED=1
fi

    echo "VIGHT HEALTH CHECK: PASSED"
else
    echo "VIGHT HEALTH CHECK: FAILED"
    exit 1
fi
