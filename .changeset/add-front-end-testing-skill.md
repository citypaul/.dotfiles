---
"@paulhammond/dotfiles": minor
---

# Add Front-End Testing Skills for Testing Library Patterns

**Context**: The existing `testing` skill covers general testing patterns (factories, public API, coverage theater) and `tdd` skill covers the RED-GREEN-REFACTOR workflow. However, there was no dedicated guidance for Testing Library-specific patterns and best practices.

This minor release adds two new skills to fill that gap:
1. **front-end-testing**: Framework-agnostic DOM Testing Library patterns
2. **react-testing**: React-specific Testing Library patterns

## New Skills

### 1. front-end-testing (~890 lines) - Framework-Agnostic DOM Testing Library

**DOM Testing Library patterns for behavior-driven UI testing across all frameworks (React, Vue, Svelte, etc.)**

#### Key Sections

**1. Core Philosophy (80 lines)**
- Test behavior users see, not implementation details
- False negatives (tests break on refactor) vs false positives (bugs pass)
- Kent C. Dodds principle: "Test how software is used"
- Framework-agnostic examples (vanilla JS/HTML)

**2. Query Selection Priority (100 lines)** ⭐ **MOST CRITICAL**
- Accessibility-first query hierarchy (getByRole → getByLabelText → ... → getByTestId)
- Query variants: getBy* (throws), queryBy* (null), findBy* (async)
- Common mistakes with correct alternatives
- Works across all Testing Library implementations

**3. User Event Simulation (80 lines)**
- userEvent vs fireEvent (why userEvent is superior)
- userEvent.setup() pattern (2025 best practice)
- Common interactions: click, type, keyboard, select
- Framework-agnostic patterns

**4. Async Testing Patterns (110 lines)**
- findBy queries for async elements
- waitFor utility for complex conditions
- waitForElementToBeRemoved for disappearance
- Common patterns: loading states, API responses, debounced inputs

**5. MSW Integration (90 lines)**
- Why MSW (network-level interception)
- setupServer pattern for test setup
- Per-test overrides with server.use()
- Works across all frameworks

**6. Accessibility-First Testing (70 lines)**
- Why accessible queries improve both tests AND app quality
- When to add ARIA (custom components only)
- Semantic HTML priority over ARIA

**7. Testing Library Anti-Patterns (200 lines)** ⭐ **HIGH VALUE**
14 common mistakes with ❌ WRONG and ✅ CORRECT examples:
1. Not using `screen` object
2. Using `querySelector`
3. Testing implementation details
4. Not using jest-dom matchers
5. Manual cleanup() calls
6. Wrong assertion methods
7. beforeEach render pattern
8. Multiple assertions in waitFor
9. Side effects in waitFor
10. Exact string matching
11. Wrong query variants
12. Wrapping findBy in waitFor
13. Using testId when role available
14. Not installing ESLint plugins

**8. Summary Checklist (30 lines)**
Quick reference for test review with cross-references to `tdd`, `testing`, and `react-testing` skills

### 2. react-testing (~460 lines) - React-Specific Patterns

**React Testing Library patterns for testing React components, hooks, and context**

#### Key Sections

**1. Opening Paragraph (10 lines)**
- References `front-end-testing` skill for general DOM patterns
- References `tdd` skill for RED-GREEN-REFACTOR workflow
- References `testing` skill for factory patterns

**2. Testing React Components (60 lines)**
- Components as functions: props → rendered DOM
- Testing props and their effects
- Testing conditional rendering
- Example patterns with ❌/✅ comparisons

**3. Testing React Hooks (60 lines)**
- renderHook API (built into RTL since v13)
- result.current pattern
- act() for state updates
- rerender() for testing with different props

**4. Testing Context (60 lines)**
- wrapper option for context providers
- Multiple providers pattern
- Testing components that consume context
- Custom render helpers

**5. Testing Forms (60 lines)**
- Controlled inputs
- Form submissions
- Form validation
- userEvent integration

