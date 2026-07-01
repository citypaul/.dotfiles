---
name: story-splitting
description: Turn broad requirements, large stories, epics, features, initiatives, or backlog items into small end-to-end child stories without turning them into technical component tasks. Use when refining a backlog, decomposing epics, planning an MVP or walking skeleton, looking for vertical slices, reducing story size, applying SPIDR/Hamburger/capability slicing, avoiding scatter-gather/component stories, or deciding the first valuable story before implementation planning.
---

# Story Splitting

Split work so the team can deliver, test, learn, and change direction in small batches. A good split preserves a whole user-visible capability while reducing variation, uncertainty, scope, or quality level.

The goal is not "make smaller tickets." The goal is **N% of the system 100% done and demonstrable**, not 100% of the system N% done.

## Attribution

This skill is based on Tim Ottinger's [Splitting Stories - A Resource Listicle](https://agileotter.blogspot.com/2022/03/splitting-stories-resource-list.html) and synthesizes the linked story-splitting writing by Tim Ottinger, Bill Wake, Joshua Kerievsky, Gojko Adzic, Neil Killick, George Dinwiddie, Mike Cohn, Richard Lawrence, Peter Green, J. B. Rainsberger, Rachel Davies, and others. Load `resources/source-notes.md` for source-by-source provenance.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `pattern-catalog.md` | You need more splitting prompts, SPIDR/Hamburger/Humanizing Work/Bill Wake pattern details, or examples for a stubborn story |
| `source-notes.md` | You need source provenance, want to teach the concepts, or need to explain how the article/resource-list ideas shaped the skill |

## How This Fits With Other Skills

Use `story-splitting` **before** `planning` when the input is a large story, epic, feature idea, roadmap item, or backlog item. This skill discovers small valuable child stories. The `planning` skill then sequences one selected child story into PR-sized implementation slices with TDD execution details.

Use `find-gaps` **after** a split or plan exists when you need to tighten missing states, acceptance criteria, edge cases, or unverifiable language. If `find-gaps` discovers that the plan is still horizontal or too large, return here and split again.

Use `grill-me` when the issue is unresolved product or design decision-making rather than splitting mechanics; its one-question-at-a-time interview can clarify the decision tree before or after this skill proposes slices.

Use `storyboard` when the work spans multiple UX surfaces or mock states; the storyboard can reveal missing screens and flow gaps that become child stories. Use design skills such as `shape`, `critique`, and `polish` to improve the mocks themselves, not to replace product slicing.

This skill must not drive implementation directly. When a selected child story is ready to implement, load `planning` first. Planning must turn that child story into implementation slices/stages, and every slice/stage must repeat the full implementation cycle before code changes begin: load `tdd`, `testing`, `mutation-testing`, and `refactoring`; run RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR; then present the work before moving to the next slice. Treat this as a per-slice mandatory handoff, not a one-time feature reminder. Use `finding-seams` and `characterisation-tests` when a slice touches legacy code that cannot yet be tested safely. Use domain and architecture skills (`domain-driven-design`, `hexagonal-architecture`, `api-design`, `cli-design`, `twelve-factor`, `production-parity-skill-builder`) to keep each slice coherent; do not split stories by those technical layers.

## Requirement Refinement Pipeline

Use the earliest skill that matches the uncertainty:

| If the problem is... | Use... | Stop when you have... |
|----------------------|--------|------------------------|
| "We don't know which decision branch is right." | `grill-me` | A resolved decision tree or a named open decision |
| "This requirement is too broad or solution-shaped." | `story-splitting` | Independently valuable child stories |
| "This story/spec/plan/mock has holes." | `find-gaps` | Confirmed artifact updates with testable wording |
| "We selected a child story and need to build it." | `planning` | PR-sized implementation slices |

Do not use `story-splitting` to interrogate every product decision from scratch; use `grill-me` when the decision tree is the real work. Do not use `story-splitting` to produce implementation tasks; use `planning` after a child story is selected. Do not use `find-gaps` before there is an artifact to inspect; use it to harden a split, plan, AC set, or mock spec.

## Core Principles

### Stories Are Conversations, Not Requirements

