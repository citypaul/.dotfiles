# Creating Seams Where None Exist

FP-first techniques for introducing seams into tightly-coupled code. See the main `finding-seams` skill for overview. For class-based techniques (extract and override, parameterize constructor), see `oop-patterns.md`.

Each technique serves two purposes: **sensing** (observing what code does) and **separation** (running code without real collaborators).

## Technique 1: Parameterize Function

Add a parameter for the dependency with a production default. The simplest and most explicit technique.

```typescript
// BEFORE -- hidden dependency, no seam
const processOrder = (order: Order): OrderResult => {
  const tax = fetchTaxRate(order.region);  // calls external service
  return { ...order, total: order.subtotal * (1 + tax) };
};
```

```typescript
// AFTER -- dependency is a parameter with production default
type TaxResolver = (region: string) => number;

const processOrder = (
  order: Order,
  resolveTax: TaxResolver = fetchTaxRate,
): OrderResult => {
  const tax = resolveTax(order.region);
  return { ...order, total: order.subtotal * (1 + tax) };
};

// Test -- for SEPARATION (skip the real service)
const result = processOrder(order, () => 0.08);
expect(result.total).toBe(108);

// Test -- for SENSING (observe what was called)
const taxCalls: string[] = [];
const sensingTax: TaxResolver = (region) => { taxCalls.push(region); return 0.1; };
processOrder(order, sensingTax);
expect(taxCalls).toEqual(['US-CA']);
```

**When to use:** Default choice for any function with a hard-coded dependency.

## Technique 2: Higher-Order Function (Factory)

When a function has multiple dependencies, wrap it in a factory that returns a configured function:

```typescript
// BEFORE -- multiple hidden dependencies
const calculateInvoice = (lineItems: ReadonlyArray<LineItem>): Invoice => {
  const prices = lineItems.map(item => lookupPrice(item.sku));
  const subtotal = prices.reduce((sum, p) => sum + p, 0);
  const tax = getTaxRate() * subtotal;
  const formatted = formatCurrency(subtotal + tax);
  return { lineItems, subtotal, tax, total: subtotal + tax, display: formatted };
};
```

```typescript
// AFTER -- factory accepts dependencies, returns pure function
type InvoiceDeps = {
  readonly lookupPrice: (sku: string) => number;
  readonly getTaxRate: () => number;
  readonly formatCurrency: (amount: number) => string;
};

const createInvoiceCalculator = (deps: InvoiceDeps) =>
  (lineItems: ReadonlyArray<LineItem>): Invoice => {
    const prices = lineItems.map(item => deps.lookupPrice(item.sku));
    const subtotal = prices.reduce((sum, p) => sum + p, 0);
    const tax = deps.getTaxRate() * subtotal;
    return {
      lineItems,
      subtotal,
      tax,
      total: subtotal + tax,
      display: deps.formatCurrency(subtotal + tax),
    };
  };

// Production -- wire real dependencies
const calculateInvoice = createInvoiceCalculator({
  lookupPrice: catalogApi.getPrice,
  getTaxRate: () => parseFloat(process.env.TAX_RATE!),
  formatCurrency: intlFormat,
});

// Test -- wire fakes
const calculateInvoice = createInvoiceCalculator({
  lookupPrice: () => 100,
  getTaxRate: () => 0.2,
  formatCurrency: (n) => `$${n}`,
});
const invoice = calculateInvoice([testItem]);
expect(invoice.total).toBe(120);
expect(invoice.display).toBe('$120');
```

**When to use:** Functions with 2+ dependencies. This is the FP equivalent of constructor injection.

## Technique 3: Extract Type (Contract)

Create a type for the dependency so you can substitute implementations. Defines a narrow contract rather than depending on a broad API.

