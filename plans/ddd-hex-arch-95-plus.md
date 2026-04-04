# Plan: DDD + Hex Arch Skills to 95+

## Current Score: 80/100

## The 5 high-impact changes

### 1. Full stack worked example (+5-8 points) — THE biggest single improvement
**Gap:** No resource shows how everything fits together end-to-end.
**Fix:** New `hex-arch/resources/worked-example.md` showing one feature traced through every layer:
- Glossary entry → domain types (value object, entity, branded ID)
- Domain function (business rule, pure)
- Use case function (orchestration, takes ports)
- Driving adapter (route handler — thin glue)
- Driven adapter (repository implementation)
- Fake for testing
- Use case test (primary) + domain unit test (complement)
- File locations for everything
**Cross-reference from DDD SKILL.md**

### 2. Error modeling guidance (+2-3 points)
**Gap:** `PledgeResult` appears in examples but there's no general guidance on when to use discriminated union results vs exceptions.
**Fix:** New `ddd/resources/error-modeling.md` covering:
- Discriminated union results for expected business outcomes (the default)
- Exceptions for truly unexpected errors / programmer mistakes
- How errors propagate through layers (domain → use case → adapter → HTTP)
- Brief section pointer in DDD SKILL.md

### 3. Cross-cutting concerns (+2-3 points)
**Gap:** Where do logging, auth, transactions, error formatting live?
**Fix:** New `hex-arch/resources/cross-cutting-concerns.md` covering:
- Auth: driving adapter layer (middleware), passed as context
- Logging: adapter layer, never in domain
- Transactions: adapter concern, use case is unaware
- Error formatting: driving adapter translates domain results to HTTP
- Brief section pointer in hex arch SKILL.md

### 4. Hex arch anti-patterns with code examples (+1-2 points)
**Gap:** 4 of 5 anti-patterns are text-only descriptions.
**Fix:** Add brief code examples to Business Logic in Adapters, Bypass Adapters, and Technology-Shaped Ports.

### 5. Targeted main skill improvements (+2-3 points)
- **Where use cases live** — clarify physical location in hex arch file organization table
- **Repository method conventions** — brief naming guidance in DDD
- **Aggregate rules** — promote 1-2 key points from resource to main skill

## Estimated final score: 93-99

## Execution order
1. Worked example (largest, most impactful — do first)
2. Error modeling resource
3. Cross-cutting concerns resource
4. Anti-patterns code examples
5. Targeted improvements
6. Update REFERENCES.md + changeset
