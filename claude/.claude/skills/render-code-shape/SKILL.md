---
name: render-code-shape
description: "Render the shape of code — module boundaries, the types that cross them, signatures, and a cited call graph — for code that already exists or a change about to be built. Every name, type, and path is read from source and cited, or marked NEW; bodies collapse to one line of intent. Use when asking how something composes, tracing what a request actually touches, pseudocoding a change before implementing it, onboarding to an unfamiliar path, or producing the shape a plan and its tests will be checked against. Read-only: the render is the deliverable, never the edit. For judgments about whether the shape is good see codebase-design; for where files should live see structure-codebase; for a rendered picture see diagrams; for fault localization see debugging."
---

# Render Code Shape

Code has a **waterline**. Above it sits the **shape**: modules and their boundaries, the types and values that cross those boundaries, the signatures, and the order calls actually happen in. Below it sits syntax and the statements inside a body.

Render the shape and collapse everything below the waterline to a single line of intent. Only bodies are pseudo — every name, type, and path is read from the source and cited by file and line, or marked `[NEW]`. This is why the render is trustworthy in a way a remembered summary is not.

**Read-only.** The render is the deliverable, not the edit. Producing a render never authorizes changing production code, tests, or configuration. Implement only if the request separately authorizes it, and then under the governing workflow — `tdd` for behavior change, `refactoring` or `reduce-system-complexity` for behavior-preserving work.

**A render is not a verdict.** It states what is visible in the render. Deciding whether a boundary is well-drawn belongs to `codebase-design`; deciding where files should live belongs to `structure-codebase`; ranking architecture investments belongs to `improve-codebase-architecture`.

**Load alongside**: `planning` (a `[NEW]` render is an input to a slice plan, never a substitute for one), `codebase-design` and `structure-codebase` (judgments about the shape once it is visible), `finding-seams` (when the render exposes an untestable dependency), `characterisation-tests` (when the existing path has no behavior evidence), `diagrams` (when relationships are materially clearer drawn than listed), `technical-writing` (when the render becomes a durable document).

## 1. Frame the render

Name the **entry points** to trace from and the **frame edge** — the packages, services, and libraries that count as outside. Name each **wiring** to render: production, plus any composition root that substitutes a dependency, such as tests, local dev, or a feature flag.

Classify each entry point `existing` or `[NEW]`. For a `[NEW]` render, resolve the requirement it must satisfy and the existing code it attaches to.

Prefer the narrowest frame that answers the question asked. A render that expands to the whole repository answers nothing.

**Complete when:** the entry points, the frame edge, every wiring, and the existing/`[NEW]` split are each explicit.

## 2. Read the parts

Follow every call from each entry point, opening each file on the path. For every function reached, record its file and line, its signature as written, the effects it causes, and the calls it makes.

Expand a path until it reaches a boundary crossing, a pure leaf, the frame edge, or a function already recorded. A path ends nowhere else.

For a `[NEW]` render, read the surrounding modules the change attaches to with the same rigour; parts that do not exist yet are derived from the requirement and marked.

Read the source. A signature recalled from training data, inferred from a name, or carried over from an older revision is a fabrication even when it happens to be right — and the citation is what makes the difference checkable.

**Complete when:** every path terminates on one of those four conditions, and every name that will appear in the render is either recorded with a file and line or marked `[NEW]`.

## 3. Render the shape

Write in the project's own language and naming — the glossary term, not a synonym (see `ubiquitous-language`). Three parts:

**Types** — every type, interface, or schema that crosses a boundary, declared with its fields. A type from outside the frame is named and marked external.

**Boundaries** — one row per module: what it owns, what it exposes, what it depends on, and what it hides behind that surface.

**Signatures** — grouped under their module, each carrying parameter names, parameter types, return type, and error type as written in the source. Each body collapses to a single line naming its intent.

Where the cut is not obvious, place it here:

| Above the waterline | Below it |
| --- | --- |
| An effect that leaves the process: network, database, filesystem, clock, randomness, environment | Pure local computation |
| A branch that changes which downstream call happens | A branch that only changes a returned value |
| A helper whose effect crosses the module edge | A private helper contained inside it |
| What is constructed and injected where | Framework and transport boilerplate |