```typescript
// BEFORE -- coupled to concrete S3 SDK
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const uploadReport = async (report: Report): Promise<string> => {
  const client = new S3Client({ region: 'us-east-1' });
  await client.send(new PutObjectCommand({
    Bucket: 'reports', Key: report.id, Body: report.content,
  }));
  return `s3://reports/${report.id}`;
};
```

```typescript
// AFTER -- narrow type defines the contract
type FileStorage = {
  readonly upload: (key: string, content: string) => Promise<string>;
};

const uploadReport = async (
  report: Report,
  storage: FileStorage = s3Storage,
): Promise<string> =>
  storage.upload(report.id, report.content);

// Production adapter (thin wrapper)
const s3Storage: FileStorage = {
  upload: async (key, content) => {
    const client = new S3Client({ region: 'us-east-1' });
    await client.send(new PutObjectCommand({
      Bucket: 'reports', Key: key, Body: content,
    }));
    return `s3://reports/${key}`;
  },
};

// Test fake -- for SENSING
type Upload = { readonly key: string; readonly content: string };

const createInMemoryStorage = () => {
  const stored: Upload[] = [];
  return {
    upload: async (key: string, content: string) => { stored.push({ key, content }); return `mem://${key}`; },
    uploads: (): ReadonlyArray<Upload> => [...stored],
  };
};

const storage = createInMemoryStorage();
await uploadReport(testReport, storage);
expect(storage.uploads()).toEqual([{ key: 'report-1', content: 'data' }]);
```

**When to use:** When the real dependency has a large API surface and you want a narrow, focused contract.

## Technique 4: Wrap Global/Static Calls

Wrap direct global or static calls in a function that can be passed as a parameter:

```typescript
// BEFORE -- direct static call, no seam
const isAuthorised = (user: User): boolean => {
  const session = SessionManager.getCurrentSession();  // global state
  return session.roles.includes(user.requiredRole);
};
```

```typescript
// AFTER -- wrapped in a default parameter
type SessionProvider = () => Session;

const isAuthorised = (
  user: User,
  getSession: SessionProvider = () => SessionManager.getCurrentSession(),
): boolean => {
  const session = getSession();
  return session.roles.includes(user.requiredRole);
};

// Test
const fakeSession: SessionProvider = () => ({
  roles: ['admin'],
  userId: 'test',
});
expect(isAuthorised(adminUser, fakeSession)).toBe(true);
expect(isAuthorised(viewerUser, fakeSession)).toBe(false);
```

**When to use:** Code with global function dependencies you cannot modify directly. Common with `Date.now()`, `Math.random()`, `process.env`.

## Technique 5: Module Indirection (Scaffolding)

Move a direct import behind a thin module that can be mocked. **Temporary scaffolding** -- migrate to parameter injection once you have tests.

```typescript
// BEFORE -- direct import of heavy dependency
import { analyzeImage } from 'heavy-ml-library';

export const classifyUpload = (image: Buffer): Classification =>
  analyzeImage(image);
```

```typescript
// AFTER -- indirection layer (the seam)
// image-analyzer.ts
import { analyzeImage } from 'heavy-ml-library';
export const analyze = (image: Buffer): Classification => analyzeImage(image);

// classify.ts -- depends on the seam, not the heavy library
import { analyze } from './image-analyzer';
export const classifyUpload = (image: Buffer): Classification => analyze(image);

// test -- mock the thin indirection module
vi.mock('./image-analyzer', () => ({
  analyze: () => ({ label: 'cat', confidence: 0.99 }),
}));
```

**When to use:** When you cannot change the function signature yet but need to isolate a heavy/slow dependency. Convert to parameter injection next.

## Two Reasons to Break Dependencies

Every technique above can serve either purpose:

| Purpose | Goal | Example |
|---------|------|---------|
| **Separation** | Run code in isolation without real collaborators | Pass `() => 0.08` instead of calling the tax API |
| **Sensing** | Observe what code does (args passed, functions called) | Collect calls in an array, assert against them |

When writing your first characterisation tests, you typically need **separation** first (get the code running in a test), then add **sensing** to verify specific behaviors.
