---
name: technical-writing
description: "Writing developer-facing prose that can be skimmed first and trusted enough to finish — READMEs, guides, tutorials, reference docs, proposals, PR descriptions, release notes. Use when creating or editing any technical document, when a doc reads as a wall of text, when claims need receipts, or when docs must serve AI agents as well as humans. Covers reader-first structure, falsifiable claims, docs-as-behavior verification, and agent-readable reference shape. For diagram choice and syntax see diagrams; for API reference semantics see api-design; for CLI help text see cli-design."
---

# Technical Writing: Skimmed First, Trusted Enough to Finish

Developers skim before they commit. A document earns the full read by
answering three questions in its first screen: what is this, why should
I care, and how do I start. Everything below serves that contract.

| Resource | Load when... |
|----------|-------------|
| `resources/doc-types.md` | Choosing what KIND of page to write — the four Diátaxis modes, tutorial-vs-how-to, the types the model omits, minimalism scoped per type |
| `resources/readme.md` | Writing or overhauling a README — the cognitive funnel, short-vs-long resolved, README-driven development |
| `resources/docs-quality.md` | Making docs enforceable — prose lint, executable examples, link checking, friction logs, timeless-docs, every-page-is-page-one |
| `resources/agent-docs.md` | Docs serving AI agents — the honest llms.txt verdict, markdown endpoints, RAG-chunkable pages |
| `resources/formatting.md` | Structural rules — titles, headings, paragraphs, lists, intros/outros, tables of contents |
| `resources/references.md` | Sources for every claim above |

## One Mode Per Page

The most violated rule in documentation: a page is a tutorial, a
how-to, a reference, or an explanation — never a blend (Diátaxis; the
full typology, the tutorial/how-to distinction most docs miss, and the
model's honest limits live in `resources/doc-types.md`). Decide the
mode before the first sentence; when a page fights you, it is usually
two modes wearing one URL.

## Principles

- **Reader-first** — lead with the payoff; the reader's next action is
  the organizing principle, not the system's internal structure. Name
  things by what readers recognize, not how the code is built.
- **Scannable** — clear headings that summarize their section's payoff,
  short paragraphs, purposeful emphasis. A heading every 200–250 words.
- **Plain and direct** — active voice, second person for instructions,
  short sentences for complex ideas. Complete sentences beat fragments
  and arrow chains: readable matters more than terse.
- **Selective, not compressed** — the way to keep a doc short is to cut
  what doesn't change the reader's next step, never to compress the
  prose into jargon the reader must decode.

## Claims Need Receipts

Every claim in a technical document is checkable or it is marketing.

- **No capability claim without evidence**: numbers a reader can
  verify, a command they can run, a file they can open. "Fast" is
  marketing; "the gates run in 14 seconds on this repo's CI" is a
  claim with a receipt.
- **Counts and versions rot**: any number quoted in prose (test
  counts, coverage, versions) is a maintenance liability — either
  generate it, date it, or bind it to the kept-current rule (updating
  it is part of every change's definition of done).
- **Honest limits are content, not confession**: a section naming what
  the thing does NOT do yet is the most trust-building section in the
  document. State limits plainly; never imply protection, coverage, or
  capability that isn't there.
- **Idle and empty states must speak**: "0 items processed" that reads
  like success is a lie of layout. Distinguish "nothing to do" from
  "did nothing" everywhere output appears in docs and examples.
- **Timeless docs**: never pre-announce; no "coming soon",
  "currently", or "new in…" — docs outlive releases and these rot
  faster than any code example (Google's rule).

## Docs Are Behavior — Verify Them

A document that describes a system is a claim about that system, and
claims get verified:

- **Verify against the source, not memory**: every flag, exit code,
  config key, and command in a doc is checked against the code before
  it ships. If a claim can be executed, execute it.
- **Machine-check what machines can check**: table-of-contents anchors
  against the renderer's real slug rules, links against files, command
  examples against the binary. Hand-verification is the fallback, not
  the default.
- **Update docs in the same change**: a behavior change that leaves
  its documentation stale is incomplete work. The doc diff belongs in
  the same commit as the behavior diff.

## Writing for AI Agents Too

Developer docs now have two audiences. Agent-readable means:

- **Enumerable over prose-only**: anything an agent must choose from —
  options, flags, exit codes, states — appears in a table row, not
  only inside a paragraph.
- **Preconditions and postconditions per operation**: what must be
  true before, what changes after, what exit codes mean. A
  state-machine table ("in state X, the one correct next action is Y")
  outperforms narrative for both audiences.
- **Exact strings**: agents (and humans under pressure) copy-paste.
  Give the exact command, the exact config block, the exact error
  message — never a paraphrase.

## Document Shapes

- **README / landing**: first screen answers what/why/how-to-start;
  table of contents for anything over ~4 sections; quickstart as one
  coherent journey in true order; honest limits before credits.
- **Tutorial**: state the destination up front ("you will have X
  working"); number steps; every step's output shown so readers know
  they're on track; end with where to go next.
- **Reference**: completeness over narrative; one entry per
  flag/option/state; generated where possible; agent-readable tables.
- **Proposal / design doc**: the decision requested up front, options
  with honest trade-offs, a recommendation with reasoning, and what
  evidence would change it.
- **PR description / release notes**: what changed for the READER of
  the change (behavior, migration), not a commit-log paraphrase.

## Boundaries

| Situation | Skill |
|-----------|-------|
| Choosing and authoring diagrams | `diagrams` |
| REST/API reference semantics (errors, pagination, versioning) | `api-design` |
| CLI help text, exit codes, output design | `cli-design` |
| Documenting expectations, gotchas, decisions while fresh | `expectations` |
| Domain vocabulary in prose | `ubiquitous-language` (where installed) |

## Verification Checklist

- [ ] First screen answers what / why / how-to-start
- [ ] Headings summarize payoffs; one per 200–250 words; ToC where warranted (anchors machine-checked)
- [ ] Every claim carries a receipt or a date; no marketing verbs without evidence
- [ ] Every command/flag/code verified against the source; executable claims executed
- [ ] Honest-limits section present and current
- [ ] Enumerable facts appear in tables; exact strings given for anything copy-pasteable
- [ ] Counts/versions bound to the kept-current rule or generated
- [ ] Doc changes ride the same commit as the behavior they describe
