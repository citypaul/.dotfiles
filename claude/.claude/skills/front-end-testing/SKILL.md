---
name: front-end-testing
description: DOM Testing Library patterns for behavior-driven UI testing. Framework-agnostic patterns for testing user interfaces. Use when testing any front-end application.
---

# Front-End Testing with DOM Testing Library

This skill focuses on framework-agnostic DOM Testing Library patterns that work across React, Vue, Svelte, and other frameworks. For React-specific patterns (renderHook, context, components), load the `react-testing` skill. For TDD workflow (RED-GREEN-REFACTOR), load the `tdd` skill. For general testing patterns (factories, public API testing), load the `testing` skill.

---

## Core Philosophy

**Test behavior users see, not implementation details.**

Testing Library exists to solve a fundamental problem: tests that break when you refactor (false negatives) and tests that pass when bugs exist (false positives).

### Two Types of Users

Your UI components have two users:
1. **End-users**: Interact through the DOM (clicks, typing, reading text)
2. **Developers**: You, refactoring implementation

**Kent C. Dodds principle**: "The more your tests resemble the way your software is used, the more confidence they can give you."

### Why This Matters

**False negatives** (tests break on refactor):
```typescript
// ❌ WRONG - Testing implementation (will break on refactor)
it('should update internal state', () => {
  const component = new CounterComponent();
  component.setState({ count: 5 }); // Coupled to state implementation
  expect(component.state.count).toBe(5);
});
```

**False positives** (bugs pass tests):
```typescript
// ❌ WRONG - Testing wrong thing
it('should render button', () => {
  render('<button data-testid="submit-btn">Submit</button>');
  expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  // Button exists but onClick is broken - test passes!
});
```

**Correct approach** (behavior-driven):
```typescript
// ✅ CORRECT - Testing user-visible behavior
it('should submit form when user clicks submit', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();

  render(`
    <form id="login-form">
      <label>Email: <input name="email" /></label>
      <label>Password: <input name="password" type="password" /></label>
      <button type="submit">Submit</button>
    </form>
  `);

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(new FormData(e.target));
  });

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalled();
});
```

This test:
- Survives refactoring (state → signals → stores)
- Tests the contract (what users see)
- Catches real bugs (broken onClick, validation errors)

---

## Query Selection Priority

**Most critical Testing Library skill: choosing the right query.**

### Priority Order

Use queries in this order (accessibility-first):

1. **`getByRole`** - Highest priority
   - Queries by ARIA role + accessible name
   - Mirrors screen reader experience
   - Forces semantic HTML

2. **`getByLabelText`** - Form fields
   - Finds inputs by associated `<label>`
   - Ensures accessible forms

3. **`getByPlaceholderText`** - Fallback for inputs
   - Only when label not present
   - Placeholder shouldn't replace label

4. **`getByText`** - Non-interactive content
   - Headings, paragraphs, list items
   - Content users read

5. **`getByDisplayValue`** - Current form values
   - Inputs with pre-filled values

6. **`getByAltText`** - Images
   - Ensures accessible images

7. **`getByTitle`** - SVG titles, title attributes
   - Rare, when other queries unavailable

8. **`getByTestId`** - Last resort only
   - When no other query works
   - Not user-facing

### Query Variants

Three variants for every query:

**`getBy*`** - Element must exist (throws if not found)
```typescript
// ✅ Use when asserting element EXISTS
const button = screen.getByRole('button', { name: /submit/i });
expect(button).toBeDisabled();
```

**`queryBy*`** - Returns null if not found
```typescript
// ✅ Use when asserting element DOESN'T exist
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

// ❌ WRONG - getBy throws, can't assert non-existence
expect(() => screen.getByRole('dialog')).toThrow(); // Ugly!
```

**`findBy*`** - Async, waits for element to appear
```typescript
// ✅ Use when element appears after async operation
const message = await screen.findByText(/success/i);
```

