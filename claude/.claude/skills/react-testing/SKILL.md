---
name: react-testing
description: React component testing patterns including components, hooks, context, and forms. Covers Vitest Browser Mode with vitest-browser-react (preferred) and @testing-library/react. Use when testing React applications. For general UI testing patterns, see the front-end-testing skill.
---

# React Testing

For general UI testing patterns (queries, events, async, accessibility, MSW), load the `front-end-testing` skill. For TDD workflow, load the `tdd` skill.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `resources/testing-library-react-legacy.md` | Working in a `@testing-library/react` + jsdom codebase — sync render, `screen` queries, imported `act`, render helpers, legacy form/hook/context examples |

---

## Vitest Browser Mode with React (Preferred)

**Always prefer `vitest-browser-react` over `@testing-library/react`.** Tests run in a real browser, giving production-accurate rendering, events, and CSS.

### Setup

Extend the Browser Mode config from the `front-end-testing` skill with the React plugin and `vitest-browser-react`:

```bash
npm install -D vitest @vitest/browser-playwright vitest-browser-react @vitejs/plugin-react
```

```typescript
// vitest.config.ts — same as front-end-testing Browser Mode config, plus:
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    browser: { /* unchanged from front-end-testing setup */ },
  },
})
```

### Component Testing

```tsx
import { render } from 'vitest-browser-react'
import { expect, test } from 'vitest'

test('should display user name when provided', async () => {
  const screen = await render(<UserProfile name="Alice" email="alice@example.com" />)

  await expect.element(screen.getByText(/alice/i)).toBeVisible()
  await expect.element(screen.getByText(/alice@example.com/i)).toBeVisible()
})
```

**Key differences from `@testing-library/react`:**
- `render()` and `renderHook()` are async — use `await`
- Returns a `screen` scoped to the rendered component
- Use `expect.element()` for auto-retrying assertions
- No `act()` wrapper needed for component interactions via locators — CDP events + retry handle timing. `renderHook` state updates still need `act` (returned by `renderHook`, see below)
- Auto-cleanup happens before each test (not after), so components stay visible for debugging

### Testing Props and Callbacks

```tsx
test('should call onSubmit when form submitted', async () => {
  const handleSubmit = vi.fn()
  const screen = await render(<LoginForm onSubmit={handleSubmit} />)

  await screen.getByLabelText(/email/i).fill('test@example.com')
  await screen.getByRole('button', { name: /submit/i }).click()

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
  })
})
```

### Testing Conditional Rendering (with MSW)

Browser Mode tests run in a real browser, so use MSW's `setupWorker` (`msw/browser`) — not `setupServer`. Start the worker in a setup file and override per test with `worker.use()`. Full setup: `front-end-testing` skill, `resources/msw.md`.

```tsx
import { http, HttpResponse } from 'msw'
import { worker } from '../vitest.browser.setup'

test('should show error message when login fails', async () => {
  worker.use(
    http.post('/api/login', () => {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    })
  )

  const screen = await render(<LoginForm />)

  await screen.getByLabelText(/email/i).fill('wrong@example.com')
  await screen.getByRole('button', { name: /submit/i }).click()

  await expect.element(screen.getByText(/invalid credentials/i)).toBeVisible()
})
```

### Testing Hooks with renderHook

`renderHook()` is async and returns `act` alongside `result` — use that `act` for hook state updates:

```tsx
import { renderHook } from 'vitest-browser-react'

test('should toggle value', async () => {
  const { result, act } = await renderHook(() => useToggle(false))

  expect(result.current.value).toBe(false)

  await act(() => {
    result.current.toggle()
  })

  expect(result.current.value).toBe(true)
})
```

### Testing Context Providers

```tsx
test('should show user menu when authenticated', async () => {
  const screen = await render(
    <AuthProvider initialUser={{ name: 'Alice', role: 'admin' }}>
      <Dashboard />
    </AuthProvider>
  )

  await expect.element(screen.getByRole('button', { name: /user menu/i })).toBeVisible()
})
```

For hooks that need context:
```tsx
const { result } = await renderHook(() => useAuth(), {
  wrapper: ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
  ),
})
```

### Testing Forms

```tsx
test('should submit form with user input', async () => {
  const handleSubmit = vi.fn()
  const screen = await render(<RegistrationForm onSubmit={handleSubmit} />)

  await screen.getByLabelText(/name/i).fill('Alice')
  await screen.getByLabelText(/email/i).fill('alice@example.com')
  await screen.getByLabelText(/password/i).fill('password123')
  await screen.getByRole('button', { name: /sign up/i }).click()

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'Alice',
    email: 'alice@example.com',
    password: 'password123',
  })
})

test('should show validation errors for invalid input', async () => {
  const screen = await render(<RegistrationForm />)

  // Submit empty form
  await screen.getByRole('button', { name: /sign up/i }).click()

  // Validation errors appear
  await expect.element(screen.getByText(/name is required/i)).toBeVisible()
  await expect.element(screen.getByText(/email is required/i)).toBeVisible()
  await expect.element(screen.getByText(/password is required/i)).toBeVisible()
})
```

