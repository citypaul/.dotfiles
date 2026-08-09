# Cross-Cutting Concerns

Where logging, authentication, transactions, and error formatting live in hexagonal architecture.

## The Principle

Cross-cutting *infrastructure* concerns live in adapters, never in domain. The domain is pure business logic — it doesn't know about HTTP status codes, log levels, database transactions, or auth tokens. When a cross-cutting concern turns out to be business-significant (authorization rules, domain observations), it gets domain-language treatment: a business rule, a result type, or an explicit driven port — see Logging & Observability below.

## Authentication & Authorization

**Authentication lives in driving adapters** (middleware, route handlers). The
application receives a provider-free authenticated principal; business
authorization remains application/domain policy.

```typescript
// Driving adapter: extract and validate auth
export async function POST(request: Request) {
  const principal = await authenticateRequest(request); // sole production constructor
  if (!principal) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const pledging: ForPledgingToOccasions = createPledgingToOccasions(pledgePersistence);
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'malformed-json' }, { status: 400 });
  }
  const parsedBody = PledgeBodySchema.strict().safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 422 });
  }

  // Strict body has no actor/tenant fields; the principal owns attribution.
  const result = await pledging.pledgeToOccasion({
    ...parsedBody.data,
    principal,
  });
  ...
}
```

```typescript
// Application/use case: receives identity and coordinates domain behaviour
const createPledgingToOccasions = (
  persistence: PledgePersistence,
): ForPledgingToOccasions => ({
  pledgeToOccasion: async (dto: { readonly principal: AuthenticatedPledger; ... }) => {
    // Application code doesn't check JWT tokens or session cookies.
    // It authorizes a provider-free principal and invokes domain rules.
  },
});
```

**Authorization (business rules about who can do what)** is domain logic:

```typescript
// Domain: "only the organizer can close funding" is a business rule
const closeFunding = (occasion: Occasion, requesterId: ContributorId): CloseResult => {
  if (occasion.organizerId !== requesterId) {
    return { success: false, reason: 'not-organizer' };
  }
  return { success: true, occasion: { ...occasion, isFundingClosed: true } };
};
```

**Authentication** (who are you?) = adapter. **Authorization** (are you allowed?) = domain.

For browser-facing HTTP/BFF entry points, the `bff-entry-points` skill turns this rule into an enforceable model: explicit public/protected classification per route, a composition-prepared registrar that installs session/CSRF/Origin policy by construction, a provider-free `AuthenticatedPrincipal`, and direct provider-free tests proving no driving adapter can bypass in-application authorization.

## Logging & Observability

"Logging" conflates two different things: technical telemetry (unambiguously adapter territory) and domain-significant observations (facts about the business process, with stakeholders of their own). The organizing test comes from GOOS's "Logging Is a Feature" (Freeman & Pryce, ch. 20): **is this observation a feature — someone outside the dev team relies on it — or developer scaffolding?** Four tiers follow. (For what goes *into* telemetry — wide events, SLOs, alerting — see the `observability` skill; this section is about *where the code lives*.)

### Tier 1 — Technical telemetry: adapters

Request/response cycles, SQL timings, retries, connection errors. Lives in driving and driven adapters; auto-instrumentation belongs here too.

```typescript
// Driving adapter: log the request/response cycle
export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'malformed-json' }, { status: 400 });
  }
  const parsedBody = PledgeSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 422 });
  }
  const body = parsedBody.data;
  const pledging: ForPledgingToOccasions = createPledgingToOccasions(pledgePersistence);
  const result = await pledging.pledgeToOccasion(body);

  if (!result.success) {
    logger.warn('Pledge rejected', { reason: result.reason, occasionId: body.occasionId });
  }
  return NextResponse.json(...);
}

// Driven adapter: log infrastructure interactions
const createDrizzleOccasionRepository = (db: Database, logger: Logger): OccasionRepository => ({
  save: async (occasion) => {
    await db.insert(occasions).values(toRow(occasion))...;
    logger.debug('Occasion saved', { id: occasion.id });
  },
});
```

