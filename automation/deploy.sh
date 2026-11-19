#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Starting VIGHT network deployment..."

# Create networks if they do not exist.
create_network() {
    if ! docker network inspect "$1" >/dev/null 2>&1; then
        docker network create --subnet "$2" "$1"
    fi
}

create_network vight-client-net 172.25.10.0/24
create_network vight-api-net 172.25.20.0/24
create_network vight-db-net 172.25.30.0/24

# Check that the existing containers are running.
for container in vight-mongodb vight-api vight-router vight-client-test; do
    if [ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" != "true" ]; then
        echo "ERROR: $container is not running."
        exit 1
    fi
done

# Connect containers to their required networks.
connect_network() {
    if ! docker inspect -f '{{json .NetworkSettings.Networks}}' "$2" | \
        grep -q "\"$1\""; then
        docker network connect "$1" "$2"
    fi
}

connect_network vight-db-net vight-mongodb
connect_network vight-db-net vight-api
connect_network vight-api-net vight-api
connect_network vight-client-net vight-router
connect_network vight-api-net vight-router
connect_network vight-client-net vight-client-test

# Restore routes and firewall rules.
./network/router/setup_routing.sh

echo "VIGHT network deployment completed successfully."
