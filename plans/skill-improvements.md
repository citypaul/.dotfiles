# Plan: Architectural Skill Improvements

**Status:** Ideas gathered, not yet prioritised
**Context:** Identified during PR 2.7/2.7.1 on micro-saas + research against authoritative sources

## Background

During the Slice 2.7 work on micro-saas, we hit several issues that revealed gaps in our DDD and hexagonal architecture skills:
- Presentation logic (`formatEventDate`) placed in `domain/` — caught by DDD glossary review
- Functions extracted purely for testability (`prepareParticipantData`) — caught by testing philosophy discussion
- Per-layer testing treated as primary strategy — challenged by Valentina Cupac's use-case-primary approach
- Hex arch boundaries violated (`loadParticipantViewData` in domain importing Drizzle)

PR #97 in dotfiles addresses the core gaps (DDD decision framework, domain services, hex arch driving/driven distinction, CQRS-lite, use-case-primary testing, REFERENCES.md). This plan captures ideas that emerged but weren't included.

## Idea 1: Test Architecture / Test DSLs

**Source:** Valentina Cupac (Jemuovic) — "The Architecture Behind Acceptance Tests That Don't Break"

**The problem:** Production code has clean architecture (domain, ports, adapters) but tests are often unstructured — repeated setup, business intent mixed with mechanical details, copy-pasted patterns.

**The idea:** Tests should have architecture too. Cupac proposes 4 layers:
1. **Test layer** — the business scenario ("participant claims a gift and sees it in Your Claims")
2. **DSL layer** — fluent API expressing the scenario (`asParticipant(USER).visitEvent(EVENT).claimGift(GIFT).expectClaimVisible()`)
3. **Driver port** — abstract interface for interacting with the system
4. **Driver adapter** — concrete implementation (API calls, Playwright page interactions)

**Why we might want this:**
- Our integration tests have repeated patterns: `apiSignupAndOnboard(page, USER); await page.goto(URL); await expect(page.getByRole(...)).toBeVisible()`. A DSL would make the business intent clearer.
- The same business scenario could run against both the API (fast, use case level) and the UI (slow, Playwright) — proving behavior is channel-independent.
- When the UI changes (component rename, layout shift), only the driver adapter changes. The business scenario stays the same.

**Why we might not:**
- Significant upfront investment in test infrastructure before it pays off
- For a small team / solo project, the indirection may not be worth it
- We'd need to build the DSL, driver ports, and at least two driver adapters
- Risk of over-engineering tests themselves

**Where it would go:** New `testing` skill resource: `resources/test-architecture.md`. NOT Gherkin — code-based DSLs with compile-time safety.

**Effort:** Medium-high. Skill documentation is straightforward but the real value comes from applying it to a real project.

---

## Idea 2: Zero Business Logic in Use Cases

**Source:** Valentina Cupac — "DDD + Clean Architecture: Stop Putting Business Logic in the Application Layer"

**The problem:** Use cases (application services) accumulate business logic over time. What starts as "load, delegate, save" grows `if` statements that make business decisions. The domain stays anemic.

**The idea:** Strengthen the rule: use cases contain ZERO business logic. They orchestrate only — load aggregates, call domain functions/services, save results. Any `if` that makes a business decision should be a domain function.

**Concrete example from our codebase:** `instantClaim` in micro-saas checks for existing lead claims (`hasLeadClaim`). This was correctly extracted as a domain function. But the use case still has orchestration logic that could be confused with business logic. The line between "orchestration `if`" (load returned null → not found) and "business `if`" (lead claim exists → reject) needs to be clearer.

**Why we might want this:**
- Prevents domain logic leaking into use cases over time
- Makes domain logic testable through pure functions rather than requiring faked repos
- Aligns with Cupac's strong stance and Evans' original guidance
- Our DDD skill already says "use cases orchestrate, not decide" — this strengthens it with specific guidance on where the line is

**Why we might not:**
- The current guidance is probably sufficient for experienced developers
- Being too strict about this can lead to extracting trivial one-line checks into domain functions unnecessarily

**Where it would go:** Strengthen the existing "Domain Services" section in the DDD skill. Add a "Where's the line?" subsection with examples of orchestration-if vs business-if.

**Effort:** Low. Mostly clarifying existing guidance with better examples.

---

## Idea 3: Contract Testing for External APIs

**Source:** Cupac's eShop architecture (WireMock contract tests), Pact contract testing community

**The problem:** Our adapter tests use MSW to stub external APIs (Stripe, Authentik). This verifies our adapter works against a stubbed API — but doesn't verify the stub matches the real API. If Stripe changes their response format, our MSW stubs still pass but production breaks.

**The idea:** Contract tests verify that our stubs match the real API's behavior. Two approaches:
1. **Consumer-driven contracts (Pact):** Our adapter generates a contract describing what it expects. The provider verifies it.
2. **Provider-driven contracts (WireMock + recording):** Record real API responses, use them as stubs. Periodically re-record to catch drift.

**Why we might want this:**
- Real gap — our Stripe adapter tests pass even if Stripe changes their API
- Cupac's eShop architecture uses this pattern for external system boundaries
- Particularly valuable for the Authentik integration (OIDC flows are complex)

**Why we might not:**
- Adds complexity to the test infrastructure
- For well-documented APIs (Stripe), breaking changes are rare and announced
- Recording real API responses requires credentials and network access in CI
- Might be over-engineering for a small project

**Where it would go:** New hex arch skill resource: `resources/contract-testing.md`. Reference from the "Driven Adapters" testing section.

**Effort:** Medium for documentation. High for actual implementation in a project.

---

## Decision Criteria

For each idea, evaluate:
1. **Does it prevent bugs we've actually shipped?** (not theoretical bugs)
2. **Does it make the daily development workflow better?** (not just architecturally pure)
3. **Is the effort proportional to the value?** (for a solo/small team project)
4. **Can it be adopted incrementally?** (not all-or-nothing)

## Next Steps

- Review this plan after PR #97 is merged and applied to micro-saas
- Evaluate each idea against real pain points encountered in subsequent work
- Implement the low-effort, high-value ideas first (Idea 2)
- Revisit higher-effort ideas (1, 3) when the project grows or the pain becomes real
