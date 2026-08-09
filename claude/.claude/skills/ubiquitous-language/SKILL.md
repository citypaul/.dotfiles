---
name: ubiquitous-language
description: "One ubiquitous language per bounded context, with a repository-declared glossary as the naming authority and explicit decisions for language changes. Covers the five-step language protocol (detect, propose, decide, record, rename), optional glossary-driven lint ratchets, and safe context-wide renames. Use when naming domain concepts, when a term is missing from or fights the glossary, when spotting synonyms or near-duplicates, when bootstrapping a glossary, or when renaming across a bounded context. For DDD building blocks see domain-driven-design; for acceptance-DSL vocabulary use the project's relevant installed skill."
---

# Ubiquitous Language: Evolution by Decision, Never Drift

A change in the language **is** a change to the model (Evans). One ubiquitous language per bounded context — apply a single language to a whole enterprise and you will fail (Vernon). This skill makes the repository's declared glossary the naming authority. The language is expected to evolve, but only through an explicit, recorded decision.

The documented agent failure mode this kills: terminology drift — `processUserData` vs `processUserInfo` near-duplicates, "booking" quietly becoming "reservation" mid-feature. Prompt-level glossaries steer; deterministic gates enforce.

| Resource | Load when... |
|----------|-------------|
| `resources/language-protocol.md` | A term is missing, awkward, or duplicated — running the five steps and recording model-changing decisions |
| `resources/glossary-format.md` | Creating or editing a glossary — repository schema, optional Contextive example, context scoping, aliases, bootstrap paths |

---

## Where the Language Lives

1. **The declared glossary** is the naming authority for its bounded context. Canonical spelling and capitalization matter whenever the concept is named. Use the repository's chosen file location and schema; do not impose a different glossary format.
2. **Domain code and executable examples** consume and exercise that language. Identifiers, branded types, DSL verbs, and test titles should use the canonical terms.
3. **The rest of the maintained system** propagates approved terms through schemas, APIs, documentation, diagrams, fixtures, and generated clients. Public wire vocabulary may need deliberate versioning even after an internal rename.
4. **Speech, plans, research, comments, historical documents, and existing code** expose candidate vocabulary and possible drift. They are evidence for a proposal, not authority that can silently canonize a term.

Absence from the glossary means **not yet agreed**. It does not automatically approve or forbid a word.

Working names must be visibly provisional and name how they will be ratified or replaced. Do not let a placeholder spread as if it were approved language.

## The Language Protocol (the centrepiece)

Silent evolution is forbidden. Every new, changed, or suspect domain term runs five steps — full guidance in `resources/language-protocol.md`:

1. **DETECT** — you need a term the glossary lacks; you spot a synonym or near-duplicate (one word per concept; two phrases must mean two concepts); a term feels awkward in conversation; or a targeted identifier lint flags an unknown domain word. A missing term is not yet agreed.
2. **PROPOSE — never adopt.** STOP and present to the human: the term, a proposed definition, the bounded context, an example sentence, and the alternatives considered. Use the host's structured question mechanism when available; otherwise ask one concise plain-text question with a recommendation. An agent never coins a domain term silently.
3. **DECIDE** — the human approves, renames, or rejects. Cheap because it's one term at a time with a recommendation.
4. **RECORD** — glossary entry added or updated in the same reviewable change; rejected or replaced aliases point to the owning bounded context and canonical term. Renames that change the **model**, not just a label, use the repository's decision-record mechanism; routine additions need only the glossary diff.
5. **RENAME** — in that order: decision first, then refactor code, tests, and glossary together in one reviewable change. **Boundary rule**: rename freely *inside* the bounded context; the published language at context boundaries — APIs, events, schemas — is versioned deliberately, never casually renamed.

## Mechanical Enforcement

Where a mechanical enforcement layer is installed (lint rules generated from the glossary), it runs inside the agent's loop, scoped to domain paths — and enforces:

