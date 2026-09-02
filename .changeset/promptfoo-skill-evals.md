---
"@citypaul/dotfiles": minor
---

Evaluate skill routing with promptfoo, and fix the two descriptions it caught

Fifty skills with deliberately overlapping remits only work if each `description:`
wins the requests it should and stays quiet on the rest. Until now that was checked
by reading the descriptions and guessing. `evals/skills/` is a
[promptfoo](https://github.com/promptfoo/promptfoo) suite that measures it: it runs
the real Claude Code agent (the `anthropic:claude-agent-sdk` provider) inside a small
fixture project with this bundle mounted at `.claude/skills`, sends it 48 realistic
developer requests that never name a skill, and asserts on the `Skill` tool calls —
`skill-used` for the owner, `not-skill-used` for the neighbour most likely to steal
the request, and "no skill at all" for two trivial asks.

```bash
cd evals/skills && pnpm install && ./run.sh     # ~10 minutes, your Claude Code login
```

`run.sh` builds a throwaway workspace in a temp directory (fixture + a symlink to the
live skills) so nothing inside the repository gains a nested `.claude/skills`, and
prints a per-case report of what loaded versus what was expected. The suite spends
tokens and samples a non-deterministic decision, so it is not part of `npm test`;
`test/skill-evals-routing.sh` is the offline guard that keeps every case pointing at
a real skill.

**What the first run found.** 36 of 48 cases passed outright; every one of the
"for X use Y" hand-offs between adjacent skills held. Nine cases only failed because
the harness capped the agent at eight turns before it had finished reading (fixed:
cap raised to 30, all nine pass 3/3), and two failed because the fixture was missing
files the request referred to (fixed: they pass 3/3). Two were real:

- **`expectations` fired one time in three** on "I just discovered X — where should
  that be recorded so we don't lose it?". Its description spoke in abstractions
  ("documenting a discovery, recording a decision"); the agent answered from general
  knowledge instead. The description now names what people actually say — just
  discovered/learned/found out, where should this go or be written down, keep it for
  the next person or the next agent session, does it belong in CLAUDE.md / README /
  ADR / tests / a skill — and hands prose off to `technical-writing`.
- **`technical-writing` fired two times in three** on "rewrite README.md so a new
  developer can get productive in ten minutes". The description now says to load it
  *before* drafting, rewriting, or restructuring a document and names README rewrites
  explicitly, and gains the reverse hand-off to `expectations` for "where should this
  be recorded".

Both re-run at 5/5 after the edits. The README documents how to read a failure, add
a case, compare two versions of one skill side by side, and extend the suite to grade
answer quality rather than only routing.
