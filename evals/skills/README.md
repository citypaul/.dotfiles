# Skill evaluations

[promptfoo](https://github.com/promptfoo/promptfoo) evaluations for the skills in
[`claude/.claude/skills`](../../claude/.claude/skills). Two kinds of suite:

| Suite | Question | Runner | Cost |
|---|---|---|---|
| **Routing** | Given a realistic request, does Claude load the right skill, and do the neighbouring skills stay quiet? | `./run.sh` | ~10 min, 48 one-step decisions |
| **Quality** ([coverage](COVERAGE.md)) | With the skill loaded, does the agent work the way the skill promises, and does the work or artifact satisfy the request? | `./run-quality.sh <suite>` | 5–15 min per suite, real agent runs |

Routing is where a description earns its place; quality is where a skill body does.
Both share the same provider (promptfoo's `anthropic:claude-agent-sdk`, i.e. the real
Claude Code agent) and the same authentication (your local Claude Code login).

## Routing suite

### What is measured

Each case in [`tests/routing.yaml`](tests/routing.yaml) is a request a developer might
type into Claude Code inside the fixture project in [`fixtures/workspace`](fixtures/workspace)
(a small React + TypeScript notes app with a legacy corner, a sync path with flags and
retries, and a story under discussion). Requests never name a skill.

The provider is promptfoo's `anthropic:claude-agent-sdk`, running the real Claude Code
agent with the bundle mounted at `.claude/skills`. The only signal graded is the
`Skill` tool calls the agent makes:

- `skill-used: <name>` — the skill that should own the request loaded.
- `not-skill-used: <name>` — the adjacent skill that most plausibly steals the request
  did not load.
- Two negative cases assert that trivial requests load **no** skill at all.

Nothing grades the prose of the answer. Answer quality is a separate question with a
separate cost; see *Extending* below for the pattern.

### Running it

```bash
cd evals/skills
pnpm install          # promptfoo + @anthropic-ai/claude-agent-sdk, pinned
./run.sh              # full suite, ~10 minutes at concurrency 4
./run.sh --repeat 3   # sample flaky cases; any `promptfoo eval` flag passes through
SKILL_EVAL_MODEL=opus ./run.sh
pnpm exec promptfoo view   # browse results/latest.json in the web UI
```

`run.sh` assembles a throwaway workspace in a temp directory — the fixture project plus
a symlink to the live `claude/.claude/skills` — so edits to a `SKILL.md` are picked up
on the next run and nothing inside the repository gains a nested `.claude/skills`
(which Claude Code would otherwise discover as a second copy of every skill).

Authentication uses your local Claude Code login (`apiKeyRequired: false`). Set
`ANTHROPIC_API_KEY` to bill an API key instead. Each case costs roughly 100k prompt
tokens: the system prompt, all 50 skill descriptions, the loaded skill body and a
handful of file reads.

The suite is deliberately **not** part of `npm test` or the per-push CI: it spends
real tokens and is non-deterministic. `test/skill-evals-routing.sh` is the cheap,
offline guard that keeps the cases honest (every skill a case names must exist).
`.github/workflows/skill-evals.yml` runs the suites on demand, weekly, or on a pull
request labelled `run-evals` that touches a skill or the harness, using the
`ANTHROPIC_API_KEY` secret and uploading results as artifacts.

### Reading a failure

A failed `skill-used` means the description did not win the request; a failed
`not-skill-used` means a neighbour's description claimed it. In both cases the fix is
almost always in a `description:` line, not in the test:

1. Open `results/latest.json` (or `promptfoo view`) and look at which skill *did* load.
2. Read the winning and losing descriptions side by side.
3. Move the distinguishing trigger words into the losing description, or add an
   explicit "for X use Y" hand-off to the winning one.
4. Re-run just that cluster, or just what failed last time:
   `./run.sh --filter-pattern '^refactoring'` or
   `./run.sh --filter-failing results/latest.json --repeat 3`.

Before treating a single failure as a defect, re-run it with `--repeat 3`. Routing is a
sampled decision; a case that fails one time in three is a weak description, a case
that fails three times in three is a wrong one.

### Adding a case

Add an entry to `tests/routing.yaml` under the cluster it belongs to:

```yaml
- description: <skill> — <what the request is really about>
  metadata: { cluster: testing }
  vars:
    request: "<what a developer would actually type; never names the skill>"
  assert:
    - { type: skill-used, value: <skill> }
    - { type: not-skill-used, value: <most plausible wrong neighbour> }
```

If the request needs code to look at, add it to `fixtures/workspace` and keep it
small — the fixture is context the agent pays for on every case.

## Quality suites

Each quality suite is a small project under `fixtures/<suite>-workspace` that has
**declared** the practice the skill teaches but shows as little of it as possible, so
the skill — not the fixture — has to supply the rules. Implementation suites grade
the agent's trail, workspace, and hidden behavioral checks; advisory suites grade the
written artifact, deterministically where the promise is objective and with a rubric
only where judgement is unavoidable. [`COVERAGE.md`](COVERAGE.md) is the authoritative
suite list and status tracker.

The original implementation fixtures illustrate the pattern:

- `tdd`: a notes module with a decent test file. Cases add behaviour or fix a bug.
- `hexagonal`: a service whose README and CLAUDE.md say "ports and adapters" but whose
  only feature calls the SDKs directly, mixes the business rule with email formatting,
  and mocks the SDKs in its test. Cases add a feature, swap a transport, and add a rule
  the requester wants "where the SMTP call is".
- `ddd`: a greenfield library-lending domain with only a glossary, whose canonical
  terms (Patron, Item, Loan, Hold, Fine) deliberately differ from the everyday words
  the requests use (member, book, borrow, late fee).

Requests pin only what the hidden acceptance test must call. Where things live, what
they are called, and how they are modelled and tested is the agent's — and what the
graders check.

Three providers run every case: **with-skills** (the bundle as installed, routing
left to the agent), **no-skills** (the same agent with nothing loaded — verified to
see no skills, no CLAUDE.md and no memory), and **skill-forced** (the bundle, with a
system-prompt line telling the agent to load the skill under test first). Read the
arms in pairs: forced against no-skills is what the skill body is worth on that
case; with-skills against forced is whether the description routes on its own when
only the repository declares the practice. A case both no-skills and forced pass is
not measuring the skill; make it harder or drop it.

### What is graded

Everything is deterministic — no model grades a model. The graders read two sources:
the ordered tool-call trail the Claude Agent SDK reports (what the agent did, in what
order) and the workspace it left behind. Every rule graded is one the skill states as
a rule.

| Suite | Trail | Workspace | Behaviour |
|---|---|---|---|
| `tdd` | test edited before production; a test run between them (RED seen) using a narrow selector; a test run after the last edit; no watch mode | suite green; touched tests use no spies, `let` or `beforeEach`; every new export has a test; reply reports the failing and passing runs and addresses the mutation gate | hidden acceptance test per case, built only through the public API |
| `hexagonal` | which tests the agent touched | roles found by content, not folders: the file carrying the business rule imports no SDK and no adapter; ports are inside interfaces named by role, driving ports by intention (`For…ing…`); adapters carry no business rule; inside reads no clock, env, network or timer; every port has a test interactor; use-case tests use fakes; wiring only in the composition root; a transport swap touches one file | hidden test drives the app through `createApp` with fake SDK clients |
| `ddd` | — | glossary language throughout (canonical present, rejected aliases absent); branded ids with factories; Result values, never throws; immutable, no `any`, assertions only for brands; no clock in the domain; tests named by concept; per case: lifecycle as a union, events as returned data, aggregates referenced by id, money in whole pence | hidden acceptance test per case through the glossary's operation names |

Graders live in `tdd-assertions.js`, `hex-assertions.js` and `ddd-assertions.js` on
top of `quality-lib.js`; hidden tests live under `tests/<suite>/acceptance/`. Every
hidden test and grader was proven against a reference implementation before the
first agent run, so a failure points at the agent's work, not the harness.

### Running a quality suite

```bash
cd evals/skills
./run-quality.sh tdd                                # all three arms, all cases
./run-quality.sh hexagonal --filter-providers with-skills
./run-quality.sh ddd --repeat 3
./run-quality.sh graph-engineering
SKILL_EVAL_BASELINE_REF=origin/main ./run-quality.sh tdd   # + skills-at-<ref> arm: old vs new skill in one eval
pnpm exec promptfoo view                           # transcripts, per-metric scores
```

`run-quality.sh` copies the fixture to a temp directory, installs its pinned
dependencies, mounts the live skills, and commits the starting state. Cases run one
at a time; `quality-hooks.js` saves each case's diff under `results/<suite>/` and
resets the workspace between cases. The report at the end is a metric-by-provider
scoreboard followed by the failing metrics per case, each with the grader's reason.

Every run gets a directory, `results/<suite>/<timestamp>/`, holding `results.json` and
one `.diff` per case. To iterate on graders without spending tokens, `node regrade.mjs
<suite> [run directory]` rebuilds every case's workspace from its saved diff and
re-runs all graders with the saved trail, reply and the *current* case vars.

### Reading a quality failure

- **with-skills fails, no-skills passes** the same metric: the skill is actively
  making things worse on that case. Read the diff and the reply; usually an
  instruction is being followed too literally.
- **both fail**: either the skill does not say it, or says it somewhere the agent
  does not read. Check whether the rule is in the skill's opening, its checklist, or
  buried in a resource.
- **both pass**: the case does not discriminate. Make it harder or replace it.
- **`behaviour-delivered` fails alone**: read `results/<suite>/<case>--<provider>.diff`
  before blaming the skill; a legitimate design the hidden test did not anticipate is
  a harness defect, and the hidden tests are written to build state only through the
  public API for exactly that reason.

The fix for a skill defect is an edit to `SKILL.md`; re-run the suite to show it
took, and keep the case.

## How this follows promptfoo's guidance

promptfoo's [Test Agent Skills](https://www.promptfoo.dev/docs/guides/test-agent-skills/)
and [Evaluate Coding Agents](https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/)
guides, and the [Claude Agent SDK provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)
reference, are the basis for the harness. Where and how each recommendation is met:

| Recommendation | Here |
|---|---|
| Discover skills from the fixture with `setting_sources: ['project']`, mount `.claude/skills` | `run.sh` / `run-quality.sh` symlink the live skills into a throwaway workspace |
| "Start by verifying that Claude actually invoked the skill" with `skill-used` | routing suite; and `report.mjs` prints what loaded for every quality case |
| Assert siblings stay quiet with `not-skill-used`; pair broad and narrow prompts | every routing case names the neighbour most likely to steal it; two negative cases |
| Compare skill versions side by side in one eval (v1/v2 fixtures) | `SKILL_EVAL_BASELINE_REF=<git ref>` adds a `skills-at-<ref>` provider: the bundle at that ref, routing left to the agent, i.e. `with-skills` for the old version |
| Use a plain baseline so capability gaps are visible | the `no-skills` arm, verified to see no skills, CLAUDE.md or memory |
| Verify the path, not only the final answer | trail graders read `metadata.toolCalls` (order of edits, which test runs, watch mode) |
| Prefer deterministic assertions; `skill-used` over raw JavaScript | `skill-used` for routing; JavaScript only where the rule needs a path predicate (a test file edited before a source file) that `trajectory:*` cannot express |
| Minimal permissions: read-only tools by default, sandbox Bash, no network | routing runs read-only; quality runs use `acceptEdits` with the SDK sandbox and `web_search_enabled: false`, and `pnpm install` runs before the eval |
| Serial execution and reset between cases when agents write | `maxConcurrency: 1`; `quality-hooks.js` saves the diff and `git reset --hard` after each case |
| Structured output when the answer itself is graded | not needed: nothing here grades the prose; the transform shows the routing decision instead |
| `--repeat` for non-determinism; "if a prompt fails 50% of the time, fix the instructions" | re-run failures with `--repeat 3` before editing; `max` status in `COVERAGE.md` needs two consecutive clean runs |
| `--no-cache` while iterating; `-o` and `view` for results | both runners; `results/` is gitignored |
| `cost` / `latency` guards | not used: runs bill a Claude Code login, so cost is not reported; latency is dominated by the fixture, not the skill |
| Keep the working directory disposable; never real credentials | temp directories outside the repository, removed on exit; SDK stand-ins in `src/lib/`, no real services |

## Extending

- **Add a quality case.** Add the request to `tests/<suite>-quality.yaml`, write the
  hidden test under `tests/<suite>/acceptance/`, prove it against a hand-written
  reference implementation in a scratch copy of the fixture, then run.
- **Add a quality suite for another skill.** Copy the pattern: a fixture that opts
  into the practice, a `promptfooconfig.<suite>.yaml`, graders that check the rules
  the skill states as rules, hidden tests for behaviour. `run-quality.sh` and
  `quality-hooks.js` need no changes.
### Routing-suite extensions

- **Compare two versions of a skill.** Copy the pattern from promptfoo's
  [Test Agent Skills](https://www.promptfoo.dev/docs/guides/test-agent-skills/) guide:
  two providers with different `working_dir`s, identical tests, and `promptfoo view`
  side by side. Prepare the second workspace the way `run.sh` does (fixture project plus
  a `.claude/skills` symlink to the candidate skills) and point its provider at it.
- **Grade the answer, not just the routing.** Add an `llm-rubric` assertion with the
  behaviour the skill promises inlined in the rubric (for example, for `tdd`: "the
  reply writes a failing test before any production code"). Keep these in a separate
  test file so the cheap routing suite stays cheap.
- **Other agents.** promptfoo's `openai:codex-sdk` and `opencode:sdk` providers discover
  the same bundle from `.agents/skills`; see the guide above.
