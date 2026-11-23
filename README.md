# Vight Messaging Platfrom 

### Secure Real-Time Messaging with Network Monitoring and Performance Analysis

VIGHT is a secure real-time messaging platform developed to demonstrate how modern networking technologies work together to support communication between multiple users.

The project combines a React frontend, Rust backend, MongoDB database, Nginx reverse proxy, and Docker-based network infrastructure.

Beyond building a functional messaging application, our main focus was understanding what happens behind the scenes when messages travel across a network. We implemented authentication, WebSocket communication, HTTPS encryption, network segmentation, firewall rules, traffic monitoring, and automated recovery.

We also used Wireshark to examine network packets and conducted experiments involving latency, network delay, packet loss, and TCP retransmissions.

The goal was not simply to create a messaging application, but to build a system where we could observe, test, and analyze the networking technologies responsible for delivering messages.

---

## 1. Project Objectives

The primary objectives of VIGHT are:

- Develop a real-time messaging platform using WebSockets.
- Implement user authentication and persistent message storage.
- Secure browser-to-server communication using HTTPS/TLS.
- Configure Docker networking to separate application components.
- Implement routing and firewall rules to control network traffic.
- Monitor network traffic using Wireshark and tcpdump.
- Measure message delivery latency under different network conditions.
- Simulate network delays and packet loss.
- Analyze TCP retransmissions and reliable message delivery.
- Implement automated health monitoring and service recovery.

These objectives allow us to evaluate both the functionality of the messaging platform and the behavior of its underlying network infrastructure.

---

## 2. Technologies Used

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| TypeScript | Frontend application development |
| Vite | Frontend development and build tooling |
| Rust | Backend application development |
| Axum | HTTP API and WebSocket handling |
| MongoDB | Persistent data storage |
| Nginx | HTTPS reverse proxy |
| Docker | Containerization and network isolation |
| WebSockets | Real-time bidirectional communication |
| TCP/IP | Reliable network transport |
| TLS | Encryption between the browser and Nginx |
| Linux | Development and network configuration |
| Bash | Automation and security testing |
| Python | Message latency measurement |
| Wireshark | Network packet inspection |
| tcpdump | Network traffic capture |
| Linux `tc/netem` | Network delay and packet-loss simulation |
| Git/GitHub | Version control and collaboration |

---

## 3. System Architecture

VIGHT uses a multi-component architecture in which each service has a specific responsibility.

```text
                 VIGHT MESSAGING PLATFORM

                     User / Browser
                           |
                           |
                    HTTPS / WSS
                     Port 8443
                           |
                           v
                +---------------------+
                |    Nginx Proxy      |
                |                     |
                | HTTPS Termination   |
                | Reverse Proxy       |
                +---------------------+
                           |
                           |
                    HTTP / WebSocket
                      Port 8000
                           |
                           v
                +---------------------+
                |    Rust Backend     |
                |                     |
                | Authentication      |
                | REST API            |
                | WebSocket Server    |
                | Message Processing  |
                +---------------------+
                           |
                           |
                      MongoDB
                           |
                           v
                +---------------------+
                |   MongoDB Database  |
                |                     |
                | Users               |
                | Sessions            |
                | Messages            |
                +---------------------+
```

### Network Infrastructure

The Docker environment also contains a test client and router used for network experiments.

```text
                 Docker Network Infrastructure

               +----------------------+
               |    Test Client       |
               |  vight-client-test   |
               +----------------------+
                          |
                          |
                    Client Network
                    172.25.10.0/24
                          |
                          v
               +----------------------+
               |     VIGHT Router     |
               |     vight-router     |
               |                      |
               | Routing / Firewall   |
               +----------------------+
                          |
                          |
                      API Network
                    172.25.20.0/24
                          |
              +-----------+-----------+
              |                       |
              v                       v
       +-------------+         +-------------+
       | Rust API    |         | Nginx       |
       +-------------+         +-------------+
              |
              |
         DB Network
       172.25.30.0/24
              |
              v
       +-------------+
       | MongoDB     |
       +-------------+
```

This architecture allows us to test communication between services while controlling which networks can access specific components.

---

## 4. Main Features

### Real-Time Messaging

VIGHT supports real-time communication through WebSockets.

When a user sends a message:

1. The frontend sends the message through an authenticated WebSocket connection.
2. Nginx forwards the WebSocket traffic to the Rust backend.
3. The backend processes the message.
4. The message is stored in MongoDB.
5. The backend broadcasts the message to the appropriate connected users.
6. The receiving client displays the message.

WebSockets allow users to exchange messages without repeatedly making HTTP requests to check for new messages.

### User Authentication

VIGHT implements session-based authentication.

