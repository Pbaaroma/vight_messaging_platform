#!/usr/bin/env python3

import asyncio
import csv
import getpass
import json
import ssl
import statistics
import time
import uuid

from datetime import datetime
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.request import (
    HTTPCookieProcessor,
    HTTPSHandler,
    Request,
    build_opener,
)

from websockets.asyncio.client import connect


BASE_URL = "https://localhost:8443"
WS_URL = "wss://localhost:8443/ws"

TEST_COUNT = 10
TIMEOUT = 10

# Local development certificate is self-signed.
# Never disable certificate verification for production testing.
SSL_CONTEXT = ssl._create_unverified_context()


def login(email, password):
    cookies = CookieJar()

    opener = build_opener(
        HTTPCookieProcessor(cookies),
        HTTPSHandler(context=SSL_CONTEXT),
    )

    payload = json.dumps({
        "email": email,
        "password": password,
    }).encode()

    request = Request(
        BASE_URL + "/api/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with opener.open(request, timeout=TIMEOUT) as response:
        user = json.load(response)

    session = next(
        (cookie.value for cookie in cookies
         if cookie.name == "vight_session"),
        None,
    )

    if not session:
        raise RuntimeError("Login succeeded but no session cookie was found")

    return user["user_id"], session


async def measure():
    print("=" * 45)
    print("VIGHT MESSAGE DELIVERY LATENCY TEST")
    print("=" * 45)

    print("\nCLIENT A")
    email_a = input("Email: ").strip()
    password_a = getpass.getpass("Password: ")

    print("\nCLIENT B")
    email_b = input("Email: ").strip()
    password_b = getpass.getpass("Password: ")

    print("\nAuthenticating clients...")

    user_a, cookie_a = await asyncio.to_thread(
        login, email_a, password_a
    )

    user_b, cookie_b = await asyncio.to_thread(
        login, email_b, password_b
    )

    if user_a == user_b:
        raise RuntimeError("Use two different VIGHT accounts")

    print("[PASS] Both clients authenticated")

    async with (
        connect(
            WS_URL,
            additional_headers={"Cookie": f"vight_session={cookie_a}"},
            ssl=SSL_CONTEXT,
        ) as socket_a,
        connect(
            WS_URL,
            additional_headers={"Cookie": f"vight_session={cookie_b}"},
            ssl=SSL_CONTEXT,
        ) as socket_b,
    ):
        print("[PASS] Both WebSocket connections established")

        results = []
        run_id = uuid.uuid4().hex[:8]

        print("\nSending test messages...\n")

        for number in range(1, TEST_COUNT + 1):
            marker = f"VIGHT-LATENCY-{run_id}-{number}"

            payload = {
                "receiver": user_b,
                "content": marker,
            }

            started = time.perf_counter()

            await socket_a.send(json.dumps(payload))

            try:
                while True:
                    response = await asyncio.wait_for(
                        socket_b.recv(),
                        timeout=TIMEOUT,
                    )

                    message = json.loads(response)

                    if (
                        message.get("content") == marker
                        and message.get("sender") == user_a
                        and message.get("receiver") == user_b
                    ):
                        elapsed = (
                            time.perf_counter() - started
                        ) * 1000

                        results.append({
                            "message": number,
                            "latency_ms": round(elapsed, 3),
                            "status": "delivered",
                        })

                        print(
                            f"Message {number:02d}: "
                            f"{elapsed:.3f} ms"
                        )

                        break

            except asyncio.TimeoutError:
                results.append({
                    "message": number,
                    "latency_ms": "",
                    "status": "timeout",
                })

                print(f"Message {number:02d}: TIMEOUT")

            await asyncio.sleep(0.2)

    delivered = [
        row["latency_ms"]
        for row in results
        if row["status"] == "delivered"
    ]

    output_dir = Path("monitoring/metrics")
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output = output_dir / f"vight_latency_{timestamp}.csv"

    with output.open("w", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["message", "latency_ms", "status"],
        )
        writer.writeheader()
        writer.writerows(results)

    print("\n" + "=" * 45)
    print("VIGHT LATENCY RESULTS")
    print("=" * 45)

    print(f"Messages sent: {TEST_COUNT}")
    print(f"Messages delivered: {len(delivered)}")
    print(
        f"Delivery success rate: "
        f"{len(delivered) / TEST_COUNT * 100:.1f}%"
    )

    if delivered:
        print(f"Average latency: {statistics.mean(delivered):.3f} ms")
        print(f"Minimum latency: {min(delivered):.3f} ms")
        print(f"Maximum latency: {max(delivered):.3f} ms")

    print(f"\nResults saved: {output}")


if __name__ == "__main__":
    try:
        asyncio.run(measure())
    except KeyboardInterrupt:
        print("\nTest interrupted.")
    except Exception as error:
        print(f"\n[ERROR] {error}")
        raise SystemExit(1)
