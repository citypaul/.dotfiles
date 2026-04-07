# Creating Seams Where None Exist

Practical techniques for introducing seams into tightly-coupled code. See the main `finding-seams` skill for overview. Each technique serves two purposes: **sensing** (observing behavior) and **separation** (running code in isolation).

## Two Reasons to Break Dependencies

- **Sensing** -- gain the ability to inspect what code does (what arguments were passed, what side effects occurred)
- **Separation** -- allow code to run in a test harness without its real collaborators (database, network, filesystem)

Every technique below can serve either purpose. The examples show both.

## Technique 1: Extract and Override

Pull a problematic call into a protected method, then override it in a test subclass. The fastest technique -- minimal production code changes.

```typescript
// BEFORE -- direct dependency, no seam
class InvoiceProcessor {
  process(invoice: Invoice): void {
    // ... business logic ...
    sendEmail(invoice.customer, formatReceipt(invoice));  // hard to test
  }
}
```

```typescript
// AFTER -- extracted method creates an object seam
class InvoiceProcessor {
  process(invoice: Invoice): void {
    // ... business logic ...
    this.notifyCustomer(invoice);
  }

  protected notifyCustomer(invoice: Invoice): void {
    sendEmail(invoice.customer, formatReceipt(invoice));
  }
}

// Test subclass -- for SEPARATION (skip the email)
class TestableInvoiceProcessor extends InvoiceProcessor {
  protected override notifyCustomer(): void { /* no-op */ }
}

// Test subclass -- for SENSING (observe the call)
class SensingInvoiceProcessor extends InvoiceProcessor {
  notifiedInvoices: Invoice[] = [];
  protected override notifyCustomer(invoice: Invoice): void {
    this.notifiedInvoices.push(invoice);
  }
}
```

**When to use:** First step when you need a test fast. Migrate to parameter injection later.

## Technique 2: Parameterize Method

Add a parameter for the dependency instead of hard-coding it. Converts a hidden dependency into a visible one.

```typescript
// BEFORE -- hidden dependency
const processOrder = (order: Order): OrderResult => {
  const tax = fetchTaxRate(order.region);  // calls external service
  return { ...order, total: order.subtotal * (1 + tax) };
};
```

```typescript
// AFTER -- dependency is now a parameter with production default
type TaxResolver = (region: string) => number;

const processOrder = (
  order: Order,
  resolveTax: TaxResolver = fetchTaxRate,
): OrderResult => {
  const tax = resolveTax(order.region);
  return { ...order, total: order.subtotal * (1 + tax) };
};

// Test -- for SENSING
const taxCalls: string[] = [];
const sensingTax: TaxResolver = (region) => { taxCalls.push(region); return 0.1; };
processOrder(order, sensingTax);
expect(taxCalls).toEqual(['US-CA']);

// Test -- for SEPARATION
const fixedTax: TaxResolver = () => 0.08;
const result = processOrder(order, fixedTax);
expect(result.total).toBe(108);
```

**When to use:** Functional code. When you want an explicit, type-safe seam.

## Technique 3: Parameterize Constructor

Same principle as parameterize method, but at the class level. Creates a permanent seam for all methods.

```typescript
// BEFORE -- constructs its own dependency
class OrderService {
  private readonly db = new DatabaseClient(process.env.DB_URL!);

  async findOrder(id: string): Promise<Order> {
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
}
```

```typescript
// AFTER -- accepts dependency via constructor
class OrderService {
  constructor(private readonly db: DatabaseClient) {}

  async findOrder(id: string): Promise<Order> {
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
}

// Production
const service = new OrderService(new DatabaseClient(process.env.DB_URL!));

// Test
const fakeDb: DatabaseClient = { query: vi.fn().mockResolvedValue(testOrder) };
const service = new OrderService(fakeDb);
```

**When to use:** Class-based code with multiple methods that share dependencies.

## Technique 4: Extract Interface

Create a type for the dependency so you can substitute implementations. Especially useful when the real dependency is complex.

```typescript
// BEFORE -- coupled to concrete implementation
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const uploadReport = async (report: Report): Promise<string> => {
  const client = new S3Client({ region: 'us-east-1' });
  await client.send(new PutObjectCommand({ Bucket: 'reports', Key: report.id, Body: report.content }));
  return `s3://reports/${report.id}`;
};
```

```typescript
// AFTER -- interface defines the contract
type FileStorage = {
  readonly upload: (key: string, content: string) => Promise<string>;
};

const uploadReport = async (report: Report, storage: FileStorage): Promise<string> => {
  return storage.upload(report.id, report.content);
};

// Production adapter
const s3Storage: FileStorage = {
  upload: async (key, content) => {
    const client = new S3Client({ region: 'us-east-1' });
    await client.send(new PutObjectCommand({ Bucket: 'reports', Key: key, Body: content }));
    return `s3://reports/${key}`;
  },
};

// Test fake -- for SENSING
const inMemoryStorage: FileStorage = {
  uploads: [] as Array<{ key: string; content: string }>,
  upload: async function(key, content) {
    this.uploads.push({ key, content });
    return `mem://${key}`;
  },
};
```

**When to use:** When the real dependency has a large API surface and you want a narrow contract.

## Technique 5: Wrap Static/Global Calls

Wrap direct static or global calls in a function or method that can be replaced.

```typescript
// BEFORE -- direct static call
const isAuthorised = (user: User): boolean => {
  const session = SessionManager.getCurrentSession();  // static, global state
  return session.roles.includes(user.requiredRole);
};
```

```typescript
// AFTER -- wrapped in an injectable function
type SessionProvider = () => Session;

const isAuthorised = (
  user: User,
  getSession: SessionProvider = () => SessionManager.getCurrentSession(),
): boolean => {
  const session = getSession();
  return session.roles.includes(user.requiredRole);
};

// Test
const fakeSession: SessionProvider = () => ({ roles: ['admin'], userId: 'test' });
expect(isAuthorised(adminUser, fakeSession)).toBe(true);
```

**When to use:** Code with static method calls or global function dependencies that you cannot modify directly.

## Technique 6: Introduce Module Indirection

Move a direct import behind a module that can be mocked or swapped.

```typescript
// BEFORE -- direct import of heavy dependency
import { analyzeImage } from 'heavy-ml-library';

export const classifyUpload = (image: Buffer): Classification => {
  return analyzeImage(image);  // takes 30s, needs GPU
};
```

```typescript
// AFTER -- indirection layer
// image-analyzer.ts (new module -- the seam)
import { analyzeImage } from 'heavy-ml-library';
export const analyze: ImageAnalyzer = (image) => analyzeImage(image);

// classify.ts (now depends on the seam, not the heavy library)
import { analyze } from './image-analyzer';
export const classifyUpload = (image: Buffer): Classification => analyze(image);

// test -- mock the thin indirection module
vi.mock('./image-analyzer', () => ({
  analyze: () => ({ label: 'cat', confidence: 0.99 }),
}));
```

**When to use:** When you cannot change the calling code's signature but need to isolate a heavy/slow dependency. Temporary stepping stone toward parameter injection.
