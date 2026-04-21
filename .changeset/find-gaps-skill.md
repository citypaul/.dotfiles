---
"@paulhammond/dotfiles": minor
---

feat: add find-gaps skill for adversarial pre-implementation review

Add a new `find-gaps` skill that systematically surfaces missing states, unhandled edge cases, unstated assumptions, and unverifiable criteria in plans, acceptance criteria, and design mocks *before* implementation begins.

**Core principle:** what isn't on the page is more dangerous than what is. A plan that says nothing about errors doesn't handle them gracefully — it doesn't handle them at all. Treat silence as a red flag, not a green light.

**What it does:**
- Activates on "what's missing?" / "find gaps" / "poke holes" / review requests, or when about to start implementing against a spec
- Identifies the artifact type (plan vs acceptance criteria vs mocks — each has its own checklist)
- Walks an artifact-specific checklist end-to-end rather than stopping at the first three issues found
- Classifies each gap as **Blocker** / **Should-address** / **Nice-to-have**
- Outputs actionable questions with named owners — not judgments
- Pairs with `storyboard` for multi-mock reviews and with `characterisation-tests` when the gap is undocumented behaviour of existing code

**Per-artifact checklists include:**
- **Plans:** scope boundary, prerequisites, sequencing, failure & recovery, state & data, observability, security, testing, unstated tribal knowledge
- **Acceptance criteria:** measurability (vague-word hit list), given/when/then discipline, negative paths, input edge cases, time & locale, actors & roles, non-functional targets, completion definition
- **Design mocks:** UI states (loading/empty/error/partial/disabled/offline/rate-limited), content variance (min/max strings, unicode, RTL), interaction states (hover/focus/active/dragging), responsive breakpoints, accessibility (contrast, focus order, touch targets), theme/platform, permissions & role, data lifecycle, internationalization

Registered in CLAUDE.md (skills list + pointer line), README.md (skill count 23→24, Key Sections table, Quick Navigation by Problem table), and `install-claude.sh` (mkdir + skills-array entry).
