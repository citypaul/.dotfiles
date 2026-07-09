# CQRS-Lite with Hexagonal Architecture

CQRS (Command Query Responsibility Segregation) separates reads from writes. The "lite" version uses the same database but different access patterns.

## Why Separate Reads from Writes?

Repositories enforce aggregate boundaries — essential for writes (consistency), but reads often need data from multiple aggregates for display. Forcing all reads through repositories means either:
- N+1 queries (load each aggregate separately)
- Breaking aggregate boundaries in the repository (defeats the purpose)
- Denormalizing data into read-optimized tables (full CQRS, usually overkill)

CQRS-lite: writes go through repositories, reads use query functions that JOIN freely.

## Query Functions

Query functions are driven adapters. In `structure-codebase`'s visible single-package layout they live under `adapters/driven/` beside the relevant persistence implementation; other established layouts may use a different physical path without changing the role.

```typescript
// adapters/driven/postgres/queries/dashboard.ts — JOINs across 4 tables for display
const getDashboardCards = async (db: Database, userId: string) => {
  return db.select({
    eventTitle: events.title,
    occasionEmoji: occasions.emoji,
    savedAmount: savingsGoals.savedAmount,
    recipientName: recipients.name,
  })
  .from(events)
  .innerJoin(occasions, ...)
  .leftJoin(savingsGoals, ...)
  .innerJoin(recipients, ...)
  .where(eq(events.userId, userId))
  .all();
};
```

## Domain Transforms on Read Data

Query functions return raw joined data. Provider-free inside functions may interpret it when the transformation encodes business meaning; presentation-only formatting stays at the driving edge.

```typescript
// hexagon/dashboard/dashboard-status.ts — provider-free read-model policy, no DB imports
const toDashboardCard = (row: DashboardRow, now: Date): DashboardCard => ({
  title: row.eventTitle,
  emoji: row.occasionEmoji,
  daysAway: differenceInDays(parseISO(row.eventDate), now),
  savings: buildSavingsDisplay(row.savedAmount, row.targetAmount, now),
  isUrgent: differenceInDays(parseISO(row.eventDate), now) < 30,
});
```

`isUrgent` is a business rule (what counts as urgent). `daysAway` is a business calculation. These are inside-eligible policy. Human-only formatting is not. The query that fetches the data remains outside.

## Testing

- **Query functions:** Integration tests with real database (`createTestDb()`)
- **Domain transforms:** Unit tests (pure functions, no mocks)
- **Full read path (query → transform → render):** E2E tests

## When to Upgrade to Full CQRS

CQRS-lite is sufficient until you need:
- Separate read/write databases
- Event sourcing (load the `event-sourcing` skill — it is the event-sourced form of this split: events as the write model, projections as read models)
- Read models that aggregate across bounded contexts
- Read-heavy workloads that need independent scaling

Start with CQRS-lite. Most applications never need full CQRS.
