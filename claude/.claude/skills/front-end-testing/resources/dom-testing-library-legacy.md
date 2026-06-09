# Legacy: DOM Testing Library + jsdom Patterns

These patterns apply only when using `@testing-library/dom` directly with jsdom/happy-dom. **Prefer Vitest Browser Mode** for new projects — query priority, behavior-driven philosophy, and userEvent guidance in the main skill apply identically there with built-in equivalents.

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
// ❌ WRONG - Setup in beforeEach
let user;
beforeEach(() => {
  user = userEvent.setup(); // Shared state across tests
});
```

**Why:** Each test gets clean state, prevents test interdependence.

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

**Install:** `npm install -D @testing-library/jest-dom`

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

## Manual cleanup() Calls

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

## ESLint Plugins

**Install these plugins** to catch anti-patterns automatically:

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
