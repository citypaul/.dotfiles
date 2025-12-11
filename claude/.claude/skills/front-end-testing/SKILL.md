---
name: front-end-testing
description: React Testing Library patterns for behavior-driven UI testing. Use when testing React components.
---

# Front-End Testing with React Testing Library

This skill focuses exclusively on React and Testing Library specifics. For TDD workflow (RED-GREEN-REFACTOR), load the `tdd` skill. For general testing patterns (factories, public API testing), load the `testing` skill.

---

## Core Philosophy

**Test behavior users see, not implementation details.**

Testing Library exists to solve a fundamental problem: tests that break when you refactor (false negatives) and tests that pass when bugs exist (false positives).

### Two Types of Users

Your components have two users:
1. **End-users**: Interact through the DOM (clicks, typing, reading text)
2. **Developers**: You, refactoring implementation

**Kent C. Dodds principle**: "The more your tests resemble the way your software is used, the more confidence they can give you."

### Why This Matters

**False negatives** (tests break on refactor):
```tsx
// ❌ WRONG - Testing implementation (will break on refactor)
it('should update state', () => {
  const { result } = renderHook(() => useState(0));
  act(() => result.current[1](5));
  expect(result.current[0]).toBe(5); // Coupled to state implementation
});
```

**False positives** (bugs pass tests):
```tsx
// ❌ WRONG - Testing wrong thing
it('should render button', () => {
  render(<LoginForm />);
  expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  // Button exists but onClick is broken - test passes!
});
```

**Correct approach** (behavior-driven):
```tsx
// ✅ CORRECT - Testing user-visible behavior
it('should submit form when user clicks submit', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();

  render(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  });
});
```

This test:
- Survives refactoring (state → reducer → context)
- Tests the contract (what users see)
- Catches real bugs (broken onClick, validation errors)

---

## Query Selection Priority

**Most critical React Testing Library skill: choosing the right query.**

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
```tsx
// ✅ Use when asserting element EXISTS
const button = screen.getByRole('button', { name: /submit/i });
expect(button).toBeDisabled();
```

**`queryBy*`** - Returns null if not found
```tsx
// ✅ Use when asserting element DOESN'T exist
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

// ❌ WRONG - getBy throws, can't assert non-existence
expect(() => screen.getByRole('dialog')).toThrow(); // Ugly!
```

**`findBy*`** - Async, waits for element to appear
```tsx
// ✅ Use when element appears after async operation
const message = await screen.findByText(/success/i);
```

### Common Mistakes

❌ **Using `container.querySelector`**
```tsx
const button = container.querySelector('.submit-button'); // DOM implementation detail
```

✅ **CORRECT - Query by accessible role**
```tsx
const button = screen.getByRole('button', { name: /submit/i }); // User-facing
```

---

❌ **Using `getByTestId` when role available**
```tsx
screen.getByTestId('submit-button'); // Not how users find button
```

✅ **CORRECT - Query by role**
```tsx
screen.getByRole('button', { name: /submit/i }); // How screen readers find it
```

---

❌ **Not using accessible names**
```tsx
screen.getByRole('button'); // Which button? Multiple on page!
```

✅ **CORRECT - Specify accessible name**
```tsx
screen.getByRole('button', { name: /submit/i }); // Specific button
```

---

❌ **Using getBy to assert non-existence**
```tsx
expect(() => screen.getByText(/error/i)).toThrow(); // Awkward
```

✅ **CORRECT - Use queryBy**
```tsx
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

```tsx
// ❌ WRONG - fireEvent (incomplete simulation)
fireEvent.change(input, { target: { value: 'test' } });
fireEvent.click(button);
```

```tsx
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

```tsx
// ✅ CORRECT - Setup per test
it('should handle user input', async () => {
  const user = userEvent.setup(); // Fresh instance per test
  render(<MyComponent />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.click(screen.getByRole('button'));
});
```

```tsx
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
```tsx
const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: /submit/i }));
```

**Typing:**
```tsx
await user.type(screen.getByLabelText(/email/i), 'test@example.com');
```

**Keyboard:**
```tsx
await user.keyboard('{Enter}'); // Press Enter
await user.keyboard('{Shift>}A{/Shift}'); // Shift+A
```

**Selecting options:**
```tsx
await user.selectOptions(
  screen.getByLabelText(/country/i),
  'USA'
);
```

**Clearing input:**
```tsx
await user.clear(screen.getByLabelText(/search/i));
```

---

## Async Testing Patterns

React is async by nature (state updates, API calls, suspense). Testing Library provides utilities for async scenarios.

### findBy Queries

**Built-in async queries** (combines `getBy` + `waitFor`):

```tsx
// ✅ CORRECT - Wait for element to appear
const message = await screen.findByText(/success/i);