The backend verifies user credentials and creates a session that is used to authenticate subsequent requests.

WebSocket connections are also checked for valid authentication.

This helps prevent unauthenticated clients from accessing protected messaging functionality.

### Persistent Message Storage

MongoDB stores application data, including:

- User records
- Authentication sessions
- Messages

This allows messages to remain available after a user disconnects or refreshes the application.

### HTTPS and TLS

Nginx provides HTTPS access to the frontend and supports secure WebSocket connections.

The local development environment uses a self-signed TLS certificate.

HTTPS and WSS protect communication between the browser and Nginx.

**Security scope:** TLS terminates at Nginx. Communication from Nginx to the Rust backend occurs over the internal Docker network and is not independently TLS-encrypted.

### Docker Network Segmentation

VIGHT separates application components into different Docker networks.

The network configuration includes:

- Client network
- API network
- Database network

This allows us to control communication paths and evaluate network isolation.

### Firewall and Routing

The project includes Linux routing and firewall configuration.

The firewall rules are designed to:

- Allow authorized client-to-API communication.
- Allow established and related traffic.
- Block direct client access to the database network.
- Restrict other unauthorized forwarding.

We verified the firewall configuration using dedicated allow and deny tests.

### Automated Monitoring and Recovery

VIGHT includes scripts for monitoring service availability and recovering stopped services.

The health-check system verifies:

- Docker container status
- MongoDB connectivity
- Rust API availability
- HTTPS frontend availability

The recovery system can restart stopped services and restore network routing when necessary.

---

## 5. Project Structure

The main project components are organized as follows:

```text
vight_messaging_platform/
|
|-- frontend/
|   |-- src/
|   |-- package.json
|   `-- vite.config.ts
|
|-- backend/
|   |-- src/
|   |   |-- main.rs
|   |   `-- websocket/
|   |       `-- handler.rs
|   `-- Cargo.toml
|
|-- database/
|
|-- network/
|   |-- router/
|   |   `-- setup_routing.sh
|   `-- firewall/
|       `-- firewall_rules.sh
|
|-- security/
|   |-- nginx/
|   |   |-- Dockerfile
|   |   `-- nginx.conf
|   |
|   |-- tls/
|   |
|   `-- tests/
|       |-- allow_test.sh
|       |-- deny_test.sh
|       `-- tls_test.sh
|
|-- monitoring/
|   |-- scripts/
|   |   |-- capture_traffic.sh
|   |   `-- measure_latency.py
|   |
|   |-- captures/
|   `-- metrics/
|
|-- automation/
|   |-- health_check.sh
|   |-- auto_monitor.sh
|   |-- recovery.sh
|   `-- deploy.sh
|
|-- test_clients/
|
`-- .gitignore
```

The monitoring directories store locally generated packet captures and performance measurements. These files may not be included in the Git repository.

---

## 6. Running VIGHT

### Prerequisites

The development environment uses Ubuntu Linux.

Required tools include:

- Docker
- Docker Compose
- Git
- Node.js and npm
- Rust and Cargo
- Python 3
- Wireshark or tcpdump for packet analysis

### Clone the Repository

```bash
git clone https://github.com/Pbaaroma/vight_messaging_platform.git

cd vight_messaging_platform
```

### Configuration

VIGHT uses multiple Docker services and custom network configurations.

Before starting the application, ensure that the required Docker networks, containers, application configuration, and local TLS certificates have been configured.

The project currently uses a development/laboratory environment. Cloning the repository alone does not automatically recreate the complete running environment.

### Verify the Running System

After starting and configuring the VIGHT services, run:

```bash
./automation/health_check.sh
```

A successful health check confirms that the required containers are running and the database, API, and HTTPS frontend respond.

### Access the Application

In the configured local environment, open:

```text
https://localhost:8443
```

Because the development environment uses a self-signed certificate, the browser may display a certificate warning.

Only proceed past that warning when working with your own trusted local development environment.

---

## 7. Security Testing

VIGHT includes scripts for testing network access controls and HTTPS connectivity.

### Allowed Traffic Test

```bash
./security/tests/allow_test.sh
```

This test checks whether the permitted client-to-API communication path is accessible.

An HTTP 401 response from a protected API endpoint is expected when the request does not include valid authentication.

### Denied Traffic Test

```bash
./security/tests/deny_test.sh
```

This test evaluates whether the network configuration prevents unauthorized direct access to the database network.

Firewall packet counters were also examined to verify that the router's DROP rule was being exercised.

### TLS Verification

```bash
./security/tests/tls_test.sh
```

This test verifies HTTPS availability and the TLS handshake.

Testing confirmed that the frontend could be accessed through HTTPS and that the TLS connection could be established.

