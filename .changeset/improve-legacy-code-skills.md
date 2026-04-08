---
"@paulhammond/dotfiles": patch
---

fix: improve characterisation-tests and finding-seams skills

characterisation-tests:
- Add async characterisation guidance with worked examples (SKILL.md + writing-process.md)
- Mention "golden master testing" as alternative name for discoverability
- Replace beforeEach/afterEach fake timers with withFrozenTime helper in modern-tooling.md
- Replace jest-extended-snapshot example with pure Vitest it.each + inline snapshot approach
- Add "not awaiting async results" to common mistakes table

finding-seams:
- Add inline worked example to main SKILL.md so it's useful without loading resources
- Add code smell → technique quick-lookup table
- Fix duplicate `const calculateOrder` variable name in seam-types.md
- Add async seam patterns (seam-types.md + creating-seams.md Technique 6)
- Add seam granularity guidance (when to create a seam vs when not to)
