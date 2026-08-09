---
name: find-gaps
description: Adversarially review an existing written artifact — stories, plans, acceptance criteria, specs, or design mocks — to surface missing states, unhandled edge cases, unstated assumptions, unverifiable criteria, and slices still too broad or horizontal. Works interactively, one question at a time, writing each answer back into the artifact as a new acceptance criterion, plan update, or mock-state spec. Use when an artifact needs tightening before planning or coding ("what's missing?", "poke holes in this", "tighten this up"). Requires an artifact to inspect — for a fuzzy decision tree with no artifact yet, use specification or an installed grill-me skill; for splitting oversized work, see story-splitting.
---

# Find Gaps

Most shipped bugs and post-launch firedrills come from things that were never written down — not from things that were specified wrong. This skill systematically surfaces those absences *before* implementation, when fixing them is cheap.

But finding gaps is only half the job. A list of open questions that nobody answers is just a todo list with extra steps. When material gaps exist, the real output is an **updated artifact** — a plan, AC set, or mock spec that now contains decisions it didn't contain before, made by the user, captured verbatim, and written back to the source of truth. A clean review is also valid when it names the sections and hostile cases checked; never invent a gap to make the process look productive.

## When to Use This Skill

Use this skill when the user:

- Asks "what's missing?", "find gaps", "poke holes in this", "what could go wrong?", "help me tighten this up"
- Shares a plan, spec, acceptance criteria, or design mocks and asks for review
- Is about to start implementing and wants a pre-implementation sanity check
- Is handing work to another team/engineer and wants a completeness pass
- Is doing a pre-mortem

Pair with `storyboard` when reviewing multiple mocks together — storyboard gives the single-page view, this skill finds what's *missing* across them.
Pair with `story-splitting` when a story, plan, spec, or backlog item is too large, horizontal, component-split, or not yet expressed as independently valuable child stories.
Pair with `characterisation-tests` when the "gap" is behavior of existing code that nobody wrote down.

## Boundary With Nearby Skills

`find-gaps` needs an artifact to inspect. It does not discover the whole decision tree from scratch and it does not split broad work into child stories.

| Need | Use | Why |
|------|-----|-----|
| Pressure-test unresolved product or design decisions | `grill-me` when installed; otherwise `specification` or one focused question at a time | Resolve the decision tree before reviewing a written artifact |
| Break broad work into independently valuable child stories | `story-splitting` | It creates product/backlog stories, not implementation tasks |
| Tighten a written story, plan, AC set, or mock spec | `find-gaps` | It finds missing states, edge cases, roles, constraints, and unverifiable wording, then writes confirmed decisions back |
| Decide whether finished implementation satisfies an authoritative artifact | `acceptance-review` | It reviews code read-only, criterion by criterion, without rewriting the requirement |
| Sequence a selected child story into PR-sized work | `planning` | It owns implementation slices and the TDD execution plan |

If the artifact is not yet written down, use an installed `grill-me` skill when available. Otherwise ask one focused question at a time or use `specification` to establish the artifact; use `story-splitting` when the problem is oversized work rather than unresolved intent. If this review discovers the artifact is actually multiple stories tangled together, stop and route back to `story-splitting`. If the artifact is clear enough to implement, route forward to `planning`.

## Core Principles

**1. What isn't on the page is more dangerous than what is.** A plan that says nothing about errors doesn't handle them gracefully — it doesn't handle them at all. An acceptance criterion with no measurement isn't ambiguous — it's unverifiable. A mock with no empty state isn't flexible — it's broken the first time a new user opens it. Treat silence as a red flag, not a green light.

**2. Every gap is a conversation, not a comment.** A static gap list is a report. This skill produces *decisions*, captured as updates to the artifact, made by the human who owns the work. The loop — ask, capture, write back, confirm — is the product.

## How This Works

This is a **conversational loop**, not a one-shot report. The shape is:

1. **Survey** the artifact against the appropriate checklist (plans / AC / mocks)
2. **Triage** candidate gaps into Blocker / Should-address / Nice-to-have
3. **Open** the loop by telling the user how many gaps and where; if there are none, report the reviewed evidence and stop
4. **Ask one question at a time** (or a tightly-coupled pair), starting with Blockers
5. **Capture** each answer as a concrete artifact update — a new AC, a plan paragraph, a named mock state
6. **Show** the proposed update back to the user and confirm
7. **Write** the confirmed update to the source of truth (file, canvas, doc)
8. **Recap** every 3–5 gaps closed — this keeps the user oriented and catches contradictions
9. **Exit** when all Blockers + Should-addresses are closed, or when the user calls time (park the rest explicitly)

