---
title: "React Doesn't Scale. Your Structure Does."
date: "2025-06-22T08:40:32.169Z"
description: "Scalability in React has nothing to do with components - and everything to do with how you separate orchestration, effects, and logic."
---

React feels scalable - until you realize your team is afraid to open certain files.

> “We had a component called `CustomerDashboard`. 900+ lines. It fetched data, handled feature flags, did date formatting, triggered analytics, and contained three modals. Nobody knew what was safe to touch.”

This isn't rare. And it's not React's fault. It's ours - for not building structure _around_ it.

React is a rendering library, not a system architecture. If you don't explicitly define your system, your component tree will _become_ it.

---

## 1. Where React stops helping

React is fantastic at rendering state. But beyond JSX and `useEffect`, you're on your own.

You'll start seeing this:

- Hooks become orchestration engines
- Logic spreads across multiple `useEffect`s
- Component props become a chain of derived state
- Reusable logic becomes magic logic

### 🔥 Anti-pattern: Hook-as-everything

```ts
function useSubscriptionFlow(userId: string) {
  const [state, setState] = useState("idle")

  useEffect(() => {
    if (!userId) return

    track("SubscriptionStarted")
    fetchData(userId).then(res => {
      if (res.status === "error") router.push("/error")
      else setState("done")
    })
  }, [userId])

  return state
}
```

✅ What's wrong:

- It tracks analytics
- Performs network fetch
- Triggers navigation
- Manages UI state

One hook. Four responsibilities. Zero clarity.

---

## 2. What scales: structure

The only way to make React codebases scale is to introduce **separation of roles**:

- Rendering vs orchestration vs logic
- Effects vs queries vs business flows
- Triggers vs processors

Let's look at concrete structures I now use.

---

## 3. Flow isolation: move business logic out of components

```ts
// flows/createCustomer.ts
export async function createCustomerAndLog(input: FormData) {
  const customer = await api.createCustomer(input)
  await analytics.track("CustomerCreated", { id: customer.id })
  return customer
}
```

Used from component:

```tsx
const handleSubmit = async () => {
  await createCustomerAndLog(form)
  router.push("/success")
}
```

🧠 This lets components **trigger**, not **orchestrate**.

---

## 4. Pattern: Hook façade

Used in real-world design systems and dashboards:

```ts
function useCustomerDashboard(customerId: string) {
  const profile = useCustomerProfile(customerId)
  const usage = useCustomerUsage(customerId)
  const tags = useCustomerTags(customerId)

  return { profile, usage, tags }
}
```

The component does this:

```tsx
const { profile, usage, tags } = useCustomerDashboard(id)
```

This isolates **data-fetching composition**, not UI logic. Think of it as the `container` pattern for hooks - but **composable and invisible**.

---

## 5. Pattern: Effect isolator

You'll find this in apps like Vercel's dashboard, Sentry's audit logic, and internally at Stripe.

```ts
function useBillingWarning(customer: Customer) {
  useEffect(() => {
    if (customer.balance > 1000) {
      toast.warning("Your balance is overdue")
    }
  }, [customer])
}
```

Used in component:

```tsx
useBillingWarning(customer)
```

🧠 This makes effects **pluggable** and **separable**.  
No business logic in the UI. No hidden triggers. Each concern has a name.

---

## 6. Pattern: Imperative flow manager

Sometimes, declarative React doesn't cut it. You want **imperative orchestration** - think onboarding flows, checkout steps, multi-API syncs.

> Don't shove this in hooks. Model it explicitly.

```ts
// services/accountMigration.ts
export class AccountMigrationManager {
  constructor(private readonly user: User) {}

  async start() {
    await this.exportData()
    await this.deleteLegacyAccount()
    await this.createNewAccount()
  }

  private async exportData() {
    /* ... */
  }
  private async deleteLegacyAccount() {
    /* ... */
  }
  private async createNewAccount() {
    /* ... */
  }
}
```

From React:

```tsx
const manager = useMemo(() => new AccountMigrationManager(user), [user])

const handleMigrate = () => {
  manager.start().then(() => router.push("/done"))
}
```

🧠 Pattern seen in apps that require **step-by-step orchestration** - like Replay.io, or admin dashboards with workflow systems.

---

## 7. Final thoughts

React gives you rendering.  
But only **your structure** can give you clarity, scale, and maintainability.

Build flows that narrate themselves.  
Encapsulate effects with intent.  
Write code that separates thought from display.

> React doesn't scale. Your structure does.

- **Q. Ackermann**  
  _Senior Engineer, Toolmaker, Systems Thinker_  
  [GitHub](https://github.com/ackermannQ) | [KodeReview](https://kodereview.com/) | [LinkedIn](https://www.linkedin.com/in/quentin-ackermann-537178176/)
