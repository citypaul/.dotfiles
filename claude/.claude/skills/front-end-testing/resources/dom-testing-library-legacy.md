# Legacy: DOM Testing Library + jsdom Patterns

These patterns apply only when using `@testing-library/dom` directly with jsdom/happy-dom. Keep this lighter harness when it proves the claim and fits the repository; choose Vitest Browser Mode when behavior depends on real rendering, CSS, focus, browser APIs, or browser event semantics. Query priority, behavior-driven philosophy, and userEvent guidance in the main skill apply in either environment.

## The screen Object

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

(Browser Mode equivalent: the `page` object from `vitest/browser`.)

## userEvent vs fireEvent

**Always use `userEvent` over `fireEvent`** for realistic interactions.

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

```typescript
// ✅ CORRECT - Fresh instance per test
it('should handle user input', async () => {
  const user = userEvent.setup();
  render('<input aria-label="Email" />');

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
});
```

```typescript
// ❌ WRONG - one stateful user shared by the whole suite
const user = userEvent.setup();
```

**Why:** Each test should get clean state. Creating a new instance in an
isolated `beforeEach` is also valid for non-concurrent tests; the defect is
reusing state across tests, not the lifecycle hook itself.

### Common Interactions

```typescript
const user = userEvent.setup();

await user.click(screen.getByRole('button', { name: /submit/i }));
await user.type(screen.getByLabelText(/email/i), 'test@example.com');
await user.keyboard('{Enter}');
await user.keyboard('{Shift>}A{/Shift}'); // Shift+A
await user.selectOptions(screen.getByLabelText(/country/i), 'USA');
await user.clear(screen.getByLabelText(/search/i));
```

## jest-dom Matchers

If the repository does not already provide equivalent matchers and setup is
authorized, apply the main skill's exact-version/local-package-manager policy:
`<repo-pm> add --save-dev @testing-library/jest-dom@<reviewed-version>`.

(Browser Mode has equivalent matchers built in via `expect.element()` — do not install jest-dom there.)

❌ **WRONG - Manual property assertions**
```typescript
expect(button.disabled).toBe(true);
expect(element.classList.contains('active')).toBe(true);
expect(input.value).toBe('test');
expect(checkbox.checked).toBe(true);
```

✅ **CORRECT - jest-dom matchers**
```typescript
expect(button).toBeDisabled();
expect(element).toHaveClass('active');
expect(input).toHaveValue('test');
expect(checkbox).toBeChecked();
```

**Why:** Better failure messages, clearer intent.

## Cleanup Ownership

When the runner exposes the global `afterEach` hook that Testing Library
expects, cleanup is automatic and another cleanup hook is redundant:

```typescript
// No cleanup hook needed: this harness has verified auto-cleanup.
```

Vitest defaults to `globals: false`; if the repository does not install an
equivalent global hook, register cleanup explicitly in shared test setup:

```typescript
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

## ESLint Plugins

If the repository's lint policy adopts these plugins, install reviewed exact
versions through its package manager:

```bash
<repo-pm> add --save-dev eslint-plugin-testing-library@<reviewed-version> eslint-plugin-jest-dom@<reviewed-version>
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
