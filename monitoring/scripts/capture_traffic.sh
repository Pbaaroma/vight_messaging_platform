#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

INTERFACE="br-da42ec3024e0"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT="monitoring/captures/vight_baseline_${TIMESTAMP}.pcap"

echo "=================================="
echo "      VIGHT PACKET CAPTURE"
echo "=================================="
echo ""
echo "Interface: $INTERFACE"
echo "Output: $OUTPUT"
echo ""
echo "Capturing Rust API traffic for 60 seconds..."
echo "Open VIGHT and send messages during capture."
echo ""

sudo tcpdump -i "$INTERFACE" \
    -nn \
    -s 0 \
    -w "$OUTPUT" \
    'tcp port 8000'

echo ""
echo "Capture saved: $OUTPUT"
