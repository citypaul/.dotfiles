---
"@paulhammond/dotfiles": minor
---

feat: integrate impeccable design skills from pbakaus/impeccable

Replace the `frontend-design` skill with the comprehensive impeccable design system by Paul Bakaus. This adds 18 externally-fetched design skills (1 core + 17 steering commands) with a systematic methodology for creating distinctive, high-quality frontend interfaces.

**What changed:**
- Removed `frontend-design` skill (replaced by impeccable, which is a strict superset)
- Added external fetch of 18 impeccable skills from [pbakaus/impeccable](https://github.com/pbakaus/impeccable):
  - Core: `impeccable` (with 9 reference files for typography, color, spatial design, motion, interaction, responsive, UX writing, craft flow, extract flow)
  - Steering commands: `shape`, `critique`, `audit`, `polish`, `harden`, `typeset`, `colorize`, `animate`, `layout`, `clarify`, `adapt`, `bolder`, `quieter`, `distill`, `delight`, `optimize`, `overdrive`
  - Critique reference files: cognitive-load, heuristics-scoring, personas
- Added `--no-impeccable` install flag (and `--no-external` now skips both web-quality-skills and impeccable)
- Added impeccable workflow documentation to README
- Apache 2.0 license and NOTICE files stored alongside skills for attribution compliance

**Getting started:**
- `/impeccable teach` - Set up design context for your project
- `/impeccable craft [feature]` - Full shape-build-iterate design flow
- `/critique` - UX review with Nielsen's heuristics scoring
- `/polish` - Final quality pass

Attribution: [Paul Bakaus](https://github.com/pbakaus/impeccable) (Apache 2.0 License)
