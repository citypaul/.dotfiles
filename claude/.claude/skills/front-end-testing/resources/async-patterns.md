# Async Testing Patterns

UI frameworks are async by nature (state updates, API calls, suspense). These utilities handle async scenarios.

**Browser Mode note:** In Vitest Browser Mode, prefer `await expect.element(...)` — it auto-retries and replaces most `findBy`/`waitFor` usage. The patterns below apply primarily to `@testing-library/dom` + jsdom, but the anti-patterns apply anywhere these utilities are used.

## findBy Queries

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

## waitFor Utility

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

## waitForElementToBeRemoved

**For disappearance scenarios:**

```typescript
// ✅ CORRECT - Wait for loading spinner to disappear
await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

// ✅ CORRECT - Wait for modal to close
await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
```

**Note:** Must use `queryBy*` (returns null) not `getBy*` (throws).

## Common Patterns

**Loading states:**
```typescript
// Initially loading
expect(screen.getByText(/loading/i)).toBeInTheDocument();

// Wait for data
await screen.findByText(/john doe/i);

// Loading gone
expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
```

**API responses:**
```typescript
const user = userEvent.setup();

await user.type(screen.getByLabelText(/search/i), 'react');
await user.click(screen.getByRole('button', { name: /search/i }));

// Wait for results (after API response)
await waitFor(() => {
  expect(screen.getAllByRole('listitem')).toHaveLength(10);
});
```

**Debounced inputs:**
```typescript
await user.type(screen.getByLabelText(/search/i), 'react');

// Wait for debounced suggestions
await screen.findByText(/react testing library/i);
```

## waitFor Anti-Patterns

### Side effects in waitFor

❌ **WRONG - Mutation in callback**
```typescript
await waitFor(() => {
  fireEvent.click(button); // Clicks multiple times on retry!
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

### Multiple assertions in waitFor

❌ **WRONG - Multiple assertions**
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

### Wrapping findBy in waitFor

❌ **WRONG - Redundant**
```typescript
await waitFor(() => screen.findByText(/success/i));
```

✅ **CORRECT - findBy already waits**
```typescript
await screen.findByText(/success/i);
```
