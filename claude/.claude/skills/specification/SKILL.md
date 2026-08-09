---
name: specification
description: Turn fuzzy intent into shared understanding and acceptance criteria — specification as a conversation, run one question at a time, before any story is split or planned. Use when an idea, feature request, or problem statement has no agreed rules or examples yet ("let's spec this out", "what should this actually do?", "we need acceptance criteria"). Produces an example map and acceptance criteria written back into the team's own story artifact, plus candidate glossary terms and parked questions. The agent-facilitated round is a draft for review by the accountable owner and, when risk or shared ownership warrants it, the relevant human perspectives. For decision trees with no artifact, use grill-me where installed or this skill's one-question protocol; for tightening an existing artifact, see find-gaps; for slicing agreed work, see story-splitting.
---

# Specification: the Conversation Is the Product

A specification is not a document. It is a conversation between stakeholders in which shared understanding gets built — and the written result is, at best, an educated guess about what is really required, refined until reality gets the deciding vote (Gorman). The value is in the *planning*, not the plan: asking an agent to "write the spec" while skipping the conversation misses the entire point. This skill exists to *force* the conversation — with you first, then between the humans who own the answers.

**Where this sits**: before `story-splitting`, before `planning`, before any acceptance test exists. Its output feeds all three.

| Resource | Load when... |
|----------|-------------|
| `spec-review-template.html` | Presenting a finished map for accountable human review |
| `references.md` | Checking sources for the practices taught here |

---

## The Contract

1. **Find the story's home first.** Ask where this story lives — an issue, a file under `docs/stories/`, a ticket, anywhere the team already keeps it. Everything this skill produces is written back into THAT artifact. If it has no home yet, ask where it should live; never invent a parallel convention silently.
2. **One question at a time.** Never a questionnaire. Name the stakes and
   accept "park it" — parked questions get an owner and a date, never silence.
   Recommend an answer only when repository evidence or known trade-offs
   justify it; otherwise ask neutrally and label any tentative hypothesis as
   such rather than anchoring the decision owner.
3. **Every material assumption becomes a question.** The moment you notice
   yourself deciding an outcome the human never supplied, stop and ask it. An
   answer that cannot change the map was not a real decision question.
4. **The map is data, not prose.** Build it as you go and keep it visible:

```
story:     <one line, in the words the human used>
rules:     # business policies / acceptance criteria
  - rule: <policy in domain language>
    examples:
      - <concrete: real values, real outcome — never a restatement of the rule>
    questions: # open assumptions attached to THIS rule (optional); parked items include owner and decision/review date
questions: # cross-cutting open assumptions; parked items include owner and decision/review date
acceptance criteria: # distilled from rules once examples stabilise
candidate terms:     # vocabulary the conversation coined or contested
```

5. **Challenge the map before trusting it.** For each rule: the counter-example question ("what would have to be true for this example to come out differently?"), zero–one–many, boundaries, and what-happens-when-it-fails. A rule with one example is a guess; a rule whose examples all agree is a hypothesis.
6. **Read the map's shape as a diagnostic.** Question-dominated → not ready to build; keep talking, or park with owners and stop. Rule-dominated (more than ~6 rules) → too big; hand the map to `story-splitting`. Balanced, with concrete examples per rule → ready.

## The Recommended Path: Draft, Then Accountable Review

The agent-facilitated conversation above produces a **first draft** of shared understanding. It becomes usable only after the people accountable for the outcome review it. Match the review group to the work: a sole owner may be enough for a low-risk local change; shared, regulated, irreversible, or cross-discipline behavior needs the affected business, development, testing, security, operations, or design perspectives. Record any material perspective intentionally absent and why.

**Recommended flow, multi-round:**

1. **Round 1 (agent-facilitated)**: run the contract above with whoever brought the idea. Write the map back to the story artifact. Generate the review page (below) from it.
2. **Round 2 (accountable humans)**: the review page goes to the owner and the risk-relevant perspectives. A three-amigos conversation (business, development, testing) is a strong default for shared product behavior, not a ceremony to manufacture for every small task. Reviewers annotate the page; disagreements become new questions, not silent edits.
3. **Round 3+ (reconcile)**: their feedback returns to the agent round as answers and new red cards. Update the map and the artifact; regenerate the page. Repeat until a round produces no new rules, no changed examples, and no new questions.
4. **Then split**: the stabilised map goes to `story-splitting`; each child story carries its rules and examples onward — per-rule questions flatten into the single questions list that downstream mapping expects — and where an acceptance-test outer loop is installed, those examples become the seed of its per-slice mapping.

Reality still gets the final vote: acceptance criteria written here are hypotheses until the shipped slice confirms them. When reality disagrees, the conversation reopens — that is a feature of the method, not a failure of the spec.

## The Review Page

For round 2, generate a single self-contained page from `resources/spec-review-template.html`: fill its JSON data slot (replace ALL occurrences of the double-underscore REVIEW_DATA token, escaping every `<` in string values as backslash-u003c), write to a temp directory, open locally, never commit the generated page. Structure the data as sections sharing one card engine: a **Rules** section (one card per rule — the rule as the card name, its concrete examples as the plain text, its attached questions in the highlight line, the verbatim map entry collapsible beneath), a **Parked questions** section (question as name, owner + decision/review date + context as plain text), and a **Candidate vocabulary** section (term as name, one-line gloss as plain text). Every card takes comments; the copy-feedback control assembles all annotations into one markdown block that returns to the next round. This page is a conversation artifact, not an approval record — regenerate it freely every round.

## Vocabulary Capture

Specification conversations coin vocabulary constantly — that is half their value. Every term the conversation invents, contests, or uses in two different senses goes into `candidate terms` with a one-line gloss. Where the `ubiquitous-language` skill is installed, candidates enter its five-step language protocol individually (extraction gathers candidates; only the protocol admits them); where it is not, the candidate list still travels with the story so the naming conversation happens somewhere.

## Boundaries

| Situation | Skill |
|-----------|-------|
| A fuzzy decision tree, no artifact yet, resolving choices | `grill-me` where installed; otherwise this skill's one-question protocol |
| An existing story/plan/spec that needs holes poked | `find-gaps` |
| The agreed map is too big; slicing into child stories | `story-splitting` |
| Turning a child story into PR-sized plans | `planning` |
| Comparing libraries, tools, applications, services, platform primitives, or bespoke implementation after behavior and constraints stabilize | `evaluate-existing-solutions` |
| Per-slice executable specification (where installed) | `acceptance-testing` |
| Naming the vocabulary the conversation surfaced (where installed) | `ubiquitous-language` |

## Verification Checklist

- [ ] The story artifact's home was asked, not assumed; all output written back into it
- [ ] Questions went one at a time; recommendations appeared only when evidence or known trade-offs justified them
- [ ] Every rule has at least one concrete example (real values, real outcome)
- [ ] Each rule survived the counter-example challenge
- [ ] Parked questions have owners and decision/review dates
- [ ] Candidate terms captured (and routed to the language protocol where installed)
- [ ] The accountable owner reviewed the page; risk-relevant perspectives joined or their absence was recorded
- [ ] Feedback returned as answers/questions, never as silent edits
- [ ] Map shape checked: not question-dominated, not rule-dominated, examples concrete
