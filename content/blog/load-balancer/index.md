---
title: "I built a Load Balancer from Scratch - Every Request Is a Lie"
date: "2026-03-03T22:40:32.169Z"
description: ⚖️
---

## Why a Load Balancer Looks Simple (Until It Breaks)

This is a **Layer 7 (application layer)** load balancer. It operates at the HTTP level — it understands requests, URLs, headers, and status codes. A Layer 4 load balancer works at the TCP level: it forwards raw bytes without knowing what protocol is inside. L7 is slower (it has to parse HTTP) but smarter (it can route based on path, retry on 5xx, health check via `GET /health`). Everything in this project — routing decisions, health checks, retry logic — depends on understanding HTTP.

A load balancer does one thing: receive a request, pick a backend, forward it. In the happy path, it's ~20 lines of code. The complexity comes when things fail — and things always fail.

This is not a tutorial. It's what I learned building one from scratch with Node.js and zero dependencies.

---

## Step 1: The Reverse Proxy

A reverse proxy sits between the client and the backend. The client talks to the proxy, the proxy talks to the backend. The client never knows the backend exists.

```
Client  -->  Load Balancer (:8080)  -->  Backend (:3001)
Client  <--  Load Balancer (:8080)  <--  Backend (:3001)
```

The naive way to build this: receive the full request body, forward it to the backend, receive the full response, send it back. That means buffering everything in memory.

But Node gives you streams. `req` is a Readable, `res` is a Writable. With `pipe()`, data flows through the proxy chunk by chunk — the load balancer never holds the full body in memory. Two pipes make a proxy:

1. `req.pipe(proxyReq)` — client body flows to the backend
2. `proxyRes.pipe(res)` — backend response flows to the client

That's it. That's the whole proxy.

I used `http.request()` instead of `fetch()` because it exposes raw streams. `fetch()` buffers the body in memory. For a proxy handling large payloads, that's the difference between constant memory and a memory leak.

A couple things caught me off guard. `http.request()` returns a Writable (the outbound request), but the response comes through a callback, not a return value. You have to think in two separate channels: the pipe going out, and the callback coming back.

And if you forget to handle the `error` event on `proxyReq`? Node throws. Your load balancer dies on the first backend failure lmao.

---

## Step 2: Round Robin

Instead of hitting the same backend every time, rotate through all of them.

```
Request 1 --> Backend 3001
Request 2 --> Backend 3002
Request 3 --> Backend 3003
Request 4 --> Backend 3001  (wraps around)
```

An index, a modulo, done:

```
index = 0

getNextBackend():
  backend = backends[index]
  index = (index + 1) % backends.length
  return backend
```

Why not random? Random is probabilistic — over 6 requests you might get 4 on one backend and 0 on another. Round-robin guarantees uniform spread. It's also debuggable: you can trace which backend got which request just by counting.

### Where it falls apart

Round-robin assumes all backends are identical. Same CPU, same memory, same response time. That's often not true.

If backend 3001 takes 500ms per request and 3002 takes 10ms, round-robin still sends them equal traffic. Requests pile up on the slow one, latency spikes, and you're only as fast as your slowest node. Weighted round-robin or least-connections would handle this — but that's a different project.

There's also no session affinity. If a user's session state lives on backend 3001, the next request might go to 3002. Stateless backends solve this. Sticky sessions (hash the client IP to always route to the same backend) would too.

And no awareness of load. A backend at 95% CPU still gets its regular turn. Least-connections would naturally shift traffic away.

For this project, the backends are identical and stateless, so none of this matters yet. But in production, round-robin is usually the starting point, not the answer.

### One thing worth noting about concurrency

Node is single-threaded. The event loop processes one callback at a time. So `currentIndex` can never be read and written concurrently — no race condition.

But it's still mutable shared state. In Go or Java, the same code would need a mutex. This works by accident in Node and breaks silently when you port it.

---

## Step 3: Retry on Failure

With the basic proxy + round-robin, killing one backend kills 1 out of 3 requests. The client gets nothing — just a hang or a connection reset.