---

## 8. Network Monitoring

One of the major parts of VIGHT is analyzing the traffic generated by the messaging platform.

We used Wireshark and tcpdump to inspect communication between the different components.

### Wireshark Analysis

Wireshark was used to examine:

- TCP connection establishment
- TCP acknowledgments
- HTTP requests and responses
- WebSocket connection upgrades
- WebSocket message traffic
- TCP round-trip time
- TCP retransmissions
- Packet rates and network throughput

### Useful Wireshark Filters

**Rust backend traffic:**

```text
tcp.port == 8000
```

**WebSocket upgrade requests:**

```text
http.request.uri == "/ws"
```

**TCP retransmissions:**

```text
tcp.analysis.retransmission
```

**TCP round-trip time:**

```text
tcp.analysis.ack_rtt
```

**TCP analysis warnings:**

```text
tcp.analysis.flags
```

These filters helped us isolate specific network events during testing.

### Packet Capture

The project also includes a Bash script for collecting network traffic:

```bash
./monitoring/scripts/capture_traffic.sh
```

Captured packets can be opened in Wireshark for additional analysis.

**Note:** Packet captures may contain sensitive application traffic, including session information. They should be reviewed before being shared publicly.

---

## 9. Message Latency Testing

VIGHT includes a Python script that measures message delivery latency.

The script authenticates test clients, establishes WebSocket connections, sends test messages, and measures the time between sending a message and receiving it.

Run the script from the configured development environment:

```bash
test_clients/.venv/bin/python monitoring/scripts/measure_latency.py
```

The script requires the appropriate Python dependencies and valid test accounts.

Results are saved as CSV files in:

```text
monitoring/metrics/
```

### Performance Results

The following results were recorded during testing:

| Network Condition | Average Message Latency | Messages Delivered |
|---|---:|---:|
| Baseline | 1.320 ms | 10/10 |
| Simulated 50 ms delay | 101.736 ms | 10/10 |
| 5% packet loss — Run 1 | 42.815 ms | 10/10 |
| 5% packet loss — Run 2 | 21.907 ms | 10/10 |

These results demonstrate how network conditions can affect message delivery time.

The baseline test produced low application-level latency.

When a simulated 50 ms network delay was introduced, average message latency increased to approximately 102 ms.

During packet-loss testing, messages were still delivered in the recorded runs, but some experienced significant delays.

A separate 10% packet-loss experiment was also conducted, and its measurements were saved for analysis.

**Important:** These measurements reflect the specific local test environment and sample sizes. They should not be interpreted as guaranteed performance under all network conditions.

---

## 10. Packet-Loss Simulation

We used Linux traffic control (`tc`) with the `netem` module to simulate different network conditions.

The tests were applied to the Nginx container's network interface using a temporary network utility container.

### Example: Simulating 50 ms Delay

```bash
docker run --rm \
  --network container:vight-nginx \
  --cap-add NET_ADMIN \
  nicolaka/netshoot \
  tc qdisc replace dev eth0 root netem delay 50ms
```

### Example: Simulating 5% Packet Loss

```bash
docker run --rm \
  --network container:vight-nginx \
  --cap-add NET_ADMIN \
  nicolaka/netshoot \
  tc qdisc replace dev eth0 root netem loss 5%
```

### Example: Simulating 10% Packet Loss

```bash
docker run --rm \
  --network container:vight-nginx \
  --cap-add NET_ADMIN \
  nicolaka/netshoot \
  tc qdisc replace dev eth0 root netem loss 10%
```

These commands are intended for controlled testing in the VIGHT laboratory environment.

### Restoring Normal Network Conditions

After testing, remove the simulated impairment:

```bash
docker run --rm \
  --network container:vight-nginx \
  --cap-add NET_ADMIN \
  nicolaka/netshoot \
  tc qdisc del dev eth0 root
```

Verify the network configuration:

```bash
docker run --rm \
  --network container:vight-nginx \
  nicolaka/netshoot \
  tc qdisc show dev eth0
```

The restored configuration was verified with:

```text
qdisc noqueue 0: root refcnt 2
```

---

## 11. TCP Retransmission Analysis

TCP provides reliable, ordered delivery of data through mechanisms such as acknowledgments and retransmissions.

During our network experiments, Wireshark identified a suspected TCP retransmission between the Rust backend and Nginx.

The captured event included:

| Field | Observed Value |
|---|---|
| Packet number | 192 |
| Source | 172.25.20.2 |
| Destination | 172.25.20.4 |
| Protocol | TCP |
| Classification | TCP Retransmission |
| TCP payload length | 230 bytes |