### Common Mistakes

❌ **Using `container.querySelector`**
```typescript
const button = container.querySelector('.submit-button'); // DOM implementation detail
```

✅ **CORRECT - Query by accessible role**
```typescript
const button = screen.getByRole('button', { name: /submit/i }); // User-facing
```

---

❌ **Using `getByTestId` when role available**
```typescript
screen.getByTestId('submit-button'); // Not how users find button
```

✅ **CORRECT - Query by role**
```typescript
screen.getByRole('button', { name: /submit/i }); // How screen readers find it
```

---

❌ **Not using accessible names**
```typescript
screen.getByRole('button'); // Which button? Multiple on page!
```

✅ **CORRECT - Specify accessible name**
```typescript
screen.getByRole('button', { name: /submit/i }); // Specific button
```

---

❌ **Using getBy to assert non-existence**
```typescript
expect(() => screen.getByText(/error/i)).toThrow(); // Awkward
```

✅ **CORRECT - Use queryBy**
```typescript
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
```

---

## User Event Simulation

**Always use `userEvent` over `fireEvent`** for realistic interactions.

### userEvent vs fireEvent

**Why userEvent is superior:**
- Simulates complete interaction sequence (hover → focus → click → blur)
- Triggers all associated events
- Respects browser timing and order
- Catches more bugs

```typescript
// ❌ WRONG - fireEvent (incomplete simulation)
fireEvent.change(input, { target: { value: 'test' } });
fireEvent.click(button);
```

```typescript
// ✅ CORRECT - userEvent (realistic simulation)
const user = userEvent.setup();
await user.type(input, 'test');
await user.click(button);
```

**Only use `fireEvent` when:**
- `userEvent` doesn't support the event (rare)
- Testing non-standard browser behavior

### userEvent.setup() Pattern

**Modern best practice (2025):**

```typescript
// ✅ CORRECT - Setup per test
it('should handle user input', async () => {
  const user = userEvent.setup(); // Fresh instance per test
  render('<input aria-label="Email" />');

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
});
```

```typescript
// ❌ WRONG - Setup in beforeEach
let user;
beforeEach(() => {
  user = userEvent.setup(); // Shared state across tests
});

it('test 1', async () => {
  await user.click(...); // Might affect test 2
});
```

**Why:** Each test gets clean state, prevents test interdependence.

### Common Interactions

**Clicking:**
```typescript
const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: /submit/i }));
```

**Typing:**
```typescript
await user.type(screen.getByLabelText(/email/i), 'test@example.com');
```

**Keyboard:**
```typescript
await user.keyboard('{Enter}'); // Press Enter
await user.keyboard('{Shift>}A{/Shift}'); // Shift+A
```

**Selecting options:**
```typescript
await user.selectOptions(
  screen.getByLabelText(/country/i),
  'USA'
);
```

**Clearing input:**
```typescript
await user.clear(screen.getByLabelText(/search/i));
```

---

## Async Testing Patterns

UI frameworks are async by nature (state updates, API calls, suspense). Testing Library provides utilities for async scenarios.

### findBy Queries

**Built-in async queries** (combines `getBy` + `waitFor`):

```typescript
// ✅ CORRECT - Wait for element to appear
const message = await screen.findByText(/success/i);

// Under the hood: retries getByText until it succeeds or timeout
```

**When to use:**
- Element appears after async operation
- Loading states disappear
- API responses render content

**Configuration:**
```typescript
// Default: 1000ms timeout
const message = await screen.findByText(/success/i);

// Custom timeout
const message = await screen.findByText(/success/i, {}, { timeout: 3000 });
```

### waitFor Utility

**For complex conditions** that `findBy` can't handle:

```typescript
// ✅ CORRECT - Complex assertion
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument();
});

// ✅ CORRECT - Multiple elements
await waitFor(() => {
  expect(screen.getAllByRole('listitem')).toHaveLength(10);
});
```

