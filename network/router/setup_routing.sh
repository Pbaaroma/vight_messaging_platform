#!/bin/bash
set -e

echo "Configuring VIGHT network routing..."

# Enable forwarding inside the router.

# Client -> API network through router.
docker run --rm \
  --network container:vight-client-test \
  --cap-add NET_ADMIN \
  nicolaka/netshoot \
  ip route replace 172.25.20.0/24 via 172.25.10.2

# API -> Client network through router.
docker run --rm \
  --network container:vight-api \
  --cap-add NET_ADMIN \
  nicolaka/netshoot \
  ip route replace 172.25.10.0/24 via 172.25.20.3

# Apply firewall rules.
docker cp network/firewall/firewall_rules.sh \
  vight-router:/tmp/firewall_rules.sh

docker exec vight-router sh /tmp/firewall_rules.sh

echo "VIGHT routing configuration completed."
