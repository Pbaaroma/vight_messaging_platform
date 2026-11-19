#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "VIGHT AUTOMATIC MONITOR STARTED"
echo "Checking system every 10 seconds..."
echo "Press Ctrl+C to stop monitoring."

while true; do
    if ./automation/health_check.sh; then
        echo "[MONITOR] System healthy."
    else
        echo "[MONITOR] Failure detected. Starting recovery..."

        if ./automation/recovery.sh; then
            echo "[MONITOR] Recovery successful."
        else
            echo "[MONITOR] Recovery failed. Will retry."
        fi
    fi

    sleep 10
done
