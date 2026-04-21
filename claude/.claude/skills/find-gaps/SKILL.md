---
name: find-gaps
description: Adversarially review plans, acceptance criteria, and design mocks to surface missing states, unhandled edge cases, unstated assumptions, and unverifiable criteria before implementation. Use when reviewing a spec/plan/mocks, before coding starts, when something "looks done" but may be incomplete, or when the user asks "what's missing?" / "find gaps" / "poke holes in this".
---

# Find Gaps

Most shipped bugs and post-launch firedrills come from things that were never written down — not from the things that were specified wrong. This skill systematically surfaces those absences *before* implementation, when fixing them is cheap.

The core move is adversarial: assume the artifact is incomplete and prove it is, category by category. Do not evaluate whether what's on the page is *good*; evaluate whether what's on the page is *enough*.

## When to Use This Skill

Use this skill when the user:

- Asks "what's missing?", "find gaps", "poke holes in this", "what could go wrong?"
- Shares a plan, spec, acceptance criteria, or design mocks and asks for review
- Is about to start implementing and wants a pre-implementation sanity check
- Says something "looks done" but hasn't been stress-tested against edge cases
- Is handing work to another team/engineer and wants a completeness pass
- Is doing a pre-mortem before kicking off a project

Pair with `storyboard` when reviewing multiple mocks together — storyboard gives the single-page view, this skill finds what's *missing* across them.
Pair with `characterisation-tests` when the "gap" is behavior of existing code that nobody wrote down.

## Core Principle

**What isn't on the page is more dangerous than what is.** A plan that says nothing about errors doesn't handle them gracefully — it doesn't handle them at all. An acceptance criterion with no measurement isn't ambiguous — it's unverifiable. A mock with no empty state isn't flexible — it's broken the first time a new user opens it.

Treat silence as a red flag, not a green light.

## Process

### 1. Identify the artifact type

Ask explicitly. A "PRD" can be any of these; treating plans and mocks with the same checklist misses categories. If the artifact is mixed (e.g., a plan with embedded mocks), run each section separately.

### 2. Walk the artifact-specific checklist end-to-end

Don't skip categories because "that probably doesn't apply" — the cost of checking is one line; the cost of missing is an outage.

### 3. Classify each gap

- **Blocker** — implementation cannot proceed without a decision (e.g., no auth model, no error contract)
- **Should-address** — will cause rework or a bug if left open (e.g., no empty state, vague success criterion)
- **Nice-to-have** — won't block this iteration, but capture it (e.g., dark mode, i18n for a pilot)

If everything is "nice-to-have," you probably haven't pushed hard enough.

### 4. Output as actionable questions, not judgments

Bad: "The plan doesn't handle errors."
Good: "What should happen when the payment provider returns a 5xx — retry, fail the whole request, or queue for later? Who sees the error message?"

Actionable questions force a decision. Judgments invite defence.

### 5. Name the owner of each unanswered question

Every gap needs someone who can answer it. If the owner is "TBD," that's itself a blocker.

---

## Plans: gap checklist

Walk these in order. Flag anything not explicitly addressed.

**Scope & intent**
- What is *explicitly out of scope*? (Silence here guarantees scope creep.)
- What problem are we solving, in one sentence? Whose problem?
- What's the success metric — and what's the baseline?
- What happens if we don't do this?

**Prerequisites & dependencies**
- What must already exist/be true? (Data, infra, feature flags, approvals.)
- Which other teams or services must ship something first?
- Any cross-cutting migrations (schema, index, backfill)?

**Sequencing & incremental value**
- Can this ship in slices? What's the smallest valuable first slice?
- What's the rollback path if slice N goes wrong?
- Is there a dark-launch / feature flag / canary strategy?

**Failure & recovery**
- What are the top 3 ways this can fail in production?
- How do we detect each? (Logs, metrics, alerts — named dashboards.)
- How do we recover? (Manual runbook, auto-retry, rollback.)
- What's the data-loss blast radius?

**State & data**
- What states does each entity move through? (Finite state diagram — even informal.)
- Are there concurrent-modification scenarios? Idempotency?
- What's the backfill/migration plan for existing data?
- Retention, deletion, GDPR?

**Observability & ops**
- What do we log/emit to know this works in prod?
- Who is on-call for it? What's the runbook?
- SLOs / error budgets defined?

**Security & compliance**
- Auth/authz: who can do what, enforced where?
- PII / secrets handling?
- Threat model for the top attack vector?

**Testing**
- What's the test strategy per layer (unit, integration, E2E)?
- What specifically will NOT be tested, and why is that OK?

**Unstated tribal knowledge**
- If a new engineer read only this plan, what would they get wrong?

---

## Acceptance Criteria: gap checklist

For each criterion, and for the set as a whole:

**Measurability**
- Is it verifiable by a machine or a test? If not, how will we know it's met?
- Vague words to challenge: *fast, intuitive, seamless, modern, clean, responsive, works well, just works, robust.* Each needs a number or a concrete behaviour.

**Given / When / Then discipline**
- Does each criterion have a precondition, a trigger, and an observable outcome? If any is missing, the criterion is a wish, not a test.