This observation demonstrates how Wireshark can be used to identify potential retransmission events in the network.

However, a Wireshark retransmission classification alone does not establish exactly which earlier packet was lost or prove that a specific simulated loss event caused that retransmission.

---

## 12. Health Monitoring and Automatic Recovery

VIGHT includes automation scripts that help monitor the application and restore stopped services.

### Health Check

```bash
./automation/health_check.sh
```

The script verifies the operational status of the platform.

### Continuous Monitoring

```bash
./automation/auto_monitor.sh
```

This script can be used to monitor service availability repeatedly.

### Recovery

```bash
./automation/recovery.sh
```

The recovery script attempts to restore stopped services and reconfigure network routing when required.

During testing, we deliberately stopped a service and verified that the recovery process could restore availability.

### Final Health Verification

After completing the network experiments, the final health check returned:

```text
==================================
     VIGHT HEALTH MONITOR
==================================

Checking Docker containers...
[PASS] vight-mongodb is running
[PASS] vight-api is running
[PASS] vight-router is running
[PASS] vight-client-test is running
[PASS] vight-nginx is running

Checking MongoDB...
[PASS] MongoDB is responding

Checking Rust API...
[PASS] Rust API is responding (401 expected without login)

Checking HTTPS frontend...
[PASS] VIGHT HTTPS frontend is responding

VIGHT HEALTH CHECK: PASSED
```

This confirmed that the main services were operational after the network testing.

---

## 13. Challenges and Lessons Learned

Developing VIGHT involved more than implementing a messaging interface.

Some of the major challenges included:

**Docker networking and routing**

We had to configure communication between containers connected to different networks while ensuring that unauthorized traffic was restricted.

**WebSocket communication**

We worked on establishing and maintaining authenticated WebSocket connections through the Nginx reverse proxy.

**HTTPS and TLS**

Configuring Nginx to serve the frontend over HTTPS and correctly forward WebSocket connections required additional testing.

**Firewall verification**

We learned that an unsuccessful connection attempt does not automatically prove a specific firewall rule blocked the traffic. Inspecting routing paths and firewall counters helped us verify the actual behavior.

**Performance measurement**

We developed a method for measuring application-level message latency and compared the results under different network conditions.

**Packet analysis**

Wireshark helped us understand the difference between TCP-level measurements, application-level latency, and retransmission warnings.

**Service recovery**

We implemented monitoring and recovery scripts to reduce the amount of manual work required when a service stops.

Overall, this project helped us connect networking concepts learned in class with practical implementation and troubleshooting.

---

## 14. Current Limitations

VIGHT is a working academic development project, but it is not presented as a production-ready messaging service.

Current limitations include:

- The local environment uses a self-signed TLS certificate.
- TLS terminates at Nginx rather than extending across every internal connection.
- The system has been tested primarily in a controlled Docker environment.
- Performance results are based on small experimental samples.
- The full environment requires additional configuration beyond cloning the repository.
- The authentication cookie's secure-transport settings should be reviewed before production deployment.
- Additional security testing and larger-scale performance evaluation would be needed before public deployment.

These limitations provide opportunities for future development.

---

## 15. Future Improvements

Potential improvements include:

- Deploying the platform to a cloud environment.
- Automating the complete Docker deployment process.
- Improving certificate and session security configuration.
- Expanding automated integration testing.
- Adding larger-scale concurrent-user performance tests.
- Creating a dashboard for live network metrics.
- Implementing more detailed delivery-status tracking.
- Extending monitoring and recovery capabilities.
- Improving logging and observability.

---

## 16. Conclusion

VIGHT demonstrates how a real-time messaging application depends on multiple networking technologies working together.

By combining React, Rust, MongoDB, Nginx, Docker, WebSockets, and TLS, we built a messaging platform that supports authenticated communication and persistent message storage.

We then extended the project with network segmentation, firewall controls, monitoring scripts, automated recovery, and packet analysis.

Our experiments showed that simulated network delay and packet loss can significantly affect message delivery latency. Wireshark also allowed us to inspect TCP communication and identify a suspected retransmission.

The biggest lesson from this project was understanding that building a working application is only one part of the process. Knowing how data travels, how connections are protected, and how the system behaves when network conditions change is equally important.

VIGHT brought those concepts together in one practical project.

---

## 17. Repository

**GitHub:** [VIGHT Messaging Platform](https://github.com/Pbaaroma/vight_messaging_platform)

**Latest verified implementation commit:** `1a59130`

---

## 18. Project Status

**Status: Academic development and testing completed for the documented implementation.**

The latest verified system health check passed, and the networking, security, monitoring, and performance-testing changes were committed and pushed to the `main` branch.

Further work is required before production deployment.
