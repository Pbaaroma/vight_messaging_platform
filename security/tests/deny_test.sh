#!/bin/bash
set -euo pipefail

echo "=================================="
echo "     VIGHT FIREWALL DENY TEST"
echo "=================================="

DB_IP="172.25.30.2"
DB_PORT="27017"

echo ""
echo "[TEST] Client attempting direct MongoDB access..."
echo "Target: $DB_IP:$DB_PORT"

if docker exec vight-client-test \
    nc -z -w 5 "$DB_IP" "$DB_PORT"; then

    echo "[FAIL] Client connected directly to MongoDB!"
    exit 1

else
    echo "[PASS] Direct MongoDB connection blocked"
fi

echo ""
echo "VIGHT FIREWALL DENY TEST: PASSED"
