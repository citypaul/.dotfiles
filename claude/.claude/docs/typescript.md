# TypeScript Guidelines

## Strict Mode Requirements

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- **No `any`** - ever. Use `unknown` if type is truly unknown
- **No type assertions** (`as SomeType`) unless absolutely necessary with clear justification
- **No `@ts-ignore`** or `@ts-expect-error` without explicit explanation
- These rules apply to test code as well as production code

## Type Definitions

- **Prefer `type` over `interface`** - Use `type` for data structures and shapes. Reserve `interface` ONLY for behavior contracts (ports, adapters, dependency injection):

```typescript
// ✅ CORRECT - type for data structures
type User = {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
};

type PaymentRequest = {
  amount: number;
  currency: string;
};

// ✅ CORRECT - interface for behavior contracts
interface Logger {
  log(message: string): void;
  error(message: string, error: Error): void;
}

interface PaymentGateway {
  processPayment(payment: Payment): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
}

// ❌ WRONG - interface for data structure
interface User {
  id: string;
  email: string;
}
```

**Why this distinction?**
- **Types** describe what data IS (structure, shape)
- **Interfaces** describe what code DOES (behavior, contracts)
- Interfaces support declaration merging and extension, useful for dependency injection and plugin systems
- Types are more flexible for complex type operations (unions, intersections, mapped types)

- Use explicit typing where it aids clarity, but leverage inference where appropriate
- Utilize utility types effectively (`Pick`, `Omit`, `Partial`, `Required`, etc.)
- Create domain-specific types (e.g., `UserId`, `PaymentId`) for type safety
- Use Zod or any other [Standard Schema](https://standardschema.dev/) compliant schema library to create types, by creating schemas first

```typescript
// Good - Branded types for type safety
type UserId = string & { readonly brand: unique symbol };
type PaymentAmount = number & { readonly brand: unique symbol };

// Avoid - No type distinction
type UserId = string;
type PaymentAmount = number;
```

## Schema-First Development with Zod

Always define your schemas first, then derive types from them:

```typescript
import { z } from "zod";

// Define schemas first - these provide runtime validation
const AddressDetailsSchema = z.object({
  houseNumber: z.string(),
  houseName: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i),
});

const PayingCardDetailsSchema = z.object({
  cvv: z.string().regex(/^\d{3,4}$/),
  token: z.string().min(1),
});

const PostPaymentsRequestV3Schema = z.object({
  cardAccountId: z.string().length(16),
  amount: z.number().positive(),
  source: z.enum(["Web", "Mobile", "API"]),
  accountStatus: z.enum(["Normal", "Restricted", "Closed"]),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payingCardDetails: PayingCardDetailsSchema,
  addressDetails: AddressDetailsSchema,
  brand: z.enum(["Visa", "Mastercard", "Amex"]),
});

// Derive types from schemas
type AddressDetails = z.infer<typeof AddressDetailsSchema>;
type PayingCardDetails = z.infer<typeof PayingCardDetailsSchema>;
type PostPaymentsRequestV3 = z.infer<typeof PostPaymentsRequestV3Schema>;

// Use schemas at runtime boundaries
export const parsePaymentRequest = (data: unknown): PostPaymentsRequestV3 => {
  return PostPaymentsRequestV3Schema.parse(data);
};

// Example of schema composition for complex domains
const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const CustomerSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  tier: z.enum(["standard", "premium", "enterprise"]),
  creditLimit: z.number().positive(),
});

type Customer = z.infer<typeof CustomerSchema>;
```

## When Schemas Are Required vs. Optional

**Not all types need schemas.** Use this decision framework to determine when runtime validation is necessary:

### Decision Framework

Ask these questions in order:

1. **Does data cross a trust boundary?** (external → internal)
   - YES → ✅ Schema required
   - NO → Continue

2. **Does type have validation rules?** (format, constraints, enums)
   - YES → ✅ Schema required
   - NO → Continue

3. **Is this a shared data contract?** (between systems)
   - YES → ✅ Schema required
   - NO → Continue

4. **Used in test factories?**
   - YES → ✅ Schema required (for validation)
   - NO → Continue

5. **Pure internal type?** (utility, state, behavior)
   - YES → ❌ Type is fine (no schema needed)
   - NO → ✅ Schema recommended for safety

### ✅ Schema REQUIRED Examples

```typescript
// API responses (trust boundary)
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]),
});
const user = UserSchema.parse(apiResponse);

// Business validation rules
const PaymentSchema = z.object({
  amount: z.number().positive().max(10000),
  email: z.string().email(),
  cardNumber: z.string().regex(/^\d{16}$/),
});

// Shared data contracts (events, messages)
const OrderCreatedEventSchema = z.object({
  orderId: z.string(),
  customerId: z.string(),
  items: z.array(z.object({ sku: z.string(), quantity: z.number() })),
});

// Test data factories (ensures test data validity)
const getMockUser = (): User => {
  return UserSchema.parse({
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "test@example.com",
    role: "user",
  });
};
```

### ❌ Schema OPTIONAL Examples

```typescript
// Pure internal types (no external data, no validation)
type Point = { readonly x: number; readonly y: number };
type CartTotal = { subtotal: number; tax: number; total: number };

// Result/Option types (internal logic)
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// TypeScript utilities (compile-time only)
type UserProfile = Pick<User, 'id' | 'name'>;
type PartialUser = Partial<User>;

// Branded primitives (compile-time nominal types)
type UserId = string & { readonly brand: unique symbol };
type PaymentId = string & { readonly brand: unique symbol };

// Behavior contracts (interface for behavior, not data)
interface Logger {
  log(message: string): void;
  error(message: string, error: Error): void;
}

// Internal state machines
type LoadingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: unknown }
  | { status: "error"; error: Error };

// Component props (usually - internal to app)
type ButtonProps = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};
// Exception: If props come from URL params or API → schema required
```

**Summary:** Use schemas at trust boundaries and for validation. For internal types, utilities, and behavior contracts, plain TypeScript types are sufficient.

## Schema Usage in Tests

**CRITICAL**: Tests must use real schemas and types from the main project, not redefine their own.

```typescript
// ❌ WRONG - Defining schemas in test files
const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  ownerId: z.string().nullable(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ✅ CORRECT - Import schemas from the shared schema package
import { ProjectSchema, type Project } from "@your-org/schemas";
```

**Why this matters:**

- **Type Safety**: Ensures tests use the same types as production code
- **Consistency**: Changes to schemas automatically propagate to tests
- **Maintainability**: Single source of truth for data structures
- **Prevents Drift**: Tests can't accidentally diverge from real schemas

**Implementation:**

- All domain schemas should be exported from a shared schema package or module
- Test files should import schemas from the shared location
- If a schema isn't exported yet, add it to the exports rather than duplicating it
- Mock data factories should use the real types derived from real schemas

```typescript
// ✅ CORRECT - Test factories using real schemas
import { ProjectSchema, type Project } from "@your-org/schemas";

const getMockProject = (overrides?: Partial<Project>): Project => {
  const baseProject = {
    id: "proj_123",
    workspaceId: "ws_456",
    ownerId: "user_789",
    name: "Test Project",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const projectData = { ...baseProject, ...overrides };

  // Validate against real schema to catch type mismatches
  return ProjectSchema.parse(projectData);
};
```