**waitFor retries until:**
- Assertion passes (doesn't throw)
- Timeout reached (default 1000ms)

**Common mistakes:**

❌ **Side effects in waitFor**
```typescript
await waitFor(() => {
  fireEvent.click(button); // Side effect! Will click multiple times
  expect(result).toBe(true);
});
```

✅ **CORRECT - Only assertions**
```typescript
fireEvent.click(button); // Outside waitFor
await waitFor(() => {
  expect(result).toBe(true); // Only assertion
});
```

---

❌ **Multiple assertions**
```typescript
await waitFor(() => {
  expect(screen.getByText(/name/i)).toBeInTheDocument();
  expect(screen.getByText(/email/i)).toBeInTheDocument(); // Might not retry both
});
```

✅ **CORRECT - Single assertion per waitFor**
```typescript
await waitFor(() => {
  expect(screen.getByText(/name/i)).toBeInTheDocument();
});
expect(screen.getByText(/email/i)).toBeInTheDocument();
```

---

❌ **Wrapping findBy in waitFor**
```typescript
await waitFor(() => screen.findByText(/success/i)); // Redundant!
```

✅ **CORRECT - findBy already waits**
```typescript
await screen.findByText(/success/i);
```

### waitForElementToBeRemoved

**For disappearance scenarios:**

```typescript
// ✅ CORRECT - Wait for loading spinner to disappear
await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

// ✅ CORRECT - Wait for modal to close
await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
```

**Note:** Must use `queryBy*` (returns null) not `getBy*` (throws).

### Common Patterns

**Loading states:**
```typescript
render('<div id="container"></div>');

// Simulate async data loading
const container = document.getElementById('container');
container.innerHTML = '<p>Loading...</p>';

// Initially loading
expect(screen.getByText(/loading/i)).toBeInTheDocument();

// Simulate data load
setTimeout(() => {
  container.innerHTML = '<p>John Doe</p>';
}, 100);

// Wait for data
await screen.findByText(/john doe/i);

// Loading gone
expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
```

**API responses:**
```typescript
const user = userEvent.setup();
render(`
  <form>
    <label>Search: <input name="search" /></label>
    <button type="submit">Search</button>
    <ul id="results"></ul>
  </form>
`);

await user.type(screen.getByLabelText(/search/i), 'react');
await user.click(screen.getByRole('button', { name: /search/i }));

// Wait for results (after API response)
await waitFor(() => {
  expect(screen.getAllByRole('listitem')).toHaveLength(10);
});
```

**Debounced inputs:**
```typescript
const user = userEvent.setup();
render(`
  <label>Search: <input id="search" /></label>
  <ul id="suggestions"></ul>
`);

await user.type(screen.getByLabelText(/search/i), 'react');

// Wait for debounced suggestions
await screen.findByText(/react testing library/i);
```

---

## MSW Integration

**Mock Service Worker** for API-level mocking.

### Why MSW

**Network-level interception:**
- Intercepts requests at network layer (not fetch/axios mocks)
- Same mocks work in tests, Storybook, development
- No client-specific mocking logic
- Tests real request logic

```typescript
// ❌ WRONG - Mocking fetch implementation
vi.spyOn(global, 'fetch').mockResolvedValue({
  json: async () => ({ users: [...] }),
}); // Tight coupling, won't work in Storybook
```

```typescript
// ✅ CORRECT - MSW intercepts at network level
// Works in tests, Storybook, dev server
http.get('/api/users', () => {
  return HttpResponse.json({ users: [...] });
});
```

### setupServer Pattern

**In test setup file:**

```typescript
// test-setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**In handlers file:**

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json({
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    });
  }),
];
```

### Per-Test Overrides

**Override handlers for specific tests:**

```typescript
it('should handle API error', async () => {
  // Override for this test only
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );

  render('<div id="user-list"></div>');

  // Simulate component fetching users
  fetch('/api/users').then(() => {
    document.getElementById('user-list').innerHTML =
      '<p>Failed to load users</p>';
  });

  await screen.findByText(/failed to load users/i);
});
```

**After test, `afterEach` resets to default handlers.**

---

## Accessibility-First Testing

### Why Accessible Queries

**Three benefits:**

1. **Tests mirror real usage** - Query like screen readers do
2. **Improves app accessibility** - Tests force accessible markup
3. **Refactor-friendly** - Coupled to user experience, not implementation

```typescript
// ❌ WRONG - Implementation detail
screen.getByTestId('user-menu');

// ✅ CORRECT - Accessibility query
screen.getByRole('button', { name: /user menu/i });
```

If accessible query fails, **your app has an accessibility issue.**

### ARIA Attributes

**When to add ARIA:**

✅ **Custom components** (where semantic HTML unavailable):
```html
<div role="dialog" aria-label="Confirmation Dialog">
  <h2>Are you sure?</h2>
  ...
</div>
```

Query:
```typescript
screen.getByRole('dialog', { name: /confirmation/i });
```

❌ **DON'T add to semantic HTML** (redundant):
```html
<!-- ❌ WRONG - Semantic HTML already has role -->
<button role="button">Submit</button>

<!-- ✅ CORRECT - Semantic HTML is enough -->
<button>Submit</button>
```

### Semantic HTML Priority

**Always prefer semantic HTML over ARIA:**

```html
<!-- ❌ WRONG - Custom element + ARIA -->
<div role="button" onclick="handleClick()" tabindex="0">
  Submit
</div>

<!-- ✅ CORRECT - Semantic HTML -->
<button onclick="handleClick()">
  Submit
</button>
```

**Semantic HTML provides:**
- Built-in keyboard navigation
- Built-in focus management
- Built-in screen reader support
- Less code, more accessibility

---

## Testing Library Anti-Patterns

### 1. Not using `screen` object

❌ **WRONG - Query from render result**
```typescript
const { getByRole } = render('<button>Submit</button>');
const button = getByRole('button');
```

✅ **CORRECT - Use screen**
```typescript
render('<button>Submit</button>');
const button = screen.getByRole('button');
```

**Why:** `screen` is consistent, no destructuring, better error messages.

---

### 2. Using querySelector

❌ **WRONG - DOM implementation**
```typescript
const { container } = render('<button class="submit-btn">Submit</button>');
const button = container.querySelector('.submit-btn');
```

✅ **CORRECT - Accessible query**
```typescript
render('<button>Submit</button>');
const button = screen.getByRole('button', { name: /submit/i });
```

---

### 3. Testing implementation details

❌ **WRONG - Internal state**
```typescript
const component = new Component();
expect(component._internalState).toBe('value'); // Private implementation
```

✅ **CORRECT - User-visible behavior**
```typescript
render('<div id="output"></div>');
expect(screen.getByText(/value/i)).toBeInTheDocument();
```

---

### 4. Not using jest-dom matchers

❌ **WRONG - Manual assertions**
```typescript
expect(button.disabled).toBe(true);
expect(element.classList.contains('active')).toBe(true);
```

✅ **CORRECT - jest-dom matchers**
```typescript
expect(button).toBeDisabled();
expect(element).toHaveClass('active');
```

**Install:** `npm install -D @testing-library/jest-dom`

---

### 5. Manual cleanup() calls

❌ **WRONG - Manual cleanup**
```typescript
afterEach(() => {
  cleanup(); // Automatic in modern Testing Library!
});
```

✅ **CORRECT - No cleanup needed**
```typescript
// Cleanup happens automatically
```

---

### 6. Wrong assertion methods

❌ **WRONG - Property access**
```typescript
expect(input.value).toBe('test');
expect(checkbox.checked).toBe(true);
```

✅ **CORRECT - jest-dom matchers**
```typescript
expect(input).toHaveValue('test');
expect(checkbox).toBeChecked();
```

---

### 7. beforeEach render pattern

❌ **WRONG - Shared render in beforeEach**
```typescript
let button;
beforeEach(() => {
  render('<button>Submit</button>');
  button = screen.getByRole('button'); // Shared state
});

it('test 1', () => {
  // Uses shared button from beforeEach
});
```

✅ **CORRECT - Factory function per test**
```typescript
const renderButton = () => {
  render('<button>Submit</button>');
  return {
    button: screen.getByRole('button'),
  };
};

it('test 1', () => {
  const { button } = renderButton(); // Fresh state
});
```

For factory patterns, see `testing` skill.

---

### 8. Multiple assertions in waitFor

❌ **WRONG - Multiple assertions**
```typescript
await waitFor(() => {
  expect(screen.getByText(/name/i)).toBeInTheDocument();
  expect(screen.getByText(/email/i)).toBeInTheDocument();
});
```

✅ **CORRECT - Single assertion per waitFor**
```typescript
await waitFor(() => {
  expect(screen.getByText(/name/i)).toBeInTheDocument();
});
expect(screen.getByText(/email/i)).toBeInTheDocument();
```

---

### 9. Side effects in waitFor

❌ **WRONG - Mutation in callback**
```typescript
await waitFor(() => {
  fireEvent.click(button); // Clicks multiple times!
  expect(result).toBe(true);
});
```

✅ **CORRECT - Side effects outside**
```typescript
fireEvent.click(button);
await waitFor(() => {
  expect(result).toBe(true);
});
```

---

### 10. Exact string matching

❌ **WRONG - Fragile exact match**
```typescript
screen.getByText('Welcome, John Doe'); // Breaks on whitespace change
```

✅ **CORRECT - Regex for flexibility**
```typescript
screen.getByText(/welcome.*john doe/i);
```

---

### 11. Wrong query variant for assertion

❌ **WRONG - getBy for non-existence**
```typescript
expect(() => screen.getByText(/error/i)).toThrow();
```

✅ **CORRECT - queryBy**
```typescript
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
```

---

### 12. Wrapping findBy in waitFor

❌ **WRONG - Redundant**
```typescript
await waitFor(() => screen.findByText(/success/i));
```

✅ **CORRECT - findBy already waits**
```typescript
await screen.findByText(/success/i);
```

---

### 13. Using testId when role available

❌ **WRONG - testId**
```typescript
screen.getByTestId('submit-button');
```

✅ **CORRECT - Role**
```typescript
screen.getByRole('button', { name: /submit/i });
```

---

### 14. Not installing ESLint plugins

**Install these plugins:**
```bash
npm install -D eslint-plugin-testing-library eslint-plugin-jest-dom
```

**.eslintrc.js:**
```javascript
{
  extends: [
    'plugin:testing-library/dom', // For framework-agnostic
    // OR 'plugin:testing-library/react' for React
    'plugin:jest-dom/recommended',
  ],
}
```

**Catches anti-patterns automatically.**

---

## Summary Checklist

Before merging UI tests, verify:

- [ ] Using `getByRole` as first choice for queries
- [ ] Using `userEvent` with `setup()` (not `fireEvent`)
- [ ] Using `screen` object for all queries (not destructuring from render)
- [ ] Using `findBy*` for async elements (loading, API responses)
- [ ] Using `jest-dom` matchers (`toBeInTheDocument`, `toBeDisabled`, etc.)
- [ ] Testing behavior users see, not implementation details
- [ ] ESLint plugins installed (`eslint-plugin-testing-library`, `eslint-plugin-jest-dom`)
- [ ] No manual `cleanup()` calls (automatic)
- [ ] MSW for API mocking (not fetch/axios mocks)
- [ ] Following TDD workflow (see `tdd` skill)
- [ ] Using test factories for data (see `testing` skill)
- [ ] For framework-specific patterns (React hooks, context, components), see `react-testing` skill
