---
name: ubiquitous-language
description: "One ubiquitous language per bounded context — mechanically enforced, evolving only by decision. Per-context Contextive-format glossaries reconciled against code by lint; the five-step language protocol (detect, propose, decide, record, rename) for every new or changed domain term; glossary-driven identifier and test-title checking. Use when naming domain concepts, when a term is missing from or fights the glossary, when spotting synonyms or near-duplicates, when bootstrapping a glossary, or when renaming across a bounded context. For DDD building blocks see domain-driven-design; for acceptance-DSL vocabulary see acceptance-testing."
---

# Ubiquitous Language: Evolution by Decision, Never Drift

A change in the language **is** a change to the model (Evans). One ubiquitous language per bounded context — apply a single language to a whole enterprise and you will fail (Vernon). This skill makes the language a first-class, mechanically-enforced artifact that is *expected* to evolve — but only ever through an explicit, recorded decision.

The documented agent failure mode this kills: terminology drift — `processUserData` vs `processUserInfo` near-duplicates, "booking" quietly becoming "reservation" mid-feature. Prompt-level glossaries steer; deterministic gates enforce.

| Resource | Load when... |
|----------|-------------|
| `resources/language-protocol.md` | A term is missing, awkward, or duplicated — running the five steps, writing Y-statement micro-ADRs |
| `resources/glossary-format.md` | Creating or editing a glossary — Contextive YAML format, context scoping, aliases, bootstrap paths |

---

## Where the Language Lives (priority order)

Team speech and **the model in the code** are the only guaranteed-current denotation of the language (Vernon). So:

1. **Domain code** — identifiers and branded types ARE the language. `CustomerId`, `Receipt`, `placeOrder`. Branded types are the *positive* enforcement: the only way to obtain a `CustomerId` is the named parse, so primitives can't smuggle anonymous concepts through the domain.
2. **The acceptance harness** — DSL verbs and test titles are the *executable* ubiquitous language. Write for the least technical person who understands the problem domain (Farley); test names as domain sentences is the founding move of BDD (North).
3. **The glossary** — the *index*, not the source of truth. Per bounded context, in the repo, riding PR review: `<context>.glossary.yml` in Contextive format (LSP-based hover definitions in every major editor; folder scoping maps onto bounded contexts). A glossary that isn't reconciled against code rots — this one is lint-checked against the code, which is precisely what makes it living.

## The Language Protocol (the centrepiece)

Silent evolution is forbidden. Every new, changed, or suspect domain term runs five steps — full guidance in `resources/language-protocol.md`:

1. **DETECT** — you need a term the glossary lacks; you spot a synonym or near-duplicate (one word per concept; two phrases must mean two concepts); a term feels awkward in conversation; or the identifier lint fails on an unknown domain word.
2. **PROPOSE — never adopt.** STOP and present to the human: the term, a proposed definition, the bounded context, an example sentence, and the alternatives considered. Use the harness's question mechanism with a recommendation attached. An agent never coins a domain term silently.
3. **DECIDE** — the human approves, renames, or rejects. Cheap because it's one term at a time with a recommendation.
4. **RECORD** — glossary entry added or updated *in the same PR*; replaced terms become deprecated `aliases` (so lints can name the replacement). Renames that change the **model**, not just a label, get a Y-statement micro-ADR; routine additions need only the glossary diff.
5. **RENAME** — in that order: decision first, then refactor code, tests, and glossary together in one atomic PR. **Boundary rule**: rename freely *inside* the bounded context; the published language at context boundaries — APIs, events, schemas — is versioned deliberately, never casually renamed.

## Mechanical Enforcement

Where a mechanical enforcement layer is installed (lint rules generated from the glossary), it runs inside the agent's loop, scoped to domain paths — and enforces:

- **Banned vocabulary** — weasel suffixes in domain code (`Info`, `Base`, `Item`, `Manager`, `Helper`, `Util`, `Data`, `Processor`, `Impl`, …): these names mean the concept hasn't been found yet.
- **Glossary-driven identifier check** (the flagship, novel-in-TypeScript rule) — split identifiers into words; validate domain words against the context's glossary using **token classes**: glossary terms / deprecated aliases (flagged with their replacement) / path-scoped technical stopwords / exempt framework identifiers.
- **Test-title check** — titles validated against the glossary; deprecated aliases rejected *naming the canonical replacement*.
- **DSL vocabulary check** — a new acceptance-DSL verb either exists in the glossary or triggers the protocol.
- **Structural rules** — pure-domain-core dependency rules (no domain→app, no domain→infra except ports, no framework imports in domain).

**Every rule teaches**: three-part messages — what fired, why the rule exists, what to do instead, with a skill pointer. A gate with no exit invites bypass, so the documented-exception process (justified in the PR, recorded) stays open.

**Enforcement status**: until a generated lint layer or equivalent gate is installed in the project, everything here is convention — say so; never imply protection that isn't there. The protocol and glossary stand on their own; enforcement is an amplifier, not a prerequisite.

## The Adoption Spectrum

- **Greenfield** — full rule set from commit one; the walking skeleton is the first passenger.
- **Brownfield — the protected-core ratchet.** You cannot lint your way to hexagonal in a big ball of mud: a rule that fires 4,000 times on day one is deleted on day two. Instead declare a nearly-empty `domain/` core and enforce *its* purity from day one; legacy stays legally messy outside but reaches in only through ports; every slice touching legacy business logic moves that logic into the core (Strangler Fig). Pre-existing violations freeze in a baseline whose counter may only go down. The glossary rolls out the same way: warn-first, diff-scoped, until it matures.
- **Spikes** — the declared spike marker exempts language and architecture rules, except quarantine, which never turns off. Vocabulary discovered in a spike enters the glossary through the protocol at promotion time, not during the spike.

## Boundaries

| Situation | Skill |
|-----------|-------|
| Value objects, entities, aggregates, bounded contexts | `domain-driven-design` |
| Ports/adapters structure the arch rules enforce | `hexagonal-architecture` |
| DSL and test-title vocabulary in the outer loop | `acceptance-testing` |
| Recording a model-changing rename | `adr` agent (Y-statement template) |
| Naming questions during authoring-loop interrogation | `grill-me` (A3) |

## Verification Checklist

- [ ] One glossary per bounded context, Contextive format, in the repo
- [ ] No domain term coined without the five-step protocol — proposals presented, never adopted silently
- [ ] Glossary diff rides the same PR as the code that introduces the vocabulary
- [ ] Replaced terms recorded as deprecated aliases with replacements
- [ ] Model-changing renames carry a Y-statement micro-ADR
- [ ] Published language at context boundaries versioned, never casually renamed
- [ ] Lint rules carry three-part teaching messages
- [ ] Brownfield: baseline counter only ever goes down; new code fully ruled
- [ ] Spike code exempt by marker only; quarantine always on
