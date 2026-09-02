---
"@citypaul/dotfiles": minor
---

Evaluate skills with promptfoo, and fix the five skills the evals caught

Fifty skills with deliberately overlapping remits only work if each one loads when it
should and, once loaded, changes what the agent does. Until now both were checked by
reading and guessing. `evals/skills/` is a [promptfoo](https://github.com/promptfoo/promptfoo)
harness that measures both by running the real Claude Code agent (the Claude Agent SDK
provider) with this bundle mounted:

- **Routing** — 48 realistic developer requests that never name a skill, asserted with
  `skill-used` / `not-skill-used` against the neighbour most likely to steal each one.
- **Quality** — for `tdd`, `hexagonal-architecture` and `domain-driven-design`, a small
  fixture project that *declares* the practice but shows as little of it as possible,
  product asks the agent implements with write and shell access in a sandbox, and
  deterministic graders that read the agent's tool-call trail (test edited before
  production? failure observed?) and the workspace it left (inside imports only inside?
  money in whole pence?), plus hidden acceptance tests for behaviour. Every case runs in
  three arms — `with-skills`, `no-skills` (verified to see no skills, CLAUDE.md or
  memory) and `skill-forced` — so forced-vs-none is what the skill body is worth and
  with-vs-forced is whether the description routes on its own. Every grader and hidden
  test was proven against a hand-written reference implementation before the first
  agent run; `regrade.mjs` re-grades saved runs offline.

```bash
cd evals/skills && pnpm install
./run.sh                                             # routing, ~10 min
./run-quality.sh tdd                                 # or hexagonal, ddd
SKILL_EVAL_BASELINE_REF=origin/main ./run-quality.sh tdd   # old vs new skill in one eval
```

The suites are not part of `npm test`; `.github/workflows/skill-evals.yml` runs them on
demand, weekly, or on a PR labelled `run-evals`. Offline guards keep the wiring honest
on every push. `COVERAGE.md` tracks every skill's status and the batch plan;
`AUTHORING.md` is the brief for adding a suite.

**What the evals caught, and what changed** (every edit anchored, verified by an
independent refuter node, and re-measured):

- `tdd` — with the skill loaded, replies named the passing run but not the RED failure
  and never stated the mutation-gate outcome; "it's probably a one-liner, please fix
  it" never loaded the skill and no test was written. Now: the final reply names the
  RED run and states the gate outcome in one line; the checklist item is unconditional;
  the description fires on quick-fix bug reports. 34 → 44 of 44 (with-skills), 40 → 44
  (forced), on two consecutive runs.
- `hexagonal-architecture` — with the skill force-loaded, agents still wrote a feature
  as one file importing the SDKs, edited a tangled use case in place when asked to make
  the next transport swap a one-file job, parked the adapter beside the vendor SDKs and
  kept `vi.fn` mocks; the forced arm scored below no-skills. Now: a short "Before You
  Write Code" procedure (an SDK client type is never a port; the order of work; what to
  do when touching a use case that still imports an SDK; where adapters and fakes go;
  fakes not mocks), the port-method rule extended to vendor DTOs, and a description that
  loads the skill for every change once a repo has opted in. 19 → 32 of 33
  (with-skills), 14 → 31 (forced).
- `domain-driven-design` — a derived branded value was re-branded with a second `as`,
  tests were titled after helpers, and the request's word "fee" became a `Fee` type
  although the glossary declares `Fine`. Now: one `as` per branded type inside its
  factory and derived values go back through it; `describe`/`it` titles name the
  business rule; the glossary outranks the request's wording. 21 → 22 of 22 (with-skills),
  18 → 22 (forced).
- `expectations` and `technical-writing` — descriptions that fired one and two times
  in three on their own requests now use the words people actually say.

Known gap left for the next batch: `functional` lost a mutation-bug request to `tdd`
in one of two routing runs.
