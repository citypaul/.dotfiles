# Writing-skill routing — 21 September 2026

Result: **27/27 passed**, zero failures or execution errors, in 3m 58s.
Model: `gpt-5.6-sol`, low reasoning effort; promptfoo 0.122.2.
Nine requests, each repeated three times. All original required/forbidden skill
assertions are retained; missing drafts are now supplied and responses are
requested in chat because the evaluation workspace is read-only.

The unchanged skills under evaluation were:
- Clarity: `9e3071196d5d26f26c58f5d7c995890b35a94499`
- Simple English: `080a862b2e80d5fe19a2fbddd3de76f7d580279e`
- Technical Writing: this branch's existing skill, unchanged during this evaluation.

The earlier 25/27 was not a reliable measure of two routing defects. One case
asked for an essay without supplying it. The other read both skill files through
a tool call the detector missed. During recovery, macOS `/var` versus
`/private/var` paths also caused false negatives, and one run read a global skill.
The runner now canonicalises paths and disables user-level skills. It retains
Codex's bundled system skills. No user settings or upstream skill text were changed.

Run `./evals/skills/run-writing.sh` to repeat. Raw results are written to the
ignored `evals/skills/results/writing/latest.json`. This checks skill selection,
including forbidden activations, not prose quality or guaranteed future reliability.
The corrected suite is not a like-for-like comparison with the historical score.
