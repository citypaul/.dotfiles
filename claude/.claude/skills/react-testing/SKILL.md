---
name: react-testing
description: React Testing Library patterns for testing React components, hooks, and context. Use when testing React applications.
---

# React Testing Library

This skill focuses on React-specific testing patterns. For general DOM testing patterns (queries, userEvent, async, accessibility), load the `front-end-testing` skill. For TDD workflow, load the `tdd` skill.

---

## Testing React Components

**React components are just functions that return JSX.** Test them like functions: inputs (props) → output (rendered DOM).

### Basic Component Testing

```tsx
// ✅ CORRECT - Test component behavior
it('should display user name when provided', () => {
  render(<UserProfile name="Alice" email="alice@example.com" />);

  expect(screen.getByText(/alice/i)).toBeInTheDocument();
  expect(screen.getByText(/alice@example.com/i)).toBeInTheDocument();
});
```

```tsx
// ❌ WRONG - Testing implementation
it('should set name state', () => {
  const wrapper = mount(<UserProfile name="Alice" />);
  expect(wrapper.state('name')).toBe('Alice'); // Internal state!
});
```

### Testing Props

```tsx
// ✅ CORRECT - Test how props affect rendered output
it('should call onSubmit when form submitted', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();

  render(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
  });
});
```

### Testing Conditional Rendering

```tsx
// ✅ CORRECT - Test what user sees in different states
it('should show error message when login fails', async () => {
  server.use(
    http.post('/api/login', () => {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    })
  );

  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await screen.findByText(/invalid credentials/i);
});
```

---

## Testing React Hooks

### Custom Hooks with renderHook

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

### Hooks with Props

```tsx
it('should accept initial value', () => {
  const { result, rerender } = renderHook(
    ({ initialValue }) => useCounter(initialValue),
    { initialProps: { initialValue: 10 } }
  );

  expect(result.current.count).toBe(10);

  // Test with different initial value
  rerender({ initialValue: 20 });
  expect(result.current.count).toBe(20);
});
```

---

## Testing Context

### wrapper Option

**For hooks that need context providers:**

```tsx
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

### Multiple Providers

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

### Testing Components with Context

```tsx
// ✅ CORRECT - Wrap component in provider
const renderWithAuth = (ui, { user = null, ...options } = {}) => {
  return render(
    <AuthProvider initialUser={user}>
      {ui}
    </AuthProvider>,
    options
  );
};

it('should show user menu when authenticated', () => {
  renderWithAuth(<Dashboard />, {
    user: { name: 'Alice', role: 'admin' },
  });

  expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
});
```

---

## Testing Forms

### Controlled Inputs

```tsx
it('should update input value as user types', async () => {
  const user = userEvent.setup();

  render(<SearchInput />);

  const input = screen.getByLabelText(/search/i);

  await user.type(input, 'react');

  expect(input).toHaveValue('react');
});
```

### Form Submissions

```tsx
it('should submit form with user input', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();

  render(<RegistrationForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'Alice');
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /sign up/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'Alice',
    email: 'alice@example.com',
    password: 'password123',
  });
});
```

### Form Validation

```tsx
it('should show validation errors for invalid input', async () => {
  const user = userEvent.setup();

  render(<RegistrationForm />);

  // Submit empty form
  await user.click(screen.getByRole('button', { name: /sign up/i }));

  // Validation errors appear
  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  expect(screen.getByText(/password is required/i)).toBeInTheDocument();
});
```

---

## React-Specific Anti-Patterns

### 1. Unnecessary act() wrapping

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

**Modern RTL auto-wraps:**
- `render()`
- `userEvent` methods
- `fireEvent`
- `waitFor`, `findBy`

**When you DO need manual `act()`:**
- Custom hook state updates (`renderHook`)
- Direct state mutations (rare, usually bad practice)

---

### 2. Manual cleanup() calls

❌ **WRONG - Manual cleanup**
```tsx
afterEach(() => {
  cleanup(); // Automatic since RTL 9!
});
```

✅ **CORRECT - No cleanup needed**
```tsx
// Cleanup happens automatically after each test
```

---

### 3. beforeEach render pattern

❌ **WRONG - Shared render in beforeEach**
```tsx
let button;
beforeEach(() => {
  render(<MyComponent />);
  button = screen.getByRole('button'); // Shared state across tests
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

### 4. Testing component internals

❌ **WRONG - Accessing component internals**
```tsx
const wrapper = shallow(<MyComponent />);
expect(wrapper.state('isOpen')).toBe(true); // Internal state
expect(wrapper.instance().handleClick).toBeDefined(); // Internal method
```

✅ **CORRECT - Test rendered output**
```tsx
render(<MyComponent />);
expect(screen.getByRole('dialog')).toBeInTheDocument(); // What user sees
```

---

### 5. Shallow rendering

❌ **WRONG - Shallow rendering**
```tsx
const wrapper = shallow(<MyComponent />);
// Child components not rendered - incomplete test
```

✅ **CORRECT - Full rendering**
```tsx
render(<MyComponent />);
// Full component tree rendered - realistic test
```

**Why:** Shallow rendering hides integration bugs between parent/child components.

---

## Testing Loading States

```tsx
it('should show loading then data', async () => {
  render(<UserList />);

  // Initially loading
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for data
  await screen.findByText(/alice/i);

  // Loading gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

---

## Testing Error Boundaries

```tsx
it('should catch errors with error boundary', () => {
  // Suppress console.error for this test
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowsError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

  spy.mockRestore();
});
```

---

## Testing Portals

```tsx
it('should render modal in portal', () => {
  render(<Modal isOpen={true}>Modal content</Modal>);

  // Portal renders outside root, but Testing Library finds it
  expect(screen.getByText(/modal content/i)).toBeInTheDocument();
});
```

**Testing Library queries the entire document,** so portals work automatically.

---

## Testing Suspense

```tsx
it('should show fallback then content', async () => {
  render(
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );

  // Initially fallback
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for component
  await screen.findByText(/lazy content/i);
});
```

---

## Summary Checklist

React-specific checks:

- [ ] Using `render()` from @testing-library/react (not enzyme's shallow/mount)
- [ ] Using `renderHook()` for custom hooks
- [ ] Using `wrapper` option for context providers
- [ ] No manual `act()` calls (RTL handles it)
- [ ] No manual `cleanup()` calls (automatic)
- [ ] Testing component output, not internal state
- [ ] Using factory functions, not `beforeEach` render
- [ ] Following TDD workflow (see `tdd` skill)
- [ ] Using general DOM testing patterns (see `front-end-testing` skill)
- [ ] Using test factories for data (see `testing` skill)
