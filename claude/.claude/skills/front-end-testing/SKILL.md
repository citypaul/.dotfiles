---
name: front-end-testing
description: Behavior-driven UI testing patterns. Covers Vitest Browser Mode (preferred) and DOM Testing Library. Use when testing any front-end application, writing UI tests, querying DOM elements, or simulating user interactions. For React-specific patterns, see the react-testing skill.
---

# Front-End Testing

For React-specific patterns (components, hooks, context), load the `react-testing` skill. For TDD workflow, load the `tdd` skill. For general testing patterns (factories, public API testing), load the `testing` skill.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `resources/async-patterns.md` | Using `findBy`/`waitFor`/`waitForElementToBeRemoved`, testing loading states, debounce, or reviewing waitFor usage |
| `resources/msw.md` | Mocking APIs — full setupWorker (Browser Mode) and setupServer (Node/jsdom) setup, per-test overrides |
| `resources/dom-testing-library-legacy.md` | Working in a jsdom/`@testing-library/dom` codebase — screen object, fireEvent vs userEvent, jest-dom matchers, ESLint plugins |

---

## Core Philosophy

**Test behavior users see, not implementation details.** This applies in every environment — Browser Mode, jsdom, anything.

Your UI has two users:
1. **End-users**: Interact through the DOM (clicks, typing, reading text)
2. **Developers**: You, refactoring implementation

**Kent C. Dodds principle**: "The more your tests resemble the way your software is used, the more confidence they can give you."

**False negatives** (tests break on refactor):
```typescript
// ❌ WRONG - Coupled to state implementation; breaks when state → signals → stores
it('should update internal state', () => {
  const component = new CounterComponent();
  component.setState({ count: 5 });
  expect(component.state.count).toBe(5);
});
```

**False positives** (bugs pass tests):
```typescript
// ❌ WRONG - Button exists but onClick is broken; test still passes
it('should render button', () => {
  render('<button data-testid="submit-btn">Submit</button>');
  expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
});
```

✅ **CORRECT - Drive the UI the way a user would, assert what the user sees**: type into labelled fields, click the submit button, assert the submit handler received the form data. This survives refactors, tests the contract, and catches real bugs (broken onClick, validation errors).

---

## Vitest Browser Mode (Preferred)

**Always prefer Vitest Browser Mode over jsdom/happy-dom.** Tests run in a real browser (via Playwright), giving production-accurate behavior for CSS, events, focus management, and accessibility.

### Why Browser Mode Over jsdom

| Aspect | jsdom/happy-dom | Browser Mode |
|---|---|---|
| Environment | Simulated DOM in Node.js | Real browser (Chromium/Firefox/WebKit) |
| CSS | Not rendered | Real CSS rendering, layout, computed styles |
| Events | Synthetic JS events | CDP-based real browser events |
| APIs | Subset of Web APIs | Full browser API surface |
| Focus/a11y | Approximate | Real focus management, accessibility tree |
| Debugging | Console only | Full browser DevTools |

### Setup

```bash
npm install -D vitest @vitest/browser-playwright
npx playwright install chromium  # Playwright provider needs browser binaries
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
})
```

Quick setup wizard: `npx vitest init browser`

### Built-in Locators

Vitest Browser Mode has built-in locators that mirror Testing Library queries. **No separate `@testing-library/dom` import needed.**

```typescript
import { page } from 'vitest/browser'

// These work exactly like Testing Library queries
page.getByRole('button', { name: /submit/i })
page.getByText(/welcome/i)
page.getByLabelText(/email/i)
page.getByPlaceholder(/search/i)
page.getByAltText(/logo/i)
page.getByTestId('my-element')  // Last resort only
```

### Built-in Assertions with Retry

Use `expect.element()` for DOM assertions — it **automatically retries** until the assertion passes or times out, reducing flakiness:

```typescript
// ✅ CORRECT - Auto-retrying assertion
await expect.element(page.getByText(/success/i)).toBeVisible()
await expect.element(page.getByRole('button')).toBeDisabled()

// Available matchers (no @testing-library/jest-dom needed):
await expect.element(el).toBeVisible()
await expect.element(el).toBeDisabled()
await expect.element(el).toHaveTextContent(/text/i)
await expect.element(el).toHaveValue('input value')
await expect.element(el).toHaveAttribute('aria-label', 'Close')
await expect.element(el).toBeChecked()
```

### Built-in User Events (CDP-based)

