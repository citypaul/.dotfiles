---
"@paulhammond/dotfiles": patch
---

fix(find-gaps): use `AskUserQuestion` for enumerable decisions

Weave the `AskUserQuestion` tool into the find-gaps loop wherever the **choice space is the value** (failure strategies, severity re-triage, state-variance scoping, parking decisions, write-back confirmation, variant comparison via `preview`) — while keeping free text for questions where the **user's specific words are the value** (microcopy, domain vocabulary, novel decisions).

**Why it matters:** structured options surface trade-offs the user might not have thought through (*"silent retry once"* is rarely what they say first, but often the right call), speed up picking vs. generating, and let you batch 2–4 tightly-related sub-questions in one turn without reverting to a gap dump.

**What's added:**
- New **Asking with Structure** section with the core heuristic, good-fit table, bad-fit list, structural rules, and a worked payment-decline example showing how to batch two related sub-questions in one `AskUserQuestion` call
- Step 4 of the gap-closing loop now routes enumerable questions to `AskUserQuestion` and uses it for the *write as-is / edit inline / discard* close, with optional `preview` for comparing two G/W/T drafts side-by-side
- "One question per turn" rule clarified: a structured call with 2–4 tightly-related sub-questions is still one turn; batching *unrelated* gaps is a gap dump wearing a hat

**What's forbidden:**
- Inventing options just to use the tool (fabricated options anchor the user to guesses and hide their real answer)
- Using `AskUserQuestion` for microcopy (destroys the exact wording that is the point)
- Batching unrelated gaps into one call

No other docs change — this is an internal refinement of how the skill interacts with the user. README/CLAUDE.md entries are unchanged.
