---
title: "[HookGuard] - HookGuard: A Practical Linter for React Hooks You Can Actually Trust"
date: "2025-05-15T22:40:32.169Z"
description: 🪝
---

React Hooks are powerful - and dangerously easy to misuse.

I've been in multiple companies and as our applications scaled and our teams grew, so did the subtle bugs: stale closures, conditional hook calls, untracked dependencies, memory leaks from async effects - all of which slipped past ESLint - when there actually was ESLint configured - and made it to production.

I didn’t just want better linting rules.

I needed a system that **understood how real developers use hooks**, and could **adapt to the patterns and risks specific to a project**.

That’s why I built **HookGuard** - a fully extensible static analysis engine designed to catch **practical, real-world hook pitfalls**, while respecting your team’s coding style and ecosystem.

## 🚨 Why I Created HookGuard

ESLint is great, but it stops short of being truly useful in complex codebases. Here's what I observed:

- Custom hooks are treated as opaque: no insight into what they _do_
- Conditional logic inside hooks often goes unnoticed
- Linting doesn’t help you catch _dangerous side effects_ - just missing deps
- No support for **contextual diagnostics** or **developer-friendly feedback**

Worse: over time, developers either **mute rules** or **learn to ignore warnings** that don’t feel actionable. The trust is lost.

### ✅ Use Cases

- Audit a codebase before major refactor
- Enforce hook hygiene in a growing team
- Assist onboarding by highlighting complex logic
- Justify architectural changes with risk metrics
- Detect dangerous patterns in-flight (with IDE integration)

### I wanted a different philosophy

- ⚖️ _Less dogma. More insight._
- 🧠 _More signal. Less noise._
- 🛠️ _Rules born from real bugs, not theoretical purity._

I mainly wanted to build a tool that would help ship more reliable, maintainable code while keeping the developer experience fast and flexible.

## 🧪 What HookGuard Actually Does

HookGuard is a **rule-based engine** that statically analyzes `useEffect`, `useMemo`, `useCallback`, and even **custom hooks you write**.

It mainly works in two parts:

1. **hookExtractor.ts** - A static parser that walks through your hook logic and builds a semantic model: hook name, dependencies, body, async calls, etc.

2. **rules/ directory** - A series of plug-and-play rules, each exposing:

```ts
interface HookRule {
  id: string
  description: string
  appliesTo(hook: HookInfo): boolean
  evaluate(hook: HookInfo): RuleResult | null
}
```

This approach lets you **define your own rules** - without modifying the core engine.

## ⚙️ Rules I've Implemented (and Why They Matter)

HookGuard ships with core rules that solve recurring problems from production bugs I’ve seen firsthand:

### `NoCleanupRule`

Detects `useEffect` blocks with async calls or event listeners - without proper cleanup.

Why it matters: Without cleanup, React components leak memory or re-attach duplicate listeners.

### `ExcessiveDependenciesRule`

Flags effects or memos with overly broad dependency arrays (e.g. whole objects or state slices).

Why it matters: These often cause **unnecessary re-renders** or **performance degradation** - and are rarely intentional.

### `UnsafeNetworkRule`

Flags direct network calls inside effects without abort signals or guards.

Why it matters: You risk **fetch-after-unmount** bugs, data inconsistency, and wasted resources.

### `MissingDependenciesRule`

