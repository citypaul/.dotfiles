# The Language Protocol — detect → propose → decide → record → rename

The language is *expected* to evolve: persistent use forces its weaknesses into the open, and those changes are changes to the domain model (Evans). What is forbidden is **silent** evolution. Five steps, every time.

## 1 — DETECT

Triggers, any one of which starts the protocol:

- You need a term that is not in the context's glossary (writing a spec, a DSL verb, a domain identifier).
- You spot a **synonym or near-duplicate** — two names for one concept, or one name doing two jobs. The rule: one word per concept; two phrases must mean two concepts.
- A term feels **awkward in conversation** — domain experts objecting to a term is signal, not noise.
- The identifier lint fails on an unknown domain word.

## 2 — PROPOSE — never adopt

STOP. Do not use the term in code, tests, or the DSL yet. Present to the human, with a recommendation:

- **Term** — the word or phrase itself
- **Proposed definition** — one or two sentences, in domain language
- **Bounded context** — which glossary it belongs to
- **Example sentence** — the term used as a domain expert would use it
- **Alternatives considered** — and why the proposal beats them

Use the harness's question mechanism (one term at a time, recommendation attached — the same semantics as every other human gate in this framework). An agent that coins a domain term silently has already violated the protocol, whatever the lint says.

## 3 — DECIDE

The human approves, renames (picks a different word for the concept), or rejects (the concept doesn't belong in this context). Cheap by design: one term, one recommendation, one decision.

## 4 — RECORD

- Glossary entry added or updated **in the same PR** as the code that introduces the vocabulary — the glossary is in-repo precisely so this is atomic.
- A replaced term becomes a deprecated **alias** on the new entry, so the lints can reject it *and name its replacement*.
- **Model-changing renames get a Y-statement micro-ADR.** Label-only changes don't. The test: did the *meaning* move, or just the spelling?

Y-statement template:

```
In the context of <use case / bounded context>,
facing <the concern that forced the decision>,
we decided for <the new term / model shape>
and against <the old term / alternatives>,
to achieve <the quality or clarity gained>,
accepting that <the cost — renames, migration, relearning>.
```

## 5 — RENAME

In this order — decision first, then mechanics:

1. Refactor code: classes, functions, variables, branded types.
2. Refactor tests and the acceptance DSL.
3. Glossary already updated (step 4) — all three land in one PR.

**The boundary rule (internal vs published)**: inside the bounded context, rename freely and aggressively — cheap, atomic, safe. At the context's **published boundary** — APIs, event schemas, database contracts other contexts consume — the language is versioned deliberately: additive evolution, explicit deprecation, never a casual rename. If the rename must cross the boundary, that is a contract change, not a vocabulary change; route it through the api-design skill's compatibility rules.

## Worked example

During a payments slice, the spec wants a verb for a customer abandoning a checkout. The glossary has nothing; `cancelOrder` already means merchant-initiated cancellation.

- DETECT: new concept, and a near-collision with `cancel`.
- PROPOSE: term `abandonCheckout`; definition "customer leaves the checkout flow before payment, releasing any held inventory"; context `ordering`; example "Held seats are released when the customer abandons checkout"; alternatives: `cancelCheckout` (collides with merchant cancel), `timeoutCheckout` (only one abandonment path).
- DECIDE: human approves.
- RECORD: `ordering.glossary.yml` gains `abandonCheckout`; no ADR (new concept, no model change).
- RENAME: nothing to rename — the term enters spec, DSL, and domain code new-born, all in the same PR.
