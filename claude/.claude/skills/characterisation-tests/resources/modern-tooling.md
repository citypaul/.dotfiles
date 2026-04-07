# Modern Tooling for Characterisation Tests

TypeScript/JavaScript tooling that supports the characterisation testing workflow. See the main `characterisation-tests` skill for the process and heuristics.

## Vitest Snapshot Testing

Snapshots automate the "let the failure tell you the behavior" step. Instead of manually copying expected values, the framework captures them.

### Inline Snapshots (Preferred for Characterisation)

The expected value lives right in the test file. Vitest fills it in on first run.

```typescript
it('characterises formatAddress', () => {
  // First run: leave the argument empty -- Vitest fills it in
  expect(formatAddress(testAddress)).toMatchInlineSnapshot();
});

// After first run, Vitest rewrites the file:
it('characterises formatAddress', () => {
  expect(formatAddress(testAddress)).toMatchInlineSnapshot(`
    "123 Main St
    Suite 4B
    Springfield, IL 62701"
  `);
});
```

Inline snapshots are ideal for characterisation because the actual behavior is visible right next to the call -- no separate snapshot file to track.

### File Snapshots

For large outputs (HTML, JSON payloads), write to a separate file:

```typescript
it('characterises full report output', () => {
  const report = generateReport(testData);
  expect(report).toMatchFileSnapshot('./snapshots/report-baseline.txt');
});
```

### When to Use Each

| Approach | Use when |
|----------|----------|
| `toMatchInlineSnapshot()` | Output is short (< 20 lines), readability matters |
| `toMatchSnapshot()` | Output is medium, co-located `.snap` file is fine |
| `toMatchFileSnapshot()` | Output is large, or you want a human-reviewable baseline file |
| Manual `toBe()` / `toEqual()` | You want to document specific values with intent |

## Combination Testing

Test many input combinations at once to rapidly characterise a function's behavior. The `jest-extended-snapshot` library provides `.toVerifyAllCombinations()`:

```typescript
import 'jest-extended-snapshot';

describe('calculateDiscount characterisation', () => {
  it('characterises all input combinations', () => {
    expect(calculateDiscount).toVerifyAllCombinations(
      [100, 1000, 10000, 15000],             // amount
      ['standard', 'premium', 'business'],    // customerType
      [0, 1, 3, 5, 7, 10],                   // years
    );
    // Generates one snapshot covering all 72 combinations
  });
});
```

This provides broad characterisation with minimal test code. The snapshot captures every combination's result, so any behavioral change is detected.

**Trade-off:** Combination tests are excellent for initial characterisation but poor for documentation -- a list of 72 results doesn't explain *why* the behavior differs. Replace with focused tests as you understand the code.

## Handling Non-Determinism

Characterisation tests must be deterministic. Common sources of non-determinism and their fixes:

### Dates and Timestamps

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### Random Values / UUIDs

```typescript
// Option 1: mock the source
vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-001');

// Option 2: use property matchers with snapshots
expect(result).toMatchSnapshot({
  id: expect.any(String),
  createdAt: expect.any(Date),
});
```

### External Service Responses

Use the `finding-seams` skill to identify and break the dependency before characterising. Module seams (`vi.mock()`) are the fastest path to isolating external calls.

## Approval Testing Workflow

For complex outputs where automated comparison isn't enough, use an explicit approval step:

1. Run code, capture output as `.received.txt`
2. Compare against `.approved.txt` (the golden master)
3. If no approved file exists, the test fails -- a human must review and approve
4. If files differ, the test fails -- a human reviews the change

The `approvals` npm package (`npm install approvals`) provides this workflow with Vitest/Jest integration and diff tool support.

**When to prefer approval tests:** When the output is complex enough that a human should review it before accepting as baseline (e.g., HTML rendering, PDF generation, complex business reports).

## Coverage-Guided Characterisation

Use coverage and mutation testing as a feedback loop to know when you've characterised enough:

1. **Run tests with coverage**: `vitest --coverage`
2. **Identify untested branches**: look for red/uncovered lines in the area you're changing
3. **Add characterisation tests** targeting those paths
4. **Repeat** until the change area + one layer out has adequate branch coverage
5. **Validate with mutation testing**: run the `mutation-testing` skill against the change area

Coverage tells you which paths are *exercised*. Mutation testing tells you which are *protected*. A test that executes a branch but doesn't assert on its effect is a false sense of security. Use both before starting your actual changes.
