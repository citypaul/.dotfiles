---
"@paulhammond/dotfiles": minor
---

Restructure DDD and hexagonal architecture skills with decision frameworks, resources, and references

**DDD skill restructure** based on gap analysis against Evans, Vernon, Fowler, Stemmler, Microsoft:
- "Where Does This Code Belong?" decision framework (purity is necessary but not sufficient)
- Domain services (business logic spanning aggregates) with comparison table vs use cases
- Always-valid entities principle
- Per-layer testing strategy
- Resources: `domain-services.md`, `testing-by-layer.md`, `aggregate-design.md`

**Hex arch skill restructure** based on Cockburn, Pierrain, Graca, Netflix, Seemann:
- Driving (left) vs driven (right) adapter distinction with visual diagram
- CQRS-lite (reads bypass repositories, query functions JOIN freely)
- Composition root / thin delivery layer pattern
- Per-layer testing strategy with swappability test
- Anti-patterns (domain depending on infrastructure, business logic in adapters, port proliferation)
- Resources: `cqrs-lite.md`, `testing-hex-arch.md`

**New: REFERENCES.md** — authoritative sources with specific attributions documenting what was taken from each source and where it appears in our skills.
