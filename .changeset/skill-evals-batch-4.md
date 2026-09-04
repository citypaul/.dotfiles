---
"@citypaul/dotfiles": minor
---

Skill evals batch 4: quality suites for six service-side skills, and the fixes they drove

Batch 4 of the programme tracked in `evals/skills/COVERAGE.md`. Each of `api-design`,
`cli-design`, `bff-entry-points`, `secure-oauth-oidc`, `twelve-factor` and
`observability` now has a promptfoo quality suite built to the `AUTHORING.md` bar and
proven before its first agent run against a hand-written reference and a hand-written
no-skills default, with an independent verifier refuting each suite through up to two
repair rounds. Where a real run then showed a grader or a request marking correct work
down, the grader or request changed and the saved run was re-graded offline.

Highlights of what the graders check:

- `api-design` — an idempotency key whose replay carries a different body is refused,
  failures are RFC 9457 problem documents with a 400/422 split, validation by schema at
  the boundary, and a shipped field stays in the contract with its supersession recorded.
- `cli-design` — data on stdout only and diagnostics on stderr, a `--json` envelope, exit
  codes 0/1/2/78 documented in `--help`, every non-zero exit explained on stderr with
  stdout empty, handlers that neither print nor exit, flat human rows, TTY-gated status.
- `bff-entry-points` — every route through the registrar with an access declaration, no
  weakening flags, the mutation chain (Origin, CSRF, content type) installed by the
  registrar, a verdict-only public response, the public allowlist pinned, no-oracle
  cross-tenant refusal, the principal from the session only, authorization inside the
  application proven by direct calls.
- `secure-oauth-oidc` — S256 PKCE per transaction, a one-time session-bound state, ID
  token claims validated, tokens never in a URL or a log, an open redirector refused, the
  issuer bound to the transaction with two providers, and no false assurance in the reply.
- `twelve-factor` — schema-validated config that fails fast with no silent defaults and
  no environment-name branching, `.env.example`, SIGTERM/SIGINT drain with a timeout and
  closed pools, structured logs on the process streams with a configurable threshold and
  a request id, and an admin process declared as its own process type.
- `observability` — one canonical event per request including the exception path,
  allowlisted fields, semantic-convention names, high-cardinality identifiers off metric
  labels, W3C trace context on outbound calls, ratio SLOs with multiwindow burn-rate
  pages that link a runbook.

**What the evals caught, and what changed** (every edit anchored, verified by an
independent refuter node on Opus, and re-measured):

- `api-design` — asked to rename a field partners already read, one skill arm renamed it
  and warned, the other stopped to ask. Now the additive rule outranks the wording of the
  request and a supersession is recorded the moment it happens. 17/17 in both arms on two
  consecutive runs (no-skills 10–13/17).
- `cli-design` — the forced arm printed from inside handlers, made a flag required so a
  plain invocation exited 2, and put a success envelope on stdout for a failed gate. Now
  the entry point is the only file that writes a stream or ends the process, any non-zero
  exit keeps stdout empty, and status lines are TTY-gated where the stream contract is
  stated. Forced 22/31 → 31/31 on two consecutive runs.
- `bff-entry-points` — the CSRF token was left as a follow-up when the session store was
  fixed, a touched legacy route stayed mounted on the app, and no direct refusal test was
  written. Now the token has a path (HMAC over the session id), any route you change goes
  through the registrar, the chain lives in the registrar and nowhere else, and
  authorization is proven by direct calls. Forced 30/33 → 33/33.
- `secure-oauth-oidc` — given a narrow request on a spike with known holes, both skill
  arms delivered the ask and listed PKCE, nonce and token exposure as "pre-existing, out
  of scope". Now the flow you touch comes up to the RFC 9700 baseline in the same change
  and an existing token leak on the path you edit is removed. Forced 18/18 on two
  consecutive runs; no-skills fails five rule metrics.
- `twelve-factor` — both skill arms left environment-name branches and deep `process.env`
  reads in place, wrote no `.env.example`, and shipped a logger with a fixed level and no
  request id. Now a config module moves every env read in the same change and the sweep
  is grepped, a branch becomes a named setting and is deleted, and a logging change ships
  the request id. Forced 26/33 → 32/33.
- `observability` — the canonical event vanished on the exception path, console calls
  survived in the touched file, and a home-made header stood in for `traceparent`. Now
  the skill gives the construction rule (open the try before parsing, one exit in the
  finally, proved by a throw), scopes console removal to the file, and says to inject
  trace context on every outbound call. Forced 19–20/20 across five runs against a
  no-skills arm at 17–20/20: this suite discriminates weakly and is the batch's open
  item.
- Routing: tdd's companions, react-performance symptoms (batch 3) and now correlation
  and tenant-leak phrasings for observability and bff-entry-points, each routing 3/3.

Harness: hidden acceptance tests can run under a per-suite vitest config, because an
agent's own setup file registered a global tracer provider and swallowed every span the
observability tests observe; graders across the batch count only net-new lines, accept
an injected signal source, and require NO_COLOR handling only of a tool that emits colour.
