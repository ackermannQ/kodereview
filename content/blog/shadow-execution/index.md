---
title: "Shadow Execution: The Refactor Miracle That Doesn't Touch Production"
date: "2026-01-30T08:00:00.000Z"
description: "I deleted 400 lines of legacy code in production without touching a single user. The secret? Running the new logic as a 'shadow' that computes decisions but never executes them — then comparing what it would have done vs what actually happened."
---

## I Ran the New Logic as a Ghost and Measured Exactly When It Lied

**TL;DR:** I deleted 400 lines of legacy code in production without touching a single user. The secret? Running the new logic as a "shadow" that computes decisions but never executes them — then comparing what it *would have done* vs what actually happened.

---

## The Problem Nobody Talks About

You've been there. Legacy code that works. Kinda. You understand it. Mostly. And your PM wants you to "just refactor it real quick."

```typescript
// The code that haunts my dreams
export const processFile = async (file) => {
  const existing = await getExistingFile(file.id)  // Side effect #1

  if (shouldUpload(file, existing)) {              // Decision buried in here
    await deleteFile(existing)                      // Side effect #2
    await uploadFile(file)                          // Side effect #3
    await updateMetadata(file)                      // Side effect #4
  }

  return file
}
```

Four side effects. Decision logic mixed with execution. And if you get it wrong?

- **Wrong upload:** Duplicate files, corrupted knowledge base
- **Wrong skip:** Missing data, users screaming "where's my file?"
- **Wrong delete:** Gone. Forever. Have a nice day.

So you write tests. Great.

But here's the thing: **tests cover cases you imagine. Production has cases that exist.**

---

## The Idea That Changed Everything

What if you could run your new code on real production traffic — but never actually *do* anything?

```
Real request ──┬──▶ [Old Code] ──▶ Actually does things ──▶ User happy
               │        │
               │        ▼
               └──▶ [New Code] ──▶ Computes result ──▶ Compare ──▶ Log
                         │
                    (no side effects!)
```