**Negative paths**
- For every happy path, is the failure path written down? (Timeout, validation error, concurrent edit, permission denied, quota exceeded, network offline, stale data.)

**Edge cases of inputs**
- Empty / null / missing optional fields
- Minimum / maximum / boundary values
- Very long strings (names, URLs, descriptions)
- Non-ASCII, emoji, RTL, combining characters
- Duplicates, case variants, leading/trailing whitespace
- Numeric: zero, negative, very large, non-integer, currency precision

**Time & locale**
- Timezones (user vs server vs data storage)
- Daylight savings transitions
- i18n / l10n: longer German, shorter Japanese, plural forms
- Date format ambiguity (01/02/2026)

**Actors & roles**
- Which role does each criterion apply to? Anonymous user, authenticated user, admin, service account, impersonator?
- What happens when the actor's permission changes mid-session?

**Non-functional**
- Performance target (p50 / p95 with workload)
- Accessibility (WCAG level, keyboard, screen reader)
- Security (auth required? rate-limited? audit-logged?)
- Privacy (PII visible to whom?)

**Observability criteria**
- What event/metric proves the criterion was met in prod (not just in the test env)?

**Completion**
- What does "done" mean? Code merged? Deployed? Rolled out to 100%? Observed working for N users?

---

## Design Mocks: gap checklist

For each screen/component, flag which of these is absent:

**UI states** (the classic missed ones)
- Loading / skeleton
- Empty (first-time user, no data yet)
- Partial (some data, some missing)
- Error — network, validation, 404, 403, 500, timeout
- Success / confirmation
- Disabled
- Read-only (lacks permission to edit)
- Offline
- Rate-limited / over-quota
- Stale / needs-refresh

**Content variance**
- Shortest possible text (1 character, 1 item)
- Longest possible text (max-length strings, 10k-item lists)
- Zero items, one item, many items
- Missing avatar/image, broken image
- Unicode: emoji, RTL (Arabic/Hebrew), combining marks, CJK wrapping
- Numbers: 0, negative, very large, currency formatting, percentages
- Dates: today, relative ("2 min ago"), long-past, far-future, unknown

**Interaction states**
- Hover
- Focus (keyboard, not just mouse)
- Active / pressed
- Selected
- Disabled
- Dragging / dropping
- During async (optimistic vs pending)

**Responsive & density**
- Smallest supported mobile (≤ 360px)
- Tablet / portrait / landscape
- Desktop
- Ultra-wide / cramped window
- Browser zoom at 200%

**Accessibility**
- Color-only signalling (does it still work in greyscale?)
- Contrast pairs on interactive elements
- Focus ring visibility and order
- Screen-reader labels / aria / alt text
- Touch targets ≥ 44×44
- Reduced motion alternative
- Form labels + error association

**Theme / platform**
- Dark mode / light mode / system mode
- High-contrast mode
- Reduced motion
- Browser back/forward, refresh, deep-link
- Mobile web vs native (if both)

**Permissions & role**
- What does this look like to an anonymous user?
- To a user with view-only vs edit vs admin?
- During a role change mid-session?

**Data lifecycle**
- Creation, edit, delete flows — and their undo / confirmation
- What happens to the screen if the underlying record is deleted by someone else?

**Internationalization**
- Text expansion (+40% for German)
- Text contraction (CJK)
- RTL mirroring of layout, not just text
- Locale-formatted numbers, dates, currency

---

## Output format

Produce a numbered list grouped by artifact section or screen. For each gap:

```
[Blocker | Should-address | Nice-to-have] <short name>
  Question: <the concrete, answerable question>
  Owner: <who can answer — name, role, or "TBD" (itself a red flag)>
  Why it matters: <one line on downstream cost if unresolved>
```

End with a **Summary** line: *N blockers, M should-address, K nice-to-have.* If there are zero blockers after a thorough pass, say so explicitly and state the categories you checked — silent completeness is not evidence.

## Anti-patterns

- **Reading for comprehension instead of for absences.** If your notes say "looks good" anywhere, you read the document, you didn't audit it.
- **Asking only about the happy path.** For every happy path, write its failure path. Happy paths are the easy half.
- **Letting "we'll figure that out later" stand.** "Later" decisions cost 10–100× more than "now" decisions. Either answer it or mark it a Blocker.
- **Clustering gaps as one bullet.** "Missing error states" is not actionable. "What shows when the API returns 401 vs 403 vs 500?" is actionable.
- **Stopping at three gaps.** If you found three in five minutes, there are almost certainly thirty. Finish the checklist.
- **Treating stylistic preferences as gaps.** Taste is not a gap. Absence of decision is.
- **Reviewing only the artifact in isolation.** Cross-check plan ↔ acceptance criteria ↔ mocks: each gap often shows up as a contradiction between two of them.

## Quick reference

| Artifact              | Top-3 gaps to always check                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| Plan                  | Out-of-scope not stated · No rollback path · No observability                          |
| Acceptance criteria   | Unmeasurable words · Missing negative paths · No non-functional targets                |
| Design mocks          | No loading/empty/error states · No long-text variance · No keyboard focus treatment    |
