# Event Versioning and Schema Evolution

This is the topic that separates event-sourced systems that survive from ones that calcify. Events are immutable and live for the lifetime of the system, so **new code must be able to read old events forever.** You cannot "just run a migration". Decide a strategy before the first event ships. The definitive text is Greg Young's *Versioning in an Event Sourced System* (2017); this resource distils it for functional TypeScript.

## Rule 0: You Cannot Change the Past

Events are immutable. You never `UPDATE` or `DELETE` a stored event, and you cannot migrate the store the way you would ALTER a table — consumers may already have read the old shape, audit guarantees depend on it, and the log stops being trustworthy the moment one edit is allowed. Greg Young: *"Immutability is immutable. The moment you allow a single edit, everything becomes suspect."*

Therefore **all schema change happens at read/deserialize time**, not at write time. You transform old shapes into the current shape as events are loaded. Corrections to *data* (as opposed to schema) are handled the same way the ledger handles them — by appending a compensating event, never by editing history (see `production-concerns.md`).

## Rule 1: A New Version Must Be Derivable From the Old

Young's defining test: *"A new version of an event must be convertible from the old version of the event. If not, it is not a new version of the event but rather a new event."* If you cannot compute the V2 shape purely from V1's data (plus constants/defaults), you do not have a new version — you have a **different event type**, and you should introduce it as one and stop emitting the old one.

Two hard corollaries:
- **Semantic meaning must never change between versions.** *"There is no good way for a downstream consumer to understand a semantic meaning change."* If the *meaning* of a field changes, it is a new event, not a new version.
- **Never rename a field silently.** Under weak-schema mapping (Strategy A below), fields map by name, so an in-place rename breaks the mapping and old data no longer loads. Either keep the persisted name stable, or treat the rename as a **new version** and map old-name → new-name in an explicit upcaster (the new shape is derivable from the old, so it is a legitimate version, not a new event). What you must never do is rename in place and expect events already on disk to still map.

## Strategy A: Weak Schema + Tolerant Reader (the default)

Serialize events as JSON and **map** them into the current type rather than hard-deserializing, tolerating fields that do not line up. The mapping rules:

| Field state | Action |
|-------------|--------|
| In the JSON **and** in the target type | copy the value |
| In the JSON but **not** in the type | ignore it |
| In the type but **not** in the JSON | use a default value |

This makes **additive, backward/forward-compatible change free**: adding an optional field, or a new consumer ignoring a field it does not know, both "just work". What weak schema *alone* cannot do is **rename** a field (it maps by name, so the old value is silently dropped and the new one defaulted) or change a field's **meaning** — a rename needs an explicit upcaster (Strategy B), and a semantic change needs a whole new event (Rule 1). A tolerant reader is the baseline every event-sourced system should adopt from day one — it is what the schema-parse-on-read in `event-store.md` implements.

## Strategy B: Upcasting

When a shape change is more than additive (a field restructured, a value split), insert an **upcaster** — a pure function that transforms an old-shape event into the next shape — *between deserialization and the domain*. Upcasters chain (`V1→V2→V3`) or jump straight to current, and run on **every read**, so they must be pure and do **no I/O** (Marten's explicit warning — an upcaster that calls the network turns every replay into an N+1 storm).

```typescript
type OrderPlacedV1 = { readonly type: 'OrderPlaced'; readonly version: 1; readonly orderId: string; readonly total: number };
type OrderPlacedV2 = {
  readonly type: 'OrderPlaced'; readonly version: 2;
  readonly orderId: string;
  readonly totalAmount: { readonly amount: number; readonly currency: Currency }; // structural change
};
type OrderPlaced = OrderPlacedV2; // the shape the domain uses today

const upcastOrderPlacedV1toV2 = (e: OrderPlacedV1): OrderPlacedV2 => ({
  type: 'OrderPlaced',
  version: 2,
  orderId: e.orderId,
  totalAmount: { amount: e.total, currency: 'GBP' }, // default for the newly-required field
});

// On read: dispatch on the stored version and upcast forward to the current shape.
// A discriminated union of versions keeps this exhaustive and cast-free.
const upcastOrderPlaced = (raw: OrderPlacedV1 | OrderPlacedV2): OrderPlaced => {
  switch (raw.version) {
    case 1: return upcastOrderPlacedV1toV2(raw);
    case 2: return raw;
    default: { const _: never = raw; return _; }
  }
};
```

This encodes the whole discipline: never mutate stored events; upcast on read; default added fields; upcasters are pure and chainable; and a rename or restructure is handled by the upcaster itself (here `total` becomes `totalAmount`) precisely because the new shape is derivable from the old — that is what makes it a *version* rather than a new event. (Weak schema alone, Strategy A, can't do that — it maps by name; an upcaster can.) For many event types, keep a **registry keyed by `type` + version** and apply upcasters until you reach the current shape, validating each raw record against a per-version schema at the boundary (`safeParse`) so the dispatch stays type-safe instead of casting untyped JSON.

## Strategy C: Copy-Transform (the nuclear option)

When you genuinely cannot map forward — the stream boundaries were wrong, or a concept must split — rewrite streams into new ones. This is expensive and disruptive; avoid it if a tolerant reader or upcaster can do the job.

- **Copy-and-replace** — read the old stream, write transformed events to a **new** stream, retire the old.
- **In a live system, do not delete** — write pointer / `StreamMovedTo` link events (like an HTTP redirect); both old and new code must understand both stream shapes during the transition. Always append with `expectedVersion` so nothing is lost mid-migration.
- **Copy-transform / "BigFlip"** — stand up a parallel event store with its own projections, let it catch up, then switch traffic across.
- **Split-stream / join-stream** — fix bad boundaries by splitting one stream into two (or joining), via an intermediate release that understands both.

## The Best Strategy Is Not Needing One

Dudycz: *"The best option for versioning the event schema is to prevent conditions in which versioning is needed."* Two practices do most of the work:

- **Keep streams short** (`production-concerns.md`). If a stream's natural lifetime is a day or a shift, the old event *shape* stops being written quickly, so a two-phase deploy (ship code that reads both shapes → later stop writing the old shape) shrinks the active-versioning window. Note this retires old **writers**, not old **readers**: as long as old events remain in the replayable set, code that rebuilds a projection from event zero must still read them. You only drop the old readers/upcasters once those events have left the replayable set — archived out, copy-transformed, or summarised away by closing the books.
- **Split internal from external events** (`modelling-events.md`). Internal events stay free to change behind a coarse, deliberately-versioned external contract, so most churn never reaches another context.

## Related: Snapshots and Process Managers

- **Snapshots version like structural data** — they are a cache of a shape that changes, so *rebuild* snapshots from events rather than trying to migrate them; deprecate a snapshot format before deleting it. (`production-concerns.md`.)
- **Process managers/sagas** — never mutate a running instance to a new version; create the new version and migrate in-flight state, preserving correlation ids. Avoid changing a workflow while instances are live.

## Checklist

- [ ] A versioning strategy (at minimum a tolerant reader) exists before the first event ships
- [ ] Stored events are never updated or deleted; all evolution happens on read
- [ ] No field is renamed *silently* — a rename is handled by an explicit versioned upcaster, never by editing stored data — and no field's meaning is ever changed within a version
- [ ] Non-derivable changes are introduced as new event types, not new versions
- [ ] Upcasters are pure, do no I/O, and are covered by tests (`testing-event-sourced-systems.md`)
- [ ] Short streams and internal/external splitting are used to minimise the versioning surface
