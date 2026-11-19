#!/bin/sh
set -eu

CLIENT_NET="172.25.10.0/24"
API_IP="172.25.20.2"
DB_NET="172.25.30.0/24"

# Create a dedicated firewall chain if necessary.
iptables -N VIGHT_FORWARD 2>/dev/null || true

# Clear previous VIGHT rules to prevent duplicates.
iptables -F VIGHT_FORWARD

# Allow established connections.
iptables -A VIGHT_FORWARD -m conntrack \
  --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow client access to the Rust API.
iptables -A VIGHT_FORWARD -s "$CLIENT_NET" -d "$API_IP" \
  -p tcp --dport 8000 -j ACCEPT

# Block client access to MongoDB.
iptables -A VIGHT_FORWARD -s "$CLIENT_NET" -d "$DB_NET" -j DROP

# Block other forwarded client traffic.
iptables -A VIGHT_FORWARD -s "$CLIENT_NET" -j DROP

# Return control for other traffic.
iptables -A VIGHT_FORWARD -j RETURN

# Add the chain to FORWARD only if it is not already linked.
iptables -C FORWARD -j VIGHT_FORWARD 2>/dev/null || \
  iptables -I FORWARD 1 -j VIGHT_FORWARD

echo "VIGHT firewall configured without duplicate rules."