```typescript
import { userEvent } from 'vitest/browser'

// Real browser events via Chrome DevTools Protocol
await userEvent.click(page.getByRole('button', { name: /submit/i }))
await userEvent.fill(page.getByLabelText(/email/i), 'test@example.com')
await userEvent.keyboard('{Enter}')
await userEvent.selectOptions(page.getByLabelText(/country/i), 'USA')
await userEvent.clear(page.getByLabelText(/search/i))
```

Or use locator methods directly:
```typescript
await page.getByRole('button', { name: /submit/i }).click()
await page.getByLabelText(/email/i).fill('test@example.com')
```

In jsdom codebases, use `@testing-library/user-event` instead — always prefer it over `fireEvent` (see `resources/dom-testing-library-legacy.md`). Create a fresh `userEvent.setup()` per test, never in `beforeEach`.

### Multi-Project Setup (Node + Browser)

When you need both unit tests (Node) and UI tests (browser):

```typescript
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['tests/unit/**/*.test.ts'],
          name: 'unit',
          environment: 'node',
        },
      },
      {
        test: {
          include: ['tests/browser/**/*.test.ts'],
          name: 'browser',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
```

### Browser Mode Gotchas

- **`vi.spyOn` on imports**: ES module namespaces are sealed in real browsers. `vi.mock('./module', { spy: true })` works, but treat module mocking as temporary scaffolding — prefer parameter injection so the dependency is an explicit seam (load the `finding-seams` skill).
- **`alert()`/`confirm()`**: Thread-blocking dialogs halt browser execution. Mock them with `vi.spyOn(window, 'alert').mockImplementation(() => {})`.
- **`act()`**: Not needed for component interactions via locators — CDP events + `expect.element()` retry handle timing. `renderHook` state updates still need `act` (see `react-testing`).

### Playwright / Browser Mode Test Idempotency

**All Playwright-style tests MUST be idempotent.** Every test must produce the same result regardless of execution order, how many times it runs, or what other tests ran before it.

**Rules:**
- Each test creates its own state from scratch — never depend on another test's side effects
- Clean up any persistent state (database rows, localStorage, cookies) created during the test
- Use unique identifiers (e.g., timestamp-based) to avoid collisions when tests run in parallel
- Never assume the DOM is in a particular state at the start of a test — render fresh
- If tests share a server or database, use isolation strategies (transactions, test-specific data)

```typescript
// ❌ WRONG - Tests depend on shared state
it('creates a user', async () => {
  await page.getByRole('button', { name: /create/i }).click()
  // Creates user "Alice" in the database
})

it('lists users', async () => {
  // Assumes "Alice" exists from previous test!
  await expect.element(page.getByText('Alice')).toBeVisible()
})

// ✅ CORRECT - Each test is self-contained
it('creates and displays a user', async () => {
  const uniqueName = `User-${Date.now()}`
  await page.getByLabelText(/name/i).fill(uniqueName)
  await page.getByRole('button', { name: /create/i }).click()
  await expect.element(page.getByText(uniqueName)).toBeVisible()
})
```

**Why this matters:** Browser Mode can run tests in parallel across multiple browser instances. Non-idempotent tests will produce flaky failures that are nearly impossible to debug.

---

## Query Selection Priority

**Most critical skill: choosing the right query.** Near-identical for Browser Mode locators and Testing Library queries — the two naming differences are flagged below.

Use queries in this order (accessibility-first):

