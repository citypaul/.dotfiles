---
"@paulhammond/dotfiles": minor
---

feat: add find-gaps skill for collaborative pre-implementation review

Add a new `find-gaps` skill that systematically surfaces missing states, unhandled edge cases, unstated assumptions, and unverifiable criteria in plans, acceptance criteria, and design mocks — then **works interactively with the user** to close each gap, turning answers into new acceptance criteria, plan updates, or mock-state specs written back to the source of truth.

**Two core principles:**
1. *What isn't on the page is more dangerous than what is.* Treat silence as a red flag, not a green light.
2. *Every gap is a conversation, not a comment.* A gap list nobody answers is a todo list with extra steps. The output of this skill is a **tightened artifact**, not a gap report.

**The shape is a conversational loop:**
- Survey the artifact against an artifact-specific checklist (plans / AC / mocks)
- Triage candidates into Blocker / Should-address / Nice-to-have
- Tell the user how many gaps and where — get agreement to proceed
- Walk them one at a time (or a tightly-coupled pair), starting with Blockers
- For each: ask the concrete question, refine vague answers until testable, convert to an artifact update, show it back, confirm, write to source of truth
- Recap every 3–5 closed gaps to catch contradictions
- Exit when Blockers + Should-addresses are closed, or park explicitly with owner if the user calls time

**Answer-to-artifact conversion patterns** (with worked examples in the skill):
- **AC:** Given / When / Then with a single observable outcome, actor, and any emitted events. A QA engineer should be able to execute it without follow-up questions.
- **Plan update:** the sentence or subsection that would have been in the plan if the author had thought of it — section, trade-off, failure mode named.
- **Mock state spec:** name / trigger / visual / behaviour / exit for each missed state, so it can be implemented without re-asking.

**Working-with-the-user patterns** the skill enforces:
- One question per turn (no bundling)
- Mirror the user's vocabulary verbatim — no silent "buyer → user" promotions
- Every confirmed answer is visible in the artifact before moving on
- Surface downstream trade-offs explicitly
- Escalate gaps the user can't decide — name the actual owner, park with question
- Don't re-ask triage — you already decided severity

**Per-artifact discovery checklists** (the engine for surfacing candidates):
- Plans: scope boundary, prerequisites, sequencing, failure & recovery, state & data, observability, security, testing, tribal knowledge
- Acceptance criteria: measurability (vague-word hit list), G/W/T discipline, negative paths, input edge cases, time & locale, actors, non-functional targets, completion
- Design mocks: UI states (loading/empty/error/offline/rate-limited), content variance, interaction states, responsive, accessibility, theme, permissions, i18n

**Outputs:**
- Primary: the **updated artifact** written to the source of truth (AC list, plan doc, `states.md`)
- Secondary: a resolution log with closed gaps (→ location) and parked gaps (→ owner)

Registered in CLAUDE.md (skills list + pointer), README.md (skill count 23→24, Key Sections row, two Quick Navigation by Problem rows), and `install-claude.sh` (mkdir + skills-array entry).