**Complete when:** every type named in a signature is declared here or marked external, every module row states what it hides, and every signature matches its source or carries `[NEW]`.

## 4. Render the call graph

One graph per wiring, as an indented tree. Each edge reads `→ Receiver.method(arg: Type, arg: Type) : Return`, then its annotations, then its file and line. Order siblings by execution order.

```
submitCheckout(req: HttpRequest) : HttpResponse                          src/http/checkout.ts:14
  → Checkout.submit(cart: Cart, actor: UserId) : Receipt                 src/checkout/service.ts:31
      → Pricing.quote(cart: Cart) : Quote                                src/pricing/quote.ts:8
          → TaxRates.lookup(region: Region) : TaxTable  [boundary: network]   src/pricing/tax.ts:22
      → Payments.charge(quote: Quote, card: CardRef) : Receipt  [boundary: network]   src/payments/stripe.ts:40
      → Orders.insert(order: Order) : OrderId  [boundary: database]      src/orders/store.ts:17
      → Email.receipt(to: EmailAddress, receipt: Receipt) : void  [async]   src/mail/queue.ts:9
      → Checkout.release(cart: Cart) : void  [error: charge declined]    src/checkout/service.ts:58
```

Annotate every edge that is not a plain unconditional in-process call with at least one:

| Annotation | Meaning |
| --- | --- |
| `[if …]` | Happens only on the named condition |
| `[each …]` | Repeats over the named collection |
| `[async]` | Enqueued, scheduled, or not awaited on this path |
| `[error …]` | Happens on the named failure path |
| `[boundary: …]` | The effect leaves the process — name which |
| `[NEW]` | Does not exist yet |

A function already drawn appears as `→ Name (above)` in place of a second expansion.

**Complete when:** every edge names the values crossing it, every non-plain edge carries an annotation, every branch terminates on a step 2 condition, and each wiring that differs from production is drawn beside it.

## 5. Return the render

Lead with the entry points, the frame edge, and the wirings drawn. Then give the types, the boundary table, the signatures, and the call graphs.

Close with what the shape shows, stated as facts already visible in the render rather than as judgements: dependency cycles, a dependency pointing against the module layering, argument counts, functions reached from many callers, boundary crossings on the primary path, and paths no wiring covers. Name what stayed unread and why.

Where a fact is a decision waiting to happen, name the skill that owns the decision rather than making it here — a cycle or a leaking boundary routes to `codebase-design`, a path with no test wiring routes to `characterisation-tests` or `finding-seams`, an untraceable dependency routes to `structure-codebase`.

When the render is a plan for work about to be done, save it under `plans/` beside the slice plan so the implementation can be checked against it, and so a later reviewer can see which parts were `[NEW]` at the time.

**Complete when:** every citation resolves, every observation points at an element of the render, and every gap names what would close it.

## Anti-Patterns

- Rendering from memory or from a summary of the code instead of opening the files — the citation is the whole contract.
- Carrying a signature over from an older revision, or inferring one from a name, without reading it.
- Expanding every path to a leaf, producing a render nobody reads, when the question needed one entry point.
- Slipping below the waterline: statements, control-flow detail, and framework boilerplate reproduced as prose.
- Silently mixing `[NEW]` and existing names, so the reader cannot tell what is proposed from what is there.
- Drawing only the production wiring when a test or feature-flag composition root substitutes a dependency that changes the graph.
- Closing with judgments — "this is over-abstracted", "this should be split" — instead of the facts the render actually shows.
- Editing code during the render, or treating an approved render as approval to implement.
- Rendering a `[NEW]` shape and then implementing it straight through, skipping the failing behavior test that `tdd` requires.

## Completion Check

- Does every name, type, and path in the render resolve to a file and line in the current tree, or carry `[NEW]`?
- Is the frame edge explicit, and is every wiring that substitutes a dependency drawn beside production?
- Does every path terminate on a boundary, a pure leaf, the frame edge, or an already-drawn function?
- Does every module row say what it *hides*, not just what it exposes?
- Is every non-plain call-graph edge annotated, and does every edge name the values crossing it?
- Are the closing observations facts visible in the render, with decisions routed to the skill that owns them?
- Did the render stay read-only, and is unread territory named rather than quietly omitted?
