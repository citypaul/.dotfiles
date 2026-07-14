# Improve Codebase Architecture Source Notes

This skill is an attributed adaptation, not a verbatim copy. These notes preserve the source material and document the local changes.

## Upstream Source

- Author: Matt Pocock
- Repository: <https://github.com/mattpocock/skills>
- Pinned revision reviewed: [`66898f60e8c744e269f8ce06c2b2b99ce7660d5f`](https://github.com/mattpocock/skills/tree/66898f60e8c744e269f8ce06c2b2b99ce7660d5f)
- Files:
  - [`skills/engineering/improve-codebase-architecture/SKILL.md`](https://github.com/mattpocock/skills/blob/66898f60e8c744e269f8ce06c2b2b99ce7660d5f/skills/engineering/improve-codebase-architecture/SKILL.md)
  - [`agents/openai.yaml`](https://github.com/mattpocock/skills/blob/66898f60e8c744e269f8ce06c2b2b99ce7660d5f/skills/engineering/improve-codebase-architecture/agents/openai.yaml) (adapted agent metadata)
  - [`HTML-REPORT.md`](https://github.com/mattpocock/skills/blob/66898f60e8c744e269f8ce06c2b2b99ce7660d5f/skills/engineering/improve-codebase-architecture/HTML-REPORT.md)
- License: MIT, Copyright (c) 2026 Matt Pocock. The complete notice is preserved in [`../LICENSE`](../LICENSE).

The upstream skill's deep-module vocabulary is now supplied by its sibling `codebase-design` skill. That sibling's source notes separately credit John Ousterhout and Michael Feathers.

## Retained and Adapted

- Scope before scanning, with recent change pressure used to focus an otherwise broad review.
- Organic exploration for shallow modules, fragmented locality, leaked knowledge, and hard-to-test contracts.
- Evidence-backed candidates rather than an immediate code rewrite.
- A timestamped HTML artifact outside the repository by default.
- Visual candidate cards with files, problem, direction, benefits, before/after diagrams, recommendation strength, and a top recommendation.
- Explicit ADR conflicts and a stop before exact interface design.
- A subsequent design conversation and Design It Twice flow for the selected candidate.

## Local Adaptations

- Treat HTML as a first-class output while making it genuinely self-contained: inline CSS and static SVG instead of mandatory Tailwind and Mermaid CDNs.
- Add escaping, Content Security Policy, accessibility, responsive, print, and offline requirements; remove Mermaid `securityLevel: "loose"`.
- Keep automatic browser opening conditional on environment capability and authority.
- Replace the mandatory `Agent` tool and fixed sub-agent count with provider-neutral parallel exploration when useful.
- Change the upstream explicit-only invocation to locally auto-discoverable model invocation because this skill is the evidence-gathering entry point to the audit → selection → design flow; its narrowed repository/multi-module trigger prevents a single named module request from starting the audit workflow.
- Use several hotspot signals—co-change, defects, tests, runtime risk, ownership, dependency direction, and planned work—rather than raw churn alone.
- Include counterevidence, confidence, risks, fidelity gaps, and why-now evidence so visuals do not overstate certainty.
- Search for splits, seam movement, dependency repair, and locality restoration as well as deepening.
- Protect intentionally thin routes, commands, adapters, generated clients, and composition roots.
- Use the project's actual instruction, ADR, and glossary conventions instead of hard-coded `CONTEXT.md` and `docs/adr/` paths.
- Route domain terminology changes through `ubiquitous-language` instead of editing a glossary silently.
- Keep `structure-codebase` authoritative for physical placement and enforcement, and `codebase-design` authoritative for a selected logical contract.
- Route implementation through the existing TDD, mutation, legacy-code, refactoring, API, DDD, and hexagonal skills rather than embedding competing workflows.
