# Aggregate Design

Aggregates are the hardest part of DDD to get right. Start small and tighten boundaries when you hit consistency issues.

## Design From Invariants, Not Relationships

The most common aggregate design mistake is starting from entity relationships. Developers see "Route has many Locations, Location has one VendingMachine" and build a hierarchy that mirrors this structure. The result looks domain-rich — organized entities, nested value objects, accessor methods — but conceals the absence of genuine business behavior.

**Aggregates are consistency boundaries, not containment hierarchies.** An aggregate exists to enforce invariants during state changes. If you can't name the invariant, you probably don't need the aggregate.

**The litmus test for aggregate membership:**

1. What commands change state in this area of the domain?
2. What must remain true immediately after each state change? (These are your invariants.)
3. What data is required to enforce those invariants? (Only this belongs in the aggregate.)

If the answer to #2 is only structural rules (one-to-many, one-to-one), database constraints enforce these more simply than aggregate code. Reserve aggregates for behavioral invariants — rules about what's allowed, limits, conditions, and business decisions.

```typescript
// ❌ RELATIONSHIP-DRIVEN — aggregate mirrors entity hierarchy
//    No invariants enforced; methods just manage associations
type Route = {
  readonly id: RouteId;
  readonly locations: ReadonlyArray<Location>;  // Why is this here?
  readonly addLocation: ...;                     // Just manages a collection
  readonly attachVendingMachine: ...;            // Just manages a relationship
  readonly getAlarmCount: ...;                   // Read concern leaking in
};

// ✅ INVARIANT-DRIVEN — VendingMachine is its own aggregate
//    because alarms are the behavioral responsibility
type VendingMachine = {
  readonly id: VendingMachineId;
  readonly locationId: LocationId;              // Reference by ID
  readonly alarms: ReadonlyArray<Alarm>;
  readonly maxConcurrentAlarms: number;         // Invariant: can't exceed this
};

// The invariant that justifies this aggregate:
const triggerAlarm = (machine: VendingMachine, alarm: NewAlarm): TriggerAlarmResult => {
  const activeAlarms = machine.alarms.filter(a => a.status === 'active');
  if (activeAlarms.length >= machine.maxConcurrentAlarms) {
    return { success: false, reason: 'max-alarms-reached' };
  }
  return { success: true, machine: { ...machine, alarms: [...machine.alarms, alarm] } };
};
```

**Signs you have a relationship-driven aggregate:**
- Methods only add, remove, or attach children (no business rules enforced)
- No method ever returns a failure result — everything always succeeds
- The aggregate's value is "organizing" data rather than protecting correctness
- Removing the aggregate and using direct repository access would change nothing about system correctness

**Complementary heuristic — lifecycle identity:** Aggregates have lifecycles. They are "born" through domain events (a customer registers, a contract is signed, an order is placed) and eventually "die" (expiration, cancellation, liquidation). If you can identify what creates and destroys a thing, you've likely found an aggregate boundary. The birth event often reveals the root entity; the data needed for invariants between birth and death reveals what belongs inside.

## The Always-Valid Principle

An entity must satisfy its invariants at all times — after construction, after every state transition, and when retrieved from persistence.

```typescript
// ✅ Factory function enforces invariants on creation
const createOccasion = (params: CreateOccasionParams): Occasion => {
  if (!params.name.trim()) throw new Error('Occasion name is required');
  if (params.budget.amount < 0) throw new Error('Budget cannot be negative');
  return OccasionSchema.parse({
    ...params,
    id: createOccasionId(crypto.randomUUID()),
    name: params.name.trim(),
    giftIdeas: [],
  });
};

// ✅ State transition enforces invariants — returns result type for business outcomes
type AddGiftIdeaResult =
  | { readonly success: true; readonly occasion: Occasion }
  | { readonly success: false; readonly reason: 'exceeds-budget' };

const addGiftIdea = (occasion: Occasion, idea: NewGiftIdea): AddGiftIdeaResult => {
  const totalCost = occasion.giftIdeas.reduce((sum, i) => sum + i.estimatedCost.amount, 0);
  if (totalCost + idea.estimatedCost.amount > occasion.budget.amount) {
    return { success: false, reason: 'exceeds-budget' };
  }
  return { success: true, occasion: { ...occasion, giftIdeas: [...occasion.giftIdeas, idea] } };
};
```

**Never allow temporary invalid states**, even in "internal" code. If an entity can be constructed without meeting its invariants, that's a bug.

## Sizing Aggregates

