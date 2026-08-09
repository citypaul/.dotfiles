# Creating Seams Where None Exist

FP-first techniques for introducing seams into tightly-coupled code. See the main `finding-seams` skill for overview. For class-based techniques (extract and override, parameterize constructor), see `oop-patterns.md`.

Each technique serves two purposes: **sensing** (observing what code does) and **separation** (running code without real collaborators).

## Technique 1: Parameterize Function

Add a parameter for the dependency with a production default. The simplest and most explicit technique.

```typescript
// BEFORE -- hidden dependency, no seam
const scheduleDelivery = (delivery: Delivery): DeliveryPlan => {
  const transitDays = fetchTransitDays(delivery.region);  // calls external service
  return { ...delivery, totalDays: delivery.preparationDays + transitDays };
};
```

```typescript
// AFTER -- dependency is a parameter with production default
type TransitDaysResolver = (region: string) => number;

const scheduleDelivery = (
  delivery: Delivery,
  resolveTransitDays: TransitDaysResolver = fetchTransitDays,
): DeliveryPlan => {
  const transitDays = resolveTransitDays(delivery.region);
  return { ...delivery, totalDays: delivery.preparationDays + transitDays };
};

// Test -- for SEPARATION (skip the real service)
const delivery = { ...testDelivery, preparationDays: 3 };
const result = scheduleDelivery(delivery, () => 2);
expect(result.totalDays).toBe(5);

// Test -- for SENSING (observe what was called)
const transitCalls: string[] = [];
const sensingTransitDays: TransitDaysResolver = (region) => { transitCalls.push(region); return 4; };
scheduleDelivery(delivery, sensingTransitDays);
expect(transitCalls).toEqual(['US-CA']);
```

**When to use:** Default choice for any function with a hard-coded dependency.

## Technique 2: Higher-Order Function (Factory)

When a function has multiple dependencies, wrap it in a factory that returns a configured function:

```typescript
// BEFORE -- multiple hidden dependencies
const calculateShipment = (lineItems: ReadonlyArray<LineItem>): Shipment => {
  const weights = lineItems.map(item => lookupWeightGrams(item.sku));
  const contentsWeightGrams = weights.reduce((sum, grams) => sum + grams, 0);
  const packagingWeightGrams = getPackagingWeightGrams();
  const totalWeightGrams = contentsWeightGrams + packagingWeightGrams;
  return {
    lineItems,
    contentsWeightGrams,
    packagingWeightGrams,
    totalWeightGrams,
    display: formatWeight(totalWeightGrams),
  };
};
```

```typescript
// AFTER -- factory accepts dependencies, returns pure function
type ShipmentDeps = {
  readonly lookupWeightGrams: (sku: string) => number;
  readonly getPackagingWeightGrams: () => number;
  readonly formatWeight: (grams: number) => string;
};

const createShipmentCalculator = (deps: ShipmentDeps) =>
  (lineItems: ReadonlyArray<LineItem>): Shipment => {
    const weights = lineItems.map(item => deps.lookupWeightGrams(item.sku));
    const contentsWeightGrams = weights.reduce((sum, grams) => sum + grams, 0);
    const packagingWeightGrams = deps.getPackagingWeightGrams();
    const totalWeightGrams = contentsWeightGrams + packagingWeightGrams;
    return {
      lineItems,
      contentsWeightGrams,
      packagingWeightGrams,
      totalWeightGrams,
      display: deps.formatWeight(totalWeightGrams),
    };
  };

// Production -- wire real dependencies
const calculateShipment = createShipmentCalculator({
  lookupWeightGrams: (sku) => catalogApi.getWeightGrams(sku),
  getPackagingWeightGrams: () => packagingCatalog.getStandardWeightGrams(),
  formatWeight: formatGrams,
});

// Test -- wire fakes
const calculateShipment = createShipmentCalculator({
  lookupWeightGrams: () => 100,
  getPackagingWeightGrams: () => 20,
  formatWeight: (grams) => `${grams} g`,
});
const shipment = calculateShipment([testItem]);
expect(shipment.totalWeightGrams).toBe(120);
expect(shipment.display).toBe('120 g');
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

## Technique 6: Parameterize Async Function

The same as Technique 1, but for `async` dependencies. The type signature returns a `Promise`:

```typescript
// BEFORE -- hidden async dependency, no seam
const getShipmentSummary = async (userId: string): Promise<Summary> => {
  const shipments = await db.query('SELECT * FROM shipments WHERE user_id = $1', [userId]);
  const totalPackages = shipments.reduce((sum, shipment) => sum + shipment.packageCount, 0);
  return { userId, shipmentCount: shipments.length, totalPackages };
};
```

```typescript
// AFTER -- async dependency as parameter with production default
type ShipmentFetcher = (userId: string) => Promise<ReadonlyArray<ShipmentRecord>>;

const getShipmentSummary = async (
  userId: string,
  fetchShipments: ShipmentFetcher = (id) => db.query('SELECT * FROM shipments WHERE user_id = $1', [id]),
): Promise<Summary> => {
  const shipments = await fetchShipments(userId);
  const totalPackages = shipments.reduce((sum, shipment) => sum + shipment.packageCount, 0);
  return { userId, shipmentCount: shipments.length, totalPackages };
};

// Test -- for SEPARATION (skip the real database)
const result = await getShipmentSummary('user-1', async () => [
  { id: 'shipment-1', packageCount: 2 },
  { id: 'shipment-2', packageCount: 3 },
]);
expect(result).toEqual({ userId: 'user-1', shipmentCount: 2, totalPackages: 5 });

// Test -- for SENSING (observe queries)
const queries: string[] = [];
const sensingFetcher: ShipmentFetcher = async (userId) => {
  queries.push(userId);
  return [{ id: 'shipment-1', packageCount: 1 }];
};
await getShipmentSummary('user-1', sensingFetcher);
expect(queries).toEqual(['user-1']);
```

**When to use:** Any function with async I/O (database, HTTP, filesystem). Same technique as Technique 1 -- the only difference is the `Promise` return type.

## Two Reasons to Break Dependencies

Every technique above can serve either purpose:

| Purpose | Goal | Example |
|---------|------|---------|
| **Separation** | Run code in isolation without real collaborators | Pass `() => 2` instead of calling the transit-time service |
| **Sensing** | Observe what code does (args passed, functions called) | Collect calls in an array, assert against them |

When writing your first characterisation tests, you typically need **separation** first (get the code running in a test), then add **sensing** to verify specific behaviors.