I tested it. Kill backend 3001, send a request that round-robins to it. The client hangs forever. No error, no fallback, nothing.

So the retry logic needs to be *inside* the request flow, not before it. You can't pre-filter dead backends — you only discover failure when you try.

I went recursive:

```
tryNextBackend(backendsToTry, req, res):
    if backendsToTry is empty → 502 Bad Gateway

    backend = backendsToTry.shift()
    proxyReq = http.request(backend, ...)

    proxyReq.on('error') → tryNextBackend(rest, req, res)

    req.pipe(proxyReq)
```

Each incoming request gets a fresh copy of the backend list, ordered by round-robin starting index. On failure, the function calls itself with one fewer backend. When the list is empty → 502.

Why recursive and not a for loop? `http.request()` is callback-based. The error handler triggers the next attempt. The call stack mirrors the retry chain. It just maps naturally.

### I messed up the state

My first attempt used a `Set<Backend>` on the class to track which backends had been tried. Problem: it's shared across all concurrent requests. Two clients hitting the load balancer at the same time would corrupt each other's retry state.

The fix: pass `backendsToTry` as a parameter. Each request gets its own copy via `[...this._backends]`. No shared mutable state, no bug.

### How round-robin and retry work together

The backend list isn't just a copy — it's **rotated** to start at the current round-robin index:

```
backends = [3001, 3002, 3003], currentIndex = 1

backendsToTry = [3002, 3003, 3001]  // starts at index 1, wraps around
```

First attempt follows round-robin distribution. Retries go through the remaining backends in order.

What works now: backend down → instant retry, client sees nothing. All backends down → clean 502. Round-robin still distributes evenly.

What's missing: a backend that *accepts* the connection but never responds will still hang forever. ECONNREFUSED is fast failure. A slow backend is silent failure. That's next.

### Architecture Decision Log

| Decision | Why |
|---|---|
| Recursive retry over iterative | Natural fit with callback-based `http.request()` |
| Backend list as parameter, not class state | Avoids shared mutable state between concurrent requests |
| Max retries = number of backends | Try each backend exactly once, no more |
| 502 when all retries exhausted | Standard HTTP status for "gateway got no valid response" |

---

## Step 4: Timeout

ECONNREFUSED is the easy case. Backend is dead, error is instant, retry kicks in. But what about a backend that accepts the connection and just... sits there?

Without a timeout, the load balancer hangs forever. The client waits. The proxy waits. Nobody times out. This is worse than a crash — it's silent.

The fix is simple: `setTimeout` → `proxyReq.destroy()` after 2 seconds. `destroy()` triggers the `error` event, so the existing retry handler picks it up. One retry path, not two.

I fell into a trap here though. My first attempt called `_tryNextBackend()` both in the `setTimeout` *and* in the `error` handler. But `destroy()` triggers `error`. So the retry ran **twice** — skipping a backend entirely. Same class of bug as Step 3: I also stored the timer as `this._timeout` (class property), which meant concurrent requests overwrote each other's timers. Both fixes are the same — keep it local, keep it per-request.

In practice, with a 5s-slow backend and a 2s timeout:

```
Request 3 → hits 3001 (slow) → 2.0s timeout → retry → 3002 → 0.1s
            Total: ~2.1s  (would have been 5s+ without timeout)
```

The client never waits more than timeout + one normal response.

---

## Step 5: Health Checks

Retry works. But it's reactive. Every time a backend is down, the first request that hits it pays the cost: a timeout (2s) or a connection error before retrying. With 3 backends and 1 down, a third of all requests eat a 2-second penalty before getting a real response.

The obvious fix: stop routing traffic to backends we already know are broken.

But "health checking" isn't one thing. It's two, and they solve different problems.

| Type | When it runs | What it does |
|---|---|---|
| **Passive** | During the request flow | Marks a backend unhealthy immediately on failure |
| **Active** | Background timer (`setInterval`) | Probes backends with `GET /health` to detect recovery |