The most common mistake is making aggregates too large. Include only what's needed to enforce a consistency rule.

**Ask:** "Does modifying X require checking Y's state to maintain an invariant?"
- If yes: X and Y belong in the same aggregate
- If no: they're separate aggregates, referenced by ID

```typescript
// ❌ TOO LARGE — User doesn't need to be in the Occasion aggregate
type Occasion = {
  readonly organizer: User;         // Embedded user — wrong!
  readonly contributors: User[];    // Embedded users — wrong!
  readonly giftIdeas: GiftIdea[];
};

// ✅ RIGHT SIZE — only what's needed for consistency
type Occasion = {
  readonly organizerId: UserId;     // Reference by ID
  readonly giftIdeas: ReadonlyArray<GiftIdea>;  // Owned — needed for budget invariant
  readonly budget: Money;           // Owned — needed for budget invariant
};
```

## One Aggregate Per Transaction

Don't modify multiple aggregates in a single write operation. If a business process spans aggregates, use:

1. **Domain service** to compute changes across aggregates (pure function)
2. **Use case** to save each aggregate in sequence
3. **Eventual consistency** (domain events) if strong consistency isn't required

```typescript
// Use case saves each aggregate separately
const handlePledge = async (repos, dto) => {
  const result = pledgeContribution(occasion, contributor, amount); // Domain service
  if (result.success) {
    await repos.occasion.save(result.occasion);       // Transaction 1
    await repos.contributor.save(result.contributor);  // Transaction 2
  }
};
```

**Data locality:** The flip side of "one aggregate per transaction" is that all of an aggregate's internals must be co-located in the same data store. Splitting an aggregate's child entities across separate databases or services forces distributed transactions to maintain consistency — defeating the purpose of the boundary. Store an aggregate's data together so it can be read, changed, and persisted atomically.

**Cross-aggregate rules are eventually consistent by default.** Any business rule that spans aggregates should not be expected to be immediately up-to-date at all times (Evans). Immediate consistency is a scarce resource — spend it only within aggregates where invariants truly demand it. Between aggregates, use domain events, batch processing, or reconciliation jobs to converge within acceptable business timeframes.

## Aggregate Root Rules

1. **External access only through the root** — never reach into child entities directly
2. **The root enforces all invariants** — children don't validate themselves in isolation
3. **Delete cascades from the root** — deleting an aggregate deletes all its children
4. **IDs are globally unique for roots** — child entity IDs only need to be unique within the aggregate

## Enforcing Boundaries in TypeScript

The rules above are meaningless without code-level enforcement. Three patterns prevent callers from bypassing the aggregate root:

### 1. Accept child IDs, not child objects

When an aggregate method operates on a child entity, accept the child's **ID** — not the entity itself. The root looks up the child internally and validates ownership. Passing a child entity object from outside leaks aggregate internals into the caller.

```typescript
// ❌ Leaks internals — caller must obtain the Exercise object somehow
const removeExercise = (workout: Workout, exercise: Exercise): Workout => ...;

// ✅ Boundary preserved — caller only knows the ID
const removeExercise = (workout: Workout, exerciseId: ExerciseId): RemoveExerciseResult => {
  const exercise = workout.exercises.find(e => e.id === exerciseId);
  if (!exercise) return { success: false, reason: 'exercise-not-found' };
  return {
    success: true,
    workout: { ...workout, exercises: workout.exercises.filter(e => e.id !== exerciseId) },
  };
};
```

### 2. Create child entities through the root

Child entities should be created by aggregate root operations, not constructed externally and passed in. This ensures the root can enforce creation invariants (e.g., max items, uniqueness, ordering).

```typescript
// ❌ Externally constructed child — root can't enforce creation rules
const addExercise = (workout: Workout, exercise: Exercise): Workout => ...;

// ✅ Root creates the child — enforces max-exercises invariant
const addExercise = (workout: Workout, params: NewExerciseParams): AddExerciseResult => {
  if (workout.exercises.length >= workout.maxExercises) {
    return { success: false, reason: 'max-exercises-reached' };
  }
  const exercise: Exercise = {
    id: createExerciseId(),
    workoutId: workout.id,
    ...params,
  };
  return { success: true, workout: { ...workout, exercises: [...workout.exercises, exercise] } };
};
```

### 3. Expose ReadonlyArray for child collections

TypeScript's `ReadonlyArray<T>` (or `readonly T[]`) prevents callers from mutating the collection. This is the minimum boundary enforcement — callers can inspect children but cannot add, remove, or reorder them without going through root methods.