Treat a story as a placeholder for collaboration between people with the problem and people who can solve it. Do not optimize for perfect written requirements or a handoff from Product to Engineering.

When a story seems too large, bring product, engineering, design, QA, and operations perspectives into the split. Product knows value and trade-offs. Engineers know where effort and uncertainty hide. Splitting without both viewpoints usually creates either low-value fragments or technical dependencies.

### Slice Capabilities, Not Components

Every child story should describe a change in behavior from a real user's or external system's point of view. If the "user" in the story is an internal component, layer, queue, database, API, or service, it is probably a task, not a story.

Prefer:

```text
Buyer can pay one invoice by card and receive a confirmation.
```

Avoid:

```text
Backend exposes payment endpoint.
Frontend calls payment endpoint.
Database stores payment rows.
```

Tasks can exist inside a story. Do not relabel tasks as stories to make a plan look incremental.

### Stay In The Problem Space First

Ask:

```text
What are the simplest options for delivering value to the customer as soon as possible?
```

Do not start with:

```text
What is the simplest way to build this already-imagined solution?
```

The first question reveals customer-capability options. The second often jumps straight to portals, apps, services, vendors, and architecture before the team has chosen the narrow valuable capability.

### Start With A Primitive Whole

Prefer a tiny, end-to-end, production-quality whole over a polished part. Useful first versions include a walking skeleton, tracer bullet, steel thread, zero-feature release, or minimal spanning application.

This first slice should exercise the real production path as far as practical: entry point, domain behavior, persistence or external service, output, deployment, and observability. It may be under-featured, hidden behind a flag, or internal-only, but it should not be throwaway unless explicitly framed as a spike or tracer experiment.

### Hunt For Bargains

A bargain is high value at a fraction of full cost. Look for slices where one-fourth of the imagined feature gives most of the value or learning. Treat the parent story as a draft idea; be willing to discover a cheaper or better version through conversation.

## Child Story Quality Bar

Use INVEST as a quality check, not a template:

| Letter | Check |
|--------|-------|
| I | Independent enough to build, test, release, reorder, or drop without waiting for every sibling |
| N | Negotiable in scope and quality level; not a fixed solution order |
| V | Valuable to a real user, external system, business stakeholder, operator, or learning goal |
| E | Estimable because the behavior, unknowns, and deferrals are visible |
| S | Small enough to finish in the target planning horizon |
| T | Testable through observable examples |

Also apply the feedback triad: a good slice **works**, **delivers value**, and **can generate user feedback**. If it only makes internal progress, it is probably a task. If it works but produces no possible feedback or learning, ask whether a thinner or different slice would be more useful.

## Workflow

### 1. Reframe The Parent

Before splitting, write the parent in plain language:

- **Actor:** who receives value
- **Need or capability:** what they can do or learn
- **Outcome:** why it matters
- **Current constraint:** why it is too large, risky, vague, or uncertain

If the parent is a solution phrase like "build online banking portal," reframe it as capabilities like "customers can pay bills," "customers can transfer money," or "customers can view balances."

If the parent is a technical task like "add payment database," find the user behavior it serves. If no behavior exists, keep it as a task and attach it to the first story that proves it matters.

### 2. Surface Examples And Variations

List concrete examples before inventing tickets:

- happy-path examples
- alternate paths and error paths
- user roles or customer segments
- data shapes, sizes, and edge cases
- business rules and policy variants
- interfaces, channels, devices, or integrations
- quality attributes: performance, scale, reliability, security, accessibility, auditability
- unknowns or assumptions that could invalidate the plan

Acceptance examples are often natural splits. Group related examples into separate stories when each group is independently understandable and testable.

### 3. Find Splitting Dimensions

Use these dimensions as prompts, then choose the split that creates the most value and optionality:

| Dimension | Useful question |
|-----------|-----------------|
| Capability | Which narrower customer capability still delivers value? |
| Path | Which happy path, alternate path, workflow branch, or operation can stand alone? |
| Interface | Which channel, consumer, UI level, device, browser, or integration can prove the behavior first? |
| Data | Which data subset, file type, entity type, field subset, or quantity can we support first? |
| Rules | Which business, validation, permission, compliance, or policy rules can be scoped safely? |
| Quality | What is the simplest acceptable quality level: manual, batch, low fidelity, small scale, slower, generic UI? |
| Risk | What spike, tracer bullet, or walking skeleton would answer a specific risky unknown? |

