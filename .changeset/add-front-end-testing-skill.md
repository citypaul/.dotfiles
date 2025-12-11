---
"@paulhammond/dotfiles": minor
---

# Add front-end-testing Skill for React Testing Library Patterns

**Context**: The existing `testing` skill covers general testing patterns (factories, public API, coverage theater) and `tdd` skill covers the RED-GREEN-REFACTOR workflow. However, there was no dedicated guidance for React Testing Library-specific patterns and best practices.

This minor release adds the new `front-end-testing` skill to fill that gap.

## New Skill: front-end-testing (~500 lines)

**React Testing Library patterns for behavior-driven UI testing**

### Key Sections

**1. Core Philosophy (40 lines)**
- Test behavior users see, not implementation details
- False negatives (tests break on refactor) vs false positives (bugs pass)
- Kent C. Dodds principle: "Test how software is used"

**2. Query Selection Priority (80 lines)** ⭐ **MOST CRITICAL**
- Accessibility-first query hierarchy (getByRole → getByLabelText → ... → getByTestId)
- Query variants: getBy* (throws), queryBy* (null), findBy* (async)
- Common mistakes with correct alternatives

**3. User Event Simulation (60 lines)**
- userEvent vs fireEvent (why userEvent is superior)
- userEvent.setup() pattern (2025 best practice)
- Common interactions: click, type, keyboard, select

**4. Async Testing Patterns (70 lines)**
- findBy queries for async elements
- waitFor utility for complex conditions
- waitForElementToBeRemoved for disappearance
- Common patterns: loading states, API responses, debounced inputs

**5. Testing Hooks and Context (50 lines)**
- renderHook API (built into RTL since v13)
- wrapper option for context providers
- act() warnings and when manual act() is needed (rare)

**6. MSW Integration (40 lines)**
- Why MSW (network-level interception)
- setupServer pattern for test setup
- Per-test overrides with server.use()

**7. Accessibility-First Testing (40 lines)**
- Why accessible queries improve both tests AND app quality
- When to add ARIA (custom components only)
- Semantic HTML priority over ARIA

**8. React Testing Anti-Patterns (70 lines)** ⭐ **HIGH VALUE**
15 common mistakes with ❌ WRONG and ✅ CORRECT examples:
1. Not using `screen` object
2. Using `querySelector`
3. Testing implementation details
4. Not using jest-dom matchers
5. Manual cleanup() calls
6. Wrong assertion methods
7. Unnecessary act() wrapping
8. beforeEach render pattern
9. Multiple assertions in waitFor
10. Side effects in waitFor
11. Exact string matching
12. Wrong query variants
13. Wrapping findBy in waitFor
14. Using testId when role available
15. Not installing ESLint plugins

**9. Component Testing Patterns (40 lines)**
- Testing form submissions
- Testing controlled inputs
- Testing conditional rendering
- Testing error/loading states
- References `testing` skill for factory patterns

**10. Summary Checklist (20 lines)**
Quick reference for test review with cross-references to `tdd` and `testing` skills

### Separation of Concerns

**This skill DOES cover:**
- React Testing Library query APIs
- userEvent vs fireEvent
- renderHook patterns
- MSW integration for React tests
- React-specific anti-patterns (screen, jest-dom, act)
- Async patterns (findBy, waitFor)
- Accessibility-first querying

**This skill does NOT cover:**
- General test factories (testing skill)
- RED-GREEN-REFACTOR workflow (tdd skill)
- General beforeEach anti-pattern (testing skill)
- Type safety patterns (typescript-strict skill)

### Cross-References

**Opening paragraph** references:
- `tdd` skill for RED-GREEN-REFACTOR workflow
- `testing` skill for general testing patterns

**Component patterns section** references:
- `testing` skill for factory patterns

**Summary checklist** references:
- `tdd` skill for TDD workflow
- `testing` skill for test factories

## Files Modified

### New Files
- `claude/.claude/skills/front-end-testing/SKILL.md` (~500 lines)

### Updated Files
- `README.md`: Updated skill count (7 → 8), added front-end-testing to Key Sections table and Quick Navigation table
- `install-claude.sh`: Added front-end-testing to directory creation, skills array, and install summary

## Key Principles from Sources

### From fullstack-react-tdd-example (https://github.com/citypaul/fullstack-react-tdd-example)
- "Testing against behavior rather than implementation details provides more value"
- "The purpose of good tests is to give us the confidence to make changes over time"
- User-perspective testing with accessible selectors
- MSW for consistent mocking across tests and development

### From Testing Library Philosophy
- "The more your tests resemble the way your software is used, the more confidence they can give you"
- Accessibility queries improve both tests AND app quality
- Query priority: role → label → text → testId

### From Kent C. Dodds' React Testing Library Best Practices
- False negatives (break on refactor) = brittle tests
- False positives (bugs pass) = useless tests
- Test the contract (public API), not the implementation
- userEvent over fireEvent (realistic simulation)

## Impact

**Before:**
- React developers had to piece together Testing Library patterns from general `testing` skill
- No dedicated guidance on query selection priority
- No React-specific anti-patterns catalog
- MSW integration patterns missing

**After:**
- ✅ Comprehensive React Testing Library skill (~500 lines)
- ✅ Clear query selection hierarchy (accessibility-first)
- ✅ 15 React-specific anti-patterns with solutions
- ✅ MSW integration patterns documented
- ✅ userEvent best practices (setup() pattern)
- ✅ renderHook patterns for custom hooks
- ✅ All cross-references to existing skills maintained

**Total skills:** 7 → 8 (tdd, testing, typescript-strict, functional, refactoring, expectations, planning, front-end-testing)
