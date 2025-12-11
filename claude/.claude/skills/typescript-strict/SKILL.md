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

## Schema Organization

### Organize Schemas by Usage

**Common patterns:**
- Centralized: `src/schemas/` for shared schemas
- Co-located: Near the modules that use them
- Layered: Separate by architectural layer (if using layered/hexagonal architecture)

**Key principle:** Avoid duplicating the same validation logic across multiple files.

### Gotcha: Schema Duplication

**Common anti-pattern:**

Defining the same schema in multiple places:
- Validation logic duplicated across endpoints
- Same business rules defined in multiple adapters
- Type definitions not shared

**Why This Is Wrong:**
- ❌ Duplication creates multiple sources of truth
- ❌ Changes require updating multiple files
- ❌ Breaks DRY principle at the knowledge level
- ❌ Domain logic leaks into infrastructure code

**Solution:**

```typescript
// ✅ CORRECT - Define schema once, import everywhere
// src/schemas/user-requests.ts
import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
```

```typescript
// Use in multiple places
import { CreateUserRequestSchema } from '../schemas/user-requests.js';

// Express endpoint
app.post('/users', (req, res) => {
  const result = CreateUserRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  // Use result.data (validated)
});

// GraphQL resolver
const createUser = (input: unknown) => {
  const validated = CreateUserRequestSchema.parse(input);
  return userService.create(validated);
};
```

**Key Benefits:**
- ✅ Single source of truth for validation
- ✅ Schema changes propagate everywhere automatically
- ✅ Type safety maintained across codebase
- ✅ DRY principle at knowledge level

**Remember:** If validation logic is duplicated, extract it into a shared schema.

---

## Dependency Injection Pattern

### Inject Dependencies, Don't Create Them

**The Rule:**
- Dependencies are always injected via parameters
- Never use `new` to create dependencies inside functions
- Factory functions accept dependencies as parameters

### Why This Matters

Without dependency injection:
- ❌ Only one implementation possible
- ❌ Can't test with mocks (poor testability)
- ❌ Tight coupling to specific implementations
- ❌ Violates dependency inversion principle
- ❌ Can't swap implementations

With dependency injection:
- ✅ Any implementation works (in-memory, database, remote API)
- ✅ Fully testable (inject mocks for testing)
- ✅ Loose coupling
- ✅ Follows dependency inversion principle
- ✅ Runtime flexibility (configure implementation)

### Example: Order Processor

**❌ WRONG - Creating implementation internally**

```typescript
export const createOrderProcessor = ({
  paymentGateway,
}: {
  paymentGateway: PaymentGateway;
}): OrderProcessor => {
  // ❌ Hardcoded implementation!
  const orderRepository = new InMemoryOrderRepository();

  return {
    processOrder(order) {
      const payment = paymentGateway.charge(order.total);
      if (!payment.success) {
        return { success: false, error: payment.error };
      }

      orderRepository.save(order); // Using hardcoded repository
      return { success: true, data: order };
    },
  };
};
```

**Why this is WRONG:**
- Only ONE repository implementation possible (in-memory)
- Can't test with mock repository
- Can't swap to database repository or remote API
- Tight coupling to specific implementation

**✅ CORRECT - Injecting all dependencies**

```typescript
export const createOrderProcessor = ({
  paymentGateway,  // ✅ Injected
  orderRepository, // ✅ Injected
}: {
  paymentGateway: PaymentGateway;
  orderRepository: OrderRepository;
}): OrderProcessor => {
  return {
    processOrder(order) {
      const payment = paymentGateway.charge(order.total);
      if (!payment.success) {
        return { success: false, error: payment.error };
      }

      orderRepository.save(order); // Delegate to injected dependency
      return { success: true, data: order };
    },
  };
};
```

**Why this is CORRECT:**
- ✅ Any OrderRepository implementation works (in-memory, PostgreSQL, MongoDB)
- ✅ Any PaymentGateway implementation works (Stripe, mock, testing)
- ✅ Easy to test (inject mocks)
- ✅ Loose coupling (depends on interfaces, not implementations)
- ✅ Runtime flexibility (choose implementation at startup)

---

## Type vs Interface - Understanding WHY

