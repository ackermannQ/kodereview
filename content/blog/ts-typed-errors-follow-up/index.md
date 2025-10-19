---
title: "ts-typed-errors v0.5.0: From Concept to Production-Ready Error Matching"
date: "2025-10-19T10:00:00.000Z"
description: "Since v0.1.0, ts-typed-errors evolved from a simple exhaustive matcher into a composable, performance-focused error pattern system with async support, serialization, and O(1) tag-based matching."
---

**TL;DR:** Since my [initial article](https://dev.to/ackermannq/why-i-built-ts-typed-errors-a-typescript-error-handling-revolution-2bph), ts-typed-errors has evolved from a simple error matching library to a full-featured pattern composition system. Here's what changed.

---

## What Changed Since v0.1.0

When I first launched ts-typed-errors, it had basic exhaustive matching. The feedback was clear: **developers wanted more power and composability**.

So I went back to the drawing board and implemented 5 major phases of improvements.

### 📊 Before & After

| Metric           | v0.1.0 (Initial) | v0.5.0 (Now) |
| ---------------- | ---------------- | ------------ |
| Bundle Size      | ~2 KB            | ~6.4 KB      |
| Features         | 4                | 20+          |
| Test Coverage    | 15 tests         | 92 tests     |
| Pattern Builders | 0                | 11           |
| Phases Completed | 1                | 5            |

Let's dive into what's new.

---

## Phase 1-2: The Foundations (v0.1.0 - v0.2.0)

### Property Selection with `.select()`

Extract properties directly in your handler:

```ts
const NetworkError = defineError("NetworkError")<{
  status: number
  url: string
}>()

matchErrorOf<Err>(error)
  .select(NetworkError, "status", status => {
    // Handler receives just the status number
    return `HTTP ${status}`
  })
  .exhaustive()
```

**Why it matters:** No more manual destructuring. Cleaner handlers.

### Composition Utilities

```ts
// Check multiple types at once
if (isAnyOf(error, [NetworkError, TimeoutError])) {
  // Handle connection errors
}

// Combine type guards
const isServerError = isAllOf([
  isErrorOf(NetworkError),
  e => e.data.status >= 500,
])
```

### Async Support

```ts
await matchErrorAsync(error)
  .with(NetworkError, async e => {
    await logToService(e)
    return "logged"
  })
  .otherwise(async () => "unknown")
```

---

## Phase 3: Performance & Serialization (v0.3.0)

### Error Transformation with `.map()`

Transform errors before matching:

```ts
matchError(error)
  .map(e => e.cause ?? e) // Extract root cause
  .with(NetworkError, e => `Network: ${e.data.status}`)
  .otherwise(() => "Unknown")
```

**Use cases:**

- Normalize errors from different sources
- Extract nested errors
- Add contextual information

### O(1) Tag-Based Matching

Under the hood, ts-typed-errors now uses a `Map` for instant lookups:

```ts
// Before: O(n) instanceof checks
for (const c of cases) if (c.test(e)) return c.run(e)

// After: O(1) tag lookup for defineError errors
const handler = tagHandlers.get(error.tag)
if (handler) return handler(error)
```

**Result:** Faster matching for large error unions.

### Error Serialization

Send errors over the wire safely:

```ts
// Serialize for API
const serialized = serialize(error)
// { tag: 'NetworkError', message: '...', data: {...}, stack: '...' }

// Send to client
res.json(serialized)

// Deserialize on client
const error = deserialize(json, [NetworkError, ParseError])
```

---

## Phase 4: Pattern Composition (v0.4.0) 🔥

This is where it gets exciting. Inspired by [ts-pattern](https://github.com/gvergnaud/ts-pattern), I built a full `P` namespace for pattern composition.

### The `P` Namespace

```ts
import { P, matchError } from "ts-typed-errors"
```

### `P.union()` - Match ANY Pattern

```ts
const isConnectionError = P.union(
  P.instanceOf(NetworkError),
  P.instanceOf(TimeoutError)
)

matchError(error)
  .with(isConnectionError, () => "Retry connection")
  .otherwise(() => "Other error")
```

### `P.intersection()` - Match ALL Patterns

```ts
// Match NetworkError with status >= 500
matchError(error)
  .with(
    P.intersection(
      P.instanceOf(NetworkError),
      P.when(e => e.data.status >= 500)
    ),
    e => `Server error: ${e.data.status}`
  )
  .otherwise(() => "Other")
```

### Composable & Reusable Patterns

This is the real power:

```ts
// Define reusable patterns
const isServerError = P.intersection(
  P.instanceOf(NetworkError),
  P.when(e => e.data.status >= 500)
)

const isClientError = P.intersection(
  P.instanceOf(NetworkError),
  P.when(e => e.data.status >= 400 && e.data.status < 500)
)

const isCritical = P.union(isServerError, P.instanceOf(DatabaseError))

// Use patterns everywhere
function handleError(error: unknown) {
  return matchError(error)
    .with(isCritical, () => "ALERT TEAM")
    .with(isClientError, () => "Show user message")
    .otherwise(() => "Log and continue")
}
```

### Available Pattern Builders

- `P.instanceOf(Constructor)` - Match by constructor
- `P.when(predicate)` - Match with predicate
- `P.guard(guardFn)` - Use type guard functions
- `P.union(...patterns)` - Match ANY pattern (OR logic)
- `P.intersection(...patterns)` - Match ALL patterns (AND logic)
- `P.not(pattern)` - Negate a pattern

---

## Phase 5: Error-Specific Patterns (v0.5.0) 🚀

Now we have patterns specifically designed for error handling scenarios.

### `P.array()` - Match Array Properties

Perfect for validation errors:

```ts
const ValidationError = defineError("ValidationError")<{
  errors: Array<{ field: string; message: string }>
}>()

matchError(error)
  .with(
    P.intersection(
      P.instanceOf(ValidationError),
      P.array(
        "errors",
        P.when(e => e.field === "email")
      )
    ),
    () => "Email validation failed"
  )
  .otherwise(() => "Other validation error")
```

**Use cases:**

- ValidationError with multiple field errors
- AggregateError with error collections
- Batch processing errors

### `P.hasCause()` - Match Error Chains

Traverse the entire cause chain:

```ts
const rootCause = new NetworkError("failed", { status: 500, url: "/api" })
const middleError = Object.assign(new Error("middle"), { cause: rootCause })
const topError = Object.assign(new Error("top"), { cause: middleError })

matchError(topError)
  .with(P.hasCause(NetworkError), () => "Network issue in chain")
  .otherwise(() => "Other")
```

**Why it matters:** Modern JavaScript supports error causes. Now you can match on them!

### `P.hasStack()` - Match by Stack Trace

Categorize errors by where they came from:

```ts
matchError(error)
  .with(P.hasStack(/internal/), () => {
    // Internal application error
    alert("Our bad! We" + "'" + "re on it.")
  })
  .with(P.hasStack(/node_modules/), () => {
    // Third-party library error
    logToSentry(error)
  })
  .otherwise(() => {
    // Application code error
    showUserFriendlyMessage()
  })
```

**Use cases:**

- Debugging and error categorization
- Different handling for internal vs external errors
- Stack-based error routing

### `P.optional()` / `P.nullish()`

Match optional properties:

```ts
matchError(error)
  .with(P.nullish("cause"), () => "No underlying cause")
  .with(P.optional("metadata"), () => "Has optional metadata")
  .otherwise(() => "Other")
```

### Complex Composition

Combine everything:

```ts
const ValidationError = defineError("ValidationError")<{
  errors: Array<{ field: string }>
}>()

const rootCause = new NetworkError("network", { status: 500, url: "/api" })
const error = Object.assign(
  new ValidationError("validation failed", {
    errors: [{ field: "email" }],
  }),
  { cause: rootCause }
)

matchError(error)
  .with(
    P.intersection(
      P.instanceOf(ValidationError),
      P.array(
        "errors",
        P.when(e => e.field === "email")
      ),
      P.hasCause(NetworkError)
    ),
    () => "Email validation failed due to network issue"
  )
  .otherwise(() => "Other")
```

---

## Real-World Use Cases

### 1. API Error Handling

```ts
async function fetchUser(id: string) {
  const result = await wrap(async () => {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      throw new NetworkError("Request failed", {
        status: response.status,
        url: response.url,
      })
    }
    return response.json()
  })()

  if (!result.ok) {
    return matchErrorOf<ApiError>(result.error)
      .with(
        P.intersection(
          P.instanceOf(NetworkError),
          P.when(e => e.data.status === 404)
        ),
        () => null
      )
      .with(
        P.intersection(
          P.instanceOf(NetworkError),
          P.when(e => e.data.status >= 500)
        ),
        () => {
          toast.error("Server error. Please try again.")
          return null
        }
      )
      .with(P.instanceOf(NetworkError), e => {
        toast.error(`Request failed: ${e.data.status}`)
        return null
      })
      .exhaustive()
  }

  return result.value
}
```

### 2. Form Validation

```ts
const ValidationError = defineError("ValidationError")<{
  errors: Array<{ field: string; message: string }>
}>()

function handleFormError(error: unknown) {
  return matchError(error)
    .with(
      P.array(
        "errors",
        P.when(e => e.field === "email")
      ),
      e => {
        showFieldError("email", "Invalid email address")
      }
    )
    .with(
      P.array(
        "errors",
        P.when(e => e.field === "password")
      ),
      e => {
        showFieldError("password", "Password too weak")
      }
    )
    .with(P.instanceOf(ValidationError), e => {
      showGeneralError("Please fix the highlighted fields")
    })
    .otherwise(() => {
      showGeneralError("An error occurred")
    })
}
```

### 3. Database Error Recovery

```ts
const DatabaseError = defineError("DatabaseError")<{
  code: string
  query: string
}>()

async function queryWithRetry(query: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await wrap(() => db.query(query))()

    if (result.ok) return result.value

    const shouldRetry = matchError(result.error)
      .with(
        P.intersection(
          P.instanceOf(DatabaseError),
          P.when(e => e.data.code === "CONNECTION_LOST")
        ),
        () => true
      )
      .with(
        P.intersection(
          P.instanceOf(DatabaseError),
          P.when(e => e.data.code === "DEADLOCK")
        ),
        () => true
      )
      .otherwise(() => false)

    if (!shouldRetry) throw result.error

    await sleep(Math.pow(2, i) * 1000) // Exponential backoff
  }

  throw new Error("Max retries exceeded")
}
```

---

## Bundle Size Impact

Despite adding 20+ features, the bundle stayed incredibly small:

| Version | Features | Bundle Size | Size per Feature |
| ------- | -------- | ----------- | ---------------- |
| v0.1.0  | 4        | 2 KB        | 0.5 KB           |
| v0.5.0  | 20+      | 6.4 KB      | 0.32 KB          |

**How?**

- Tree-shaking friendly
- No external dependencies
- Optimized for minification
- Shared code between features

---

## Performance Benchmarks

Tested with 1,000,000 error matches:

```
Tag-based matching (defineError):    ~15ms  (O(1) lookup)
instanceof matching:                 ~85ms  (O(n) iteration)
Pattern composition:                 ~95ms  (multiple tests)
```

**Key insight:** For errors created with `defineError()`, matching is ~5.6x faster due to tag-based O(1) lookup.

---

## What's Next: Phase 6 (v1.0.0)

The roadmap for v1.0.0 includes:

### Error Recovery Patterns

```ts
// Built-in retry, fallback, circuit breaker
matchError(error)
  .with(NetworkError, retry(3, exponentialBackoff))
  .with(ValidationError, fallback(defaultValue))
  .exhaustive()
```

### Framework Integrations

```ts
// Express middleware
app.use(errorHandler([NetworkError, DatabaseError, ValidationError]))

// tRPC error handling
export const createContext = createTRPCContext({
  errorFormatter: tsTypedErrorsFormatter,
})
```

### Error Context Propagation

```ts
// Automatic context tracking
const { wrap } = withContext({ requestId: "123", userId: "abc" })
const result = await wrap(riskyOperation)()
// All errors include requestId and userId
```

---

## Comparison with Alternatives

### vs try/catch

```ts
// try/catch: No type safety, easy to forget cases
try {
  await fetchData();
} catch (error) {
  // error is unknown
  // No compile-time guarantees
}

// ts-typed-errors: Full type safety
const result = await wrap(fetchData)();
if (!result.ok) {
  matchErrorOf<Err>(result.error)
    .with(NetworkError, ...)
    .with(ParseError, ...)
    .exhaustive(); // TypeScript enforces all cases
}
```

### vs neverthrow

```ts
// neverthrow: Great Result type, but manual matching
import { Result, ok, err } from 'neverthrow';

const result: Result<User, NetworkError | ParseError> = ...;
result.match(
  (user) => console.log(user),
  (error) => {
    // Manual instanceof checks
    if (error instanceof NetworkError) { ... }
    else if (error instanceof ParseError) { ... }
  }
);

// ts-typed-errors: Pattern matching + exhaustiveness
const result = await wrap(fetchUser)();
if (!result.ok) {
  matchErrorOf<Err>(result.error)
    .with(NetworkError, ...)
    .with(ParseError, ...)
    .exhaustive(); // Compile error if cases missing
}
```

### vs ts-pattern (for errors)

```ts
// ts-pattern: General-purpose pattern matching
import { match, P } from 'ts-pattern';

match(error)
  .with({ name: 'NetworkError' }, ...)
  .with({ name: 'ParseError' }, ...)
  .exhaustive();

// ts-typed-errors: Specialized for errors with type inference
matchErrorOf<Err>(error)
  .with(NetworkError, (e) => {
    // e is fully typed with data property
    e.data.status; // ✅ Type-safe
  })
  .exhaustive();
```

**When to use what:**

- **ts-pattern**: General pattern matching (objects, arrays, primitives)
- **ts-typed-errors**: Error-specific matching with error-focused features

---

## Community Feedback & Iterations

Based on early adopter feedback, we made several changes:

### 1. "P namespace is verbose"

**Solution:** Keep both APIs - use `P` for composition, direct constructors for simple cases:

```ts
// Simple case: direct constructor
matchError(error)
  .with(NetworkError, ...)
  .otherwise(...);

// Complex case: P namespace
matchError(error)
  .with(P.intersection(P.instanceOf(NetworkError), P.when(...)), ...)
  .otherwise(...);
```

### 2. "How do I match on error data?"

**Solution:** Added `.select()` and pattern composition:

```ts
// Extract specific property
.select(NetworkError, 'status', (status) => ...)

// Or match with P.when
.with(P.when(e => e instanceof NetworkError && e.data.status >= 500), ...)
```

### 3. "Need better async support"

**Solution:** Added dedicated async matchers with proper Promise types:

```ts
await matchErrorAsync(error)
  .with(NetworkError, async e => {
    await logToService(e)
    return "handled"
  })
  .otherwise(async () => "unknown")
```

---

## Migration Guide

### From v0.1.0 to v0.5.0

All existing code continues to work! We maintained backward compatibility.

But here's how to leverage new features:

```ts
// Before (v0.1.0)
matchError(error)
  .with(NetworkError, e => {
    if (e.data.status >= 500) {
      return "Server error"
    }
    return "Client error"
  })
  .otherwise(() => "Unknown")

// After (v0.5.0) - more expressive
const isServerError = P.intersection(
  P.instanceOf(NetworkError),
  P.when(e => e.data.status >= 500)
)

const isClientError = P.intersection(
  P.instanceOf(NetworkError),
  P.not(P.when(e => e.data.status >= 500))
)

matchError(error)
  .with(isServerError, () => "Server error")
  .with(isClientError, () => "Client error")
  .otherwise(() => "Unknown")
```

---

## Testing Strategy

All 92 tests pass with 100% coverage:

```bash
✓ test/integration.test.ts (7 tests)
✓ test/index.test.ts (85 tests)

Test Files  2 passed (2)
Tests       92 passed (92)
```

**Test categories:**

- Basic matching (15 tests)
- Pattern composition (16 tests)
- Error-specific patterns (19 tests)
- Async matching (8 tests)
- Serialization (10 tests)
- Edge cases (24 tests)

---

## Installation & Quick Start

```bash
npm install ts-typed-errors
```

```ts
import { defineError, matchError, P } from "ts-typed-errors"

const NetworkError = defineError("NetworkError")<{
  status: number
  url: string
}>()

const error = new NetworkError("Request failed", {
  status: 500,
  url: "/api/users",
})

const result = matchError(error)
  .with(
    P.intersection(
      P.instanceOf(NetworkError),
      P.when(e => e.data.status >= 500)
    ),
    e => `Server error: ${e.data.status}`
  )
  .otherwise(() => "Unknown error")

console.log(result) // "Server error: 500"
```

---

## Links

- **GitHub:** https://github.com/ackermannQ/ts-typed-errors
- **npm:** https://www.npmjs.com/package/ts-typed-errors
- **Original Article:** https://dev.to/ackermannq/why-i-built-ts-typed-errors-a-typescript-error-handling-revolution-2bph

---

## Final Thoughts

From v0.1.0 to v0.5.0, ts-typed-errors evolved from "exhaustive error matching" to "composable error pattern matching system".

The journey taught me:

1. **Listen to users** - Pattern composition came from community feedback
2. **Iterate quickly** - 5 phases in a few months
3. **Stay focused** - Every feature is error-specific
4. **Performance matters** - O(1) matching was crucial
5. **DX is everything** - Great docs and examples drive adoption

What would you add to Phase 6?

Drop your thoughts in the comments! 💬

---

**Q. Ackermann** – Senior Engineer, Toolmaker, Systems Thinker  
[GitHub](https://github.com/ackermannQ) | [KodeReview](https://kodereview.com/) | [LinkedIn](https://www.linkedin.com/in/quentin-ackermann-537178176/) | [X](https://x.com/qntn_dev)
