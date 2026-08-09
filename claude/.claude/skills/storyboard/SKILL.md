---
name: storyboard
description: Produce a mock-audit storyboard — a single HTML page embedding related UX surfaces side-by-side, with per-mock audit checklists, a flow diagram, and gap cards for missing mocks. Use when reviewing several mocks together would materially reduce context-switching or expose cross-surface gaps, or when the user asks to see or audit a whole flow in one place.
---

# Storyboard

A **storyboard** is a single reviewable HTML page that stitches every UX surface in a scope of work into one view. Existing mocks are embedded as sandboxed `<iframe>` elements only when they are authoritative and safe to load; otherwise the page uses a labelled static image. A flow diagram at the top shows how the user moves through them. Gap cards mark mocks that still need producing. Per-mock audit checklists give the reviewer a place to approve or flag concrete fixes.

**Purpose:** move the design audit from "open a dozen tabs and try to hold the flow in your head" to "open one page and scroll". Gives you a reviewable artifact that pairs with whatever textual decision record you keep (a plan doc, an audit note, a PR description).

## When to produce one

- **When a flow has enough related surfaces or states that reviewing them separately hides transitions, inconsistencies, or gaps.** Examples: signup → verification → onboarding, or a settings flow with destructive and recovery states.
- **Before a planned chunk of work only when the combined review earns its maintenance cost.** A count of surfaces alone is not a reason to create another artifact.
- **Single-feature audit** when a feature spans multiple states (a flow with loading / empty / populated / error states across 3+ steps).
- **The user explicitly asks** for "everything in one place", "the whole flow", "audit the mocks", "I want to see all of this together".
- **Before producing new mocks.** Storyboarding the existing ones first reveals gaps visually and forces brainstorm questions per gap before drafting.

## When NOT to produce one

- Single-mock work (a one-off copy fix on a settings page). Open the mock, run the impeccable pipeline, done.
- Purely API / data-migration / ops items with no UX surface. No mocks = nothing to storyboard.
- Exploratory / throwaway work before scope is settled. Storyboard is a reviewing artifact; you need something worth reviewing first.
- Features already fully built. The storyboard is pre-implementation. Post-hoc, if you need a visual review, run the `critique` skill (external, from the impeccable family; skip if not installed) on the live surfaces instead.

## Inputs the skill gathers

Before drafting the HTML, gather:

1. **Scope code + title.** E.g. `Onboarding v2 — reset regression`, `Settings page — profile + notifications`, `M3 · address book`. Sets the page title + breadcrumb.
2. **Existing mocks in scope.** Walk the project's design-mocks folder (or equivalent) and collect the paths relevant to this scope. Each existing mock becomes an embedded panel.
3. **User flow.** The sequence of states + transitions the user walks through. Draw as ASCII in a `<pre>` block. Mark gaps with distinctive colour / glyph.
4. **Gaps.** New mocks the scope needs but doesn't have yet. Each gap gets its own card with brainstorm questions the user must answer before we produce it — no gap without questions.
5. **Upstream / adjacent surfaces.** Not part of this scope but provide context (e.g. where the user lands after this flow). Embed at smaller iframe height.
6. **Links to companion docs.** Plan entry, design brief, relevant ADR, parent index page.

## Output location

Place the storyboard HTML in the project's existing mocks or launch-planning folder, next to where the mocks live so relative iframe paths work. Common locations:

- `apps/<app>/design-mocks/<scope>-audit.html`
- `design-mocks/<scope>-storyboard.html`

Treat the storyboard as an active review artifact, not a permanent record. Follow the repository's artifact layout while it is in use; delete it when the reviewed outcome ships or its assumptions are superseded unless a named owner still maintains it for a current question. Git history is the archive.

Match the naming convention of other artifacts in the repo. If there's a mock manifest or index page, add a featured link to the storyboard so it's discoverable.

## Required structure (sections in order)

A storyboard is a pattern, not a template. Every storyboard has these sections in this order; the content inside each is specific to the scope.

### 1. Breadcrumb

Back-link to the parent index (mocks manifest, planning index, etc.).

### 2. Header

- Small pill with scope code (e.g. `Onboarding v2` or whatever the project uses) in an uppercase-tracking style.
- Serif display title describing the scope.
- Short subhead (one sentence) naming the purpose of this page.
- Paragraph explaining what the scope is + link row to item README, design brief, and any relevant ADR.

### 3. Flow diagram

- **Use `<pre>` for ASCII, never `<div class="whitespace-pre">`.** Prettier reformats the latter and destroys the layout; `<pre>` is immune. This is a hard rule — violating it ships a broken page.
- ASCII boxes + arrows showing the user's journey through the scope.
- Colour-code inline: one colour for existing-mocked nodes, a distinct colour for gaps (preferably the project's "action" colour so the user's eye goes there), a muted colour for adjacent/context surfaces.
- Mark gaps with an inline glyph like `🆕 GAP` so they're scannable at speed.

### 4. Existing mocks (side-by-side)

