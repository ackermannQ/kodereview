---
title: "Building SandpackVM: How to build a lightweight VM"
date: "2025-10-27T10:00:00.000Z"
description: "Sandboxing untrusted JavaScript with TypeScript, Workers, and RPC-style proxies"
---

## TL;DR

I'm building **SandpackVM**, a lightweight JavaScript sandbox that lets isolated Workers call host functions safely.  
This post covers how I bridged the boundary between parent ↔ worker using proxy functions, TypeScript, and async messaging - turning a hard limitation into a design pattern.

👉 Part 1 focuses on the communication bridge.

> _Creating a portable, composable, and observable JavaScript Virtual Machine - built with TypeScript - documenting the journey from concept to implementation._

## The Problem That Started It All

When you start building something that runs untrusted code - a playground, a plugin system, a REPL - you quickly hit the same wall I did: you can't just run user code directly.

JavaScript has Workers, Node has `worker_threads`, but they all suffer from the same fundamental limitation: the sandbox can't call functions defined outside its world. Communication becomes message-passing, serialization... frustration.

That's where **SandpackVM started** - as a personal experiment to make those two worlds (host ↔ sandbox) talk seamlessly again.

The challenge I faced on day one: **How do you execute code in a Worker thread while letting it call functions from the parent process?**

My first approach was simple:

```javascript
const worker = new Worker(code, {
  workerData: { apis: { log: console.log } }, // Functions don't serialize!
})
```

I thought: _great, I'll just send a function and call it_.

Except it doesn't work that way.

The Worker sees only serialized data - not closures, not context, not even functions. That's when I realized the real challenge wasn't "running code in isolation", but **making isolated code feel** connected.

> **Why TypeScript?** Building a VM requires careful control over types, interfaces, and API boundaries. TypeScript provides compile-time safety, excellent IDE support, and ensures our public API contracts are clearly defined. Plus, it compiles to clean JavaScript that runs everywhere.

### Today's Challenge

## Proxying the boundary

The next step was clear: if we can't share functions, we'll fake them.
The key insight: We can't pass functions directly, but we can create **proxy functions** that communicate via `postMessage`.

### Architecture Overview

Let’s peek under the hood - here’s how a simple `await log("hello")` call travels between worlds:

```
┌─────────────────────────────────────────────────────────┐
│ User Code in Worker                                     │
│   await log("hello");                                   │
│      ↓                                                  │
│   [1] Proxy function created                            │
│      ↓                                                  │
│   [2] Intercept call, postMessage to parent             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ postMessage
┌─────────────────────────────────────────────────────────┐
│ Parent Process (SandpackVM)                             │
│   [4] Receive message                                   │
│      ↓                                                  │
│   [3] Execute real function (console.log)               │
│      ↓                                                  │
│   postMessage result back                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ postMessage
┌─────────────────────────────────────────────────────────┐
│ Worker                                                  │
│   [5] Receive result, resolve Promise                   │
│      ↓                                                  │
│   User code continues execution                         │
└─────────────────────────────────────────────────────────┘
```

This architecture is the beating heart of SandpackVM - simple enough to grasp, yet flexible enough to extend.

## Implementation: Step by Step

At this point, SandpackVM becomes less a single script and more a protocol between host and sandbox. Let's build it up step-by-step

### Step 1: Generate the Proxy Code

I write a function that dynamically generates JavaScript code for each API. For every API in `this._apis`, I create a proxy function:

```typescript
function createWorkerURL(code: string, apis: Apis): URL {
  const apiNames = Object.keys(apis)
  const proxyDefs: string[] = []

  apiNames.forEach(name => {
    const api = apis[name]

    if (typeof api === "function") {
      // Generate an async proxy function
      const proxyCode = [
        "const " + name + " = async (...args) => {",
        "  return new Promise((resolve, reject) => {",
        "    const callId = Math.random().toString(36).substr(2, 9);",
        "    pendingCalls[callId] = { resolve, reject };",
        "    // [2] Intercept the call and send message to parent",
        "    parentPort.postMessage({",
        "      type: 'apiCall',",
        "      id: callId,",
        "      functionName: '" + name + "',",
        "      arguments: args",
        "    });",
        "  });",
        "};",
      ].join("\n")
      proxyDefs.push(proxyCode)
    }
  })

  // ... assemble the worker code
}
```

This generates code like:

```javascript
const log = async (...args) => {
  return new Promise((resolve, reject) => {
    const callId = Math.random().toString(36).substr(2, 9)
    pendingCalls[callId] = { resolve, reject }

    parentPort.postMessage({
      type: "apiCall",
      id: callId,
      functionName: "log",
      arguments: args,
    })
  })
}
```

### Step 2: Handle Messages in Parent

In the main `run()` method, we listen for API calls from the Worker:

```typescript
public async run(_code: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(createWorkerURL(_code, this._apis!));

    // [4] Parent receives message from Worker
    worker.on("message", (msg) => {
      if (msg.type === "apiCall") {
        // [3] Execute the real function from this._apis
        const fn = this._apis![msg.functionName] as Function;

        if (!fn) {
          worker.postMessage({
            type: "apiResult",
            id: msg.id,
            error: `Function ${msg.functionName} not found`,
          });
          return;
        }

        try {
          const result = fn(...msg.arguments);
          // Send result back to Worker
          worker.postMessage({
            type: "apiResult",
            id: msg.id,
            result,
          });
        } catch (error) {
          worker.postMessage({
            type: "apiResult",
            id: msg.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else if (msg.type === "done") {
        worker.terminate();
        resolve();
      }
    });
  });
}
```

The parent now acts as an RPC router - forwarding calls, executing real functions, and sending structured results back to the sandbox.

### Step 3: Worker Receives Results

The Worker needs to listen for API results and resolve the corresponding Promises:

```javascript
// [5] Listen for API results from parent
parentPort.on("message", msg => {
  if (msg.type === "apiResult") {
    if (msg.error) {
      pendingCalls[msg.id].reject(new Error(msg.error))
    } else {
      pendingCalls[msg.id].resolve(msg.result)
    }
    delete pendingCalls[msg.id]
  }
})
```

At this point, we have a working request/response RPC bridge inside the VM. Everything else - observability, quotas, permissions - will hang on this foundation.

## Principles that emerged

As SandpackVM took shape, a few principles emerged - lessons that apply to any system trying to balance safety, control, and developer experience.

### 1. **⚡Asynchronicity is Non-Negotiable**

> Isolation demands async boundaries - it's a feature, not a bug.

Here's the first gotcha I discovered: User code must now use `await` with all APIs:

```javascript
// ❌ This won't work (synchronous)
log("hello")

// ✅ This works (asynchronous)
await log("hello")
```

I initially thought this was a bug, but it's actually a **feature**. True isolation requires async boundaries. We're building a sandbox, not a simple wrapper.

---

### 2. **🧩 The Proxy Pattern is Your Friend**

> Control, observability, security, debugging - all in one abstraction

The proxy pattern allows us:

- **Control**: I decide exactly what functions can be called
- **Observability**: I can log all API calls before they execute
- **Security**: I can validate arguments, enforce quotas, add rate limits
- **Debugging**: Every call gets a unique ID for tracing

---

### 3. **Promise-based Communication is Elegant**

Each API call is just a Promise with a side channel:

1. Generate unique call ID
2. PostMessage to parent
3. Wait for response (async)
4. Resolve or reject

It's like RPC, but built into the VM itself.

TLDR:

- Isolation ≠ disconnection. True sandboxing is about controlled bridges, not walls.
- Message protocols are APIs. The format of your postMessage payload is your interface contract.
- Developer experience matters even for infra code. The fewer abstractions users need to learn, the more they'll trust the sandbox.

---

## Current Status

✅ **Working**:

- Worker creation & execution
- Proxy-based API injection
- Asynchronous communication via `postMessage`
- Basic error handling

🚧 **Next Steps**:

- Nested APIs (`apis: { fs: { readFile: ... } }`)
- Resource quotas (CPU, memory)
- Observability layer (timeline, metrics)
- Cleanup & edge cases handling

## What's Next?

- Loop protection: detect CPU-bound tasks via heartbeats or execution quotas.
- Observability: mirror console.log, exceptions, and metrics from inside the sandbox to the host.
- Security hardening: disallow access to fetch, importScripts, or Node's fs when not explicitly permitted.

## Where this matters in the real world

These are not theoretical - each of these scenarios demands the same thing: run arbitrary code safely, without losing flexibility - exactly what SandpackVM aims to deliver:

- Interactive docs: safely run examples in-browser.
- Plugin systems: allow third-party extensions without risking host crashes.
- AI code agents: execute user-generated functions securely.
- Education tools: give each student an isolated REPL that can't break the main app.
- Dev sandboxes: run user-submitted snippets in cloud IDEs (like StackBlitz or CodeSandbox) safely

## Try It Yourself

Want to follow along? The code is on [GitHub](https://github.com/ackermannQ/sandpackvm). You can clone it and experiment with different API configurations:

```bash
git clone https://github.com/ackermannQ/sandpackvm
cd sandpackvm
npm install
npm run start
```

## Parting Thoughts

This journey started with a simple question: "How do I safely run untrusted code?" and building SandpackVM reminds me why I love infrastructure work: it's invisible when it works.

Every bridge between processes, every proxy call, every message passed - each is a tiny act of empathy for the next developer who just wants things to feel simple.

That's what I'm chasing - **simplicity on the other side of complexity**

In Part 2, I'll tackle resource quotas and observability. What happens when someone runs an infinite loop? How do we track CPU usage in real-time? These are the questions that keep me coding into the night.

---

**Questions or feedback?** Leave a comment below. I'd love to hear your thoughts.

---

**Q. Ackermann**  
Senior Engineer, Toolmaker, Systems Thinker  
[GitHub](https://github.com/ackermannQ) | [KodeReview](https://kodereview.com) | [LinkedIn](https://www.linkedin.com/in/quentin-ackermann-537178176/)

---
