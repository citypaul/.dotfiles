---
name: react-performance
description: "Make React and Next.js performance changes that are measured, evidence-backed, and behaviorally safe. Routes to the right rule catalogue — vercel-react-best-practices for the 72 prioritized React/Next rules, vercel-composition-patterns for component API shape, next-best-practices for App Router semantics, core-web-vitals and performance for field metrics and non-React budgets — then governs how a rule is applied here: baseline first, one hypothesis at a time, behavior tests unchanged and green, and the house functional and typing rules winning where a micro-optimization would trade them away. Use when React or Next.js feels slow, when a bundle, waterfall, re-render, or hydration problem is suspected, when reviewing a diff for performance, or when a performance rule appears to conflict with immutability, TDD, or type-safety guidance. For rendering-tier decisions and browser-observable proof see front-end-testing and react-testing; for flow logic driving the re-renders see xstate."
---

# React Performance

Performance work fails in two predictable ways: optimizing something that was never the bottleneck, and buying speed with a mutation, a cast, or a deleted test. This skill exists to prevent both. It owns the *method*; the rule catalogues own the *rules*.

**The catalogue is not the plan.** Vercel's rules are ordered by typical impact, not by what is slow in *this* application. A rule earns its way into a diff by a measurement, not by appearing high in the list.

## Where the Rules Live

Read the catalogue that matches the question before proposing a change:

| Source | Owns | Reach for it when |
|--------|------|-------------------|
| `vercel-react-best-practices` (external, pinned) | 72 rules across 8 impact-ordered categories: `async-` waterfalls, `bundle-` size, `server-` RSC/serialization, `client-` fetching, `rerender-`, `rendering-`, `js-`, `advanced-` | You have a measured bottleneck and need the specific, worked fix — read the individual `rules/<id>.md`, not just the index |
| `vercel-composition-patterns` (external, pinned) | Compound components, boolean-prop proliferation, context providers, React 19 API changes (`ref` as prop, no `forwardRef`) | The re-render or prop-drilling problem is really a component-API problem |
| `next-best-practices` (external, pinned) | App Router structure, RSC boundaries, async request APIs, metadata | The question is Next.js semantics rather than React cost |
| `next-cache-components` (external, pinned) | Cache Components, `use cache`, revalidation | Caching and revalidation are the lever |
| `core-web-vitals`, `performance` (external, pinned) | LCP/INP/CLS in the field, non-React budgets, images, fonts, third parties | The complaint is a *user-facing* metric, not a React-internal cost |
| `react-testing`, `front-end-testing` | Proving browser-observable behavior survived | Any time a performance change touches rendered output |
| `xstate` | Flow logic that re-renders on every keystroke because it lives in scattered `useState` and `useEffect` | The re-render storm is a modelling problem, not a memoization problem |

If two catalogues disagree, the more specific one wins: Next-specific semantics over general React, field-metric guidance over component-level micro-cost.

## The Method

### 1. Establish the baseline

Name the symptom in user-observable terms — a slow route, an unresponsive input, a heavy first load — and capture a *number* before touching code: a profile, a bundle report, a trace, a field metric. Record how it was measured so the same measurement can be repeated.

**Complete when:** the symptom, the measurement method, and the starting number are all written down, and the number is reproducible.

### 2. Locate the cost

Find where the time actually goes before choosing a category. The prioritized order in the catalogue is a good *search* order — waterfalls and bundle size first, `js-` micro-optimizations last — but it is a hypothesis generator, not a diagnosis. React Profiler, `next build` output, a bundle analyzer, and a network waterfall are evidence; a plausible story about re-renders is not.

**Complete when:** the dominant cost is attributed to a specific boundary — a request waterfall, a bundle entry, a serialization payload, a re-render path, a layout or hydration step — with the evidence that attributes it.

### 3. Apply one rule at a time

Read the specific rule file, then change one thing. Batched "performance passes" make the re-measurement uninterpretable and turn a review into a guess.