**Non-negotiable: one question at a time.** A twenty-question dump is a report. Twenty questions, each answered and captured, is a tightened artifact. The difference is entirely about cadence.

## The Gap-Closing Loop

### Step 1 — Survey

Walk the relevant checklist (see Gap Discovery below). Note candidate gaps silently; don't present them yet.

If the artifact is mixed (plan with embedded mocks, AC referencing a mock), run each section separately so the checklists don't bleed.

### Step 2 — Triage

Classify each candidate as:

- **Blocker** — implementation can't proceed or will be wrong without a decision (no auth model, no error contract, unverifiable criterion)
- **Should-address** — will cause rework or a bug if left open (no empty state, vague success metric)
- **Nice-to-have** — won't block this iteration, but worth capturing (dark mode on a pilot, analytics events for v2)

If everything is "nice-to-have," make one adversarial pass for missed failure paths and unstated assumptions. If that still produces no material gap, say so with the checklist evidence; do not promote taste or fabricate a blocker.

### Step 3 — Open the loop

Before asking the first question, tell the user:

- The artifact type and sections reviewed
- Counts by severity (e.g., "3 Blockers, 7 Should-address, 4 Nice-to-have")
- Which section or screen has the most gaps
- That you'll walk through them one at a time, starting with Blockers, and capture each answer as an update

Get explicit agreement to proceed ("shall we start with the payment errors?" or "start now?"). If the user wants the full list up front, provide it — but still loop through Q&A afterwards.

### Step 4 — Ask, refine, capture

For each gap:

1. **State the gap** in one sentence. No preamble, no justification.
2. **Ask the concrete question.** Never bundle unrelated questions. When the answer space is enumerable — failure strategies, severity classifications, state-variance scoping, parking decisions — use the host's structured-input capability when available and follow its current schema. Otherwise ask the same question in concise free text. See **Asking with Structure** below for the heuristic and worked examples.
3. **If the answer is vague, ask the follow-up that makes it testable.** "The user sees an error" → "What message, and can they retry?" Follow-ups on microcopy stay free-text; follow-ups that narrow between a small set of behaviours become structured.
4. **Convert the refined answer into an artifact update** using the patterns below.
5. **Show the proposed update** verbatim, then offer *write as-is / edit inline / discard and redo* through supported structured input or a single free-text confirmation. If the host supports side-by-side previews, use them only for genuinely comparable phrasings.
6. **Write it** to the source of truth once confirmed.
7. **Move on.** Don't linger.

### Step 5 — Recap every 3–5 gaps

Summarize what's closed, what's left by severity, and any inconsistencies you noticed between answers. This is where you catch "the buyer can retry from the error screen, but two gaps ago we said only admins can retry" — the kind of thing invisible from inside a single question.

### Step 6 — Exit

Stop when:

- All Blockers and Should-addresses are closed (the healthy exit)
- The user calls time ("that's enough for now") — produce an explicit parking-lot list of unresolved gaps with owners, so nothing leaks
- You hit a gap that needs a decision the user isn't empowered to make — name the actual owner, park that gap, keep going on others

If you realize the artifact needs a larger rewrite than Q&A can deliver (e.g., the AC set is describing three different features tangled together), say so explicitly and recommend the user restart that artifact.

---

## Gap Discovery — Checklists

Walk these end-to-end per artifact. Don't skip categories because "that probably doesn't apply" — the cost of checking is one line; the cost of missing is an outage.

### Plans

- **Scope & intent:** out-of-scope stated? one-sentence problem statement? success metric + baseline? cost of doing nothing?
- **Prerequisites & dependencies:** what must already exist/be true? which other teams must ship first? cross-cutting migrations?
- **Sequencing & incremental value:** can this ship in slices? smallest valuable first slice? rollback path per slice? dark-launch / feature flag / canary? any database-only/API-only/UI-only component slices that should go back through `story-splitting`?
- **Failure & recovery:** top 3 prod failure modes? detection (named dashboards/alerts) per mode? recovery (runbook, auto-retry, rollback)? data-loss blast radius?
- **State & data:** finite state model per entity? concurrent-modification handling? idempotency? backfill/migration plan? retention / deletion / GDPR?
- **Observability & ops:** what do we log/emit to know this works in prod? on-call owner? runbook link? SLOs / error budgets?
- **Security & compliance:** auth/authz matrix? PII + secrets handling? threat model for the top attack vector?
- **Testing:** strategy per layer (unit / integration / E2E)? what's explicitly NOT tested and why is that OK?
- **Unstated tribal knowledge:** if a new engineer read only this plan, what would they get wrong?