The choice between `type` and `interface` is architectural, not stylistic.

### Behavior Contracts → Use `interface`

**When to use:** Interfaces define contracts that must be implemented.

**Examples**: `UserRepository`, `PaymentGateway`, `EmailService`, `CacheProvider`

**Why `interface` for behavior contracts?**

1. **Signals implementation contracts clearly**
   - Interface communicates "this must be implemented elsewhere"
   - Type communicates "this is a data structure"

2. **Better TypeScript errors when implementing**
   - `class X implements UserRepository` gives clear errors
   - Types don't have `implements` keyword

3. **Conventional for dependency injection**
   - Standard pattern for dependency inversion
   - Clear separation between contract and implementation

4. **Class-friendly for implementations**
   - Many libraries use classes for services
   - Classes naturally implement interfaces

**Example:**

```typescript
// Behavior contract
export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// Concrete implementation
export class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | undefined> {
    // Implementation
  }
  // ... other methods
}
```

### Data Structures → Use `type`

**When to use:** Types define immutable data structures.

**Examples**: `User`, `Order`, `Config`, `ApiResponse`

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
// Data structure
export type User = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly roles: ReadonlyArray<string>;
};

export type Order = {
  readonly id: string;
  readonly userId: string;
  readonly items: ReadonlyArray<OrderItem>;
  readonly total: number;
};
```

### Architectural Pattern

This pattern supports clean architecture:

- **Behavior contracts** (`interface`) = Boundaries between layers
- **Data structures** (`type`) = Data flowing through the system
- **Business logic** depends on interfaces, not implementations
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
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "allowUnusedLabels": false
  }
}
```

### What Each Setting Does

**Core strict flags:**
- **`strict: true`** - Enables all strict type checking options
- **`noImplicitAny`** - Error on expressions/declarations with implied `any` type
- **`strictNullChecks`** - `null` and `undefined` have their own types (not assignable to everything)
- **`noUnusedLocals`** - Error on unused local variables
- **`noUnusedParameters`** - Error on unused function parameters
- **`noImplicitReturns`** - Error when not all code paths return a value
- **`noFallthroughCasesInSwitch`** - Error on fallthrough cases in switch statements

**Additional safety flags (CRITICAL):**
- **`noUncheckedIndexedAccess`** - Array/object access returns `T | undefined` (prevents runtime errors from assuming elements exist)
- **`exactOptionalPropertyTypes`** - Distinguishes `property?: T` from `property: T | undefined` (more precise types)
- **`noPropertyAccessFromIndexSignature`** - Requires bracket notation for index signature properties (forces awareness of dynamic access)
- **`forceConsistentCasingInFileNames`** - Prevents case sensitivity issues across operating systems
- **`allowUnusedLabels`** - Error on unused labels (catches accidental labels that do nothing)

### Additional Rules

- **No `@ts-ignore`** without explicit comments explaining why
- **These rules apply to test code as well as production code**

### Architectural Insight: noUnusedParameters Catches Design Issues

The `noUnusedParameters` rule can reveal architectural problems:

**Example**: A function with an unused parameter often indicates the parameter belongs in a different layer. Strict mode catches these design issues early.

---

## Immutability Patterns

### Use `readonly` on All Data Structures

```typescript
// ✅ CORRECT - Immutable data structure
type ApiRequest = {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly url: string;
  readonly headers?: {
    readonly [key: string]: string;
  };
  readonly body?: unknown;
};

// ❌ WRONG - Mutable data structure
type ApiRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: {
    [key: string]: string;
  };
  body?: unknown;
};
```

### ReadonlyArray vs Array

```typescript
// ✅ CORRECT - Immutable array
type ShoppingCart = {
  readonly id: string;
  readonly items: ReadonlyArray<CartItem>;
};

// ❌ WRONG - Mutable array
type ShoppingCart = {
  readonly id: string;
  readonly items: CartItem[];
};
```

### Result Type Pattern for Error Handling

Prefer `Result<T, E>` types over exceptions for expected errors:

