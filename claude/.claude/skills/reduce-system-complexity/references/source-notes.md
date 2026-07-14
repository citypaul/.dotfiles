# Reduce System Complexity Source Notes

This skill is an attributed adaptation, not a verbatim copy. These notes preserve the exact upstream source and explain the local decisions that differ from it.

## Upstream source

- Author: Adam Bulmer (`mintuz`)
- Repository: <https://github.com/mintuz/skills>
- Pinned revision reviewed: [`d698a88fc1e4d054a25e5919f15658f673f602cb`](https://github.com/mintuz/skills/tree/d698a88fc1e4d054a25e5919f15658f673f602cb)
- Original bundle: [`plugins/core/skills/reducer/`](https://github.com/mintuz/skills/tree/d698a88fc1e4d054a25e5919f15658f673f602cb/plugins/core/skills/reducer)
- Exact source files:
  - [`SKILL.md`](https://github.com/mintuz/skills/blob/d698a88fc1e4d054a25e5919f15658f673f602cb/plugins/core/skills/reducer/SKILL.md)
  - [`agents/openai.yaml`](https://github.com/mintuz/skills/blob/d698a88fc1e4d054a25e5919f15658f673f602cb/plugins/core/skills/reducer/agents/openai.yaml)
- Introduction commit: [`1a433a5170560df40b0b9493a9cdb389958d0777`](https://github.com/mintuz/skills/commit/1a433a5170560df40b0b9493a9cdb389958d0777)
- License: [MIT](https://github.com/mintuz/skills/blob/d698a88fc1e4d054a25e5919f15658f673f602cb/LICENSE), Copyright (c) 2025 Adam Bulmer. The complete notice is preserved in [`../LICENSE`](../LICENSE).

The upstream `SKILL.md` links no additional documents. Its companion OpenAI metadata and repository license were inspected directly.

## Retained concepts

- “Conserve behavior. Minimize mechanism.”
- A behavior and non-functional guarantee ledger with explicit evidence gaps.
- Whole-path accounting across control, state/time, structure, variability, and operations.
- Deriving a plausible minimum from outcomes and external constraints rather than copying the current decomposition.
- Prefer deletion, unification, state/decision-space reduction, hop removal, and then stable primitives.
- Separate behavior and mechanism gates.
- Same-scope before/after evidence and a prohibition on exporting complexity to callers or operations.
- Diagnosis must not claim realized reduction or equivalence.

## Local adaptations

- Renamed `reducer` to `reduce-system-complexity` to avoid collisions with Redux and functional reducer terminology.
- Narrowed activation to a selected behavior path or subsystem; architecture candidate discovery remains in `improve-codebase-architecture` and routine cleanup remains in `refactoring`.
- Classified supported behavior so documented contracts, downstream reliance, intended behavior, bugs, and obsolete internals are not treated as morally equivalent.
- Replaced “proof” language with calibrated preservation evidence, confidence, and fidelity gaps.
- Replaced the numeric-looking ranking formula with qualitative, ordered dimensions.
- Kept objective observations within like-for-like dimensions instead of aggregating incomparable mechanism counts.
- Added mutation-strength, provider-fidelity, privacy, external-effect, dirty-worktree, and implementation-authority safeguards.
- Integrated true behavior-preserving work with the REFACTOR path instead of manufacturing a failing structural test.
- Allowed safe expand/contract migrations to increase transition mechanism temporarily, while requiring owners and removal conditions and withholding the reduction claim until the terminal state.
- Added guarded forward recovery for changes that cannot be safely reversed.
- Routed consequential stable-primitive choices through the local `evaluate-existing-solutions` workflow.

These changes preserve the upstream conservation protocol while fitting the local skill system's architecture, testing, planning, and safety boundaries.