- **Project-declared vocabulary smells** — a repository may choose to flag vague suffixes such as `Manager`, `Helper`, or `Impl` in selected domain paths. Treat them as prompts for review, never universal bans: a canonical glossary term overrides a generic smell list.
- **Glossary-driven identifier check** (the flagship, novel-in-TypeScript rule) — split identifiers into words; validate domain words against the context's glossary using **token classes**: glossary terms / deprecated aliases (flagged with their replacement) / path-scoped technical stopwords / exempt framework identifiers.
- **Test-title check** — titles validated against the glossary; deprecated aliases rejected *naming the canonical replacement*.
- **DSL vocabulary check** — a new acceptance-DSL verb either exists in the glossary or triggers the protocol.
- **Context-scoped aliases and forms** — validate aliases within their owning context; enforce canonical case, plurals, identifier forms, and public wire names where the glossary declares them.
- **Language scope only** — delegate architecture and dependency enforcement to `domain-driven-design`, `hexagonal-architecture`, and `structure-codebase`; do not smuggle structural policy into a vocabulary lint.

**Every rule teaches**: three-part messages — what fired, why the rule exists, what to do instead, with a skill pointer. A gate with no exit invites bypass, so the documented-exception process (justified in the PR, recorded) stays open.

**Enforcement status**: until a generated lint layer or equivalent gate is installed in the project, everything here is convention — say so; never imply protection that isn't there. Even when the command is green, report its configured paths and token classes: a targeted ratchet is not proof that every prose passage and identifier uses the ubiquitous language correctly.

Every language guard needs a positive control: a fixture or focused test that introduces known-forbidden vocabulary and proves the guard fails with the owning context and canonical replacement. Scanning the current tree and finding nothing proves only that the scanner completed.

## The Adoption Spectrum

- **Greenfield** — start with the glossary and the smallest useful positive-control guard; add enforcement only where it catches a demonstrated drift risk.
- **Brownfield — the protected-core ratchet.** A rule that fires thousands of times on day one will be bypassed. Start with one capability or bounded context, enforce its domain/application boundary, and expand as work touches adjacent behavior. Pre-existing violations may freeze in a baseline whose counter only goes down. The glossary can roll out warn-first and diff-scoped, with its limited scope stated explicitly.
- **Spikes** — treat vocabulary as provisional and route it through the protocol before promotion into maintained code. Follow the repository's existing spike or experimental-code policy rather than inventing a global marker.

## Boundaries

| Situation | Skill |
|-----------|-------|
| Value objects, entities, aggregates, bounded contexts | `domain-driven-design` |
| Ports/adapters structure the arch rules enforce | `hexagonal-architecture` |
| DSL and test-title vocabulary in the outer loop | The project's acceptance/specification skill |
| Recording a model-changing rename | The repository's decision-record mechanism |
| Naming questions during discovery | The host's available question mechanism |

## Verification Checklist

- [ ] One repository-declared glossary authority per bounded context
- [ ] The repository's declared glossary format and location are preserved
- [ ] Canonical spelling and capitalization are used when naming declared concepts
- [ ] Missing terms are treated as not yet agreed
- [ ] No domain term coined without the five-step protocol — proposals presented, never adopted silently
- [ ] Glossary diff rides the same reviewable change as the code that introduces the vocabulary
- [ ] Replaced terms recorded as deprecated aliases with replacements
- [ ] Rejected aliases point to the owning bounded context and canonical term
- [ ] Model-changing renames use the repository's decision-record mechanism
- [ ] Published language at context boundaries versioned, never casually renamed
- [ ] Approved terms propagated through code, types, schemas, APIs, tests, docs, diagrams, fixtures, and generated clients in scope
- [ ] Working names are visibly provisional with a ratification or replacement path
- [ ] Alias and word-form checks are scoped to their owning bounded context
- [ ] Lint rules carry three-part teaching messages
- [ ] Green lint results are reported as targeted ratchets, not whole-repository language proof
- [ ] Positive controls prove forbidden vocabulary is detected
- [ ] Brownfield enforcement is scoped, its baseline does not grow silently, and its limits are reported
- [ ] Provisional spike vocabulary is ratified or replaced before promotion
