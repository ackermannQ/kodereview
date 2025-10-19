---
date: "2025-10-01T08:00:00.000Z"
description: A deep dive into how `ts-typed-errors` brings compile-time
  exhaustive error matching to TypeScript, eliminating verbose `if/else`
  chains and improving developer experience across the stack.
title: How I Solved the Exhaustive Error Matching Problem Every
  TypeScript Developer Faces
---

## Introduction

If you've ever written robust TypeScript code, you've probably
encountered **the "unknown" error type hell**.\
Since TypeScript 4.4, every `catch` block receives an `unknown` type---a
great move for safety, but a nightmare for developer experience.

This article explains how I designed `ts-typed-errors`, a **tiny,
dependency-free utility** that makes error handling in TypeScript both
**exhaustive** and **ergonomic**, enforcing compile-time coverage across
all error types.

---

## The Problem: TypeScript's `unknown` Error Hell

Since TypeScript 4.4, every `catch` block receives an `unknown` type.
This was a great improvement for type safety, but it created a new
problem: **verbose, error-prone error handling**.

```typescript
try {
  await riskyOperation()
} catch (error) {
  if (error instanceof NetworkError) {
    handleNetworkError(error)
  } else if (error instanceof ValidationError) {
    handleValidationError(error)
  } else if (error instanceof DatabaseError) {
    handleDatabaseError(error)
  } else {
    handleUnknownError(error)
  }
}
```

### Why This Is a Problem

- **Verbose**: Repetitive `if/else` chains\
- **Error-prone**: Easy to forget cases\
- **No exhaustiveness**: TypeScript can't ensure all handled\
- **Poor DX**: No autocomplete or type inference in handlers

---

## The Solution: Exhaustive Error Matching

I built `ts-typed-errors` to solve this exact problem.

```typescript
import { defineError, matchErrorOf, wrap } from "ts-typed-errors"

const NetworkError = defineError("NetworkError")<{
  status: number
  url: string
}>()
const ValidationError = defineError("ValidationError")<{
  field: string
  value: any
}>()
const DatabaseError = defineError("DatabaseError")<{
  table: string
  operation: string
}>()

type AppError =
  | InstanceType<typeof NetworkError>
  | InstanceType<typeof ValidationError>
  | InstanceType<typeof DatabaseError>

const safeOperation = wrap(async () => {
  /* risky op */
})

const result = await safeOperation()
if (!result.ok) {
  return matchErrorOf<AppError>(result.error)
    .with(
      NetworkError,
      e => `Network error: ${e.data.status} for ${e.data.url}`
    )
    .with(ValidationError, e => `Invalid ${e.data.field}: ${e.data.value}`)
    .with(
      DatabaseError,
      e => `Database issue in ${e.data.table} during ${e.data.operation}`
    )
    .exhaustive()
}
```

---

## Why It's Revolutionary

### 🛡️ Compile-Time Exhaustiveness

If a new error type is added, TypeScript fails compilation until you
handle it.

```typescript
type AppError = NetworkError | ValidationError | DatabaseError | NewError
// ❌ TypeScript error: NewError is not handled!
```

### 📦 Zero Dependencies

- 1--2 KB gzipped\
- Tree-shakeable\
- Works everywhere

### 🚀 Better Developer Experience

```typescript
matchErrorOf<AppError>(error)
  .with(NetworkError, e => console.log(e.data.status))
  .with(ValidationError, e => console.log(e.data.field))
  .exhaustive()
```

---

## Real-World Example: API Error Handling

```typescript
const ValidationError = defineError("ValidationError")<{
  field: string
  value: any
}>()
const NotFoundError = defineError("NotFoundError")<{
  resource: string
  id: string
}>()
const RateLimitError = defineError("RateLimitError")<{
  limit: number
  remaining: number
}>()
const DatabaseError = defineError("DatabaseError")<{
  operation: string
  table: string
}>()

type APIError =
  | InstanceType<typeof ValidationError>
  | InstanceType<typeof NotFoundError>
  | InstanceType<typeof RateLimitError>
  | InstanceType<typeof DatabaseError>

const safeGetUser = wrap(async (id: string) => {
  if (!id) throw new ValidationError("ID required", { field: "id", value: id })
  const user = await db.users.findById(id)
  if (!user) throw new NotFoundError("User not found", { resource: "user", id })
  return user
})

app.get("/users/:id", async (req, res) => {
  const result = await safeGetUser(req.params.id)
  if (!result.ok) {
    const errorResponse = matchErrorOf<APIError>(result.error)
      .with(ValidationError, e => ({
        status: 400,
        message: `Invalid ${e.data.field}`,
      }))
      .with(NotFoundError, e => ({
        status: 404,
        message: `${e.data.resource} not found`,
      }))
      .with(RateLimitError, e => ({
        status: 429,
        message: `Rate limit exceeded`,
      }))
      .with(DatabaseError, e => ({ status: 500, message: `DB error` }))
      .exhaustive()
    return res.status(errorResponse.status).json(errorResponse)
  }
  res.json(result.value)
})
```

---

## The Journey

- 20+ error types → chaos\
- Result types lacked exhaustiveness\
- Pattern matching libs weren't error-focused\
- Combined discriminated unions + fluent API

---

## Impact

- Cleaner codebases\
- Fewer production bugs\
- Better DX\
- Easier onboarding

---

## Try It Yourself

```bash
npm install ts-typed-errors
```

```typescript
const MyError = defineError("MyError")<{ code: string }>()
const safeFn = wrap(() => {
  throw new MyError("Oops", { code: "E001" })
})
const result = await safeFn()
if (!result.ok) {
  const msg = matchErrorOf<InstanceType<typeof MyError>>(result.error)
    .with(MyError, e => `Error ${e.data.code}: ${e.message}`)
    .exhaustive()
  console.log(msg)
}
```

---

## The Future

- React Error Boundaries\
- Express middleware\
- Jest/Vitest matchers\
- IDE tooling

---

## Conclusion

`ts-typed-errors` changes how we think about errors in TypeScript.\
It gives us:

- ✅ Compile-time safety\
- ✅ Cleaner ergonomics\
- ✅ Zero dependencies\
- ✅ Tiny bundle

Adopt it incrementally in any project---one function at a time.

---

**Q. Ackermann**\
_Senior Engineer, Toolmaker, Systems Thinker_\
[GitHub](https://github.com/ackermannQ) \|
[KodeReview](https://kodereview.com/) \|
[LinkedIn](https://www.linkedin.com/in/quentin-ackermann-537178176/)
