---
title: "You Shouldn't Need to Reverse Engineer Your Own React App"
date: "2025-05-26T15:03:00.000Z"
description: "Structure isn't a luxury. It's how we prevent our systems from decaying under their own weight."
---

We've all been there.
You need to change a feature, fix a bug, or review a PR.
And suddenly, you realize: you don't even know where to start.

The code technically works. But it doesn't explain itself.
There's no obvious place to plug into. No signposts. Just fragments of logic scattered across components, hooks, and helpers.

So you do what any experienced developer does: you reverse engineer the system.
You crawl through files, rename variables locally to understand data flows, and slowly build a mental model - again.

That's not sustainable.

---

## Structure isn't cosmetic. It's survival

What we call "technical debt" is often just the absence of intentional structure.
And it leads to silent failure modes:

- PRs that no one wants to review because they touch too many unclear areas
- New team members who can't find where logic lives
- Developers who avoid changing things because they're afraid to break what they don't understand

Eventually, your codebase becomes a high-friction environment. Not because it's broken - but because it doesn't speak.

---

## You know it's happening when...

Here are the real-world signals that tell you structure is decaying:

- A component is doing five things, but it's "not worth the refactor right now"
- A flow can only be understood by replaying it in your head
- A new dev takes days to find where to add a simple feature
- You have to jump between four files just to follow one behavior
- PRs feel like archaeology

Most devs feel this and call it "complexity."
But it's actually a lack of architectural constraints.

Good structure makes the next step obvious. And when it doesn't, that ambiguity becomes a productivity sink.

---

## What I look for when reading a new project

When I join a codebase, I open the app and interact like a user.
Then I trace how those behaviors are implemented.

- Where is this UI rendered?
- What logic powers it?
- What side effects does it trigger?

If I can follow that loop in 10 minutes, I know the architecture holds.
If not, I'm looking at a system that wasn't built for humans - or at least not beyond its original authors.

I don't expect perfect modularity. But I expect graceful scale.
When a component grows, it should expand its structure. That means introducing separation, naming its parts clearly, and exposing boundaries that others can work within.

---

## My system: separating flow, logic, and rendering

When I build systems meant to last, I rely on a few repeatable patterns and folder conventions:

- `flows/` - business actions modeled as imperative sequences
- `services/` - reusable pure logic (validation, formatting, utilities)
- `features/` - one per domain or screen, grouping UI, hooks, and tests
- `ui/` - low-level visual components with no business logic
- `hooks/` - reactive bridges, ideally dumb wrappers around flows/services

This gives developers mental orientation. It tells them "where things go" and makes refactoring less risky.

### Example: billing system

Let's say we're building a screen to let users view their current invoice and pay it.

**`flows/payInvoice.ts`**

```ts
export async function payInvoiceFlow(invoiceId: string) {
  const invoice = await api.fetchInvoice(invoiceId)
  if (!invoice || invoice.status === "paid") return

  const paymentResult = await api.pay(invoiceId)
  await auditLog.record({ type: "payment", invoiceId })

  return paymentResult
}
```

**`services/invoice.ts`**

```ts
export function formatInvoiceAmount(invoice: Invoice): string {
  return `$${(invoice.totalCents / 100).toFixed(2)}`
}

export function canInvoiceBePaid(invoice: Invoice): boolean {
  return invoice.status === "pending"
}
```

**`features/billing/BillingScreen.tsx`**

```tsx
import { payInvoiceFlow } from "@/flows/payInvoice"
import { formatInvoiceAmount, canInvoiceBePaid } from "@/services/invoice"

export function BillingScreen({ invoiceId }: { invoiceId: string }) {
  const { data: invoice } = useInvoiceQuery(invoiceId)
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    setLoading(true)
    await payInvoiceFlow(invoiceId)
    setLoading(false)
  }

  if (!invoice) return <LoadingIndicator />

  return (
    <BillingCard>
      <Amount>{formatInvoiceAmount(invoice)}</Amount>
      <PayButton
        onClick={handlePay}
        disabled={!canInvoiceBePaid(invoice) || loading}
      />
    </BillingCard>
  )
}
```

**`ui/BillingCard.tsx`**

```tsx
export function BillingCard({ children }: { children: React.ReactNode }) {
  return <div className="billing-card">{children}</div>
}
```

### Why it works

- The **flow** describes the business behavior end-to-end.
- The **service** extracts testable logic and utility formatting.
- The **feature** file holds the orchestration layer for one domain.
- The **UI** component makes visual reuse explicit.

This means the billing logic is:

- Easy to test
- Easy to follow
- Easy to change without fear
- Easy to onboard into for new contributors

That's not overengineering. That's investing in **code that explains itself**.

---

## Onboarding friction is not a rite of passage

I've seen well-structured projects decay in less than a year - not because people stopped caring, but because structure wasn't maintained.

Every "quick fix" that breaks separation is a tax on future developers.
Every logic shortcut that leaks into the UI costs us debug time later.

That's how rot starts. And by the time it's obvious, it's expensive to reverse.

---

## For leads and engineering managers: these are real metrics

Structure is measurable - not just by LOC, test coverage, or bugs, but by friction.

Here are concrete signals:

- Average time to review PRs (especially by team members outside the author's feature)
- Time to first meaningful contribution for a new hire
- Number of hotfixes or production bugs that involve tangled logic
- How often the same modules appear in complex diffs
- Ratio of reactive bugfixes to structural ones

These are early warning signs.
If your app requires archaeology before action, it's not healthy.
If your devs hesitate before opening files - that's not culture, it's pain avoidance.

Track the pain. Structure is how you reduce it.

---

## Final thought

If you feel like you're always reverse engineering your own system, that's a signal - not a skill test.

Good code doesn't just work. It narrates.
It gives others a way in. It survives context loss.

You don't fix this by rewriting everything.
You fix it by:

- Isolating flows
- Clarifying services
- Making views shallow and honest
- Giving structure a name, and making it part of your culture

Because in the end, good architecture is not just for today's team. It's for the one who shows up next.

---

**Q. Ackermann**  
_Senior Engineer, Toolmaker, Systems Thinker_  
[GitHub](https://github.com/ackermannQ) | [KodeReview](https://kodereview.com/) | [LinkedIn](https://www.linkedin.com/in/quentin-ackermann-537178176/)