**Never import a logger into domain code.** The default stays cheap: when the fact already survives to the use-case boundary in the returned result, the driving adapter inspects the result and logs accordingly — don't add a port for observations the port signature already exposes.

### Tier 2 — Domain-significant observations: a driven port (Domain Probe) or domain events

The result-inspection default breaks down when the interesting fact is *intermediate* (which pricing rule fired, cache-hit vs. remote lookup, retry count) — smuggling it into the return type pollutes the domain contract with observability freight — or when the observation is a *requirement in its own right* (support logging, business metrics, product analytics). Then model the observability backend as what it is: a driven **recipient** actor, behind a per-capability, intention-named, severity-free, fire-and-forget port (Hodgson's Domain Probe, martinfowler.com):

```typescript
// Driven port — application-owned because the use case consumes it
interface PledgeInstrumentation {
  readonly pledgeRejected: (reason: PledgeRejectionReason, occasionId: OccasionId) => void;
  readonly pledgeAccepted: (amount: Money, occasionId: OccasionId) => void;
}

// Use case announces domain facts; no log levels, no metric names, no framework types
const createPledgingToOccasions = (
  persistence: PledgePersistence,
  instrumentation: PledgeInstrumentation,
): ForPledgingToOccasions => ({ ... });

// Adapter decides severity, metric names, span attributes — swappable without touching a use case
const createTelemetryPledgeInstrumentation = (logger: Logger): PledgeInstrumentation => ({
  pledgeRejected: (reason, occasionId) => logger.warn('Pledge rejected', { reason, occasionId }),
  pledgeAccepted: (amount, occasionId) => logger.info('Pledge accepted', {
    minorUnits: amount.minorUnits,
    currency: amount.currency,
    occasionId,
  }),
});
```

Probe methods take domain types only, return `void`, and never influence control flow. Severity mapping is the adapter's decision — if operations later wants `pledgeRejected` at `info` instead of `warn`, the adapter changes and no use case moves.

**If the capability already publishes domain events**, prefer an observability subscriber on the existing publisher port (`OrderEventPublisher`) over a new probe — don't build two announcement channels. See the `domain-driven-design` skill's domain events guidance.

**Anti-patterns:** a generic `Logger` / `log(level, msg)` port — that's a technology-shaped conversation in intent clothing; if you want a logger, you're in Tier 1, go to an adapter. Widening use-case result types purely to expose loggable intermediates. Probe methods that return values or gate behavior.

### Tier 3 — Correlation and context: adapters/middleware only

Trace/request IDs, span lifecycle, context propagation, and canonical/wide-event assembly live in driving adapters (middleware) and driven adapters. **The domain never sees a trace ID.** Where the wide event needs domain dimensions, they arrive via Tier 2 — the probe's adapter attaches them to the current span or canonical line.

The decorator option slots in here: an instrumented wrapper around a driving or driven port is the preferred home for timing and tracing whole use cases. The honest limit of decorators is the criterion for Tier 2: **a decorator sees only what crosses the port** — inputs, outputs, duration, errors — never intermediate domain facts.

### Tier 4 — Instrumentation is tested behavior

A probe is a driven port, and every driven port gets a fake. Use-case tests assert observations through a recording fake; the adapter's translation into log lines/metrics gets its own adapter tests. See `testing-hex-arch.md` for the fake-probe example. Diagnostic (developer-only) logging is exempt: not a feature, not test-driven — and it should not accumulate in domain code either.

## Transactions

**Transaction mechanics are an adapter concern; the atomic application operation is an application concern.** The application-owned port says what must persist together. Its adapter decides how to provide that guarantee.

```typescript
// Application-owned driven port: one semantic operation must save both or neither.
type StoredOccasion = { readonly value: Occasion; readonly version: number };

interface PledgePersistence {
  readonly findOccasionById: (id: OccasionId) => Promise<StoredOccasion | undefined>;
  readonly saveWithOutbox: (
    occasion: Occasion,
    events: readonly PledgeRecorded[],
    expectedVersion: number,
  ) => Promise<'saved' | 'conflict'>;
}

// Driven adapter owns the database transaction mechanics.
const createDrizzlePledgePersistence = (db: Database): PledgePersistence => ({
  findOccasionById: async (id) => {
    const row = await db.select().from(occasions).where(eq(occasions.id, id)).get();
    return row ? { value: toOccasion(row), version: row.version } : undefined;
  },
  saveWithOutbox: async (occasion, events, expectedVersion) =>
    db.transaction(async (tx) => {
      const updated = await tx.update(occasions)
        .set({ ...toRow(occasion), version: expectedVersion + 1 })
        .where(and(
          eq(occasions.id, occasion.id),
          eq(occasions.version, expectedVersion),
        ))
        .returning({ id: occasions.id });
      if (updated.length !== 1) return 'conflict';
      await tx.insert(outbox).values(events.map(toOutboxRow));
      return 'saved';
    }),
});
```

The use case calls `saveWithOutbox` with the loaded version and handles a
`conflict` outcome without importing a transaction API. The domain remains
unaware of both the port and its adapter.

**Scope the transaction to the selected consistency boundary.** A single-statement aggregate save needs no explicit wrapper. Use a transaction when one application-owned operation spans rows or tables that must commit together, such as an aggregate with its children or an aggregate with its outbox records. In a DDD design, follow `resources/aggregate-design.md` in the `domain-driven-design` skill: keep one aggregate per transaction, then coordinate another aggregate through the outbox and an idempotent handler. Hexagonal architecture alone does not impose that DDD policy; when a project selects a different consistency model, make its atomic boundary explicit in the application-owned port rather than hiding it in composition code.

## Error Formatting

**The driving adapter translates domain results to protocol-specific responses.** The domain returns business-language results; the adapter maps them to HTTP, gRPC, or whatever protocol the client speaks.

For the HTTP examples in this skill, keep three failure layers distinct. Authenticate first where the route is protected. Then catch only `request.json()` to map malformed JSON syntax to `400`. Parse the resulting `unknown` body and any path parameters with non-throwing schemas; a syntactically valid request that fails either schema maps to `422`. Only after those boundary checks should the adapter invoke the use case and translate its business-language result.

```typescript
// Domain returns: { success: false, reason: 'funding-closed' }
// Route handler translates:
const toHttpResponse = (result: PledgeResult): NextResponse => {
  if (result.success) {
    return NextResponse.json({ pledged: result.occasion.totalPledged }, { status: 200 });
  }
  const statusMap: Record<Extract<PledgeResult, { success: false }>['reason'], number> = {
    'not-found': 404,
    'concurrent-change': 409,
    'non-positive-amount': 422,
    'currency-mismatch': 422,
    'exceeds-budget': 422,
    'funding-closed': 422,
  };
  return NextResponse.json({ error: result.reason }, { status: statusMap[result.reason] });
};
```

**The domain never returns HTTP status codes, error messages for users, or protocol-specific types.** It returns business reasons. The adapter translates.

## Summary

| Concern | Where | Why |
|---------|-------|-----|
| Authentication (who are you?) | Driving adapter | Protocol-specific (JWT, session, API key) |
| Authorization (are you allowed?) | Domain | Business rule about permissions |
| Technical telemetry & correlation | Adapters (both driving and driven) | Infrastructure side effect |
| Domain observations (support logs, business metrics) | Driven port (probe) or domain events | Business-significant facts; tested with fakes like any port |
| Transactions | Application-owned atomic operation; driven adapter mechanics | Application defines what must persist together; infrastructure provides the guarantee; domain remains unaware |
| Error formatting | Driving adapter | Protocol-specific translation |
| Input validation (schema) | Driving adapter boundary | Parse at the edge, trust inside |
| Business validation | Domain | Business rules are domain logic |