Load `resources/pattern-catalog.md` when a story needs more prompts or when applying named methods such as SPIDR, Hamburger, Humanizing Work's patterns, or Bill Wake's twenty ways.

### 4. Use The Hamburger Method When The Team Is Stuck

If the team keeps drifting into technical decomposition, use the Hamburger Method from `resources/pattern-catalog.md`: list the technical layers, list simpler-to-richer options per layer, then take a first "bite" across every layer so the result is still end-to-end. The point is to avoid eating only one layer.

### 5. Choose The First Slice

Choose the first slice using these rules of thumb:

- Prefer the split that lets the team deprioritize or delete at least one follow-up story.
- Prefer the split that produces more similarly sized children, if value is comparable.
- Prefer the slice with the highest value-to-cost ratio.
- Prefer an end-to-end slice that burns down integration or architecture risk early.
- In complex domains, pick one or two useful learning slices instead of pretending to enumerate the whole backlog up front.
- If the first slice cannot be useful to anyone, make it useful for learning, ops, support, or validation, and state that explicitly.

### 6. Write Child Stories

For each child story, capture:

- **Title:** actor + action + narrow scope
- **Value:** who benefits and how
- **Scope:** what is included
- **Intentional deferrals:** what is not included yet and why
- **Acceptance examples:** concrete precondition → trigger → observable-outcome examples (or equivalent testable examples)
- **Release constraint:** shippable, hidden behind flag, internal-only, demo-only, or not releasable and why
- **Follow-ups:** stories that add paths, interfaces, data, rules, or quality

Use the user's domain vocabulary. If they say "buyer," write "buyer," not "user."

## Validation Checklist

Before returning a split, check every child story:

- Does it name a real actor or external system?
- Does it have a trigger and observable outcome?
- Does it run through the real production path needed for that behavior?
- Could it be tested without waiting for every sibling story?
- Could it generate feedback, learning, or a visible decision if shipped, demoed, or exercised?
- If no later story happens, did this still deliver value or learning?
- Are dependencies explicit and small enough to manage?
- Are deferred paths, data, rules, and qualities visible?
- Is it safe to ship, or is the release constraint explicit?
- Does it avoid prescribing unnecessary implementation details?
- Is the eventual full capability still visible, so useful follow-up slices are not forgotten?

Red flags:

- child stories split by process activity: design, code, test, document, deploy
- "As a database/API/frontend/service..."
- "Build the backend" and "build the frontend" as separate stories
- "Collect data" or "build integration" without a user-visible or feedback-generating outcome
- every child must finish before any child can be tested
- a spike for every story
- acceptance criteria that say "works" or "fast" without observable detail
- slices that are so tiny they only specify a solution detail
- all business rules forced into the first slice without discussion

## Output Format

When asked to split a story, return a compact artifact that can feed directly into `planning`:

```markdown
## Parent
[Reframed parent capability]

## Recommended First Slice
[One sentence story]

Why this first: [value, risk, learning, or bargain]

## Split Candidates
| Slice | Value | Includes | Defers | Acceptance Examples | Release Constraint |
|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... |

## Parking Lot
[Explicit follow-ups, questions, or intentionally unsplit tasks]

## Warnings
[Component splits, unsafe deferrals, unclear ownership, or missing examples]

## Next Step
[Usually: load `planning` for the selected first slice, run `find-gaps` on the split, or ask one decision question. If implementing, every planned implementation slice/stage must explicitly require `tdd`, `testing`, `mutation-testing`, and `refactoring` before code changes, then complete RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR before the next slice/stage starts.]
```

If the user wants an interactive refinement session, ask one high-value question at a time rather than dumping a questionnaire. Start with the question that most changes the split: usually actor, outcome, release constraint, highest-value customer segment, or biggest risk.

For source provenance and article-by-article concept mapping, load `resources/source-notes.md`.