The passive check is the fast path. A backend times out or returns ECONNREFUSED → mark it `unhealthy` right there in the error handler. No delay, no interval to wait for. The next request skips it immediately.

The active check is the recovery path. A `HealthChecker` class sends `GET /health` to every backend every 5 seconds. Backend responds 200 → marked `healthy` again, back in rotation.

The active health check is the only way back. A backend marked unhealthy by the passive check stays unhealthy until the active checker confirms it's alive. No automatic forgiveness. You have to prove you're back.

### Filtering unhealthy backends

The request handler builds a rotated backend list (for round-robin), then filters:

```
backendsToTry = [...backends.slice(idx), ...backends.slice(0, idx)]
                .filter(b => b.healthy)
```

If the filtered list is empty → `503 Service Unavailable`. Not `502`. The distinction matters:
- **502 Bad Gateway**: I tried a backend and it gave me garbage
- **503 Service Unavailable**: I have no backend to try at all

### Three traps I fell into

**Killing the health checker on error.** My first version called `this._stop()` inside the `http.get` error handler. One backend down → the entire health checker stops. No more probes, no recovery detection. Every unhealthy backend stays unhealthy forever. The health checker must keep running *especially* when backends are failing. That's literally its job.

**Losing the timer reference.** `setInterval()` returns a reference you need for `clearInterval()` later. I stored it in a local variable inside `start()` — invisible to `stop()`. Fix: class property (`private _timeout`). This is the inverse of the Step 4 trap. There, the timer had to be local (one per request). Here, it has to be a class property (one per health checker instance). Same primitive, opposite scoping. Context decides.

**No error handler on `http.get`.** `http.get()` to a dead backend emits an `error` event. No listener → Node throws → process crashes. The health checker, whose job is to *detect* dead backends, was killing the entire load balancer when it found one. Fix: `.on('error', ...)`. Mark unhealthy, log it, move on.

### Architecture Decision Log

| Decision | Why |
|---|---|
| Passive + active over active-only | Passive reacts in real-time; active handles recovery. Different failure timescales need different mechanisms |
| Active check = only recovery path | Prevents flapping — a backend must prove it's healthy, not just stop failing |
| 503 over 502 for empty backend list | Semantically correct: no backend available vs. bad backend response |
| Health check interval = 5s | Frequent enough to detect recovery quickly, infrequent enough to not flood failing backends |

---

## Step 6: Graceful Shutdown

`process.exit()` kills everything. In-flight requests get dropped mid-response. The client sees a connection reset. If this happens during a deploy — where you stop the old process and start a new one — users get errors on every release.

What you actually want: stop accepting new work, finish what's in progress, then exit.

```
SIGTERM/SIGINT received
  1. server.close()         → stop accepting new connections
  2. healthChecker.stop()   → stop polling backends
  3. wait for active connections to drain (res.on('finish'))
  4. process.exit(0)        → clean exit
```

`server.close()` is the key. It tells Node to stop accepting new TCP connections, but existing connections stay alive. The callback fires when the last one closes.

### Tracking active connections

`server.close()` knows when all *TCP connections* are done, but HTTP keep-alive means a TCP connection can outlive a request. So you need to track requests, not connections:

```
createServer callback → activeConnections++
res.on('finish')      → activeConnections--
```

The `finish` event fires when the last byte has been flushed to the OS. Not when the client receives it — when the server is done writing. That's the right boundary.

### I decremented too early

My first version put the `activeConnections--` right after calling `_tryNextBackend()`:

```
_tryNextBackend(backendsToTry, req, res)
this._activeConnections--    // WRONG: runs immediately
```

But `_tryNextBackend` is async — it starts an `http.request` and returns. The decrement runs before the backend even responds. The counter hits 0 while requests are still in-flight.

The fix: `res.on('finish', ...)`. The event fires at the right time no matter how many retries or timeouts happen along the way.

### The safety net

What if a request never finishes? Stuck backend, a client that never reads the response, a keep-alive connection that hangs open. `server.close()` would wait forever.

