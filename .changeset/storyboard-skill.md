---
"@paulhammond/dotfiles": minor
---

Add storyboard skill for multi-surface design audits

The `storyboard` skill produces a single HTML page that stitches every UX surface in a scope of work into one reviewable view — each existing mock embedded as a live `<iframe>`, a flow diagram showing how the user moves through them, per-mock audit checklists, and gap cards for mocks still to produce.

Solves the "open a dozen tabs and try to hold the flow in your head" problem. Use before any feature whose scope touches ≥ 2 UX surfaces begins implementation, at wave-start in launch-planning workflows, or whenever the user asks for "the whole flow in one place" / "audit the mocks".

Pairs with the `impeccable` family (`/shape`, `/critique`, `/layout`, `/clarify`, `/audit`, `/polish`, `/adapt`, `/harden`, `/distill`) — the audit checklists reference these, and gap-mock production runs them.

Non-negotiables baked in: live iframes not screenshots (screenshots go stale), every gap card has brainstorm questions (forcing function for decisions before drafting), one scrollable page not a tree, `<pre>` for ASCII diagrams (prettier-safe).