// Under the hood: retries getByText until it succeeds or timeout
```

**When to use:**
- Element appears after async operation
- Loading states disappear
- API responses render content

**Configuration:**
```tsx
// Default: 1000ms timeout
const message = await screen.findByText(/success/i);

// Custom timeout
const message = await screen.findByText(/success/i, {}, { timeout: 3000 });
```

### waitFor Utility

**For complex conditions** that `findBy` can't handle:

```tsx
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
```tsx
await waitFor(() => {
  fireEvent.click(button); // Side effect! Will click multiple times
  expect(result).toBe(true);
});
```

✅ **CORRECT - Only assertions**
```tsx
fireEvent.click(button); // Outside waitFor
await waitFor(() => {
  expect(result).toBe(true); // Only assertion
});
```

---

❌ **Multiple assertions**
```tsx
await waitFor(() => {
  expect(screen.getByText(/name/i)).toBeInTheDocument();
  expect(screen.getByText(/email/i)).toBeInTheDocument(); // Might not retry both
});
```

✅ **CORRECT - Single assertion**
```tsx
await waitFor(() => {
  expect(screen.getByText(/name/i)).toBeInTheDocument();
});
await waitFor(() => {
  expect(screen.getByText(/email/i)).toBeInTheDocument();
});
```

---

❌ **Wrapping findBy in waitFor**
```tsx
await waitFor(() => screen.findByText(/success/i)); // Redundant!
```

✅ **CORRECT - findBy already waits**
```tsx
await screen.findByText(/success/i);
```

### waitForElementToBeRemoved

**For disappearance scenarios:**

```tsx
// ✅ CORRECT - Wait for loading spinner to disappear
await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

// ✅ CORRECT - Wait for modal to close
await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
```

**Note:** Must use `queryBy*` (returns null) not `getBy*` (throws).

### Common Patterns

**Loading states:**
```tsx
render(<UserProfile userId="123" />);

// Initially loading
expect(screen.getByText(/loading/i)).toBeInTheDocument();

// Wait for data
await screen.findByText(/john doe/i);

// Loading gone
expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
```

**API responses:**
```tsx
const user = userEvent.setup();
render(<SearchForm />);

await user.type(screen.getByLabelText(/search/i), 'react');
await user.click(screen.getByRole('button', { name: /search/i }));

// Wait for results
const results = await screen.findAllByRole('listitem');
expect(results).toHaveLength(10);
```

**Debounced inputs:**
```tsx
const user = userEvent.setup();
render(<AutocompleteInput />);

await user.type(screen.getByLabelText(/search/i), 'react');

// Wait for debounced suggestions
await screen.findByText(/react testing library/i);
```

---

## Testing Hooks and Context

### renderHook API

**Built into React Testing Library** (since v13):

```tsx
import { renderHook } from '@testing-library/react';

it('should toggle value', () => {
  const { result } = renderHook(() => useToggle(false));

  expect(result.current.value).toBe(false);

  act(() => {
    result.current.toggle();
  });

  expect(result.current.value).toBe(true);
});
```

**Pattern:**
- `result.current` - Current return value of hook
- `act()` - Wrap state updates
- `rerender()` - Re-run hook with new props

### wrapper Option

**For context providers:**

```tsx
// ✅ CORRECT - Wrap hook in provider
const { result } = renderHook(() => useAuth(), {
  wrapper: ({ children }) => (
    <AuthProvider>
      {children}
    </AuthProvider>
  ),
});

expect(result.current.user).toBeNull();

act(() => {
  result.current.login({ email: 'test@example.com' });
});

expect(result.current.user).toEqual({ email: 'test@example.com' });
```

**Multiple providers:**
```tsx
const AllProviders = ({ children }) => (
  <AuthProvider>
    <ThemeProvider>
      <RouterProvider>
        {children}
      </RouterProvider>
    </ThemeProvider>
  </AuthProvider>
);

const { result } = renderHook(() => useMyHook(), {
  wrapper: AllProviders,
});
```

### act() Warnings

**"When testing, code that causes React state updates should be wrapped in act()"**

**Usually means:** Missing `await`

```tsx
// ❌ WRONG - Missing await (triggers act warning)
user.click(button);
expect(screen.getByText(/clicked/i)).toBeInTheDocument();
```

```tsx
// ✅ CORRECT - Await user event
await user.click(button);
expect(screen.getByText(/clicked/i)).toBeInTheDocument();
```

**Modern RTL handles act() automatically.** You rarely need manual `act()`:
- `userEvent` methods → auto-wrapped
- `fireEvent` → auto-wrapped
- `waitFor`, `findBy` → auto-wrapped

**When you DO need manual `act()`:**
- Custom hook state updates (`renderHook`)
- Direct state mutations (rare, usually bad practice)