- Heading with a status badge ("✓ ships with …").
- Responsive grid (typically 3-column on desktop, collapsing to single column on mobile). One cell per mock.
- Each cell contains:
  - Small badge + filename header.
  - Mock name using the project's heading typography.
  - Short description (1–2 sentences).
  - A sandboxed `<iframe>` at fixed height (780px works well for primary mocks, 640px for adjacent; adjust to project), or the documented static fallback.
  - "Open in new tab ↗" link with `rel="noopener noreferrer"`.
  - **Audit checklist card** — prompts for each impeccable discipline relevant to the mock: `/critique`, `/clarify`, `/audit`, `/polish`, `/adapt`, `/impeccable harden`, `/distill`. Plus any scope-specific questions ("discoverability of edit affordance?", "loading state mocked?").

### 5. Transition / state gaps

When something should be mocked but isn't obvious (e.g. a post-action toast, a success confirmation) flag it as an "? unclear" section with a bullet list of brainstorm questions. Better to surface ambiguity than let it slip.

### 6. Gaps to fill

- Heading with a "🆕 produce next" badge.
- Responsive grid. One cell per gap.
- Visually distinct background / border (use the project's "action" tint).
- Each cell:
  - Badge + filename for the mock to be produced.
  - Display name using the project's heading typography.
  - Description of what the mock represents.
  - **Brainstorm questions** — unordered list. Each bullet = one explicit decision that must be made before drafting the mock. Cover: entry point(s), shape (sheet / dialog / page), field list, edge/error states, integration with existing patterns, destructive-action semantics, cancel behaviour.

### 7. Upstream / adjacent (for context)

- Smaller iframes.
- 3-column grid.
- Label each as "not this scope, here for context".
- Used for surfaces the user jumps INTO from this scope (detail pages that populate later) or OUT OF (upstream flows).

### 8. Proposed sequence

Ordered list describing the steps from this storyboard to code-lands:

1. User reviews this page; approves existing mocks or flags concrete fixes.
2. Answer the brainstorm questions on each gap card.
3. Produce the gap mocks via `/impeccable craft` + run them through the design pipeline (`/shape` → `/critique` → `/layout` → `/clarify` → `/polish`, plus `/adapt` for responsive + `/impeccable harden` for edge states).
4. Apply any fixes to existing mocks the audit flagged.
5. Save the reviewed mocks and audit note through the repository's authorized delivery workflow. Implementation starts.

### 9. Footer

Meta line: scope code · last-updated date · pair-read links.

## Style conventions

Use the project's existing design tokens and layout tooling — **do not invent
new ones**. If the project uses Tailwind, reuse its configured utilities; do
not emit Tailwind classes into a project that does not compile them. If no
local convention exists, use a small framework-neutral inline-CSS fallback.
Specifically:

- **Colours:** map action, text, background, exists, gap, and uncertain roles to
  local semantic tokens. A fallback may define only the minimum accessible
  colours the page needs.
- **Fonts:** reuse local body and heading stacks; do not add a serif or font
  dependency solely for the storyboard.
- **Badges:** use the project's semantic status colours, with text/glyph labels
  so colour is never the only signal.
- **Iframe frame:** fixed height, border, rounded corners, light shadow. Same visual weight across the grid.
- **Container:** use the local page-shell/container pattern. A framework-neutral
  fallback can use `max-width`, `margin-inline: auto`, and responsive padding.

Match the local codebase's existing mock or index-page style. Copy the `<style>` block from a sibling mock rather than re-inventing.

## Embedding safety

Treat every mock and URL as untrusted content even when it lives in the repository. Prefer relative, reviewed, repository-owned targets; never embed credential-bearing URLs or private third-party pages. Give each iframe a `sandbox` attribute with only the capabilities the mock demonstrably needs. Static mocks need no tokens; interactive mocks commonly need `allow-scripts`, but same-origin untrusted content must not receive both `allow-scripts` and `allow-same-origin`. If that combination is genuinely required, serve it from an isolated origin or use the static fallback.

Add a restrictive Content Security Policy to the storyboard itself (normally self-hosted frames/images/styles only, plus the minimum locally justified exceptions). Do not add `allow-top-navigation`, popups, forms, downloads, camera, microphone, or clipboard access merely to make a mock work. If sandboxing or CSP prevents faithful rendering, label the limitation and use a static authority rather than weakening the review page silently.

## Prettier safety

Three rules learned the hard way:

1. **Always wrap ASCII / multi-line preformatted content in `<pre>`.** Prettier reformats HTML inside `<div class="whitespace-pre">` and destroys the layout. `<pre>` is immune.
2. **Don't fight markdown table column widths.** Write the table; let prettier realign it; commit the realigned version.
3. **Run `prettier --write` on the storyboard file before committing.** If the project has a prettier pre-commit hook it catches this anyway, but it's faster to format up-front.

## Convention integration

After producing the storyboard:

1. **Link it from the project's mocks manifest or index page** under an "Active audits" or similar section while it is current.
2. **Reference it from the active decision artifact** (plan, audit note, or PR description) as the visual companion.
3. Remove active links when the storyboard is deleted or superseded; promote lasting design constraints to maintained product documentation or tests.

## Non-negotiables

- **Prefer live, rendered mocks.** Use iframes when the authoritative source is embeddable and safe to load. If only a static authoritative mock exists, embed the image, label it non-interactive, and record which states cannot be exercised.
- **Gaps must have brainstorm questions.** A gap card without questions is dead weight. Each gap is a forcing function to make decisions before drafting.
- **One page, not a tree.** Scrolling through one page is cheaper than navigating a tree of links. If the scope is so big the page becomes unreadable, split by sub-flow but keep each split to one page.
- **Checklist is genuine, not decorative.** Every item on the audit checklist corresponds to a real design discipline. The reviewer uses the checklist to guide review; the agent uses it to guide follow-up work. Don't list `/critique` if `/critique` won't actually run.

## Anti-patterns

❌ **Presenting a static mock as live evidence.**
Static images are valid when they are the available authority, but they must be labelled non-interactive and cannot prove scrolling, transitions, focus, or runtime states.

❌ **"TODO: add brainstorm questions" on a gap card.**
A gap without answered questions is a gap without the skill's value. Brainstorm now or remove the card.

❌ **Inventing bespoke design tokens for the storyboard.**
The storyboard should feel native to the project. Use the same Tailwind colours / fonts / shadows as the underlying mocks.

❌ **Navigation tree instead of one scrollable page.**
The storyboard's value is "everything in one place". A tree of sub-pages defeats that. Split only when the single page becomes unreadably long, and document the split reason.

❌ **`<div class="whitespace-pre">` for ASCII diagrams.**
Prettier reformats inner HTML and destroys the diagram. Use `<pre>` every time.

❌ **Producing new mocks before the storyboard is reviewed.**
The storyboard's brainstorm questions drive decisions. Drafting mocks first pre-commits to answers that may be wrong.

## Invocation

User says `/storyboard <scope>` or asks one of the trigger phrases (see frontmatter description). The skill:

1. Reads the relevant item/feature docs + any existing mock manifest entry.
2. Gathers existing mocks, flow, gaps, adjacent surfaces.
3. Drafts brainstorm questions for each gap (doesn't answer them — the user will).
4. Produces the HTML file at the canonical project path.
5. Updates the mocks manifest / index page with an active-audit link when that index exists.
6. Reports back with the file path + brief summary so the user can open it in a browser.

## Related skills

- **`impeccable`** family (`/shape`, `/critique`, `/layout`, `/clarify`, `/audit`, `/polish`, `/adapt`, `/impeccable harden`, `/distill`) — external skills from pbakaus/impeccable; the audit checklists reference these and the gap-mock production step runs them. Note `harden` exists only as an `/impeccable` subcommand, not a standalone skill. If they aren't installed, list only the disciplines that will actually run (see Non-negotiables: the checklist is genuine, not decorative).
- **`story-splitting`** — use when the storyboard reveals the feature is too broad or needs to be split by flow, role, state, interface, data, rule, or quality level before implementation.
- **`planning`** — supplement the repository-owned plan artifact after the scope has been split into implementable slices; use root `plans/` only as the planning skill's fallback when no local owner exists and a file is authorized.
- **`find-gaps`** — use after the storyboard exists to turn missing states, unanswered brainstorm questions, and unclear transitions into concrete acceptance criteria or mock-state specs.
- **`expectations`** — after the storyboard audit surfaces lasting learnings, route them to the repository's current guidance, accepted decisions, glossary, source, or tests.

## Quick Reference

```
/storyboard <scope>
│
├─► GATHER
│   ├─ Scope code + title
│   ├─ Existing mocks in scope
│   ├─ User flow (sequence of states + transitions)
│   ├─ Gaps (new mocks needed)
│   └─ Adjacent surfaces (upstream / downstream context)
│
├─► PRODUCE (<scope>-audit.html)
│   ├─ Breadcrumb
│   ├─ Header (scope code + title + link row)
│   ├─ Flow diagram (<pre>, colour-coded, glyphs for gaps)
│   ├─ Existing mocks (3-column grid, iframes + audit checklists)
│   ├─ State gaps ("? unclear" + brainstorm questions)
│   ├─ Gaps to fill (brainstorm-question cards per gap)
│   ├─ Upstream/adjacent (context iframes at smaller height)
│   ├─ Proposed sequence (ordered list)
│   └─ Footer (meta)
│
├─► WIRE UP
│   ├─ Link from mocks manifest / index page
│   ├─ Reference from plan / audit markdown
│   └─ Reference from feature README
│
└─► USER REVIEWS
    ├─ Answers brainstorm questions per gap
    ├─ Approves existing mocks (or flags fixes)
    └─ Skill produces gap mocks via /impeccable craft
```

**Rules of thumb:**

- Prefer live iframes when they are the maintained authority and can render
  safely; use the documented static-authority fallback when they cannot.
- Every gap has brainstorm questions.
- One page, not a tree.
- `<pre>` for ASCII. Never `<div class="whitespace-pre">`.
- Use the project's existing design tokens.
