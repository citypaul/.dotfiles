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

## Every page is page one (Baker)

Readers arrive at pages, not sites — search brought them then, RAG
brings them now. Each page: self-contained, one limited purpose,
establishes its own context, links richly. The 2013 argument that
became the single best predictor of RAG-readiness.