Before the change lands, check it against the house rules below.

**Complete when:** exactly one hypothesis is in the diff, and the rule it implements is named.

### 4. Re-measure and keep the evidence

Repeat the step-1 measurement. A change that does not move the number is reverted, not kept "because it is better practice" — an unmeasured optimization is mechanism without benefit, and `reduce-system-complexity` treats added mechanism as a cost.

Record the before/after pair in the PR. Performance is a non-functional guarantee, so this measurement *is* the evidence for the change; it does not substitute for the behavior tests, which must be unchanged and green.

**Complete when:** the same measurement is reported before and after, and every behavior test still passes without modification.

## Where House Rules Win

Performance advice written for the general case sometimes trades away something this repository does not trade. When they collide, these hold:

1. **Behavior tests do not change to accommodate a performance change.** A perf refactor that requires editing assertions is a behavior change wearing a disguise — route it through `tdd`. Deleting or weakening a test to make a benchmark look better is never in scope.
2. **Immutability holds until a measurement says otherwise.** `js-` rules that cache property lookups, mutate accumulators, or reuse arrays in hot loops are legitimate *inside a proven hot path*, and only there. The mutation stays local to a pure function's own scope — never a caller's array or a shared object. See `functional`.
3. **No `any`, no unjustified assertion, for speed.** Skipping schema validation at a trust boundary is a correctness change, not an optimization. See `typescript-strict`.
4. **Memoization is earned, not default.** `rerender-` rules assume a measured re-render problem. `rerender-simple-expression-in-memo` is in the catalogue precisely because reflexive `useMemo`/`memo` costs more than it saves. Prefer deleting the cause — derived state during render, a narrower subscription, a moved boundary — over adding a cache.
5. **Prefer removing mechanism to adding it.** A fix that deletes a waterfall, a provider, or a bundle entry beats one that adds a cache, a ref, or a memo with the same measured effect.
6. **Effects stay modelled.** If the fix is "add another `useEffect` to coordinate", the flow logic wants a machine or a derived value, not another effect. See `xstate` and `rerender-derived-state-no-effect`.
7. **Third-party rules are pinned, not gospel.** The external catalogues are installed at reviewed commits. When a rule contradicts a primary source (React or Next.js docs) for the version actually in use, the primary source wins and the divergence is worth recording via `expectations`.

## Anti-Patterns

- Applying rules top-down from the catalogue with no profile — "we did the CRITICAL ones" is not a diagnosis.
- A single "performance PR" bundling twenty rules, where no individual change can be attributed or reverted.
- `useMemo`, `useCallback`, or `React.memo` added by reflex to components that never re-rendered measurably.
- Reaching for `js-` micro-optimizations while an un-parallelized `await` chain or a barrel import dominates the trace.
- Mutating a caller's array or a shared object in the name of a hot loop.
- Weakening a schema, widening a type, or asserting past a boundary to shave milliseconds.
- Moving work to the client to make a server metric look better, or the reverse, without measuring the metric the user actually feels.
- Measuring in development mode, or on a warm cache, and reporting it as the improvement.
- Treating a bundle-size win as a user win without checking whether the removed code was on the critical path.
- Optimizing a re-render storm caused by flow logic scattered across effects, instead of modelling the flow.

## Completion Check

- Is the symptom stated in user-observable terms, with a reproducible measurement method?
- Was the dominant cost *attributed* with evidence before a category was chosen?
- Does the diff carry one hypothesis, naming the specific rule it applies?
- Does the same measurement, run the same way, show the improvement — and would the change be reverted if it did not?
- Are all behavior tests unchanged and green, with no assertion edited to fit the optimization?
- Did every micro-optimization stay inside a proven hot path, local in scope, with immutability and typing intact at every boundary?
- Was a simpler fix — deleting the waterfall, narrowing the subscription, moving the boundary — considered before a cache was added?
- Is the before/after evidence recorded where the reviewer will see it?