---

## MSW Integration

**Mock Service Worker** for API-level mocking.

### Why MSW

**Network-level interception:**
- Intercepts requests at network layer (not fetch/axios mocks)
- Same mocks work in tests, Storybook, development
- No client-specific mocking logic
- Tests real request logic

```tsx
// ❌ WRONG - Mocking fetch implementation
vi.spyOn(global, 'fetch').mockResolvedValue({
  json: async () => ({ users: [...] }),
}); // Tight coupling, won't work in Storybook
```

```tsx
// ✅ CORRECT - MSW intercepts at network level
// Works in tests, Storybook, dev server
http.get('/api/users', () => {
  return HttpResponse.json({ users: [...] });
});
```

### setupServer Pattern

**In test setup file:**

```tsx
// test-setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**In handlers file:**

```tsx
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

```tsx
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

  render(<UserList />);

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

```tsx
// ❌ WRONG - Implementation detail
screen.getByTestId('user-menu');

// ✅ CORRECT - Accessibility query
screen.getByRole('button', { name: /user menu/i });
```

If accessible query fails, **your app has an accessibility issue.**

### ARIA Attributes

**When to add ARIA:**

✅ **Custom components** (where semantic HTML unavailable):
```tsx
<div role="dialog" aria-label="Confirmation Dialog">
  <h2>Are you sure?</h2>
  ...
</div>

// Query
screen.getByRole('dialog', { name: /confirmation/i });
```

❌ **DON'T add to semantic HTML** (redundant):
```tsx
// ❌ WRONG - Semantic HTML already has role
<button role="button">Submit</button>

// ✅ CORRECT - Semantic HTML is enough
<button>Submit</button>
```

### Semantic HTML Priority

**Always prefer semantic HTML over ARIA:**

```tsx
// ❌ WRONG - Custom element + ARIA
<div role="button" onClick={handleClick} tabIndex={0}>
  Submit
</div>

// ✅ CORRECT - Semantic HTML
<button onClick={handleClick}>
  Submit
</button>
```

**Semantic HTML provides:**
- Built-in keyboard navigation
- Built-in focus management
- Built-in screen reader support
- Less code, more accessibility

---

## React Testing Anti-Patterns

### 1. Not using `screen` object

❌ **WRONG - Query from render result**
```tsx
const { getByRole } = render(<MyComponent />);
const button = getByRole('button');
```

✅ **CORRECT - Use screen**
```tsx
render(<MyComponent />);
const button = screen.getByRole('button');
```

**Why:** `screen` is consistent, no destructuring, better error messages.

---

### 2. Using querySelector

❌ **WRONG - DOM implementation**
```tsx
const { container } = render(<MyComponent />);
const button = container.querySelector('.submit-btn');
```

✅ **CORRECT - Accessible query**
```tsx
render(<MyComponent />);
const button = screen.getByRole('button', { name: /submit/i });
```

---

### 3. Testing implementation details

❌ **WRONG - Component internals**
```tsx
const { result } = renderHook(() => useCounter());
expect(result.current.count).toBe(0); // Internal state
```

✅ **CORRECT - User-visible behavior**
```tsx
render(<Counter />);
expect(screen.getByText(/count: 0/i)).toBeInTheDocument();
```

---

### 4. Not using jest-dom matchers

❌ **WRONG - Manual assertions**
```tsx
expect(button.disabled).toBe(true);
expect(element.classList.contains('active')).toBe(true);
```

✅ **CORRECT - jest-dom matchers**
```tsx
expect(button).toBeDisabled();
expect(element).toHaveClass('active');
```

**Install:** `npm install -D @testing-library/jest-dom`

---

### 5. Manual cleanup() calls

❌ **WRONG - Manual cleanup**
```tsx
afterEach(() => {
  cleanup(); // Automatic since RTL 9!
});
```

✅ **CORRECT - No cleanup needed**
```tsx
// Cleanup happens automatically
```

---

### 6. Wrong assertion methods

❌ **WRONG - Property access**
```tsx
expect(input.value).toBe('test');
expect(checkbox.checked).toBe(true);
```

✅ **CORRECT - jest-dom matchers**
```tsx
expect(input).toHaveValue('test');
expect(checkbox).toBeChecked();
```

---

### 7. Unnecessary act() wrapping

❌ **WRONG - Manual act() everywhere**
```tsx
act(() => {
  render(<MyComponent />);
});

await act(async () => {
  await user.click(button);
});
```

✅ **CORRECT - RTL handles it**
```tsx
render(<MyComponent />);
await user.click(button);
```

---

### 8. beforeEach render pattern

❌ **WRONG - Shared render in beforeEach**
```tsx
let button;
beforeEach(() => {
  render(<MyComponent />);
  button = screen.getByRole('button'); // Shared state
});

