# Seam Types for TypeScript/JavaScript

Deep dive on each seam type with examples. See the main `finding-seams` skill for overview and when-to-use guidance.

## Module Seams

The modern equivalent of Feathers' "link seams." The module system resolves imports at load time -- you can intercept this to substitute behavior.

```typescript
// production code: order-service.ts
import { sendConfirmation } from './email-client';

export const placeOrder = (order: Order): OrderResult => {
  const result = processPayment(order);
  if (result.success) {
    sendConfirmation(order.customerEmail, result.receipt);
  }
  return result;
};
```

```typescript
// test: order-service.test.ts
import { vi, describe, it, expect } from 'vitest';

// The MODULE SEAM -- replacing the import
vi.mock('./email-client', () => ({
  sendConfirmation: vi.fn(),
}));

import { placeOrder } from './order-service';
import { sendConfirmation } from './email-client';

describe('placeOrder', () => {
  it('sends confirmation on successful payment', () => {
    const result = placeOrder(validOrder);
    expect(sendConfirmation).toHaveBeenCalledWith(
      validOrder.customerEmail,
      expect.objectContaining({ id: expect.any(String) }),
    );
  });
});
```

**Enabling point:** The `vi.mock()` call in the test file.

**Trade-offs:** Fast to apply, no production code changes. But implicit -- bypasses TypeScript's type system, requires `clearAllMocks()` between tests, and the seam is invisible from the production code.

## Object Seams

Exploit polymorphism -- the fact that a method call does not define which implementation runs at runtime.

```typescript
// production code: report-generator.ts
class ReportGenerator {
  constructor(private readonly dataSource: DataSource) {}

  generate(period: DateRange): Report {
    const data = this.dataSource.fetch(period);  // SEAM
    return this.format(data);
  }

  // Also a seam -- protected method can be overridden
  protected format(data: RawData): Report {
    return { sections: data.rows.map(this.formatRow) };
  }
}
```

```typescript
// test: using constructor injection (enabling point: constructor arg)
const fakeDataSource: DataSource = {
  fetch: (period) => ({ rows: [testRow] }),
};
const generator = new ReportGenerator(fakeDataSource);

// test: using subclass override (enabling point: which class is instantiated)
class TestableReportGenerator extends ReportGenerator {
  protected override format(data: RawData): Report {
    return { sections: [{ raw: data }] };  // simplified for testing
  }
}
```

**Enabling point:** The constructor argument list, or the choice of which class to instantiate.

**Trade-offs:** Explicit, type-safe, visible in production code. Requires the dependency to be injectable (not constructed internally).

## Function Parameter Seams

In functional TypeScript, functions-as-values provide natural built-in seams. Every function parameter that accepts a callable is both a seam and its own enabling point.

```typescript
// production code: pricing.ts
type PriceResolver = (sku: string) => Money;

export const calculateTotal = (
  items: ReadonlyArray<LineItem>,
  resolvePrice: PriceResolver = lookupCatalogPrice,  // default = production behavior
): Money => {
  return items.reduce(
    (sum, item) => addMoney(sum, multiplyMoney(resolvePrice(item.sku), item.quantity)),
    zeroMoney,
  );
};
```

```typescript
// test: pricing.test.ts -- enabling point is the argument
const fixedPrice: PriceResolver = () => createMoney(1000, 'USD');

it('sums line items', () => {
  const total = calculateTotal(threeItems, fixedPrice);
  expect(total).toEqual(createMoney(3000, 'USD'));
});
```

**Enabling point:** The argument list -- caller decides which implementation to pass.

**Trade-offs:** Most explicit approach. Fully type-safe, no shared state between tests, no mocking framework needed. Preferred for functional codebases.

## Configuration Seams

Behavior varies based on external configuration rather than code substitution.

```typescript
// production code: feature-flags.ts
export const createFeatureFlags = (config: FeatureConfig) => ({
  isEnabled: (flag: string): boolean => config.flags[flag] ?? false,
});

// usage in production
const flags = createFeatureFlags(loadFromEnv());

// usage in test -- enabling point: the config object
const flags = createFeatureFlags({ flags: { 'new-checkout': true } });
```

**Enabling point:** The config source (env vars, config file, constructor argument).

**Trade-offs:** Good for infrastructure-level concerns. Less precise than other seam types -- affects broad behavior rather than specific dependencies.

## Comparison: When to Prefer Each Type

| Criterion | Module | Object | Function Param | Configuration |
|-----------|--------|--------|---------------|--------------|
| Speed to apply | Fast | Medium | Medium | Fast |
| Type safety | None (bypasses TS) | Full | Full | Full |
| Production code changes | None | May need refactoring | May need refactoring | Usually exists |
| Explicitness | Implicit | Explicit | Most explicit | Varies |
| Test isolation | Requires cleanup | Natural | Natural | Natural |
| Best for | Quick scaffolding | Class-based DI | Functional code | Feature toggling |
| Temporary or permanent | Temporary | Permanent | Permanent | Permanent |
