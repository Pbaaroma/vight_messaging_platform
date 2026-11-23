#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=================================="
echo "     VIGHT AUTOMATIC RECOVERY"
echo "=================================="

RECOVERED=0
NETWORK_RECOVERY=0

for container in vight-mongodb vight-api vight-router vight-client-test vight-nginx; do
    if [ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" != "true" ]; then
        echo "[RECOVERY] Starting $container..."
        docker start "$container"
        RECOVERED=1

        if [ "$container" != "vight-nginx" ]; then
                NETWORK_RECOVERY=1
        fi

    else
        echo "[OK] $container is running"
    fi
done

if [ "$RECOVERED" -eq 1 ]; then
    echo ""
    echo "[RECOVERY] Waiting for services..."
    sleep 5

fi
    if [ "$NETWORK_RECOVERY" -eq 1 ]; then
    echo "[RECOVERY] Restoring network routing and firewall..."
    ./network/router/setup_routing.sh
fi

echo ""
echo "[RECOVERY] Verifying system health..."
./automation/health_check.sh

echo ""
echo "VIGHT RECOVERY CHECK COMPLETED"