1. **`getByRole`** - Highest priority. Queries by ARIA role + accessible name; mirrors screen reader experience; forces semantic HTML
2. **`getByLabelText`** - Form fields, via associated `<label>`
3. **`getByPlaceholder`** - Fallback for inputs when no label (placeholder shouldn't replace a label). Testing Library's name is `getByPlaceholderText`
4. **`getByText`** - Non-interactive content users read
5. **`getByDisplayValue`** - Inputs with pre-filled values. Testing Library only — Browser Mode has no such locator; use `getByRole` + a value assertion instead
6. **`getByAltText`** - Images
7. **`getByTitle`** - Rare, when other queries unavailable
8. **`getByTestId`** - Last resort only; not user-facing

### Query Variants (Testing Library)

- **`getBy*`** - Element must exist (throws if not found). Use when asserting existence.
- **`queryBy*`** - Returns null if not found. Use when asserting **non-existence**.
- **`findBy*`** - Async, waits for element to appear. See `resources/async-patterns.md`.

(Browser Mode locators are lazy and retried by `expect.element()`, so the get/query/find split mostly disappears — use `.not.toBeInTheDocument()` via `expect.element` for absence.)

### Common Mistakes

```typescript
// ❌ WRONG - querySelector (DOM implementation detail)
const button = container.querySelector('.submit-button');
// ❌ WRONG - testId when a role is available (not how users find the button)
screen.getByTestId('submit-button');
// ❌ WRONG - role without accessible name (which button? pages have many)
screen.getByRole('button');
// ✅ CORRECT - role + accessible name (how screen readers find it)
screen.getByRole('button', { name: /submit/i });

// ❌ WRONG - getBy to assert non-existence (awkward throw-based check)
expect(() => screen.getByText(/error/i)).toThrow();
// ✅ CORRECT - queryBy returns null
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

// ❌ WRONG - exact string match (breaks on whitespace change)
screen.getByText('Welcome, John Doe');
// ✅ CORRECT - regex for flexibility
screen.getByText(/welcome.*john doe/i);
```

---

## Accessibility-First Testing

**Three benefits of accessible queries:**

1. **Tests mirror real usage** - Query like screen readers do
2. **Improves app accessibility** - Tests force accessible markup
3. **Refactor-friendly** - Coupled to user experience, not implementation

If an accessible query fails, **your app has an accessibility issue.**

**Always prefer semantic HTML over ARIA:**

```html
<!-- ❌ WRONG - Custom element + ARIA -->
<div role="button" onclick="handleClick()" tabindex="0">Submit</div>

<!-- ✅ CORRECT - Semantic HTML: built-in keyboard nav, focus, screen reader support -->
<button onclick="handleClick()">Submit</button>
```

Add ARIA only where semantic HTML is unavailable (e.g., `role="dialog"` on a custom modal), never redundantly on semantic elements.

---

## Async Testing

In Browser Mode, `await expect.element(...)` handles most waiting automatically. In jsdom codebases, use `findBy*` for appearance, `waitFor` for complex conditions, and `waitForElementToBeRemoved` for disappearance.

**Key rules:** no side effects inside `waitFor`, one assertion per `waitFor`, never wrap `findBy` in `waitFor`.

For full patterns and anti-patterns, see `resources/async-patterns.md`.

---

## API Mocking with MSW

**Use MSW, not fetch/axios mocks** — it intercepts at the network level, so the same handlers work in tests, Storybook, and dev.

**Environment determines the API:**
- **Browser Mode**: `setupWorker` from `msw/browser` (start the worker in a setup file; per-test overrides via `worker.use()`)
- **Node/jsdom**: `setupServer` from `msw/node` (per-test overrides via `server.use()`)

Using `setupServer` in Browser Mode silently does nothing — tests run in a real browser. See `resources/msw.md` for full setup of both.

---

## Core Anti-Patterns

1. **Testing implementation details** — internal state, private methods, CSS classes as hooks. Test user-visible behavior.
2. **`querySelector`/testId when an accessible query exists** — see Query Selection Priority above.
3. **beforeEach render with shared variables** — use a factory function per test instead:

```typescript
// ❌ WRONG - Shared state across tests
let button;
beforeEach(() => {
  render('<button>Submit</button>');
  button = screen.getByRole('button');
});

// ✅ CORRECT - Factory function per test
const renderButton = () => {
  render('<button>Submit</button>');
  return { button: screen.getByRole('button') };
};
```

For factory patterns, see the `testing` skill.

4. **Fetch/axios mocking instead of MSW** — see `resources/msw.md`.
5. **waitFor misuse** — see `resources/async-patterns.md`.
6. **jsdom-specific anti-patterns** (skipping `screen`, `fireEvent`, manual `cleanup()`, property assertions instead of jest-dom matchers, missing ESLint plugins) — see `resources/dom-testing-library-legacy.md`.

---

## Summary Checklist

Before merging UI tests, verify:

- [ ] **Preferred**: Using Vitest Browser Mode with real browser (not jsdom/happy-dom)
- [ ] All Playwright/Browser Mode tests are idempotent (no shared state between tests)
- [ ] Using `getByRole` as first choice for queries (built-in or Testing Library)
- [ ] Using `expect.element()` for auto-retrying assertions (Browser Mode)
- [ ] Using `userEvent` for interactions (CDP-based in Browser Mode, or `@testing-library/user-event`)
- [ ] Testing behavior users see, not implementation details
- [ ] No manual `cleanup()` calls (automatic)
- [ ] No manual `act()` calls for component interactions (Browser Mode handles timing)
- [ ] MSW for API mocking — `setupWorker` in Browser Mode, `setupServer` in Node/jsdom
- [ ] Following TDD workflow (see `tdd` skill)
- [ ] Using test factories for data (see `testing` skill)
- [ ] For React-specific patterns (hooks, context, components), see `react-testing` skill