Flags effects or memos with missing dependency arrays (e.g. it won't retrigger if the object changes).

Why it matters: Missing dependencies can lead to stale closures, subtle bugs, and effects that silently stop reacting to key variable changes. This rule helps enforce predictable and reactive behavior by ensuring all referenced variables are declared.

### `AsyncEffectRule`

Flags useEffect hooks whose callback is declared as async.

React does not support async functions directly as effect callbacks. Declaring useEffect(async () => { ... }) causes React to ignore the returned Promise, which breaks the expected cleanup behavior and can lead to memory leaks or unexpected state updates.

## 🔌 Extensibility: Your Rules, Your Context

All rules live in your local `hookguard.config.ts`. You can:

- Add or remove rules
- Disable them by file or hook type
- Create entirely new ones for your architecture - don't hesitate to open a PR!

Example _hookguard.config.ts_:

```ts
import { HookRule, RuleResult } from "./src/rules/Rule"
import { HookInfo } from "./src/scanner/hookExtractor"
import { HookGuardConfig } from "./src/config/defaultConfig"

/**
 * Fake rule for demonstration purposes
 */
export class FakeRule implements HookRule {
  id = "fake-rule"
  description = "It's a fake rule for demonstration purposes"

  appliesTo(hook: HookInfo): boolean {
    return hook.name === "useEffect"
  }

  evaluate(hook: HookInfo): RuleResult | null {
    return {
      ruleId: this.id,
      level: "info",
      message: "It's a useEffect hook!",
      suggestions: [
        "Write here some suggestions for ensuring the rules is respected",
      ],
    }
  }
}

export const config: HookGuardConfig = {
  customRules: { "fake-rule": new FakeRule() },
  rules: {
    "no-cleanup": true,
    "unsafe-network": true,
    "excessive-dependencies": true,
    "missing-dependency": false,
    "async-effect": false,
    "fake-rule": true,
  },
  thresholds: {
    failOnScore: undefined,
    failOnCritical: false,
  },
  suspiciousCalls: [
    "setUser",
    "setAuth",
    "setSession",
    "setTheme",
    "setLocale",
    "setLanguage",
    "setSettings",
  ],
}
```

The `RuleResult` returns not just a message - but:

- A **message** (e.g. "unstable network effect")
- **suggestions** (e.g. "wrap in useCallback and pass signal")
- A **level**

HookGuard becomes not just a linter - but a **living documentation engine for your team’s hook discipline**.

## 🧑‍💻 The VS Code Extension

To make adoption seamless, I built a **VS Code extension** called `vscode-hookguard`. It:

- Runs HookGuard in the background
- Shows live diagnostics and underlines risks directly in your code
- Offers contextual suggestions in the Problems panel

## 📈 Adoption & Impact

HookGuard is now used by multiple teams working with large-scale React apps.

We’ve seen:

- ✅ **Reduction in subtle hook bugs** (particularly around stale data and async effects)
- 🛠️ **Better dev onboarding** - new hires understand our hook patterns in days, not weeks
- 🧘 **Cleaner reviews** - with fewer "Why is this rerendering?" debates

HookGuard isn’t just about rules - it’s about creating **a shared language for writing and debugging hooks**.

## ✅ **GitHub Action** for CI integration

Even though HookGuard is a CLI tool, it can be integrated into your CI pipeline. This allows you to run HookGuard on every push, pull request, or commit, and fail the build if any rule violations are found.
The diff system partiularly helps understanding the impact of the changes, if new complexity is introduced or if some nasty bugs got fixed.
The results can be added in PR comments.

```yaml
// github/workflows/hookguard.yml
name: HookGuard Routine

on:
  pull_request:
    paths:
      - "src/**"
      - "**.ts"
      - "**.tsx"

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: |
          corepack enable
          npm install
          npm run build

      - name: Generate report from master
        run: |
          git fetch origin master
          git reset --hard  # ← supprime les fichiers modifiés
          git switch -c master-snapshot FETCH_HEAD
          npx hookguard scan ./src
          mv $(ls -t ./data/hookguard-log-*.json | head -n1) ./data/hookguard-master.json

      - name: Restore PR branch
        run: |
          git checkout ${{ github.head_ref }}

      - name: HookGuard Scan on PR
        run: |
          npx hookguard scan ./src
          mv $(ls -t ./data/hookguard-log-*.json | head -n1) ./data/hookguard-pr.json

      - name: Generate HookGuard summary (Markdown)
        run: |
          HG_MARKDOWN=1 npx hookguard report ./data/hookguard-pr.json > hookguard-summary.md

      - name: Comment HookGuard summary on PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: hookguard-summary.md
          header: hookguard-summary

      - name: Generate HookGuard diff
        run: |
          npx hookguard diff ./data/hookguard-master.json ./data/hookguard-pr.json > hookguard-diff.md

      - name: Comment HookGuard diff on PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: hookguard-diff.md
          header: hookguard-diff
```

## 🔭 Roadmap

The next steps for HookGuard include:

### 📊 **Visual dashboard** - "Hook Hygiene Tracker"

> Track how clean your hooks are - at a glance.

A dashboard that aggregates HookGuard results across files, folders, and commits.

- Displays a "Hook Hygiene Score" over time.
- Highlights:
  - most violated rules
  - files/modules with the highest hook debt
  - trend charts: are you improving or degrading?
- Can be self-hosted or deployed as part of a SaaS model.
- Exportable reports for teams and tech leads.

🎯 Goal: Help teams visualize technical debt related to hooks, like Code Climate but focused on hook usage.

### HookGPT

> What if your linter could explain your code?

- Combine static analysis (HookGuard) with GPT-4 (or local LLM).
- For each hook, generate:
  - an explanation in plain English
  - suggestions for cleanup, dependency fix, stale logic
  - diff proposal for refactor (optional)
- Could be integrated directly in the VS Code extension, or via a CLI command.

🎯 Goal: Offer context-aware guidance beyond static rules - and help onboard devs faster.

### Hygiene Analytics - Lead-Level Insights

> Not just feedback - strategy.

- Aggregate violation data over time:
  - What patterns are teams struggling with?
  - Which rules are rarely violated? (Can be softened or dropped.)
  - Are some modules consistently worse?
- Offer CSV export or Grafana-compatible output.
- Help tech leads drive targeted refactoring campaigns or developer education.

🎯 Goal: Move from “code policing” to “code coaching” - with measurable KPIs.

## 🧘 Lessons Learned

> A good dev tool doesn’t enforce style - it enforces **awareness**.

HookGuard works because it comes from the field, not from theory.

We didn’t aim to create a perfect linter - we aimed to build one that **devs trust**.

- ✅ Rules solve **real bugs**
- ✅ Feedback is **contextual**
- ✅ Adoption is **painless**
- ✅ The code is **yours to extend**

And in the end, that trust leads to cleaner, more reliable apps.

## 🙌 Try It, Fork It, Break It

HookGuard is available on npm:

```sh
npm install hookguard
```

And the VS Code extension is live: [vscode-hookguard](https://marketplace.visualstudio.com/items?itemName=ackermannQ.vscode-hookguard)

It’s built to help real developers write safer, more maintainable hook logic - without slowing you down.

If you use it, break it, improve it - I’d love to hear from you.  
Submit a rule, share your use case, or even just ping me to say hi.

Let’s make hook hygiene... fun again.

- **Q. Ackermann**  
  _Senior Engineer, Toolmaker, Systems Thinker_  
  [GitHub](https://github.com/ackermannQ) | [KodeReview](https://kodereview.com/) | [LinkedIn](https://www.linkedin.com/in/quentin-ackermann-537178176/)
