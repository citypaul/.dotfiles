---
"@paulhammond/dotfiles": patch
---

Align finding-seams and characterisation-tests skills with FP-first principles

Both skills were too class-heavy, reading like they were written for an OOP/Java audience
rather than for a TypeScript FP workflow. This brings them in line with the functional skill's
conventions.

**finding-seams:**
- Reorder to lead with function parameter injection as the primary seam technique
- Move class-based patterns (object seams, extract and override, parameterize constructor) to
  a separate `resources/oop-patterns.md` with clear "legacy OOP" framing
- Add React/Next.js seam examples (props as seams, context as seams, MSW for API boundaries)
- Add connection to hexagonal architecture (ports = designed-in seams)
- Strengthen `vi.mock()` warning as last-resort scaffolding
- Replace over-engineered class examples with simple default parameters

**characterisation-tests:**
- Add "when to stop" heuristic (cover every branch your change touches + one layer out)
- Add mutation testing validation step after characterising
- Replace monkey-patching sensing with parameter injection
- Add anti-pattern for `vi.mock()` sensing in common mistakes table
