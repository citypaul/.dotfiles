---
name: typescript-strict
description: TypeScript strict mode patterns including schema-first development, branded types, type vs interface guidance, and tsconfig strict flags. Use when writing TypeScript code, defining types or schemas, or reviewing type safety. For immutability and pure function patterns, see the functional skill.
---

# TypeScript Strict Mode

## Core Rules

1. **Use `unknown` at untrusted boundaries.** Contain unavoidable `any` in external declarations or interop shims and explain it
2. **No type assertions** (`as Type`) without justification
3. **Follow the repository's `type`/`interface` convention.** Choose from language semantics when no convention exists

---

## Type vs Interface

### `type` — unions, tuples, mapped types, and closed aliases

```typescript
export type User = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly roles: ReadonlyArray<string>;
};
```

Type aliases can name unions, intersections, tuples, primitives, mapped types, and object shapes. They cannot be reopened through declaration merging.

### `interface` — extendable object contracts

```typescript
export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
}
```

Interfaces describe object shapes, work with `implements`, extend with conflict checking, and support declaration merging. They are useful for behavior contracts and deliberately open extension points, but are not forbidden for data shapes.

### Schema Duplication

Define a schema once per owned contract, version, and bounded context, then
import it within that boundary. Do not couple independently deployed consumers
or contexts merely because their fields happen to match today; validate and
translate at each trust boundary, with contract tests where drift matters.

```typescript
// ✅ Define once for this API contract
export const CreateUserRequestSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// Import and use wherever needed
```

**Where schemas belong**: validate at trust boundaries (HTTP handlers, queue consumers, file/env parsing, third-party API responses), then pass plain derived types through internal logic — internal functions trust their inputs. Prefer schema libraries implementing [Standard Schema](https://standardschema.dev) (Zod 4+, Valibot, ArkType) so validation tooling stays interchangeable.

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

**Strict baseline:**
- **`strict: true`** - Enables the strict type-checking family, including `noImplicitAny` and `strictNullChecks`

**Additional project checks:**
- **`noUnusedLocals`** - Error on unused local variables
- **`noUnusedParameters`** - Error on unused function parameters
- **`noImplicitReturns`** - Error when not all code paths return a value
- **`noFallthroughCasesInSwitch`** - Error on fallthrough cases in switch statements

**Additional safety flags to assess against the codebase:**
- **`noUncheckedIndexedAccess`** - Array/object access returns `T | undefined` (prevents runtime errors from assuming elements exist)
- **`exactOptionalPropertyTypes`** - Distinguishes `property?: T` from `property: T | undefined` (more precise types)
- **`noPropertyAccessFromIndexSignature`** - Requires bracket notation for index signature properties (forces awareness of dynamic access)
- **`forceConsistentCasingInFileNames`** - Prevents case sensitivity issues across operating systems
- **`allowUnusedLabels`** - Error on unused labels (catches accidental labels that do nothing)

### Additional Rules

- Prefer a justified, narrow `@ts-expect-error` over `@ts-ignore` when an upstream typing defect cannot yet be fixed
- Apply the repository's type-safety policy to tests too; use deliberate test-only interop shims rather than weakening global configuration

### Architectural Insight: noUnusedParameters Catches Design Issues

The `noUnusedParameters` rule can reveal architectural problems:

**Example**: A function with an unused parameter often indicates the parameter belongs in a different layer. Strict mode catches these design issues early.

---

## Immutability, Pure Functions, and Composition

For detailed patterns on immutability (`readonly`, `ReadonlyArray`), pure functions, composition, Result types, array methods, and factory functions, see the `functional` skill. These are the canonical patterns used across the codebase.

Key TypeScript-specific notes:
- Use `readonly` and `ReadonlyArray<T>` where immutability is part of the contract, especially shared domain values
- The compiler enforces shallow property immutability; it does not make nested runtime values deeply immutable
- Choose factories or classes from invariant, lifecycle, and project-convention needs; dependency injection does not require either form

---

## Schema-First at Trust Boundaries

### When Runtime Schemas Are Required

A runtime schema is required when untrusted data crosses a boundary and the
program must validate its shape or constraints before using it. Common
signals include:

- HTTP, queue, file, environment, or third-party data entering the system
- A data contract exchanged between independently deployed systems
- Contract-shaped test fixtures where reusing an existing production schema
  adds useful evidence

Internal invariants do not require a schema by default. A smart constructor,
branded type, or domain value object may be the clearer owner when values are
created and consumed inside one trusted process.

```typescript
// API responses, user input, external data
const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
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

## Branded Types

For type-safe primitives:

```typescript
type UserId = string & { readonly brand: unique symbol };
type PaymentMinorUnits = number & { readonly brand: unique symbol };
type Currency = 'GBP' | 'USD' | 'EUR';
type PaymentMoney = {
  readonly minorUnits: PaymentMinorUnits;
  readonly currency: Currency;
};

// Type-safe at compile time
const processPayment = (userId: UserId, amount: PaymentMoney) => {
  // Implementation
};

// ❌ Can't pass raw string/number
processPayment('user-123', 100); // Error

// ✅ Brand via a validating constructor — the ONE place an assertion is justified
const toUserId = (raw: string): UserId => {
  if (raw.length === 0) throw new Error('UserId cannot be empty');
  return raw as UserId;
};
const toPaymentMinorUnits = (raw: number): PaymentMinorUnits => {
  if (!Number.isSafeInteger(raw) || raw <= 0) {
    throw new Error('Payment minor units must be a positive safe integer');
  }
  return raw as PaymentMinorUnits;
};
const toPaymentMoney = (minorUnits: number, currency: Currency): PaymentMoney => ({
  minorUnits: toPaymentMinorUnits(minorUnits),
  currency,
});

processPayment(toUserId('user-123'), toPaymentMoney(2_500, 'GBP')); // £25.00
```

Never scatter `as UserId` through application code — the assertion lives only inside the constructor (or a schema's `transform`), so every branded value has passed validation.

The payment boundary above accepts already-rounded integer minor units, so `NaN`, infinities, and binary-float fractions are rejected. If a boundary instead accepts decimal major-unit text, parse it with the currency's minor-unit exponent and a named rounding policy (or reject excess precision); never use `Math.round(rawNumber * 100)`.

---

## Summary Checklist

When writing TypeScript code, verify:

- [ ] No unexplained `any`; unavoidable interop is narrow and contained
- [ ] No type assertions without justification
- [ ] `type` and `interface` follow repository convention or the required language semantics
- [ ] Schemas have one owner per contract/version/context; independent boundaries are not coupled by convenience
- [ ] `strict` is enabled; additional compiler checks follow the repository's adopted policy
- [ ] For immutability, pure functions, composition: see `functional` skill