```
setTimeout(() => {
    process.exit(1)
}, 10000)
```

10 seconds, then force exit with code 1. Should never trigger in normal operation, but it guarantees the process eventually dies. Exit code 1 tells the process manager this wasn't clean.

### Per-request logging

Replaced all `console.log` / `console.error` with a `log(level, message)` function. Format: `[ISO timestamp] [LEVEL] message`. Not a library, just a function. Consistent formatting, descriptive call sites, greppable by level.

Every request gets logged with method, path, backend, status code, and duration:

```
[2025-01-15T14:32:01.123Z] [INFO] GET /api/users → localhost:3002 200 12ms
[2025-01-15T14:32:01.456Z] [WARN] GET /api/users → 503 (no backends) 0ms
```

The tricky part: duration has to survive retries. If a request times out on backend 3001 (2s), then succeeds on 3002 (10ms), the logged duration should be ~2010ms — the total time the client waited, not just the last hop.

The fix: capture `startTime = Date.now()` once at request arrival, pass it through `_tryNextBackend()` as a parameter. Same pattern as the `backendsToTry` list — per-request state that travels with the retry chain, not shared on the class.

```
Request arrives               → startTime = Date.now()
  → try 3001 (timeout 2s)    → startTime unchanged
  → try 3002 (success 10ms)  → log: "GET /api → 3002 200 2012ms"
```

Two log levels: `INFO` for successful proxied requests, `WARN` for 503s (no backends). Errors during proxy (timeouts, connection failures) get `ERROR` but don't produce a request log — they trigger a retry, and the final outcome (success or 503) is what gets logged.

Both `SIGTERM` (process managers, Docker, Kubernetes) and `SIGINT` (Ctrl+C) trigger the same `shutdown()` function. The function lives in `index.ts`, not in the class — process lifecycle is the entry point's responsibility, not the server's. This matters more than it sounds. It's what made the whole thing testable later.

---

## Step 7: Testing — Making It Not Suck to Refactor

All the test scenarios from Steps 1-6 were manual. Start backends, start the load balancer, curl, kill a process, curl again. That works. Until you refactor something and need to re-verify everything by hand. You can't run curl-based tests in CI. You can't catch regressions.

So I wanted to automate all of it. But there was a problem.

### The constructor did too much

The original `LoadBalancer` constructor did everything at once: created the HTTP server, called `.listen()`, started the health checker, registered `process.on('SIGTERM')`. You couldn't even *instantiate* a `LoadBalancer` without it grabbing a port and installing signal handlers.

Same with `HealthChecker` — the constructor called `this.start()`, so `setInterval` was ticking the moment you created the object.

Think about what that means for tests. You can't create a load balancer without a free port. You can't control when the health checker starts polling. Calling `stop()` would `process.exit()` — killing the test runner. And you definitely can't run 5 test suites in the same process when each one fights over ports and signal handlers.

### Constructor configures. Methods activate.

That's the whole fix.

```
Before (untestable):
  constructor() → creates server + listen() + start health checker + signal handlers

After (testable):
  constructor() → creates server (not listening), stores config
  start()       → listen() + health checker start, returns Promise
  stop()        → server.close() + health checker stop, returns Promise (no process.exit)
```

`HealthChecker`: constructor stores `_backends` and `_interval`. `start()` is public, reads from them. No auto-start.

`LoadBalancer`: constructor creates the server but doesn't `.listen()`. `start()` returns a `Promise<void>` that resolves when ready. `stop()` returns a `Promise<void>` — no `process.exit()`.

`index.ts`: signal handlers move here. `await lb.stop()` then `process.exit(0)`. The class manages the server. The entry point manages the process.

### Why Promises?

`.listen()` and `.close()` take callbacks. Wrapping them in Promises lets tests `await lb.start()` and know the server is actually ready before sending requests. Without this, you're racing against the OS binding the port.

### The test suites

`node:test` (built-in) + `tsx` for TypeScript. Zero dependencies.

Each suite gets its own port range so nothing collides:

