---
"@paulhammond/dotfiles": minor
---

feat: add api-design skill for stable API and interface design

Adapted from addyosmani/agent-skills, modified to align with existing skill conventions:
- Uses `type` with `readonly` instead of `interface` for data structures
- Defers TypeScript patterns (branded types, discriminated unions) to typescript-strict skill
- Cross-references typescript-strict for schema-first validation at boundaries

New content not covered by existing skills:
- Hyrum's Law and observable behavior as contract
- The One-Version Rule
- Contract-first development
- Consistent error semantics with unified error format and HTTP status mapping
- REST conventions (resource naming, PATCH vs PUT, pagination, filtering)
- Backward compatibility guidance (additive-only changes)
- API-specific red flags, rationalizations, and verification checklist
