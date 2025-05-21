---
title: "Code That Reveals Itself: Designing for Observability at the Function Level"
date: "2025-05-21T08:40:32.169Z"
description: "Stop writing code that hides intent. Start building systems that narrate their own behavior - and survive scaling."
---

We spend so much time debating clean code. But the code that causes the most pain - the one that quietly drains hours - is the code that hides its intent.

This isn't about bugs. It's about **code that works but can't be understood without going through four files and a debugger.**

As a senior full stack developer and devtool builder, I've learned that the best code isn't just correct. It's **self-explaining**. It **reveals what it does and why - especially when things go wrong.**

This article walks through that journey: why we don't design for observability at the function level, how the pain shows up, and how I build systems today that explain themselves.

---

## Why We Don't Do It By Default

When code works, we move on. We build `useCustomerInfo()`, it returns `{ data, loading, error }`, and life goes on.

But a few weeks later:

- It sometimes fetches again unexpectedly.
- Data is stale and we don't know why.
- The retry logic behaves weirdly but only in some environments.

So we open 4 files, put breakpoints, and try to guess what's going on. We read function names and hope they match behavior.

> "The function wasn't broken. It just wasn't saying anything."

---

## When the Need Appears

This pattern becomes obvious once you hit scale:

- Hooks are reused across contexts.
- A colleague uses your code but doesn't know the assumptions you encoded.
- Side effects stack up: fetches, cache reads, timeouts, cleanups.

Suddenly, understanding what a function **does** is easy. But understanding **why** it behaves a certain way at runtime? That's the real challenge.

This is when you stop needing clean code - and start needing **observable code**.

---

## A Complete Example: From Opaque to Observable

Let's take a real-world scenario. You have a hook that fetches a customer's data. Here's how it typically starts:

### ❌ Initial version - clean but opaque

```ts
function useCustomerInfo(customerId: string) {
  return useQuery(["customer", customerId], fetchCustomer)
}
```

This works. Until:

- You start seeing unnecessary refetches.
- You're not sure if caching is working.
- You're debugging why it hits the network on navigation.

### ✅ Updated version - self-explaining

```ts
function useCustomerInfo(customerId: string) {
  const queryKey = ["customer", customerId]

  const result = useQuery(queryKey, fetchCustomer)

  const debug = {
    queryKey,
    triggeredAt: new Date().toISOString(),
    cacheHit: !!result.data,
    requestId: crypto.randomUUID(),
    componentStack: new Error().stack,
  }

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[useCustomerInfo] ${customerId}`)
    console.log(debug)
    console.groupEnd()
  }

  return { ...result, debug }
}
```

Now when something breaks or behaves unexpectedly:

- You see when the hook was triggered.
- You see whether the data came from cache.
- You can correlate request IDs with logs.
- You get stack info for tracing origin.

### Component usage

```tsx
const { data, debug } = useCustomerInfo(customerId)

useEffect(() => {
  if (import.meta.env.DEV) {
    console.log("Customer Info Debug:", debug)
  }
}, [debug])
```

This hook now **documents itself at runtime**.

---

## Where I Draw the Line

✅ I use this in:

- Shared hooks
- Complex fetch logic with caching, retries, or fallbacks
- Logic used across features where breakage isn't obvious

❌ I avoid it in:

- Local-only UI state hooks
- Dumb stateless helpers
- Anything that introduces noise without clarity

The goal isn't to make code verbose. The goal is to **make it explain itself when it matters.**

---

## It's More Than Code - It's a Posture

When you design traceable code, you:

- Stop thinking in return values only
- Start thinking in flows, triggers, and side-effects
- Build systems that **age well** and **debug cleanly**

---

## 🔚 Takeaway

**Code that survives is code that narrates.**

If you want to scale systems and avoid tribal knowledge rot, you need code that **shows its flow, not just its output.**

This isn't about overengineering. It's about engineering with empathy - for your future teammates, and your future self.

- **Q. Ackermann**  
  _Senior Engineer, Toolmaker, Systems Thinker_  
  [GitHub](https://github.com/ackermannQ) | [KodeReview](https://kodereview.com/) | [LinkedIn](https://www.linkedin.com/in/quentin-ackermann-537178176/)
