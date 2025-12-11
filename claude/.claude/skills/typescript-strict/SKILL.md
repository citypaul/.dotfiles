---
name: typescript-strict
description: TypeScript strict mode patterns. Use when writing any TypeScript code.
---

# TypeScript Strict Mode

## Core Rules

1. **No `any`** - ever. Use `unknown` if type is truly unknown
2. **No type assertions** (`as Type`) without justification
3. **Prefer `type` over `interface`** for data structures
4. **Reserve `interface`** for behavior contracts only

---

## Schema Placement Architecture - CRITICAL

### CRITICAL RULE: Schemas ALWAYS Belong in Core, NEVER in Adapters

**Location**: `packages/core/src/schemas/` (or `src/schemas/` in non-monorepo projects)

**Why schemas belong in core:**
- Schemas define **domain validation rules** (business logic)
- Same schema across all adapters → NOT framework-specific
- Prevents duplication and multiple sources of truth
- Adapters are thin translation layers, not domain logic containers

### Gotcha: Schema Duplication Across Adapters

**Real Case Study:**

During development, `scenarioRequestSchema` was duplicated in 3 adapter files:
- Express adapter had it locally
- Next.js Pages adapter had it locally
- Next.js App adapter had it locally

Each with the EXACT same Zod schema defined locally.

**Why This Was WRONG:**
- ❌ Schema defines domain validation → belongs in CORE, not adapters
- ❌ Duplication creates multiple sources of truth
- ❌ Changes require updating 3 files instead of 1
- ❌ Violates hexagonal architecture (domain logic leaking into infrastructure)
- ❌ Breaks DRY principle at the knowledge level

**What Happened:**
Schema was moved to `packages/core/src/schemas/scenario-requests.ts` and exported from core. All 3 adapters now import from core:

```typescript
// ✅ CORRECT - Import from core
import { ScenarioRequestSchema } from '@scenarist/core';
```

### Decision Framework: Does This Schema Belong in Core?

Ask these 3 questions:

**1. Is this schema used by multiple adapters?**
- YES → ✅ Schema belongs in CORE

**2. Does it define domain validation rules?**
- YES → ✅ Schema belongs in CORE

**3. Is it part of the API contract for your application/library?**
- YES → ✅ Schema belongs in CORE

**If ANY answer is YES, the schema belongs in core.**

### Red Flags to Watch For

Watch for these patterns that indicate schema should be in core:

1. ❌ Defining Zod schemas in adapter files
2. ❌ Importing `zod` in adapter code (unless using core-exported schemas)
3. ❌ Similar validation logic across multiple adapters
4. ❌ Type definitions not imported from core
5. ❌ Using `z.object()`, `z.string()`, etc. directly in adapter code

### The Pattern: Schema-First Development in Core

**Step 1: Define schema in core**

```typescript
// packages/core/src/schemas/scenario-requests.ts
import { z } from 'zod';

export const ScenarioRequestSchema = z.object({
  scenario: z.string().min(1),
  variant: z.string().optional(),
});

export type ScenarioRequest = z.infer<typeof ScenarioRequestSchema>;
```

**Step 2: Export from core barrel**

```typescript
// packages/core/src/schemas/index.ts
export { ScenarioRequestSchema } from './scenario-requests.js';
export type { ScenarioRequest } from './scenario-requests.js';
```

**Step 3: Export from core root**

```typescript
// packages/core/src/index.ts
export { ScenarioRequestSchema } from './schemas/index.js';
export type { ScenarioRequest } from './schemas/index.js';
```

**Step 4: Use in ALL adapters**

```typescript
// packages/express-adapter/src/endpoints.ts
import { ScenarioRequestSchema } from '@scenarist/core';

export const setScenario = (req: Request, res: Response) => {
  const result = ScenarioRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  // Use result.data (validated)
};
```

**Key Benefits:**
- ✅ Single source of truth for validation
- ✅ Schema changes automatically propagate to all adapters
- ✅ Type safety maintained across all packages
- ✅ Hexagonal architecture preserved
- ✅ DRY principle at knowledge level

**Remember:** If validation logic is duplicated across adapters, it's domain knowledge that belongs in core.

---

## Dependency Injection Pattern - CRITICAL

### CRITICAL: Domain Logic Must NEVER Create Port Implementations Internally

**The Rule:**
- Ports (interfaces) are always injected as dependencies
- Never use `new` to create port implementations inside domain logic
- Factory functions accept ports via parameters

### Why This Matters

Without dependency injection:
- ❌ Only one implementation possible (breaks hexagonal architecture)
- ❌ Can't test with mocks (poor testability)
- ❌ Tight coupling to specific implementations
- ❌ Violates dependency inversion principle
- ❌ Can't swap implementations (in-memory → Redis → remote)

