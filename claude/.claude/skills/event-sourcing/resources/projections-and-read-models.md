# Projections and Read Models

The event log is the source of truth, but it only answers "give me this stream's events." Every *query* — dashboards, lists, detail pages, search — is served by a **read model** built by projecting events. A projection is another left fold: `events.reduce(apply, emptyReadModel)`. This is the read side of CQRS, taken to its full form.

## A Projection Is a Fold

An `apply` function has the same shape as `evolve`, but its target is a query-optimised view rather than the aggregate's decision state:

```typescript
type BalanceView = { readonly accountId: string; readonly balance: number; readonly currency: Currency };

const apply = (view: BalanceView, event: AccountEvent): BalanceView => {
  switch (event.type) {
    case 'AccountOpened':   return { ...view, currency: event.currency, balance: 0 };
    case 'MoneyDeposited':  return { ...view, balance: view.balance + event.amount };
    case 'MoneyWithdrawn':  return { ...view, balance: view.balance - event.amount };
    default: { const _: never = event; return _; }
  }
};
```

A projection may fold **across many streams** into one view (a "customers with overdrafts" table), which is exactly what aggregate boundaries forbid on the write side and exactly why the read side is separate. Keep **derivation logic in the events themselves** (the rate that applied, the amount charged) so projections stay simple, deterministic, and replayable — do not make a projection recompute business values.

## Inline vs Async

There are three lifecycles, and the choice is a consistency/latency trade-off (Marten's taxonomy):

| Lifecycle | When it runs | Consistency | Cost |
|-----------|-------------|-------------|------|
| **Inline (synchronous)** | In the same transaction as the append | Strong — the view always matches the log | Adds latency to every write; couples write throughput to projection work |
| **Live** | On demand, per query, folded in memory (not persisted) | Strong | Recomputed every read; only viable for short streams |
| **Async** | A background subscription, in its own transaction | **Eventual** — the view lags the write | Scales; isolates failures; adds a lag to manage |

Default to **async** for anything that must scale or fan out, and reserve **inline** for the few views where a user must never see stale data immediately after their own write. Do not make everything inline "to be safe" — that throws away the isolation that makes event sourcing operable.

## Catch-up Subscriptions and Checkpoints

An async projection is driven by a **catch-up subscription**: it reads events in global order from a stored position, applies each, and advances a **checkpoint** (the last position processed). On startup it resumes from the checkpoint; with none, it starts from the beginning.

The load-bearing trick, from EventStoreDB/Kurrent guidance: **store the checkpoint in the same transaction as the projection update.** Applying the event and advancing the checkpoint atomically is what gives you effective exactly-once processing on top of at-least-once delivery — if the process crashes mid-batch, it resumes from the last committed checkpoint and reprocesses only what was not committed.

```typescript
// one event, applied and checkpointed atomically
await db.transaction(async (tx) => {
  await upsertBalanceView(tx, apply(await loadView(tx, event.streamId), event));
  await saveCheckpoint(tx, projectionName, event.globalPosition);   // same transaction
});
```

Use **catch-up** (ordered, position-tracked) subscriptions whenever processing order matters. Reserve **persistent** (competing-consumer) subscriptions for order-insensitive, best-effort work — they scale out but do not preserve order.

## Idempotency Is Mandatory

Because delivery is at-least-once, a projection **will** occasionally see the same event twice (a redelivery after a crash, a replay overlap). Applying it twice must not double-count. Make projections idempotent by either:

- keying the write on the **event id** or **global position** — values unique across the whole store — so a repeat is a no-op (e.g. `INSERT … ON CONFLICT (event_id) DO NOTHING`). A bare per-stream `version` guard (`WHERE last_version < :version`) only works when the read-model row is scoped to a single stream, because stream versions repeat across streams; or
- using the checkpoint so already-processed positions are skipped.

A projection that adds to a running total without guarding against redelivery is a latent data-corruption bug.

## Eventual Consistency and Read-Your-Writes

This is the headline operational surprise, and it is fundamental to the pattern, not a defect. With async projections the write model is strongly consistent but a read model **lags** — so a user who just issued a command may not immediately see it reflected. The canonical failure is POST-redirect-GET: publish a post, redirect to view it, and the read model has not caught up, so the user hits a 404.

Four mitigations (Ben Smith), in rough order of preference:

1. **Return the result from the command.** The command handler already knows the new state (it just folded the new events forward) — return it, or construct the view row from the command, and render *that* immediately. Simple and usually enough.
2. **Strong-consistency read on demand.** For specific views, read the aggregate's own stream (or an inline projection) so that path is strongly consistent, while everything else stays async.
3. **Subscribe / push.** Notify the client (WebSocket, SSE) once the projection has processed up to the relevant position.
4. **Poll** the read model until it reflects the expected version.

Whichever you choose, **design the UI for lag** — optimistic rendering, "saved, updating…" affordances — rather than pretending the read model is instantaneous. Monitor and cap projection lag as a first-class operational metric.

## Projections Are Disposable — Rebuild Them

Because state is `fold(events)`, any read model can be dropped and rebuilt from event zero. This is what makes two things trivial that are painful in a state-stored system:

- **Adding a new read model retroactively** — write the projection, replay history, and it is populated as if it had always existed.
- **Fixing a buggy projection** — correct the `apply` function, reset the checkpoint and the view, and replay. The events were always right; only the derivation was wrong.

Operational notes: for large stores, rebuild into **new tables alongside the live ones** and switch traffic once caught up (a blue/green / projection-versioning rebuild) so there is no downtime and no half-populated view being served. Never "fix" a read model by hand-editing rows — fix the projection and replay, or the next rebuild silently reverts your edit.

## Where This Sits Relative to CQRS-lite

The hexagonal skill's `cqrs-lite.md` is the same write/read split without event sourcing: writes through repositories, reads through query functions that JOIN. Event sourcing is the full version of that split — writes through the decider + event store, reads through projected read models folded from events. If a context does not need event history, stop at CQRS-lite; do not add projections and subscriptions for their own sake.
