---
"@paulhammond/dotfiles": patch
---

Final polish for legacy code skills based on second review round

**characterisation-tests:**
- Add explicit "When NOT to Use" section (greenfield code, existing specs, adequate
  test coverage, permanent strategy)
- Add "Naming and Identification" section: `characterises` prefix in test names,
  `.characterisation.test.ts` file suffix, block comment explaining purpose and
  lifecycle, SUSPICIOUS markers for potential bugs. Another LLM or human should
  immediately recognise these as temporary characterisation tests.
- Update worked example to follow naming conventions
- Fix External Service Responses guidance in modern-tooling.md to recommend
  parameter injection first (consistent with finding-seams "last resort" messaging)

**finding-seams:**
- Fix sensing example in seam-types.md: remove type assertion, return defensive
  copy from closure
- Fix inMemoryStorage in creating-seams.md: return defensive copy, simplify
  verbose return type annotation