### Testing Loading States

```tsx
test('should show loading then data', async () => {
  const screen = await render(<UserList />)

  await expect.element(screen.getByText(/loading/i)).toBeVisible()

  await expect.element(screen.getByText(/alice/i)).toBeVisible()
  await expect.element(screen.getByText(/loading/i)).not.toBeInTheDocument()
})
```

### Testing Error Boundaries

```tsx
test('should catch errors with error boundary', async () => {
  // Suppress console.error noise for this test
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

  const screen = await render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowsError />
    </ErrorBoundary>
  )

  await expect.element(screen.getByText(/something went wrong/i)).toBeVisible()

  spy.mockRestore()
})
```

### Testing Portals

```tsx
test('should render modal in portal', async () => {
  const screen = await render(<Modal isOpen={true}>Modal content</Modal>)

  // Portal renders outside the component root; query the page instead
  await expect.element(page.getByText(/modal content/i)).toBeVisible()
})
```

The returned `screen` is scoped to the rendered component — for portal content, use the document-wide `page` from `vitest/browser`.

### Testing Suspense

```tsx
test('should show fallback then content', async () => {
  const screen = await render(
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  )

  await expect.element(screen.getByText(/loading/i)).toBeVisible()

  await expect.element(screen.getByText(/lazy content/i)).toBeVisible()
})
```

### React Server Components

RSCs can't be tested in Browser Mode component tests — they execute on the server, not in the browser. Test them with e2e tests (Playwright against a running app) or unit tests of logic extracted from the component. Client components (`'use client'`) test normally with `vitest-browser-react`.

---

## React-Specific Anti-Patterns

### 1. Unnecessary act() wrapping

❌ **WRONG - Manual act() around renders and interactions**
```tsx
await act(async () => {
  await screen.getByRole('button').click()
})
```

✅ **CORRECT - Locator events handle timing**
```tsx
await screen.getByRole('button').click()
```

**When you DO need `act()`:** hook state updates via `renderHook` (use the `act` it returns). In `@testing-library/react`, RTL auto-wraps `render`/`userEvent`/`waitFor` — see `resources/testing-library-react-legacy.md`.

### 2. Testing component internals

❌ **WRONG - Accessing component internals**
```tsx
const wrapper = shallow(<MyComponent />);
expect(wrapper.state('isOpen')).toBe(true); // Internal state
expect(wrapper.instance().handleClick).toBeDefined(); // Internal method
```

✅ **CORRECT - Test rendered output**
```tsx
const screen = await render(<MyComponent />)
await expect.element(screen.getByRole('dialog')).toBeVisible() // What user sees
```

### 3. Shallow rendering

❌ **WRONG - Shallow rendering**
```tsx
const wrapper = shallow(<MyComponent />);
// Child components not rendered - incomplete test
```

✅ **CORRECT - Full rendering**
```tsx
await render(<MyComponent />)
// Full component tree rendered - realistic test
```

**Why:** Shallow rendering hides integration bugs between parent/child components.

### 4. Shared renders and manual cleanup

The beforeEach-render and manual `cleanup()` anti-patterns apply to React exactly as to any UI test — see the `front-end-testing` skill (Core Anti-Patterns). Use a factory function per test; cleanup is automatic.

---

## Summary Checklist

React-specific checks:

- [ ] **Preferred**: Using `vitest-browser-react` with Vitest Browser Mode (real browser)
- [ ] **Fallback**: Using `@testing-library/react` if Browser Mode not yet configured (see `resources/testing-library-react-legacy.md`)
- [ ] All Playwright/Browser Mode tests are idempotent (no shared state between tests)
- [ ] `render()`/`renderHook()` awaited (they are async in vitest-browser-react)
- [ ] Using `renderHook()` for custom hooks, with its returned `act` for state updates
- [ ] Using `wrapper` option for context providers
- [ ] No manual `act()` around renders or locator interactions
- [ ] No manual `cleanup()` calls (automatic)
- [ ] MSW via `setupWorker`/`worker.use()` in Browser Mode (not `setupServer`)
- [ ] Testing component output, not internal state
- [ ] Using factory functions, not `beforeEach` render
- [ ] Using `expect.element()` for auto-retrying assertions (Browser Mode)
- [ ] RSCs tested via e2e or extracted logic, not Browser Mode component tests
- [ ] Following TDD workflow (see `tdd` skill)
- [ ] Using general UI testing patterns (see `front-end-testing` skill)
- [ ] Using test factories for data (see `testing` skill)