With dependency injection:
- ✅ Any port implementation works (in-memory, Redis, files, remote)
- ✅ Fully testable (inject mocks for testing)
- ✅ True hexagonal architecture
- ✅ Follows dependency inversion principle
- ✅ Runtime flexibility (configure implementation)

### Example: ScenarioManager (Domain Coordinator)

**❌ WRONG - Creating implementation internally**

```typescript
export const createScenarioManager = ({
  store,
}: {
  store: ScenarioStore;
}): ScenarioManager => {
  // ❌ Hardcoded implementation!
  const scenarioRegistry = new Map<string, ScenaristScenario>();

  return {
    registerScenario(definition) {
      scenarioRegistry.set(definition.id, definition); // Using hardcoded Map
    },
    switchScenario(testId, scenarioId, variantName) {
      const definition = scenarioRegistry.get(scenarioId); // Hardcoded
      if (!definition) {
        return { success: false, error: new Error('Not found') };
      }
      store.set(testId, { scenarioId, variantName });
      return { success: true, data: undefined };
    },
  };
};
```

**Why this is WRONG:**
- Only ONE registry implementation possible (in-memory Map)
- Can't test with mock registry
- Can't swap to Redis registry or remote registry
- Breaks hexagonal architecture completely

**✅ CORRECT - Injecting both ports**

```typescript
export const createScenarioManager = ({
  registry,  // ✅ Injected - interface, not implementation
  store,     // ✅ Injected - interface, not implementation
}: {
  registry: ScenarioRegistry;
  store: ScenarioStore;
}): ScenarioManager => {
  return {
    registerScenario(definition) {
      registry.register(definition); // Delegate to injected port
    },
    switchScenario(testId, scenarioId, variantName) {
      const definition = registry.get(scenarioId);
      if (!definition) {
        return { success: false, error: new Error('Not found') };
      }
      store.set(testId, { scenarioId, variantName });
      return { success: true, data: undefined };
    },
    // All methods delegate to injected ports, never create them
  };
};
```

**Why this is CORRECT:**
- ✅ Any ScenarioRegistry implementation works (Map, Redis, remote API)
- ✅ Any ScenarioStore implementation works (Map, localStorage, IndexedDB)
- ✅ Easy to test (inject mock registry and store)
- ✅ True hexagonal architecture (domain depends on interfaces, not implementations)
- ✅ Runtime flexibility (choose implementation at startup)

### ScenarioManager's Role

