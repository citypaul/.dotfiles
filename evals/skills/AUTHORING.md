# Authoring a quality suite for a skill

This is the brief a person or an agent follows to add `evals/skills` coverage for
one skill. Follow it exactly; the three suites already here (`tdd`, `hexagonal`,
`ddd`) are the worked examples. Read `README.md` first.

## The bar

A suite is only useful if it **discriminates**: the `skill-forced` arm must be able
to score higher than the `no-skills` arm. Every case therefore exercises something
the skill states as a rule that a capable model does **not** do by default in the
fixture as given. Before writing a case, ask: "if the agent never reads the skill,
what will it do here, and does the skill say something different?" If the answer is
"the same thing", the case does not belong.

The fixture may **declare** the practice (README, CLAUDE.md, a glossary) but must
**show** as little of it as possible. A fixture that already contains a port and an
adapter teaches ports and adapters; the skill is then not measured.

## Files

| File | Contents |
|---|---|
| `fixtures/<suite>-workspace/` | Small, real, green project: `package.json` (scripts `test`, `test:watch`, `typecheck`), `tsconfig.json` (strict), `pnpm-workspace.yaml` (copy the `tdd` one), `pnpm-lock.yaml` (committed; run `pnpm install` once), `.gitignore` with `node_modules/`, `README.md`, `CLAUDE.md` (one sentence declaring the practice), source and at least one passing test |
| `tests/<suite>-quality.yaml` | Cases. Each has `description`, `vars.request`, `vars.acceptance`, any case-specific `assert` entries, and a header comment saying what the fixture withholds and what each case exercises |
| `tests/<suite>/acceptance/*.test.ts` | Hidden acceptance tests. Copied into the workspace at grade time (see `quality-lib.runAcceptance`); import the agent's code through the names the request pins |
| `<suite>-assertions.js` | Graders on top of `quality-lib.js`. One export per rule; each returns `{ pass, score, reason }` with a reason a reader can act on |
| `promptfooconfig.<suite>.yaml` | Copy `promptfooconfig.tdd.yaml`; change the description, the forced skill name, the grader module and the default `assert` list |
| `COVERAGE.md` | Set the skill's status and batch |

`run-quality.sh`, `quality-hooks.js`, `quality-lib.js` and `report-quality.mjs` are
shared and need no change. Never edit them from a suite-authoring task.

## Cases

- Write requests the way a developer would. Use everyday words; do not name the
  practice, the skill, or the pattern. A request that says "add a port" measures
  nothing.
- Pin **only** what the hidden test must call: an entry point, a function name, a
  dependency key that already exists in the fixture. Never pin where a file lives,
  what an interface is called, or how something is modelled — that is what the
  graders grade.
- Two to four cases per skill. Each exercises a different rule. Prefer one request
  that tempts the wrong thing ("just do it in the mailer") over three that do not.
- Tier B skills (advisory, document-producing): the "workspace" is the artifact
  the skill produces. Graders check the artifact's structure deterministically where
  the skill mandates structure (sections, a decision recorded, evidence cited with
  `file:line`), and an `llm-rubric` assertion checks the promises that need judgement.
  Inline the rubric's source material so the grader can compare; run with
  `--repeat 3`.

## Graders

- Deterministic first. Read the tool-call trail (`lib.trail(context)`: ordered
  `name`, `path`, `command`) and the workspace (`lib.sourceFiles`, `lib.read`,
  `lib.importsOf`, `lib.run`).
- Find roles by **content**, not folder names, unless the fixture's README fixes the
  layout. `hex-assertions.js` shows the pattern: an SDK-importing file is outside,
  the file carrying the case's business text is the use case.
- Grade only what the agent did: use `lib.touchedBy(context)` when a rule should not
  apply to fixture code the agent never changed.
- Every grader is a rule the skill states. Quote the rule in the grader's comment.
- `behaviourDelivered`, `suiteGreen`, `typecheckClean` are shared; weight
  `behaviourDelivered` 2.

## Prove before you spend

Before the first agent run, write a reference implementation by hand in a scratch
copy of the fixture (outside the repository), set `SKILL_EVAL_WORKSPACE` to it, and
call every grader and every hidden test from node. Every grader must pass on the
reference; then break one rule on purpose and confirm its grader fails. Record the
commands and exit codes in the handoff. A suite that was never proven is `authored`,
not `proven`, in `COVERAGE.md`.

Then validate the config offline:

```bash
cd evals/skills && ./node_modules/.bin/promptfoo validate config -c promptfooconfig.<suite>.yaml
../../test/skill-evals-quality.sh
```

## Handoff

Report as data, not prose:

```json
{
  "suite": "…",
  "skill": "…",
  "files": ["…"],
  "cases": [{ "description": "…", "rule_exercised": "…", "why_no_skills_fails": "…" }],
  "graders": [{ "name": "…", "rule_quoted": "…" }],
  "proof": [{ "cmd": "…", "exit_code": 0 }],
  "undone": ["…"],
  "issues": ["…"]
}
```