**6. React-Specific Anti-Patterns (80 lines)** ⭐ **HIGH VALUE**
5 React-specific mistakes:
1. Unnecessary act() wrapping (RTL handles it)
2. Manual cleanup() calls (automatic since RTL 9)
3. beforeEach render pattern (use factories)
4. Testing component internals (state, methods)
5. Shallow rendering (use full render)

**7. Advanced React Patterns (90 lines)**
- Testing loading states
- Testing error boundaries
- Testing portals
- Testing Suspense

**8. Summary Checklist (20 lines)**
React-specific checks with cross-references to `front-end-testing`, `tdd`, and `testing` skills

## Separation of Concerns

### front-end-testing (Framework-Agnostic) DOES cover:
- DOM Testing Library query APIs (works with React, Vue, Svelte)
- userEvent vs fireEvent
- Async patterns (findBy, waitFor)
- MSW integration for API mocking
- Accessibility-first querying
- Testing Library anti-patterns (screen, jest-dom)
- Generic UI testing patterns

### front-end-testing does NOT cover:
- React-specific APIs (renderHook, wrapper option)
- React component testing patterns
- React hooks testing
- React context testing
- Framework-specific anti-patterns

### react-testing (React-Specific) DOES cover:
- React Testing Library specific APIs
- renderHook for custom hooks
- wrapper option for context providers
- Testing React components, hooks, context
- React-specific anti-patterns (act, cleanup)
- React patterns (Suspense, error boundaries, portals)

### react-testing does NOT cover:
- Generic DOM Testing Library patterns (delegates to front-end-testing)
- General testing patterns (delegates to testing skill)
- TDD workflow (delegates to tdd skill)

## Cross-References

**front-end-testing references:**
- `tdd` skill for RED-GREEN-REFACTOR workflow
- `testing` skill for factory patterns
- `react-testing` skill for React-specific patterns

**react-testing references:**
- `front-end-testing` skill for general DOM Testing Library patterns
- `tdd` skill for TDD workflow
- `testing` skill for factory patterns

**CLAUDE.md references:**
- Both skills in Architecture section skill list
- Testing Principles section references both skills

## Files Modified

### New Files
- `claude/.claude/skills/front-end-testing/SKILL.md` (~890 lines)
- `claude/.claude/skills/react-testing/SKILL.md` (~460 lines)

### Updated Files
- `README.md`: Updated skill count (8 → 9), added both skills to Key Sections table and Quick Navigation table
- `install-claude.sh`: Added both skills to directory creation, skills array, and install summary
- `~/.claude/CLAUDE.md` (user's global): Updated skill list in Architecture section and Testing Principles section

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
- Framework-agnostic patterns (DOM Testing Library works everywhere)

### From Kent C. Dodds' React Testing Library Best Practices
- False negatives (break on refactor) = brittle tests
- False positives (bugs pass) = useless tests
- Test the contract (public API), not the implementation
- userEvent over fireEvent (realistic simulation)

## Impact

**Before:**
- No dedicated Testing Library guidance
- React developers had to piece together patterns from general `testing` skill
- No query selection priority guidance
- No Testing Library anti-patterns catalog
- MSW integration patterns missing

**After:**
- ✅ Two comprehensive Testing Library skills (~1350 lines total)
- ✅ Framework-agnostic patterns work across React, Vue, Svelte
- ✅ React-specific patterns separated into dedicated skill
- ✅ Clear query selection hierarchy (accessibility-first)
- ✅ 14 general + 5 React-specific anti-patterns with solutions
- ✅ MSW integration patterns documented
- ✅ userEvent best practices (setup() pattern)
- ✅ renderHook patterns for custom hooks
- ✅ All cross-references between skills maintained

**Total skills:** 8 → 9 (tdd, testing, front-end-testing, react-testing, typescript-strict, functional, refactoring, expectations, planning)