ScenarioManager is a **coordinator/facade** that:
- Orchestrates operations between ScenarioRegistry and ScenarioStore
- Enforces business rules (e.g., can't activate non-existent scenarios)
- Provides unified API for scenario operations
- **Delegates to injected ports, never creates them**

---

## Type vs Interface - Understanding WHY

The choice between `type` and `interface` is architectural, not stylistic.

### Ports (Behavior Contracts) → Use `interface`

**Location**: `packages/core/src/ports/` (or `src/ports/`)

**Definition**: Interfaces define contracts that adapters must implement.

**Examples**: `ScenarioManager`, `ScenarioStore`, `RequestContext`, `ScenarioRegistry`

**Why `interface` for ports?**

1. **Signals implementation contracts clearly**
   - Interface communicates "this must be implemented elsewhere"
   - Type communicates "this is a data structure"

2. **Better TypeScript errors when implementing**
   - `class X implements ScenarioStore` gives clear errors
   - Types don't have `implements` keyword

3. **Conventional in hexagonal architecture**
   - Ports & Adapters pattern uses interfaces for ports
   - Industry standard for dependency inversion

4. **Class-friendly for adapter implementations**
   - Adapters often use classes (Express middleware, Next.js API routes)
   - Classes naturally implement interfaces

**Example:**

```typescript
// packages/core/src/ports/scenario-manager.ts
export interface ScenarioManager {
  registerScenario(definition: ScenaristScenario): void;
  switchScenario(
    testId: string,
    scenarioId: string,
    variantName?: string,
  ): ScenaristResult<void>;
  getActiveScenario(testId: string): ActiveScenario | undefined;
}
```

### Types (Data Structures) → Use `type`

**Location**: `packages/core/src/types/` (or `src/types/`)

**Definition**: Types define immutable data structures.

**Examples**: `Scenario`, `ActiveScenario`, `ScenaristConfig`, `ScenaristMock`

**Why `type` for data?**

1. **Emphasizes immutability**
   - Types with `readonly` signal "don't mutate this"
   - Functional programming alignment

2. **Better for unions, intersections, mapped types**
   - `type Result<T, E> = Success<T> | Failure<E>`
   - `type Partial<T> = { [P in keyof T]?: T[P] }`

3. **Prevents accidental mutations**
   - `readonly` properties enforce immutability at type level
   - Compiler catches mutation attempts

4. **More flexible composition**
   - Easier to compose with utility types
   - Better inference in complex scenarios

**Example:**

```typescript
// packages/core/src/types/scenario.ts
export type ScenaristScenario = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly mocks: ReadonlyArray<ScenaristMock>;
};

export type ActiveScenario = {
  readonly scenarioId: string;
  readonly variantName?: string;
};
```

### Architectural Connection

This pattern supports **hexagonal architecture**:

- **Ports** (`interface`) = Behavior contracts at hexagon boundaries
- **Types** (`type`) = Data flowing through the hexagon
- **Domain logic** depends on ports (interfaces), not implementations
- **Data** is immutable (types with `readonly`)

---

## Strict Mode Configuration

### tsconfig.json Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### What Each Setting Does

- **`strict: true`** - Enables all strict type checking options
- **`noImplicitAny`** - Error on expressions/declarations with implied `any` type
- **`strictNullChecks`** - `null` and `undefined` have their own types (not assignable to everything)
- **`noUnusedLocals`** - Error on unused local variables
- **`noUnusedParameters`** - Error on unused function parameters
- **`noImplicitReturns`** - Error when not all code paths return a value
- **`noFallthroughCasesInSwitch`** - Error on fallthrough cases in switch statements

### Additional Rules

- **No `@ts-ignore`** without explicit comments explaining why
- **These rules apply to test code as well as production code**

### Architectural Insight: noUnusedParameters Catches Design Issues

The `noUnusedParameters` rule can reveal architectural problems:

**Example**: During development, `ScenarioManager` was found to have a `config` parameter that wasn't used. This led to discovering that `config` didn't belong in domain logic - it belonged in adapters only. The strict mode rule caught an architectural violation.

---

## Immutability Patterns

### Use `readonly` on All Data Structures

```typescript
// ✅ CORRECT - Immutable data structure
type ScenaristMock = {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly url: string | RegExp;
  readonly response: {
    readonly status: number;
    readonly body?: unknown;
    readonly headers?: Record<string, string>;
    readonly delay?: number;
  };
};

// ❌ WRONG - Mutable data structure
type ScenaristMock = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string | RegExp;
  response: {
    status: number;
    body?: unknown;
  };
};
```

### ReadonlyArray vs Array

```typescript
// ✅ CORRECT - Immutable array
type Scenario = {
  readonly id: string;
  readonly mocks: ReadonlyArray<ScenaristMock>;
};

// ❌ WRONG - Mutable array
type Scenario = {
  readonly id: string;
  readonly mocks: ScenaristMock[];
};
```

### Result Type Pattern for Error Handling

Prefer `ScenaristResult<T, E>` types over exceptions for expected errors:

```typescript
export type ScenaristResult<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

// Usage
export const switchScenario = (
  testId: string,
  scenarioId: string,
): ScenaristResult<void> => {
  const definition = registry.get(scenarioId);
  if (!definition) {
    return { success: false, error: new Error('Scenario not found') };
  }

  store.set(testId, { scenarioId });
  return { success: true, data: undefined };
};
```

**Why result types?**
- Explicit error handling (type system enforces checking)
- No hidden control flow (unlike exceptions)
- Functional programming alignment
- Easier to test (no try/catch needed)

---

## Factory Pattern for Object Creation

### Use Factory Functions (Not Classes)

```typescript
// ✅ CORRECT - Factory function
export const createScenarioManager = (
  registry: ScenarioRegistry,
  store: ScenarioStore,
): ScenarioManager => {
  return {
    registerScenario(definition) {
      registry.register(definition);
    },
    switchScenario(testId, scenarioId, variantName) {
      // Implementation
    },
  };
};

// ❌ WRONG - Class-based creation
export class ScenarioManager {
  constructor(
    private registry: ScenarioRegistry,
    private store: ScenarioStore,
  ) {}

  registerScenario(definition: ScenaristScenario) {
    this.registry.register(definition);
  }
}
```

**Why factory functions?**
- Functional programming alignment
- No `this` context issues
- Easier to compose
- Natural dependency injection
- Simpler testing (no `new` keyword)

---

## Location Guidance

### Where to Put Each Artifact Type

**Ports (Interfaces)**
- Location: `packages/core/src/ports/` (or `src/ports/`)
- Examples: `ScenarioManager`, `ScenarioStore`, `RequestContext`
- Why: Behavior contracts that define hexagon boundaries

**Types (Data Structures)**
- Location: `packages/core/src/types/` (or `src/types/`)
- Examples: `Scenario`, `ActiveScenario`, `ScenaristConfig`
- Why: Immutable data flowing through the system

**Schemas (Validation)**
- Location: `packages/core/src/schemas/` (or `src/schemas/`)
- Examples: `ScenarioRequestSchema`, `ScenaristConfigSchema`
- Why: Domain validation rules (business logic)

**Domain Logic**
- Location: `packages/core/src/domain/` (or `src/domain/`)
- Examples: `createScenarioManager`, `buildConfig`
- Why: Pure business logic with no framework dependencies

**Adapters**
- Location: Separate packages or `src/adapters/`
- Examples: `express-adapter`, `nextjs-adapter`, `InMemoryStore`
- Why: Framework-specific implementations, external integrations

---

## Schema-First at Trust Boundaries

### When Schemas ARE Required

- Data crosses trust boundary (external → internal)
- Type has validation rules (format, constraints)
- Shared data contract between systems
- Used in test factories (validate test data completeness)

```typescript
// API responses, user input, external data
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;

// Validate at boundary
const user = UserSchema.parse(apiResponse);
```

### When Schemas AREN'T Required

- Pure internal types (utilities, state)
- Result/Option types (no validation needed)
- TypeScript utility types (`Partial<T>`, `Pick<T>`, etc.)
- Behavior contracts (interfaces - structural, not validated)
- Component props (unless from URL/API)

```typescript
// ✅ CORRECT - No schema needed
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

// ✅ CORRECT - Interface, no validation
interface ScenarioManager {
  registerScenario(definition: Scenario): void;
}
```

---

## Functional Programming Principles

These principles support immutability and type safety:

### Pure Functions

- No side effects (don't mutate external state)
- Deterministic (same input → same output)
- Easier to reason about, test, and compose

```typescript
// ✅ CORRECT - Pure function
const addScenario = (
  scenarios: ReadonlyArray<Scenario>,
  newScenario: Scenario,
): ReadonlyArray<Scenario> => {
  return [...scenarios, newScenario]; // Returns new array
};

// ❌ WRONG - Impure function (mutates)
const addScenario = (scenarios: Scenario[], newScenario: Scenario): void => {
  scenarios.push(newScenario); // Mutates input!
};
```

### No Data Mutation

- Use spread operators for immutable updates
- Return new objects/arrays instead of modifying
- Let TypeScript's `readonly` enforce this

```typescript
// ✅ CORRECT - Immutable update
const updateScenario = (
  scenario: Scenario,
  updates: Partial<Scenario>,
): Scenario => {
  return { ...scenario, ...updates }; // New object
};

// ❌ WRONG - Mutation
const updateScenario = (scenario: Scenario, updates: Partial<Scenario>): void => {
  Object.assign(scenario, updates); // Mutates!
};
```

### Composition Over Complex Logic

- Compose small functions into larger ones
- Each function does one thing well
- Easier to understand, test, and reuse

```typescript
// ✅ CORRECT - Composed functions
const validate = (input: unknown) => ScenarioSchema.parse(input);
const register = (scenario: Scenario) => registry.register(scenario);
const registerScenario = (input: unknown) => register(validate(input));

// ❌ WRONG - Complex monolithic function
const registerScenario = (input: unknown) => {
  if (typeof input !== 'object' || !input) throw new Error('Invalid');
  if (!('id' in input)) throw new Error('Missing id');
  // ... 50 more lines of validation and registration
};
```

### Use Array Methods Over Loops

- Prefer `map`, `filter`, `reduce` for transformations
- Declarative (what, not how)
- Natural immutability (return new arrays)

```typescript
// ✅ CORRECT - Functional array methods
const activeScenarios = scenarios.filter(s => s.active);
const scenarioIds = scenarios.map(s => s.id);

// ❌ WRONG - Imperative loops
const activeScenarios = [];
for (const s of scenarios) {
  if (s.active) {
    activeScenarios.push(s);
  }
}
```

---

## Branded Types

For type-safe primitives:

```typescript
type UserId = string & { readonly brand: unique symbol };
type PaymentAmount = number & { readonly brand: unique symbol };

// Type-safe at compile time
const processPayment = (userId: UserId, amount: PaymentAmount) => {
  // Implementation
};

// ❌ Can't pass raw string/number
processPayment('user-123', 100); // Error

// ✅ Must use branded type
const userId = 'user-123' as UserId;
const amount = 100 as PaymentAmount;
processPayment(userId, amount); // OK
```

---

## Summary Checklist

When writing TypeScript code, verify:

- [ ] No `any` types - using `unknown` where type is truly unknown
- [ ] No type assertions without justification
- [ ] Using `type` for data structures with `readonly`
- [ ] Using `interface` for behavior contracts (ports)
- [ ] Schemas defined in core, not duplicated in adapters
- [ ] Ports injected via parameters, never created internally
- [ ] Factory functions for object creation (not classes)
- [ ] `readonly` on all data structure properties
- [ ] Pure functions wherever possible (no mutations)
- [ ] Result types for expected errors (not exceptions)
- [ ] Strict mode enabled with all checks passing
- [ ] Artifacts in correct locations (ports/, types/, schemas/, domain/)