### Acceptance Criteria

- **Measurability:** verifiable by a machine or a test? Vague-word hit list: *fast, intuitive, seamless, modern, clean, responsive, works well, just works, robust* — each needs a number or a concrete behaviour.
- **Precondition / trigger / outcome discipline:** every criterion has a precondition, a trigger, and an observable outcome. Any missing → it's a wish.
- **Negative paths:** for every happy path, the failure path (timeout, validation error, concurrent edit, permission denied, quota exceeded, offline, stale data).
- **Input edge cases:** empty / null / missing optional; min / max / boundary; very long strings; non-ASCII, emoji, RTL, combining marks; duplicates, case variants, whitespace; numeric zero / negative / very large / currency precision.
- **Time & locale:** timezones (user vs server vs storage), DST transitions, i18n text expansion, plural forms, date-format ambiguity.
- **Actors & roles:** which role does each criterion apply to — anon / authed / admin / service / impersonator? What happens when permission changes mid-session?
- **Non-functional:** performance target (p50/p95 + workload), accessibility (WCAG level, keyboard, screen reader), security (auth, rate-limit, audit log), privacy (PII visibility).
- **Observability criteria:** what event/metric proves it was met in prod, not just in test?
- **Completion:** what does "done" mean — merged, deployed, rolled out to 100%, observed working for N users?

### Design Mocks

- **UI states:** loading / skeleton, empty (first-use), partial, error (network, validation, 404, 403, 500, timeout), success/confirmation, disabled, read-only (no permission), offline, rate-limited, stale/needs-refresh.
- **Content variance:** shortest (1 char, 1 item), longest (max-length, 10k list), zero/one/many; missing avatar, broken image; unicode (emoji, RTL, CJK wrap, combining marks); numbers (0, negative, large, currency, percent); dates (today, relative, far-past, far-future).
- **Interaction states:** hover, focus (keyboard!), active, selected, disabled, dragging, async-pending vs optimistic.
- **Responsive & density:** ≤360px mobile, tablet portrait/landscape, desktop, ultra-wide / cramped, browser zoom 200%.
- **Accessibility:** color-only signalling, contrast on interactive, focus ring + order, SR labels/aria/alt, touch ≥44×44, reduced-motion alternative, form labels + error association.
- **Theme / platform:** light / dark / system / high-contrast, reduced motion, back/forward/refresh/deep-link, mobile web vs native.
- **Permissions & role:** anon view, view-only, edit, admin, mid-session role change.
- **Data lifecycle:** create/edit/delete flows + undo + confirmation; behaviour when the underlying record is deleted by someone else.
- **Internationalization:** text expansion (+40% German), contraction (CJK), RTL mirroring (layout not just text), locale-formatted numbers/dates/currency.

---

## Gap Closing — Turning Answers into Artifact Updates

Every resolved gap ends as text in the artifact. These are the three conversion patterns.

### Answer → Acceptance Criterion

Write each criterion as **precondition → trigger → observable outcome**, with a single observable outcome per criterion. Include actor, state, specific UI/data behaviour, and any emitted events the user actually confirmed. (This is a structural discipline for criteria, not an instruction to write Gherkin scenarios or a given/when/then test DSL — tests stay behaviour-driven per the `testing` skill.)

- **Gap:** "No spec for a duplicate workspace invitation."
- **Question:** "What should the owner see when the invite API reports that this email is already invited?"
- **Vague answer:** "We tell the user."
- **Follow-up:** "What exact message appears, and where?"
- **Refined answer:** "Show 'This person already has a pending invitation.' in the email-field error slot."
- **AC to add:**

> **AC-14:** With an authenticated workspace owner on the invite form, when the invite API returns `already-invited`, the UI shows *"This person already has a pending invitation."* in the email-field error slot.

**Test:** a QA engineer should be able to execute this criterion without asking a single follow-up question. If they'd need to ask, the criterion isn't finished — keep refining.

### Answer → Plan Update

Write the sentence (or paragraph) that would have been in the plan if the author had thought of it. Name the section, name the trade-off, name the failure mode.