```typescript
type Workout = {
  readonly id: WorkoutId;
  readonly exercises: ReadonlyArray<Exercise>;  // Inspect OK, mutate impossible
  readonly maxExercises: number;
};
```

**Together, these three patterns mean:** callers can see child entities (via `ReadonlyArray`), identify them (via IDs), and request operations on them (via root methods) — but can never construct, mutate, or remove them directly.

## When to Split vs Combine

**Split when:**
- Two things change for different reasons (different business rules)
- Performance: loading the full aggregate is expensive but you usually only need a subset
- Concurrency: multiple users modify different parts simultaneously

**Combine when:**
- An invariant spans both things (budget checking requires knowing all gift ideas)
- They always change together
- Splitting would require a complex coordination mechanism

**Start combined, split when you feel the pain.** Premature splitting creates coordination complexity worse than the performance problem it prevents. Aggregate boundaries are expected to evolve as domain understanding deepens — splitting or merging aggregates is a normal part of DDD, not a sign of failure.

## Aggregates Serve Commands, Not Queries

Aggregates exist to protect correctness during state changes. They do not exist to answer read-side questions efficiently. Separating these concerns (CQRS thinking) has a direct impact on aggregate design:

- **Commands** load the aggregate, enforce invariants, persist changes
- **Queries** read data directly — optimized views, joins, projections — without loading aggregates

**Don't let query needs inflate aggregate boundaries.** If a client needs alarm counts, last-alarm dates, or summary statistics, that's a read-model concern. Adding these as properties on the write-side aggregate conflates two responsibilities.

```typescript
// ❌ Query concerns leaking into the aggregate
type Route = {
  readonly id: RouteId;
  readonly locations: ReadonlyArray<Location>;
  readonly alarmCount: number;        // Read concern — doesn't support any invariant
  readonly lastAlarmDate: Date | null; // Read concern — no command needs this
};

// ✅ Aggregate only has what commands need for invariant enforcement
type VendingMachine = {
  readonly id: VendingMachineId;
  readonly locationId: LocationId;
  readonly alarms: ReadonlyArray<Alarm>;      // Needed for max-alarms invariant
  readonly maxConcurrentAlarms: number;        // The invariant itself
};

// ✅ Read model answers query-side questions independently
type AlarmSummaryView = {
  readonly routeId: RouteId;
  readonly totalAlarms: number;
  readonly lastAlarmAt: Date | null;
  readonly activeAlarmCount: number;
};
```

**The test:** For every piece of data in an aggregate, ask "Does any command need this to enforce an invariant?" If the answer is no — if it only exists to satisfy a read — it belongs in a read model, not the aggregate.

Domain events bridge the two sides: the aggregate publishes `AlarmTriggered` after a command succeeds, and a projection updates the read model. This keeps the aggregate small and focused on correctness.

## Concurrency: Optimistic Locking

When multiple users can modify the same aggregate concurrently, add a version field to detect conflicts:

```typescript
type Occasion = {
  readonly id: OccasionId;
  readonly version: number;  // incremented on each save
  readonly name: string;
  readonly budget: Money;
  readonly giftIdeas: ReadonlyArray<GiftIdea>;
};
```

The repository checks the version on save:

```typescript
save: async (occasion) => {
  const updated = await db.update(occasions)
    .set({ ...toRow(occasion), version: occasion.version + 1 })
    .where(and(eq(occasions.id, occasion.id), eq(occasions.version, occasion.version)));
  if (updated.rowsAffected === 0) throw new ConcurrentModificationError(occasion.id);
},
```

If two users load version 3 and both try to save, the first succeeds (version becomes 4) and the second fails (version 3 no longer matches). Per `error-modeling.md`, the use case does not catch this — it propagates like any infrastructure exception, and the delivery/integration boundary translates it (a driving adapter in hexagonal architecture; for example, HTTP 409 with a "please retry" message). If retrying on conflict is itself a domain flow, model it explicitly in the use case (reload, re-run the domain logic, retry the save a bounded number of times) rather than catching-and-hoping — the event-sourcing skill's command handler shows this shape.

**When to add optimistic locking:**
- Multiple users can edit the same aggregate
- The aggregate is long-lived (not created and discarded in one request)
- Concurrent modifications would violate invariants

**When it's unnecessary:**
- Single-user aggregates (e.g., user preferences)
- Append-only aggregates (e.g., event logs)
- Short-lived aggregates created and consumed in one request
