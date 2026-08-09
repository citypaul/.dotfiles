# Source Notes

## Upstream source

- Project: [Addy Osmani's `agent-skills`](https://github.com/addyosmani/agent-skills)
- Adapted skill: `skills/api-and-interface-design/SKILL.md`
- License: MIT, copyright (c) 2025 Addy Osmani

## Revision record

Local commit `05483d71b5d93ce1acc0287e07320b21a6d120b3` records that `api-design` was adapted from `addyosmani/agent-skills` and describes local convention changes and extensions. Neither that commit nor other repository metadata records the upstream commit used for the original import. The original upstream import revision is therefore unknown.

For a reproducible provenance audit, upstream `main` was inspected at commit [`7676817c12a1317454ae3898a0c5c1eacf5dd3d5`](https://github.com/addyosmani/agent-skills/tree/7676817c12a1317454ae3898a0c5c1eacf5dd3d5) on 2026-08-08:

- [Pinned source file](https://github.com/addyosmani/agent-skills/blob/7676817c12a1317454ae3898a0c5c1eacf5dd3d5/skills/api-and-interface-design/SKILL.md)
- [Pinned upstream MIT license](https://github.com/addyosmani/agent-skills/blob/7676817c12a1317454ae3898a0c5c1eacf5dd3d5/LICENSE)

This SHA is an audit baseline for immutable links and comparison. It is not claimed to be the unknown original import revision.

## Retained and adapted ideas

The local skill retains the upstream foundation: Hyrum's Law, the One-Version Rule, contract-first design, consistent errors and validation, additive evolution, predictable naming, REST resource conventions, pagination and filtering, input/output separation, rationalization checks, red flags, and verification.

## Local departures

- Renamed the skill to `api-design` and narrowed its trigger to externally consumed, versioned, HTTP, and cross-team contracts; in-process module depth routes to `codebase-design`.
- Recast TypeScript examples around local `type` and `readonly` conventions and routed detailed type design to `typescript-strict`.
- Split protocol detail into on-demand resources and added local guidance for RFC 9457 Problem Details, HTTP semantics and caching, idempotency, rate limiting, compatibility and deprecation, OWASP API security, JWT BCP controls, and OAuth/OIDC routing.
- Added cross-skill routing for BFF boundaries, observability, testing, solution evaluation, and the dedicated OAuth/OIDC workflow.
- Corrected and expanded examples as standards and local review evidence required. The local resource material is not represented as a verbatim upstream import.
