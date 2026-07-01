# Legacy: @testing-library/react Patterns

These patterns apply when using `@testing-library/react` with jsdom. **Prefer `vitest-browser-react`** (see the main skill) for new projects. Key dialect differences: `render()` is sync, queries go through the global `screen`, interactions use `@testing-library/user-event`, async appearance uses `findBy*`, and API mocking uses MSW's `setupServer`/`server.use()` (jsdom runs in Node).

## Basic Component Testing

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

## Testing Props and Callbacks

```tsx
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

## Testing Conditional Rendering

```tsx
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

(`server` comes from MSW's `setupServer` — correct for jsdom. In Browser Mode use `worker.use()` instead; see `front-end-testing` `resources/msw.md`.)

## Testing Hooks with renderHook

**Built into `@testing-library/react`** (no separate package needed). Unlike vitest-browser-react, `renderHook()` is sync and `act` is imported:

```tsx
import { renderHook, act } from '@testing-library/react';

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

  rerender({ initialValue: 20 });
  expect(result.current.count).toBe(20);
});
```

## Testing Context

### wrapper Option

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
const AllProviders = ({ children }: { children: React.ReactNode }) => (
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
// ✅ CORRECT - Wrap component in provider via a render helper
const renderWithAuth = (
  ui: React.ReactElement,
  { user = null, ...options }: { user?: User | null } & RenderOptions = {},
) => {
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

## act() in @testing-library/react

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

## Loading States

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

## Error Boundaries

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

## Portals

```tsx
it('should render modal in portal', () => {
  render(<Modal isOpen={true}>Modal content</Modal>);

  // Portal renders outside root, but Testing Library finds it
  expect(screen.getByText(/modal content/i)).toBeInTheDocument();
});
```

**Testing Library queries the entire document,** so portals work automatically.

## Suspense

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
