# OOP Seam Patterns for Legacy Class-Based Code

Use these patterns **only when encountering legacy class-based code** that you cannot immediately refactor to functional style. For the default FP-first approach, see `seam-types.md` and `creating-seams.md`.

The goal is to get tests in place using these OOP techniques, then migrate toward function parameter injection as you gain coverage.

## Object Seams

In OOP, a method call does not define which implementation runs at runtime. When an object comes from outside (parameter, constructor), you can substitute a different implementation.

```typescript
// IS a seam -- object comes from outside
class ReportGenerator {
  constructor(private readonly dataSource: DataSource) {}

  generate(period: DateRange): Report {
    const data = this.dataSource.fetch(period);  // seam: which fetch() runs?
    return this.format(data);
  }
}

// Test -- enabling point: constructor argument
const fakeDataSource: DataSource = {
  fetch: () => ({ rows: [testRow] }),
};
const generator = new ReportGenerator(fakeDataSource);
```

```typescript
// NOT a seam -- object created internally
class ReportGenerator {
  generate(period: DateRange): Report {
    const dataSource = new PostgresDataSource(process.env.DB_URL!);  // no enabling point
    return this.format(dataSource.fetch(period));
  }
}
```

**Enabling point:** The constructor argument or parameter where you choose which object to pass.

## Extract and Override

Pull a problematic call into a protected method, then override in a test subclass. The fastest OOP technique -- minimal production changes.

```typescript
// BEFORE -- direct dependency, no seam
class InvoiceProcessor {
  process(invoice: Invoice): ProcessedInvoice {
    const validated = this.validate(invoice);
    sendEmail(invoice.customer, formatReceipt(validated));  // hard to test
    return validated;
  }
}
```

```typescript
// AFTER -- extracted method creates an object seam
class InvoiceProcessor {
  process(invoice: Invoice): ProcessedInvoice {
    const validated = this.validate(invoice);
    this.notifyCustomer(validated);
    return validated;
  }

  protected notifyCustomer(invoice: ProcessedInvoice): void {
    sendEmail(invoice.customer, formatReceipt(invoice));
  }
}

// Test subclass -- for SEPARATION (skip the email)
class TestableInvoiceProcessor extends InvoiceProcessor {
  protected override notifyCustomer(): void { /* no-op */ }
}

// Test subclass -- for SENSING (observe the call)
class SensingInvoiceProcessor extends InvoiceProcessor {
  readonly notified: ProcessedInvoice[] = [];
  protected override notifyCustomer(invoice: ProcessedInvoice): void {
    this.notified.push(invoice);
  }
}
```

**When to use:** First step when working with class-heavy legacy code. Migrate to parameter injection later.

## Parameterize Constructor

Accept a dependency via the constructor instead of constructing it internally. The OOP equivalent of a higher-order function factory.

```typescript
// BEFORE -- constructs its own dependency
class OrderService {
  private readonly db = new DatabaseClient(process.env.DB_URL!);

  async findOrder(id: string): Promise<Order | undefined> {
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
}
```

```typescript
// AFTER -- dependency injected via constructor
class OrderService {
  constructor(private readonly db: DatabaseClient) {}

  async findOrder(id: string): Promise<Order | undefined> {
    return this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
  }
}

// Production
const service = new OrderService(new DatabaseClient(process.env.DB_URL!));

// Test
const fakeDb: DatabaseClient = {
  query: vi.fn().mockResolvedValue(testOrder),
};
const service = new OrderService(fakeDb);
```

**When to use:** Class-based code with multiple methods sharing dependencies.

## Migration Path: OOP → FP

These OOP patterns are stepping stones. Once you have tests via subclass/constructor injection, refactor toward functions:

```typescript
// Step 1: Extract and override gets tests passing
class TestableProcessor extends Processor {
  protected override notify(): void {}
}

// Step 2: Parameterize constructor makes it injectable
const processor = new Processor(fakeNotifier);

// Step 3: Extract to function with parameter (target state)
const processInvoice = (
  invoice: Invoice,
  notify: Notifier = sendEmail,
): ProcessedInvoice => { ... };
```

The class disappears. The function parameter is the permanent seam.