| Suite | LB Port | Backend Ports | What it verifies |
|---|---|---|---|
| Round-robin | 9100 | 9101-9103 | Uniform distribution across 6 requests |
| Failover | 9200 | 9201-9203 | Traffic redirected when one backend dies |
| Health recovery | 9300 | 9301-9302 | Backend returns to rotation after restart |
| All down → 503 | 9400 | 9401-9402 | 503 when nothing is listening |
| Graceful shutdown | 9500 | 9501 | ECONNREFUSED/ECONNRESET after `stop()` |

Each suite has its own `before` / `after`. Start everything, run the test, tear everything down. Full isolation.

### The health recovery test is the interesting one

It tests the interaction between passive and active health checks across time:

1. Kill a backend → send a request (passive check marks it unhealthy)
2. Wait 500ms (health checker confirms it's down)
3. Restart the backend on the same port
4. Wait 500ms (health checker detects recovery via `GET /health`)
5. Send requests → the recovered backend is back in rotation

Health check interval is 200ms in this test (vs 5s in prod). Fast enough that the whole thing runs in about a second. Slow enough to not be flaky.

---

## Step 8: Load Testing — The Numbers

Integration tests prove correctness. Load tests prove you didn't break performance in the process. I used [autocannon](https://github.com/mcollina/autocannon) — same idea as `ab` or `wrk`, but it's Node-native so I could script it programmatically.

### The setup

5 scenarios, 10 seconds each, 10 concurrent connections (unless noted). Backends return a tiny JSON response with no processing delay. Everything runs on localhost — so network latency is zero. This isolates the proxy overhead.

### The results

| Scenario | Req/sec | p50 | p99 | Errors |
|---|---|---|---|---|
| Direct backend (baseline) | ~28,000 | 0ms | 1ms | 0 |
| Through LB (3 healthy backends) | ~10,600 | 0ms | 2ms | 0 |
| 1 backend killed mid-test | ~11,000 | 0ms | 1ms | 0 |
| 1 slow backend (500ms delay) | ~59 | 0ms | 503ms | 0 |
| 100 concurrent connections | ~590 | 1ms | 528ms | 0 |

### What the numbers say

**The proxy costs ~62% throughput.** Direct to backend: 28k req/s. Through the LB: 10.6k. That's the cost of an extra HTTP hop — `http.request()` + `pipe()` + headers copy + timeout setup. For a learning project with zero optimization, that's expected. NGINX does this with kernel-level socket tricks and connection pooling. We're doing it in userland JS.

**Failover is invisible to the client.** Killed a backend mid-test. Zero errors, zero non-2xx. The passive health check marks it dead instantly, retry kicks in, next request skips it. Throughput didn't even drop — if anything it went slightly up because 2 fast backends is still plenty for 10 connections.

**One slow backend poisons everything.** This is the round-robin problem from Step 2 in practice. With one backend taking 500ms per request, throughput drops from 10,600 to 59 req/s. A 180x degradation. Round-robin keeps sending it a third of the traffic, and those requests block for 500ms each. The 2s timeout doesn't help because 500ms is within the limit — the backend isn't failing, it's just slow. Least-connections would naturally shift traffic away from the slow one.

**100 connections still works, but p99 suffers.** At 100 concurrent connections (10x the normal test), throughput scales to 590 req/s but p99 jumps to 528ms. That's the slow backend again — with more connections, more requests are queued behind the slow one. The event loop stays healthy (Node handles concurrency fine), but the slow backend becomes a bottleneck that affects the entire tail latency.

**Zero errors across all scenarios.** No timeouts, no non-2xx, no connection resets. The retry logic, health checks, and graceful shutdown all work under load. That's the real validation — not that the happy path works, but that the failure handling holds up when you're actually pushing traffic through.

Obviously this doesn't cover real network latency (everything is localhost), large payloads (tiny JSON), or CPU-bound backends (ours do zero work). NGINX and Envoy handle all of that and more. But for understanding the fundamentals — proxy overhead, failover behavior, how a slow backend poisons round-robin — the numbers tell the story. 