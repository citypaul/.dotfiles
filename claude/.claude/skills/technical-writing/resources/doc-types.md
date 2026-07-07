# Document Types: One Mode Per Page

The single most violated rule in real-world docs: mixing tutorial,
how-to, reference, and explanation on one page. Nearly every "Getting
Started" page is a tutorial/how-to/explanation smoothie.

## The four modes (Diátaxis — Procida, diataxis.fr)

Two axes: action vs cognition, and acquiring skill vs applying it.

| | Serves acquisition (study) | Serves application (work) |
|---|---|---|
| **Action** | Tutorial — a lesson | How-to guide — directions |
| **Cognition** | Explanation — understanding | Reference — information |

When unsure which you're writing, the compass (diataxis.fr/compass):
does this page inform action or cognition? does it serve study or work?

## Tutorial ≠ how-to (the distinction most docs miss)

- A **tutorial** is a lesson in a contrived, controlled setting: one
  carefully managed path, no choices, explicit about basics —
  "responsibility lies with the teacher" (diataxis.fr/tutorials-how-to).
- A **how-to** serves the already-competent user at work: it forks and
  branches ("if this, then that"), assumes familiarity, and the user
  owns getting in and out of trouble.
- Most pages labelled "tutorial" are how-tos, and fail beginners for
  exactly that reason.

## Adopt bottom-up, never as a restructure project

Procida's own guidance (diataxis.fr/how-to-use-diataxis): do NOT create
empty tutorial/how-to/reference/explanation shells. Pick one page,
assess it against the mode it should be, make one improvement, publish.
"Every step in the right direction is worth publishing immediately."

## Types the four-mode model doesn't name

Honest limits (Hillel Wayne, "My Problem With the Four-Document
Model"): the model fits tools best and strains for languages/frameworks
with dense conceptual models. Two real types it omits:

- **Conceptual overview** — before the tutorial, for readers deciding
  whether and how to learn.
- **Snippets/examples** — demonstrating a way of thinking, not a
  procedure.

The Good Docs Project's Core Pack adds two more first-class types:
**Troubleshooting** and **Release notes** (thegooddocsproject.dev).
Use its templates rather than inventing structure per type.

## Minimalism, scoped per type (Carroll)

Carroll's minimalism (The Nurnberg Funnel; van der Meij & Carroll
1995): start users on a real task immediately; minimize reading; put
error recognition AND recovery inline in the instruction; make
activities self-contained. The famous validation: 25 task cards
replaced a 94-page manual and halved task time.

Two guardrails:
- Minimalism is NOT "less documentation" — Carroll wrote "Ten
  Misconceptions about Minimalism" himself. It is documentation
  designed around action; citing it to avoid writing docs misreads it.
- "Let users fill gaps" fits HOW-TOS; tutorials must stay explicit
  about basics (the Diátaxis tutorial rule). Scope minimalism per doc
  type, never globally.
