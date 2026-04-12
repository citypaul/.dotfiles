# Impeccable Integration Analysis

## Overview

Analysis of incorporating skills from [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (v2.1.1) into this dotfiles repository.

**Impeccable** is a frontend design vocabulary and quality system by Paul Bakaus. It provides 1 comprehensive design skill, 18 steering commands, and 12 reference files that guide AI coding tools toward distinctive, high-quality frontend interfaces. It explicitly builds on Anthropic's original `frontend-design` skill.

---

## License Compliance

| | This repo | Impeccable | web-quality-skills (existing precedent) |
|---|---|---|---|
| **License** | MIT | Apache 2.0 | MIT |
| **Copyright** | 2024 Paul Hammond | 2025-2026 Paul Bakaus | Addy Osmani |
| **NOTICE file** | No | Yes (required by Apache 2.0) | No |

### Apache 2.0 Requirements (Section 4)

Apache 2.0 is compatible with MIT, but has stricter attribution requirements than web-quality-skills:

1. **Must include** a copy of the Apache 2.0 license alongside incorporated files
2. **Must include** the NOTICE file contents (it reads: "Impeccable, Copyright 2025-2026 Paul Bakaus" and "The impeccable skill builds on Anthropic's original frontend-design skill, Apache 2.0, Copyright 2025 Anthropic, PBC")
3. **Modified files** must carry prominent notices stating they were changed
4. **Retain** all copyright, patent, trademark, and attribution notices from source

### What This Means in Practice

- Store the Apache 2.0 license as `.impeccable-LICENSE` alongside the files (same pattern as `.web-quality-skills-LICENSE`)
- Store the NOTICE contents (this is an additional requirement MIT doesn't have)
- If any skill content is modified, add a "Modified by Paul Hammond" notice
- Add Paul Bakaus to the Acknowledgments section of `install-claude.sh`
- Each incorporated skill file already has `license: Apache 2.0` in frontmatter

---

## Current vs Impeccable: Frontend Design Coverage

### Your existing `frontend-design` skill (43 lines)

- Design thinking (purpose, tone, constraints, differentiation)
- Typography basics (avoid generic fonts)
- Color & theme (CSS variables, dominant + accents)
- Motion (CSS-only, Motion library)
- Spatial composition (asymmetry, overlap, negative space)
- Backgrounds & visual details (gradients, textures, grain)
- Anti-AI-slop warnings (avoid Inter, purple gradients, etc.)

### Impeccable core skill (~22KB + 9 reference files)

Everything above, plus:
- **Font selection procedure** (systematic process for choosing typefaces)
- **OKLCH color model** (perceptually uniform color, tinted neutrals, dark mode)
- **Spacing systems** (8px grid, modular scales, optical adjustments)
- **Absolute bans** (side-stripe borders, gradient text - specific CSS patterns)
- **AI Slop Test** (structured checklist to detect generic AI aesthetics)
- **Context Gathering Protocol** (checks loaded instructions, `.impeccable.md`, teaches design system)
- **Three modes**: Craft (full build flow), Teach (learn design system), Extract (pull reusable tokens)
- **9 reference files**: typography, color-and-contrast, spatial-design, motion-design, interaction-design, responsive-design, ux-writing, craft flow, extract flow

**Assessment**: The impeccable core skill is a strict superset of `frontend-design`. It covers everything your current skill does plus substantially more, with deeper methodology and reference material.

---

## Impeccable Skills Inventory & Overlap Analysis

### Core Skill

| Skill | What it does | Overlaps with | Value-add |
|---|---|---|---|
| **impeccable** | Comprehensive design vocabulary + methodology | `frontend-design` (replaces entirely) | Massive upgrade: 22KB vs 43 lines, systematic methodology, reference library |

### Steering Commands (18 total)

| Command | What it does | Overlaps with | Recommendation |
|---|---|---|---|
| **shape** | UX planning before code (discovery interview, design brief) | Nothing | **Include** - fills a real gap |
| **critique** | Full UX review with Nielsen's heuristics scoring (0-40) | Nothing | **Include** - structured quality assessment |
| **audit** | Technical quality scoring (5 dimensions, 0-4 scale) | `web-quality-audit` partially | **Include** - complementary, more design-focused |
| **polish** | Final quality pass with comprehensive checklist | Nothing | **Include** - useful completion step |
| **harden** | Production hardening (i18n, text overflow, edge cases) | Nothing | **Include** - fills a real gap |
| **typeset** | Typography fixes (font selection, hierarchy, OpenType) | Nothing | **Include** - deep typography guidance |
| **colorize** | Strategic color using OKLCH model | Nothing | **Include** - specialized color guidance |
| **animate** | Purposeful animation and micro-interactions | Nothing | **Include** - animation-specific guidance |
| **layout** | Fix layout, spacing, visual rhythm | Nothing | **Include** - structural design guidance |
| **clarify** | UX copy, error messages, labels | Nothing | **Include** - UX writing guidance |
| **adapt** | Cross-device/platform adaptation | Nothing | **Include** - responsive design guidance |
| **bolder** | Amplify safe/boring designs | Nothing | **Consider** - nice to have |
| **quieter** | Tone down aggressive designs | Nothing | **Consider** - nice to have |
| **distill** | Strip to essence, simplify | Nothing | **Consider** - nice to have |
| **delight** | Add moments of joy, personality | Nothing | **Consider** - nice to have |
| **optimize** | Frontend performance optimization | `performance`, `core-web-vitals` | **Skip** - already covered by web-quality-skills |
| **overdrive** | Extraordinary effects (shaders, WebGL, spring physics) | Nothing | **Consider** - niche use case |

### Reference Files

| File | Associated skill | Content |
|---|---|---|
| typography.md | impeccable | OpenType features, web font loading, modular scales |
| color-and-contrast.md | impeccable | OKLCH, tinted neutrals, dark mode, accessibility |
| spatial-design.md | impeccable | Spacing systems, grids, container queries |
| motion-design.md | impeccable | Easing curves, staggering, reduced motion |
| interaction-design.md | impeccable | Forms, focus states, loading patterns |
| responsive-design.md | impeccable | Mobile-first, fluid design, container queries |
| ux-writing.md | impeccable | Button labels, error messages, empty states |
| craft.md | impeccable | The craft flow (shape -> build -> iterate) |
| extract.md | impeccable | Extract reusable components/tokens |
| cognitive-load.md | critique | Working memory rule, common violations |
| heuristics-scoring.md | critique | Nielsen's 10 heuristics with scoring rubric |
| personas.md | critique | 5 user archetypes for testing |

---

## Technical Considerations

### Template Placeholders

Impeccable source files use `{{model}}`, `{{config_file}}`, `{{command_prefix}}`, etc. that get resolved during their build process. Two approaches:

1. **Pull from `.claude/skills/`** (pre-built for Claude Code) - ready to use, no transformation needed
2. **Pull from `source/skills/`** and strip placeholders - more work, more control

**Recommendation**: Pull pre-built files from their `.claude/skills/` directory, same pattern as web-quality-skills.

### Skill Dependencies

Impeccable's steering commands expect the core `impeccable` skill to be loaded first (via Context Gathering Protocol). This works naturally with Claude Code's auto-discovery - when a user asks to "animate" or "polish", the `animate` or `polish` skill loads and internally references `/impeccable`.

### Your `frontend-design` Skill

**Decision needed**: Replace with impeccable, or keep both?

- **Replace**: Impeccable is a strict superset. Having both would be redundant and potentially conflicting.
- **Rename**: Could keep `frontend-design` as an alias/redirect to `impeccable` for backwards compatibility, but this adds complexity for no real benefit.

**Recommendation**: Replace `frontend-design` with `impeccable` and its reference files. Update CLAUDE.md to reference `impeccable` instead of `frontend-design`.

---

## Proposed Integration Approach

### Option A: Full External Integration (Recommended)

Follow the established `web-quality-skills` pattern:

1. **Don't store impeccable files in this repo** - fetch during install from `pbakaus/impeccable`
2. **Add `--no-impeccable` flag** to `install-claude.sh` for opt-out
3. **Store license + NOTICE** as `.impeccable-LICENSE` and `.impeccable-NOTICE`
4. **Replace** `frontend-design` with `impeccable` (remove `frontend-design/SKILL.md` from repo)
5. **Add** to acknowledgments in install script

**Pros**: Clean separation, automatic upstream updates, minimal repo bloat
**Cons**: Install depends on another repo being available, no control over upstream changes

### Option B: Vendored Integration

Copy impeccable files into this repo under `claude/.claude/skills/impeccable/`:

1. **Store all files in this repo** with clear attribution headers
2. **Add Apache 2.0 license** file for the vendored content
3. **Remove** `frontend-design` skill

**Pros**: Full control, works offline, can modify content
**Cons**: Must manually sync upstream changes, Apache 2.0 modification notices required for any edits

### Option C: Hybrid (Core External, Cherry-Pick Vendored)

Fetch the core `impeccable` skill + reference files externally, but vendor only the most valuable steering commands.

**Not recommended**: Splits the source of truth unnecessarily.

---

## Recommended Skill Selection

### Must Include (fills clear gaps)

1. `impeccable` (core) - replaces `frontend-design`
2. `shape` - UX planning before code
3. `critique` (+ 3 reference files) - structured UX review
4. `audit` - technical quality scoring
5. `polish` - final quality pass
6. `harden` - production hardening
7. `typeset` - typography fixes
8. `colorize` - strategic color
9. `animate` - purposeful animation
10. `layout` - spacing and rhythm
11. `clarify` - UX copy
12. `adapt` - cross-device adaptation

### Nice to Have (include if keeping selection broad)

13. `bolder` - amplify designs
14. `quieter` - tone down designs
15. `distill` - simplify
16. `delight` - personality and joy

### Skip

- `optimize` - already covered by `performance` and `core-web-vitals` from web-quality-skills
- `overdrive` - very niche (shaders, WebGL)

---

## Changes Required (Option A)

### `install-claude.sh`

1. Add `IMPECCABLE_URL` variable pointing to `pbakaus/impeccable` raw content
2. Add `INSTALL_IMPECCABLE=true` default and `--no-impeccable` flag
3. Remove `frontend-design/SKILL.md` from the `skills` array
4. Add impeccable skills section (similar to web-quality-skills section)
5. Add directory creation for `impeccable/reference/` and `critique/reference/`
6. Download Apache 2.0 license as `.impeccable-LICENSE`
7. Download NOTICE as `.impeccable-NOTICE`
8. Add Paul Bakaus to Acknowledgments section

### `claude/.claude/CLAUDE.md`

1. Change `frontend-design` reference to `impeccable`
2. Add brief mention of steering commands

### `README.md`

1. Add impeccable skills to the skills table
2. Add to acknowledgments
3. Update skill count

### Files to Remove

1. `claude/.claude/skills/frontend-design/SKILL.md` - replaced by impeccable

### Files NOT Changed (Fetched Externally)

All impeccable skill files would be fetched during install, not stored in this repo.

---

## Attribution Template

### In `install-claude.sh` Acknowledgments

```
  * Paul Bakaus - Impeccable frontend design skills (impeccable, shape, critique,
    audit, polish, harden, typeset, colorize, animate, layout, clarify, adapt,
    bolder, quieter, distill, delight)
    https://github.com/pbakaus/impeccable (Apache 2.0 License)
```

### License Files to Store

```
~/.claude/skills/.impeccable-LICENSE    # Apache 2.0 full text
~/.claude/skills/.impeccable-NOTICE     # NOTICE file contents
```

---

## Decisions Made

1. **Option A (external fetch)** - chosen for consistency with web-quality-skills pattern.
2. **All 17 steering commands included** - user chose to include everything.
3. **Replace `frontend-design`** - impeccable is a strict superset. Deep comparison confirmed no unique value in the original skill.
4. **Pull from `.claude/skills/` (pre-built)** - avoids dealing with template placeholders.

## Implementation

Implemented in branch `feat/impeccable-integration`. Changes:
- Removed `claude/.claude/skills/frontend-design/` (SKILL.md + LICENSE.txt)
- Updated `claude/.claude/CLAUDE.md` to reference `impeccable` instead of `frontend-design`
- Updated `install-claude.sh` with impeccable external fetch section, `--no-impeccable` flag, blurb text, and attribution
- Updated `README.md` with impeccable workflow documentation, updated skills table, install options, and acknowledgments