This is **shadow execution**. Not traffic mirroring (that's an infra thing). This is *behavior comparison* at the code level.

The new code runs as a ghost. It thinks. It decides. But it never acts.

---

## Step 1: The Decision Contract

Here's the mindset shift that makes this work.

**Before:** Your function returns `void` or some mutated object. Good luck comparing that.

**After:** Your function returns a *decision* — a serializable description of what should happen.

```typescript
// This is the magic: a typed contract of "what I would do"
type SyncDecision = {
  version: 1                          // For schema evolution
  action: 'skip' | 'upload' | 'replace'
  reason: 'file-not-found' | 'file-already-synced' | 'file-content-changed'
  expectedStatus: 'newly-synced' | 'already-synced'
  fileKey?: string                    // Where to store it
  fileToDelete?: string               // What to delete first
  tagsToApply?: Record<string, string>
}
```

Why is this powerful?

1. **It's serializable** — You can log it, replay it, diff it
2. **It's deterministic** — Same input = same output
3. **It's comparable** — Two decisions can be meaningfully compared
4. **It's executable** — A separate "applier" can turn it into reality

The decision doesn't *do* anything. It just describes the intention.

---

## Step 2: Separate Decide from Execute

This is where the refactor actually happens.

**Before (tangled):**
```typescript
export const processFile = async (file) => {
  const existing = await getExistingFile(file.id)

  // Decision and execution mixed together
  if (!existing) {
    await uploadFile(file)        // <-- side effect!
    await updateMetadata(file)    // <-- side effect!
    return { ...file, status: 'newly-synced' }
  }

  return { ...file, status: 'already-synced' }
}
```

**After (separated):**
```typescript
// Step 1: Pure decision function (no side effects)
export const computeDecision = (ctx: DecisionContext): SyncDecision => {
  if (!ctx.existingFile) {
    return {
      version: 1,
      action: 'upload',
      reason: 'file-not-found',
      expectedStatus: 'newly-synced',
      fileKey: `${ctx.integration.alias}:${ctx.file.path}`,
      tagsToApply: {
        externalId: ctx.file.id,
        integrationName: ctx.integration.name,
      },
    }
  }

  return {
    version: 1,
    action: 'skip',
    reason: 'file-already-synced',
    expectedStatus: 'already-synced',
  }
}

// Step 2: Applier (all side effects here)
export const applyDecision = async (decision: SyncDecision, ctx: ApplyContext) => {
  if (decision.action === 'skip') {
    return { ...ctx.file, status: 'already-synced' }
  }

  if (decision.action === 'replace' && decision.fileToDelete) {
    await ctx.fileRepository.delete(decision.fileToDelete)
  }

  await ctx.transferApi.upload(ctx.file, decision.fileKey!)
  await ctx.fileRepository.updateTags(decision.tagsToApply!)

  return { ...ctx.file, status: 'newly-synced' }
}
```

Now the interesting part: **shadow only calls `computeDecision`**. Never `applyDecision`.

---

## Step 3: The Shadow Executor

Here's where the comparison happens:

```typescript
const executeShadow = async (ctx: DecisionContext) => {
  // LIVE: The real decision (will be applied)
  const liveDecision = computeDecisionV1(ctx)

  // Actually do the thing
  await applyDecision(liveDecision, ctx)

  // SHADOW: The new decision (fire-and-forget, non-blocking)
  setImmediate(async () => {
    try {
      const shadowDecision = computeDecisionV2(ctx)

      // Compare them
      const result = compare(
        normalize(liveDecision),
        normalize(shadowDecision)
      )

      if (!result.match) {
        logDivergence(result)
      }
    } catch (err) {
      // Shadow NEVER blocks live — fail silently
      console.warn('Shadow failed:', err.message)
    }
  })

  return liveDecision
}
```

Key rules:
1. **Live runs first.** Always.
2. **Shadow is async.** Fire-and-forget.
3. **Shadow errors are swallowed.** Live must never be affected.

---

## Step 4: Normalization (This Is Where It Gets Real)

Naive comparison doesn't work:

```typescript
// This will fail even for identical decisions
JSON.stringify(live) === JSON.stringify(shadow)  // false!
// Why? Tag ordering, timestamps, property order...
```

You need to **normalize** before comparing:

```typescript
const normalize = (decision: SyncDecision): NormalizedDecision => {
  const normalized = {
    action: decision.action,
    reason: decision.reason,
    expectedStatus: decision.expectedStatus,
    fileKey: decision.fileKey,
    fileToDelete: decision.fileToDelete,
  }

  // Sort tags alphabetically, exclude timestamps
  if (decision.tagsToApply) {
    const sortedTags: Record<string, string> = {}
    const keys = Object.keys(decision.tagsToApply).sort()

    for (const key of keys) {
      // Skip volatile fields
      if (['syncedAt', 'updatedAt', 'createdAt'].includes(key)) continue
      sortedTags[key] = decision.tagsToApply[key]
    }

    normalized.tagsToApply = sortedTags
  }

  return normalized
}
```

**We compare intentions, not implementations.** Tag order doesn't matter. Timestamp values don't matter. What matters: *would the user see the same result?*

---

## Step 5: Severity Model (The Part That Makes It Actionable)

Not all divergences are equal:

```typescript
const classifyDivergence = (field: string, live: any, shadow: any): Divergence => {
  // CRITICAL: Different user-visible behavior
  if (field === 'action') {
    return {
      field,
      severity: 'critical',
      impact: describeActionImpact(live, shadow),
      liveValue: live,
      shadowValue: shadow,
    }
  }

  // WARNING: Different data, but not catastrophic
  if (field === 'fileKey') {
    return { field, severity: 'warning', impact: 'File stored with different key' }
  }

  // INFO: Debug signal, no user impact
  if (field === 'reason') {
    return { field, severity: 'info', impact: 'Different reasoning, same outcome' }
  }

  // WARNING: Unknown field — be conservative!
  return { field, severity: 'warning', impact: `Unknown field "${field}" — needs classification` }
}

const describeActionImpact = (live: string, shadow: string): string => {
  if (live === 'skip' && shadow === 'upload') {
    return 'Shadow would UPLOAD a file that live SKIPs — potential missing file bug'
  }
  if (live === 'upload' && shadow === 'skip') {
    return 'Shadow would SKIP a file that live UPLOADs — potential duplicate prevention'
  }
  if (live === 'skip' && shadow === 'replace') {
    return 'Shadow would DELETE and re-upload a file that live SKIPs — data loss risk!'
  }
  return `Action changed from ${live} to ${shadow}`
}
```

Now your logs tell a story:

```json
{
  "event": "shadow_divergence",
  "traceId": "shadow-abc123",
  "fileId": "gdrive-xyz",
  "overallSeverity": "critical",
  "divergences": [{
    "field": "action",
    "liveValue": "skip",
    "shadowValue": "replace",
    "severity": "critical",
    "impact": "Shadow would DELETE and re-upload a file that live SKIPs — data loss risk!"
  }]
}
```

---

## The Moment of Truth (Real Story)

First day of shadow execution at 1% sampling. I'm checking logs during coffee.

```
┌────────────────────────────────────────────────────────────────┐
│ FILE: /Finance/Q4-Budget-Final.xlsx                            │
│                                                                │
│ LIVE decision:   skip   (file already synced)                  │
│ SHADOW decision: replace (delete existing, re-upload)          │
│                                                                │
│ IMPACT: Shadow would have DELETED a production file            │
│         then re-uploaded — data loss if upload fails           │
└────────────────────────────────────────────────────────────────┘
```

Coffee comes out my nose.

**What happened:** The new implementation had stricter checksum logic. It detected a hash mismatch that the old code ignored.

**The twist:** Shadow was *technically correct*. But we didn't want to fix that legacy bug during migration. Different concern, different PR.

**What we did:** Added a tolerance rule in the normalizer for this specific case. Documented it. Created a backlog item for the actual fix.

**What would have happened without shadow:** The new code would have deleted production files on day one. Users would have lost data. I would have lost my job.

---

## The Rollout Playbook

Shadow execution isn't one-and-done. It's a progression:

### Phase 1: Capture (Before You Have New Code)
```typescript
updateShadowConfig({ mode: 'capture', samplingRate: 0.1 })
```

Just log inputs. No comparison. Build a corpus of real production data for offline testing.

### Phase 2: Compare at 1%
```typescript
updateShadowConfig({
  mode: 'compare',
  samplingRate: 0.01,
  circuitBreaker: { enabled: true, failureThreshold: 5 }
})
```

Run for 1-2 weeks. Target: <5% divergence rate, 0 critical issues.

### Phase 3: Progressive Rollout
| Sampling | Duration | Target |
|----------|----------|--------|
| 10% | 1 week | <2% divergence |
| 25% | 1 week | <1% divergence |
| 50% | 1 week | <0.5% divergence |
| 100% | 1 week | <0.1% divergence |

### Phase 4: The Swap
```typescript
updateShadowConfig({ mode: 'shadow-live' })
```

Invert the roles. New code becomes live. Old code becomes shadow (safety net). If something goes wrong: `disableShadowExecution()` — instant rollback.

### Phase 5: Cleanup
Delete old code. You've earned it.

---

## The Gotchas That Will Bite You

### Gotcha 1: The Clock
```typescript
// BAD: Non-deterministic
if (file.expiresAt < new Date()) { ... }

// GOOD: Inject the clock
const decide = (ctx: { file: File, now: Date }) => {
  if (ctx.file.expiresAt < ctx.now) { ... }
}
```

### Gotcha 2: Object Key Ordering
```typescript
// These are "different" in JSON.stringify
{ a: 1, b: 2 }
{ b: 2, a: 1 }

// Solution: Sort keys in normalizer
Object.keys(tags).sort()
```

### Gotcha 3: Cache State
Live and shadow might see different cache states. Solution: **pre-fetch everything** in the orchestrator and pass it as input to both.

### Gotcha 4: Rate Limiting at 100%
At 100% sampling, you'll see thousands of the same divergence. Add deduplication:

```typescript
const seenSignatures = new Map<string, number>()

const shouldLog = (signature: string): boolean => {
  const now = Date.now()
  const lastSeen = seenSignatures.get(signature)

  if (lastSeen && now - lastSeen < 3600_000) return false  // 1 hour

  seenSignatures.set(signature, now)
  return true
}
```

### Gotcha 5: Shadow Must Never Escalate Privileges
Shadow should use read-only clients. If it accidentally calls a write API, it should throw.

```typescript
const shadowClients = {
  fileRepository: createReadOnlyProxy(fileRepository),
  transferApi: createNoOpProxy(transferApi),  // throws on write
}
```

---

## Why Not Just Tests?

I get this a lot.

| Tests | Shadow |
|-------|--------|
| Fast feedback | Slow feedback |
| Controlled inputs | Real inputs |
| Validates intent | Validates equivalence |
| Cases you imagine | Cases that exist |

They're complementary:

```
Unit Tests → Integration Tests → Shadow Execution → Canary → GA
     ↑                                    ↑
   "Does it work?"              "Does it behave the same?"
```

Tests tell you "this code does X." Shadow tells you "this code does the same X as the old code."

---

## The Mindset Shift

Before shadow execution, I thought refactoring production code required:
- Perfect tests (impossible)
- Staging environment that matches prod (never)
- Courage (bad strategy)

Now I think:

> **"We validate behavioral equivalence, not correctness."**

We're not asking "is the new code right?" We're asking "does it behave the same?"

That's a much easier question to answer. And once you know it behaves the same, you can deploy with confidence.

---

## Key Takeaways

1. **Decision Contract is everything** — A serializable, comparable, versionable type that describes "what would happen"

2. **Separate Decide from Execute** — Decision function has zero side effects. Applier does all the work. Shadow only calls the decision function.

3. **Normalize before comparing** — Sort arrays, exclude timestamps, compare intentions not implementations

4. **Severity makes metrics actionable** — "action differs" is critical. "reason differs" is info.

5. **Fire-and-forget is non-negotiable** — Shadow must never block, never fail, never slow down live

6. **Progressive rollout** — 1% → 10% → 50% → 100% → swap

7. **Divergences are bugs** — Treat them seriously. Fix before swap.

---

## The Code

Full implementation available as a reference:

```
sync-queue/
├── file-decision.ts       # Pure decision function
├── file-applier.ts        # Side effects execution
├── shadow/
│   ├── shadow-executor.ts # Core orchestration
│   ├── shadow-normalizer.ts # Comparison logic
│   ├── shadow-config.ts   # Sampling, circuit breaker
│   └── shadow-reporter.ts # Logging & metrics
└── __tests__/
    └── file-decision.test.ts
```

---

## Final Thought

The best refactors are the ones where nothing changes for users.

Shadow execution lets you prove that "nothing changed" — with data, not hope.

Go delete some code. Safely.

---

*Have questions? Found a bug in my approach? Let me know in the comments.*