it('test 1', () => {
  // Uses shared button from beforeEach
});
```

✅ **CORRECT - Factory function per test**
```tsx
const renderComponent = () => {
  render(<MyComponent />);
  return {
    button: screen.getByRole('button'),
  };
};

it('test 1', () => {
  const { button } = renderComponent(); // Fresh state
});
```

For factory patterns, see `testing` skill.

---

### 9. Multiple assertions in waitFor

❌ **WRONG - Multiple assertions**
```tsx
await waitFor(() => {
  expect(screen.getByText(/name/i)).toBeInTheDocument();
  expect(screen.getByText(/email/i)).toBeInTheDocument();
});
```

✅ **CORRECT - Single assertion per waitFor**
```tsx
await waitFor(() => {
  expect(screen.getByText(/name/i)).toBeInTheDocument();
});
expect(screen.getByText(/email/i)).toBeInTheDocument();
```

---

### 10. Side effects in waitFor

❌ **WRONG - Mutation in callback**
```tsx
await waitFor(() => {
  fireEvent.click(button); // Clicks multiple times!
  expect(result).toBe(true);
});
```

✅ **CORRECT - Side effects outside**
```tsx
fireEvent.click(button);
await waitFor(() => {
  expect(result).toBe(true);
});
```

---

### 11. Exact string matching

❌ **WRONG - Fragile exact match**
```tsx
screen.getByText('Welcome, John Doe'); // Breaks on whitespace change
```

✅ **CORRECT - Regex for flexibility**
```tsx
screen.getByText(/welcome.*john doe/i);
```

---

### 12. Wrong query variant for assertion

❌ **WRONG - getBy for non-existence**
```tsx
expect(() => screen.getByText(/error/i)).toThrow();
```

✅ **CORRECT - queryBy**
```tsx
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
```

---

### 13. Wrapping findBy in waitFor

❌ **WRONG - Redundant**
```tsx
await waitFor(() => screen.findByText(/success/i));
```

✅ **CORRECT - findBy already waits**
```tsx
await screen.findByText(/success/i);
```

---

### 14. Using testId when role available

❌ **WRONG - testId**
```tsx
screen.getByTestId('submit-button');
```

✅ **CORRECT - Role**
```tsx
screen.getByRole('button', { name: /submit/i });
```

---

### 15. Not installing ESLint plugins

**Install these plugins:**
```bash
npm install -D eslint-plugin-testing-library eslint-plugin-jest-dom
```

**.eslintrc.js:**
```js
{
  extends: [
    'plugin:testing-library/react',
    'plugin:jest-dom/recommended',
  ],
}
```

**Catches anti-patterns automatically.**

---

## Component Testing Patterns

### Testing Form Submissions

```tsx
it('should submit form with user input', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();

  render(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  });
});
```

### Testing Controlled Inputs

```tsx
it('should update input value as user types', async () => {
  const user = userEvent.setup();

  render(<SearchInput />);

  const input = screen.getByLabelText(/search/i);

  await user.type(input, 'react');

  expect(input).toHaveValue('react');
});
```

### Testing Conditional Rendering

```tsx
it('should show error when validation fails', async () => {
  const user = userEvent.setup();

  render(<RegistrationForm />);

  // Submit empty form
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Error appears
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});
```

### Testing Error/Loading States

```tsx
it('should show loading then error state', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 });
    })
  );

  render(<UserList />);

  // Loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Error state (after loading)
  await screen.findByText(/failed to load users/i);

  // Loading gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

**For test factory patterns**, see `testing` skill:
```tsx
// Reference: See `testing` skill for factory patterns
const user = getMockUser({ role: 'admin' });
render(<Dashboard user={user} />);
```

---

## Summary Checklist

Before merging component tests, verify:

- [ ] Using `getByRole` as first choice for queries
- [ ] Using `userEvent` with `setup()` (not `fireEvent`)
- [ ] Using `screen` object for all queries (not destructuring from render)
- [ ] Using `findBy*` for async elements (loading, API responses)
- [ ] Using `jest-dom` matchers (`toBeInTheDocument`, `toBeDisabled`, etc.)
- [ ] Testing behavior users see, not implementation details
- [ ] ESLint plugins installed (`@testing-library/eslint-plugin-testing-library`, `@testing-library/eslint-plugin-jest-dom`)
- [ ] No manual `cleanup()` calls (automatic since RTL 9)
- [ ] Context wrapped via `wrapper` option in `renderHook`
- [ ] MSW for API mocking (not fetch/axios mocks)
- [ ] Following TDD workflow (see `tdd` skill)
- [ ] Using test factories for data (see `testing` skill)