- **Gap:** "No rollback strategy for the migration."
- **Question:** "If the migration fails halfway through, how do we get back to a working state?"
- **Answer:** "Each step has a reverse; we have `migrate down` that runs reverses in order."
- **Plan update (new section):**

> **Rollback.** Each migration step in `migrations/` exposes `up()` and `down()`. On failure, run `pnpm migrate down` to replay `down()` for every completed step, in reverse order. **Data-loss risk:** any rows inserted between `up()` completion and failure will be orphaned by `down()` — mitigated by holding the `migration-in-progress` flag in Redis, which the app layer reads to short-circuit inserts for the duration of the migration.

### Answer → Mock State Spec

For every missed state, capture **name / trigger / visual / behaviour / exit** so the state is implementable without re-asking.

- **Gap:** "Contacts list has no empty state."
- **Question:** "What should a new user see the first time they open the Contacts screen?"
- **Answer:** "A friendly message and buttons to import CSV or add manually."
- **State spec:**

> **empty-first-use**
> - *Trigger:* authenticated user, 0 contacts in account
> - *Visual:* centred column; illustration (reuse `EmptyIllustration` from impeccable tokens); H2 "No contacts yet"; paragraph "Bring your network into the app."; two buttons — primary "Import CSV" (opens import sheet), secondary "Add manually" (opens add-contact form)
> - *Behaviour:* buttons enabled on load, no other actions available
> - *Exit:* any successful contact add or import → `populated` list state

## Working with the User

**Ask only what the user can answer.** "What's the error-handling strategy?" is a design spike. "When the payment declines, what message should the user see?" is a decision.

**One question per turn** — unless two are tightly coupled ("what's the error, and can the user retry from it?"). A structured-input request may batch tightly related subquestions only within the host capability's supported limits; batching *unrelated* gaps into one request reverts to a gap dump. If you find yourself typing "Also," stop and pick the most important one.

**Mirror the user's vocabulary.** If they say "buyer," the AC says "buyer." Do not silently promote it to "user" or "customer." Domain language is a feature.

**Capture decisions visibly, every time.** Every confirmed answer becomes visible text in the artifact before you move on. Never build a private list you'll "reconcile at the end" — it evaporates.

**Surface trade-offs, don't hide them.** If an answer creates a downstream issue: "That means anonymous users can still submit the form but get a 401 — is that the experience you want, or redirect to sign-in first?" Let the user see the consequence.

**Know when to escalate.** If a gap needs a decision the user can't make alone, name the actual owner, park it explicitly with a question and owner, and continue.

**Don't re-ask triage.** You've already decided each gap is a Blocker / Should-address / Nice-to-have. Don't ask "do you want to address this?" for every one — just ask the concrete question. The user can say "skip" if they want.

---

## Asking with Structure

Every question you put to the user is either free text or structured through a capability the current host actually exposes. Inspect and follow that capability's schema rather than assuming a provider-specific tool name, fields, or limits. Pick based on where the value lives:

- **The options are the value** → supported structured input. Picking is faster than generating, the user benefits from seeing the choice space, and the common answers are knowable.
- **The user's specific words are the value** → free text. Domain vocabulary, microcopy, novel decisions, anything that will be copied verbatim into the artifact.

### Good fits

Use structured input when the host supports it and the answer space is genuinely enumerable and recurs across projects:

| Situation                  | Why a structured question helps                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Failure strategy           | Retry / fail fast / queue / fail-over — each has a named trade-off worth surfacing                    |
| Severity re-triage         | Blocker / Should / Nice — useful when your triage and the user's disagree                             |
| State-variance scoping     | Which states matter for v1 — selecting several named choices can reduce back-and-forth                |
| Parking decisions          | Park with owner / escalate now / keep working — closes the gap-handling loop                          |
| Write-back confirmation    | Write as-is / edit inline / discard — classic 3-option close after you've drafted the update          |
| Variant comparison         | Two AC drafts or two state specs in a supported side-by-side representation — comparison beats prose walkthrough |

### Bad fits

Don't force structure where it doesn't belong:

- **Microcopy** — "what error message should appear?" needs the user's exact words.
- **Truly open questions** — "what are you trying to achieve here?" You'd be inventing the options.
- **Domain-expert questions** — "what does 'confirmed' mean in our pricing flow?" The user knows things you don't; structured options anchor them to your guesses.
- **Performative prompts** — if the right answer is already obvious, don't ask. Just propose it.

### Structural rules

