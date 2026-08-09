# Docs Quality Engineering: Docs Are Tested Behavior

## Docs-as-code (Write the Docs)

Docs live in version control, plain text, code-reviewed, CI-tested —
same workflow as code, which is what lets you block feature merges
that lack docs and gets developers drafting. Honest limit (from
Stripe's Markdoc experience, stripe.dev/blog/markdoc): version control
and CI are uncontested, but CODE-LIKE AUTHORING is where it fails
non-engineer contributors — Stripe deliberately built Markdoc WITHOUT
loops or variable assignment "to discourage writers from performing
procedural content generation."

## The enforcement ladder

- **Prose lint (Vale, vale.sh)**: syntax-aware — rules in YAML,
  heading-only contexts, skips code blocks; ready-made packages
  implement the Google and Microsoft style guides in CI. This turns
  style rules from aspiration into a merge gate. Limit: Vale enforces
  mechanics, not whether the page answers the reader's question —
  don't over-index on lint-green docs.
- **Executable examples**: any example not compiled/run in CI is a
  latent lie. rustdoc doc-tests are the canon ("makes sure that
  examples within your documentation are up to date and working");
  Python doctest, mdBook test, and extracting README snippets into CI
  are the same move.
- **Link checking (lychee)**: the hypertext layer's equivalent.
- **Generated reference**: API reference generated from the spec
  (OpenAPI) cannot drift; hand-written references quietly diverge
  within months. Spec fields (operationId, description) are
  user-facing copy — and now agent-facing.

## Style rules that survive across guides

- Second person, active voice, present tense; verbs first; cut "you
  can" and "there is" (Microsoft's compression example: "If you're
  ready to purchase Office 365 for your organization, contact your
  Microsoft account representative" → "Ready to buy? Contact us").
- Descriptive link text — never "click here"; link text must make
  sense out of context (accessibility AND agents).
- **Timeless docs (Google)**: never pre-announce; no "coming soon",
  "currently", "new in..." — docs outlive releases, and these rot
  faster than code examples.
- Mechanically lintable consistency: sentence-case headings, Oxford
  comma, no heading end-punctuation. Their value is that they END
  ARGUMENTS — pick ONE style guide, defer to it wholesale, and write
  down only your deltas (the Red Hat pattern: a supplementary guide
  over IBM's, never a restatement).

## Process (Docs for Developers — Bhatti et al.)

- **Friction logs** before writing: do the task yourself as a new
  user and record every stumble; that log is the doc's outline.
- Draft → edit → publish alongside code releases; maintenance is part
  of the release, not a backlog.
- Errors are documentation: every error carries an identifier, cause,
  and remediation. An API reference documenting only the happy path
  documents half the API.

## Lifecycle: State, Not Age

Maintained documentation describes current truth. Keep an active plan or specification workspace only while its outcome is unfinished. Delete it when the outcome ships or its assumptions are superseded; do not assign completed specifications a time-to-live or retain them as an informal archive. Git already preserves the history.

Before deletion, move each lasting constraint to its current owner:

| Constraint | Current owner |
|------------|---------------|
| Observable behavior or regression | Source code and an executable test |
| Accepted architecture decision | The repository's accepted ADR location |
| Package contract or setup | Package documentation |
| Operational procedure | Maintained operational documentation |
| Approved domain vocabulary | The bounded context's authoritative glossary |
| Temporary sequencing or blockers | Current status or the active plan only |

Do not leave maintained pages pointing at deleted workspaces or bare delivery identifiers. If an issue, PR, task, requirement, specification, or ADR identifier is still useful, introduce the purpose in plain language so the sentence remains understandable without opening the historical artifact.

A documentation index is a routing surface, not a catalogue. Name where a reader starts and distinguish current authority, active work, accepted decisions, and historical evidence. Delete overlapping, obsolete, speculative, generated, and unowned pages when they no longer answer a maintained question.

Documentation-only changes do not inherently require a RED-GREEN-REFACTOR loop. Test executable examples, link checks, lint rules, and other documentation guards—including a positive control that proves a new guard detects a known failure.

## Git Archaeology for Missing Behavior

Investigate current source, tests, status, and accepted ADRs before searching history. Then use the narrowest useful Git query:

```bash
git log -S '<concept>'              # commits that add or remove an exact string
git log -G '<pattern>'              # commits whose patches match a pattern
git log --all -- <path>             # history of a deleted or moved document
git show <commit>:<path>            # recover a file at one revision
git blame -L <start>,<end> <path>   # trace the origin of current behavior
```

Follow an introducing commit to its merged pull request when discussion there may explain the decision. Treat every recovered specification as evidence at that revision, never as current authority. If its rationale still constrains the product, promote that rationale into the current authoritative artifact instead of reviving the old workspace.

## Every page is page one (Baker)

Readers arrive at pages, not sites — search brought them then, RAG
brings them now. Each page: self-contained, one limited purpose,
establishes its own context, links richly. The 2013 argument that
became the single best predictor of RAG-readiness.
