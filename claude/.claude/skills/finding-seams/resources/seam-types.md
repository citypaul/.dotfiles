# Seam Types for TypeScript/JavaScript

FP-first examples of each seam type. See the main `finding-seams` skill for overview. For class-based patterns (object seams, subclass and override), see `oop-patterns.md`.

## Function Parameter Seams (Primary Technique)

The **default choice** in functional TypeScript. Every function parameter that accepts a callable is both a seam and its own enabling point. No mocking framework required.

### Basic: Default Parameter

```typescript
type TaxResolver = (region: string) => number;

const calculateTotal = (
  items: ReadonlyArray<LineItem>,
  resolveTax: TaxResolver = fetchTaxRate,  // production default
): Money => {
  const subtotal = items.reduce(
    (sum, item) => addMoney(sum, multiplyMoney(item.price, item.quantity)),
    zeroMoney,
  );
  const tax = resolveTax(items[0]?.region ?? 'default');
  return addMoney(subtotal, multiplyMoney(subtotal, tax));
};

// Test -- enabling point is the argument list
const fixedTax: TaxResolver = () => 0.08;
const result = calculateTotal(threeItems, fixedTax);
expect(result).toEqual(createMoney(3240, 'USD'));
```

### Higher-Order Function: Factory Pattern

When a function needs multiple dependencies, return a configured function:

```typescript
type Dependencies = {
  readonly resolvePrice: (sku: string) => Money;
  readonly applyDiscount: (total: Money, code: string) => Money;
};

const createOrderCalculator = ({
  resolvePrice,
  applyDiscount,
}: Dependencies) => (
  items: ReadonlyArray<LineItem>,
  discountCode?: string,
): Money => {
  const total = items.reduce(
    (sum, item) => addMoney(sum, multiplyMoney(resolvePrice(item.sku), item.quantity)),
    zeroMoney,
  );
  return discountCode ? applyDiscount(total, discountCode) : total;
};

// Production
const calculateOrder = createOrderCalculator({
  resolvePrice: lookupCatalogPrice,
  applyDiscount: fetchDiscountFromApi,
});

// Test -- wire in fakes
const calculateOrder = createOrderCalculator({
  resolvePrice: () => createMoney(1000, 'USD'),
  applyDiscount: (total) => multiplyMoney(total, 0.9),
});
```

### Sensing: Capturing Calls Without Mocks

When you need to observe what a dependency was called with (sensing), use a closure that accumulates calls internally and returns a snapshot when queried:

```typescript
type NotifyCall = { readonly to: string; readonly body: string };

const createSensingNotifier = () => {
  const recorded: NotifyCall[] = [];
  return {
    notify: (to: string, body: string): void => { recorded.push({ to, body }); },
    calls: (): ReadonlyArray<NotifyCall> => [...recorded],
  };
};

// Test
const sensing = createSensingNotifier();
processOrder(testOrder, { notify: sensing.notify });
expect(sensing.calls()).toEqual([
  { to: 'customer@example.com', body: expect.stringContaining('Order confirmed') },
]);
```

## React/Next.js Seams

In React, **props are function parameter seams** and **context providers are configuration seams**.

### Props as Seams

```typescript
type OrderSummaryProps = {
  readonly items: ReadonlyArray<LineItem>;
  readonly formatCurrency?: (amount: Money) => string;  // seam
};

const OrderSummary = ({
  items,
  formatCurrency = defaultFormatCurrency,
}: OrderSummaryProps) => (
  <div>{items.map(item => (
    <span key={item.id}>{formatCurrency(item.price)}</span>
  ))}</div>
);

// Test -- swap the formatter
render(<OrderSummary items={testItems} formatCurrency={() => '$10.00'} />);
```

### Context as Seams

```typescript
// Production context provides real API client
const ApiContext = createContext<ApiClient>(realApiClient);

// Test -- wrap with fake provider
render(
  <ApiContext.Provider value={fakeApiClient}>
    <OrderPage />
  </ApiContext.Provider>
);
```

### MSW as a Module-Level Seam for API Boundaries

MSW intercepts network requests at the service worker level -- effectively a link seam for HTTP boundaries:

```typescript
const handlers = [
  http.get('/api/orders', () => HttpResponse.json(testOrders)),
];
const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterAll(() => server.close());
```

## Configuration Seams

Behavior varies based on external configuration. Use a function parameter with a production default instead of reading `process.env` directly.

```typescript
// ❌ Hard-coded env access -- no seam
const getApiUrl = () => process.env.API_URL!;

// ✅ Default parameter seam
const createClient = (
  getApiUrl = () => process.env.API_URL!,
) => ({
  fetch: (path: string) => fetch(`${getApiUrl()}${path}`),
});

// Test
const client = createClient(() => 'http://localhost:3001');
```

For feature flags:

```typescript
type FeatureFlags = {
  readonly isEnabled: (flag: string) => boolean;
};

const processCheckout = (
  cart: Cart,
  features: FeatureFlags = productionFlags,
): CheckoutResult => {
  const discount = features.isEnabled('holiday-sale')
    ? applyHolidayDiscount(cart)
    : cart;
  return finalize(discount);
};

// Test
const allEnabled: FeatureFlags = { isEnabled: () => true };
const result = processCheckout(testCart, allEnabled);
```

## Module Seams (Last Resort)

`vi.mock()` / `jest.mock()` replaces imports at the module level. **Use only as temporary scaffolding** when you cannot modify the production code yet.

```typescript
// ⚠️ SCAFFOLDING ONLY -- migrate to parameter injection
vi.mock('./email-client', () => ({
  sendConfirmation: vi.fn(),
}));

import { placeOrder } from './order-service';
import { sendConfirmation } from './email-client';

it('sends confirmation on successful payment', () => {
  placeOrder(validOrder);
  expect(sendConfirmation).toHaveBeenCalledWith(
    validOrder.customerEmail,
    expect.objectContaining({ id: expect.any(String) }),
  );
});
```

**Why last resort:**
- Bypasses TypeScript's type system entirely
- Creates implicit coupling between test and implementation
- Requires `vi.clearAllMocks()` between tests (shared mutable state)
- The seam is invisible from production code

**Migration path:** Once you have characterisation tests via `vi.mock()`, refactor the production code to accept the dependency as a parameter, then remove the mock.

## Comparison: When to Prefer Each Type

| Criterion | Function Parameter | Configuration | Module Mock | Object (OOP) |
|-----------|-------------------|---------------|-------------|-------------|
| Type safety | Full | Full | None | Full |
| Explicitness | Most explicit | Explicit | Implicit | Explicit |
| Test isolation | Natural | Natural | Requires cleanup | Natural |
| Production changes | May need refactoring | Usually exists | None | May need refactoring |
| Permanence | Permanent | Permanent | **Temporary only** | Permanent |
| Best for | **Default choice** | Infrastructure | Quick scaffolding | Legacy class code |