```typescript
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

// Usage
export const findUser = (
  userId: string,
): Result<User> => {
  const user = database.findById(userId);
  if (!user) {
    return { success: false, error: new Error('User not found') };
  }

  return { success: true, data: user };
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
export const createOrderService = (
  orderRepository: OrderRepository,
  paymentGateway: PaymentGateway,
): OrderService => {
  return {
    async createOrder(order) {
      const validation = validateOrder(order);
      if (!validation.success) {
        return validation;
      }
      await orderRepository.save(order);
      return { success: true, data: order };
    },
    async processPayment(orderId, paymentInfo) {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return { success: false, error: new Error('Order not found') };
      }
      return paymentGateway.charge(order.total, paymentInfo);
    },
  };
};

// ❌ WRONG - Class-based creation
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private paymentGateway: PaymentGateway,
  ) {}

  async createOrder(order: Order) {
    // Implementation with `this`
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

### Suggested File Organization

These are common patterns, not strict rules. Adapt to your project's needs.

**Interfaces (Behavior Contracts)**
- Common locations: `src/interfaces/`, `src/contracts/`, `src/ports/`
- Examples: `UserRepository`, `PaymentGateway`, `EmailService`
- Why: Behavior contracts that define boundaries between layers

**Types (Data Structures)**
- Common locations: `src/types/`, `src/models/`, co-located with features
- Examples: `User`, `Order`, `Config`
- Why: Immutable data structures used throughout the system

**Schemas (Validation)**
- Common locations: `src/schemas/`, `src/validation/`, co-located with features
- Examples: `UserSchema`, `OrderSchema`, `ConfigSchema`
- Why: Validation rules (consider avoiding duplication)

**Business Logic**
- Common locations: `src/services/`, `src/domain/`, `src/use-cases/`
- Examples: `createUserService`, `processOrder`, `validatePayment`
- Why: Core business logic (prefer framework-agnostic when possible)

**Implementation Details**
- Common locations: `src/adapters/`, `src/infrastructure/`, `src/repositories/`
- Examples: `PostgresUserRepository`, `StripePaymentGateway`, `RedisCache`
- Why: Framework-specific code, external integrations

**Note:** These are suggestions based on common patterns. Your project may use different conventions. The key principles are:
- Clear separation of concerns
- Minimal duplication of validation logic
- Dependencies point inward (toward business logic)

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
interface UserService {
  createUser(user: User): void;
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
const addItem = (
  items: ReadonlyArray<Item>,
  newItem: Item,
): ReadonlyArray<Item> => {
  return [...items, newItem]; // Returns new array
};

// ❌ WRONG - Impure function (mutates)
const addItem = (items: Item[], newItem: Item): void => {
  items.push(newItem); // Mutates input!
};
```

### No Data Mutation

- Use spread operators for immutable updates
- Return new objects/arrays instead of modifying
- Let TypeScript's `readonly` enforce this

```typescript
// ✅ CORRECT - Immutable update
const updateUser = (
  user: User,
  updates: Partial<User>,
): User => {
  return { ...user, ...updates }; // New object
};

// ❌ WRONG - Mutation
const updateUser = (user: User, updates: Partial<User>): void => {
  Object.assign(user, updates); // Mutates!
};
```

### Composition Over Complex Logic

- Compose small functions into larger ones
- Each function does one thing well
- Easier to understand, test, and reuse

```typescript
// ✅ CORRECT - Composed functions
const validate = (input: unknown) => UserSchema.parse(input);
const saveToDatabase = (user: User) => database.save(user);
const createUser = (input: unknown) => saveToDatabase(validate(input));

// ❌ WRONG - Complex monolithic function
const createUser = (input: unknown) => {
  if (typeof input !== 'object' || !input) throw new Error('Invalid');
  if (!('email' in input)) throw new Error('Missing email');
  // ... 50 more lines of validation and registration
};
```

### Use Array Methods Over Loops

- Prefer `map`, `filter`, `reduce` for transformations
- Declarative (what, not how)
- Natural immutability (return new arrays)

```typescript
// ✅ CORRECT - Functional array methods
const activeUsers = users.filter(u => u.active);
const userEmails = users.map(u => u.email);

// ❌ WRONG - Imperative loops
const activeUsers = [];
for (const u of users) {
  if (u.active) {
    activeUsers.push(u);
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
