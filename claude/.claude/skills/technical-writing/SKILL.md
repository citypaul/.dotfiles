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

## One Primary Reader Job Per Page

Choose the page's primary reader job: tutorial, how-to, reference, or
explanation (Diátaxis; its honest limits live in
`resources/doc-types.md`). Supporting material may cross a boundary
when that helps the same job. Split the page when mixed purposes make
the next action, completeness contract, or intended audience unclear.

## Principles

- **Reader-first** — lead with the payoff; the reader's next action is
  the organizing principle, not the system's internal structure. Name
  things by what readers recognize, not how the code is built.
- **Scannable** — clear headings that summarize their section's payoff,
  short paragraphs, purposeful emphasis. Add a heading when it gives a
  skimmer a useful landmark; do not optimize for a word-count quota.
- **Plain and direct** — active voice, second person for instructions,
  short sentences for complex ideas. Complete sentences beat fragments
  and arrow chains: readable matters more than terse.
- **Selective, not compressed** — the way to keep a doc short is to cut
  what doesn't change the reader's next step, never to compress the
  prose into jargon the reader must decode.

## Material Claims Need Receipts

Make material capability, current-state, compatibility, and quantitative
claims checkable. Explanatory prose, clearly labelled judgment, and normative
design rationale do not need a fake command or date; unsupported promotional
claims do.

- **No capability claim without evidence**: numbers a reader can
  verify, a command they can run, a file they can open. "Fast" is
  marketing; "the gates run in 14 seconds on this repo's CI" is a
  claim with a receipt.
- **Counts and versions rot**: changing operational numbers quoted in prose
  (test counts, coverage, versions) are maintenance liabilities — either
  generate it, date it, or bind it to the kept-current rule (updating
  it is part of every change's definition of done).
- **Honest limits are content, not confession**: when the page's scope could
  imply protection, coverage, or capability it does not provide, name those
  limits where the reader makes the decision. A short document need not grow a
  ceremonial limits section when its bounded scope is already explicit.
- **Idle and empty states must speak**: "0 items processed" that reads
  like success is a lie of layout. Distinguish "nothing to do" from
  "did nothing" everywhere output appears in docs and examples.
- **Timeless maintained guidance**: evergreen READMEs and reference docs
  avoid unowned "coming soon", "currently", or "new in…" labels. Release
  notes, migration guides, deprecation notices, and time-bounded status pages
  may need temporal language; attach a version/date and an owner or removal
  condition so it remains evidence instead of stale promotion.

## Docs Are Behavior — Verify Them

A document that describes a system is a claim about that system, and
claims get verified:

- **Verify against the source, not memory**: every material flag, exit code,
  config key, and executable command a doc asks readers to rely on is checked
  against the code before it ships. Execute the claim when doing so is safe,
  authorized, and proportionate; otherwise record the evidence gap.
- **Machine-check what machines can check**: table-of-contents anchors
  against the renderer's real slug rules, links against files, command
  examples against the binary. Hand-verification is the fallback, not
  the default.
- **Update docs in the same reviewable change**: a behavior change that
  leaves its documentation stale is incomplete work. Follow the
  repository's commit policy rather than imposing one globally.

## Maintained Docs Describe Current Truth

Use `resources/docs-quality.md` for the full state-based lifecycle and Git-archaeology workflow.

- Keep plans and specification workspaces only while their outcomes remain unfinished. Delete them when the outcome ships or their assumptions are superseded; Git history is the archive.
- Promote lasting constraints to their current owner: source or executable tests for behavior, accepted ADRs for architecture decisions, package or operational docs for maintained procedures, and the authoritative glossary for domain vocabulary.
- Do not make maintained docs depend on deleted specifications or unexplained delivery identifiers. Introduce the purpose in plain language before any genuinely necessary issue, PR, task, requirement, specification, or ADR identifier.
- Give documentation indexes a clear starting point and distinguish current authority, active work, decisions, and historical evidence. Prefer a small navigable set of trusted pages; delete duplicated, obsolete, speculative, generated, or unowned prose.
- Documentation-only changes do not inherently require TDD. Any executable documentation guard still needs a focused test proving it can fail.

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
  table of contents when it materially improves navigation; quickstart as one
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
- [ ] Headings summarize payoffs; a ToC is present where warranted and its anchors are machine-checked
- [ ] Material capability/current-state/quantitative claims carry a receipt or date; promotional claims have evidence
- [ ] Commands, flags, and executable examples readers rely on are verified against source and run where feasible
- [ ] Material limits appear where implied scope could otherwise mislead
- [ ] Enumerable facts appear in tables; exact strings given for anything copy-pasteable
- [ ] Counts/versions bound to the kept-current rule or generated
- [ ] Doc changes ride the same reviewable change as the behavior they describe
- [ ] Maintained docs describe current truth; completed or superseded workspaces are deleted
- [ ] Lasting constraints live with their current owner, not only in historical delivery artifacts
- [ ] Indexes distinguish current authority, active work, decisions, and history