- Batch only **tightly-related** subquestions and stay within the host's supported question and option limits.
- Follow the discovered schema for labels, descriptions, recommendation markers, custom-answer behavior, and previews; do not invent unsupported fields.
- Keep labels short and put the material trade-off in the option description when that field exists.
- Use side-by-side previews only when the host supports them and the artifacts are genuinely comparable.

### Worked example — duplicate invitation, structured

**Gap:** "No spec for duplicate invitation behaviour."

If the host supports a structured request containing two questions, ask these tightly coupled decisions together. Otherwise ask them in successive turns:

1. **User outcome:** "What should happen when the invite API returns `already-invited`?"
   - **Inline field error (Recommended):** Keeps the owner in context and points to the email that needs attention.
   - **Page banner:** More prominent, but less clearly connected to the field.
   - **Open pending invite:** Useful only if the owner may view that record.
2. **Telemetry:** "Should we emit a telemetry event for the duplicate attempt?"
   - **Emit `invitation.duplicate_rejected` (Recommended):** Supports abuse and funnel analysis without including the invitee email.
   - **No event:** Reduces data volume; appropriate when existing aggregate rejection metrics already answer the question.

After the user picks, draft one criterion for the user-visible outcome and a
separate telemetry criterion when selected. They may share the same
precondition and trigger, but each keeps one independently decidable outcome.
Use custom text verbatim. Then request *write as-is / edit inline / discard*
through supported structured input or one concise free-text question. Offer
side-by-side drafts only if the host supports that representation and the
difference matters.

---

## Output

The **primary output is the updated artifact**, written to wherever the source of truth lives:

- Acceptance criteria → the AC list, with new/revised criteria appended or inserted in place
- Plan → the plan document, with new paragraphs or sections
- Mock spec → a companion `states.md` or equivalent per screen

The **secondary output is a resolution log** at the end of the session:

```
## Gaps closed — find-gaps session, YYYY-MM-DD

Resolved (12):
  [Blocker   → AC-14]        Duplicate invitation handling
  [Blocker   → Plan §4.2]    Rollback strategy for migration
  [Should    → AC-15]        Empty contacts list state
  [Should    → states.md]    Search results loading/empty/error states
  [Nice      → AC-19]        Dark-mode contrast on error banner
  ...

Parked (2):
  [Blocker] Analytics event schema — owner: @growth-lead (decision pending for v2)
  [Should]  i18n for German — owner: @i18n-team (no locale priority yet)
```

The log goes in the PR description, release notes, or wherever the work is being tracked — so the decisions (and the parked ones) don't vanish.

## Anti-patterns

- **Dumping a list of 20 gaps and walking away.** That's a report, not a review. The user won't action it. Loop through them.
- **Asking "do you want to address this?" for every gap.** You already triaged — state the gap, ask the specific question, capture, move on.
- **Accepting vague answers.** "The user sees an error" isn't testable. Keep refining until there's a specific, observable outcome.
- **Bundling questions.** "What's the message, when does it show, can they retry, and is it logged?" → four turns, not one.
- **Silently rewriting the user's language.** If they say "checkpoint," write "checkpoint," not "save state."
- **Skipping the artifact write-back.** A gap isn't closed until it's in the document. Verbal agreements evaporate between sessions.
- **Letting one giant gap swallow the session.** If a single gap needs 30 minutes of discussion, it's a design spike. Park it, keep moving, come back.
- **Stopping at an arbitrary quota.** Finish the relevant checklist and follow
  evidence across linked artifacts, but do not invent gaps to make the review
  look thorough; an evidenced clean result is valid.
- **Treating taste as a gap.** Stylistic preferences aren't gaps. Absence of decision is.
- **Reviewing the artifact in isolation.** Cross-check plan ↔ AC ↔ mocks — gaps often appear as contradictions between two of them, not as absences in one.
- **Inventing options just to use structured input.** If you don't know the real choice space, ask free text instead — fabricated options anchor the user to your guesses and hide their actual answer.
- **Using structured options for microcopy.** "What error message should appear?" must stay free text. The user's exact words are the value; structured options destroy them.
- **Batching unrelated gaps into one structured request.** Tightly coupled questions about one gap can share a request when the host permits it; questions about different gaps are a gap dump in disguise.

## Quick reference

| Artifact              | Top-3 gaps to always check                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| Plan                  | Out-of-scope not stated · No rollback path · No observability                          |
| Acceptance criteria   | Unmeasurable words · Missing negative paths · No non-functional targets                |
| Design mocks          | No loading/empty/error states · No long-text variance · No keyboard focus treatment    |
