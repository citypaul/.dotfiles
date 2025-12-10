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

## Schema-First at Trust Boundaries

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

## When Schemas ARE Required

- Data crosses trust boundary (external → internal)
- Type has validation rules (format, constraints)
- Shared data contract between systems
- Used in test factories

## When Schemas AREN'T Required

- Pure internal types (utilities, state)
- Result/Option types
- TypeScript utility types
- Behavior contracts (interfaces)
- Component props (unless from URL/API)

## Branded Types

```typescript
type UserId = string & { readonly brand: unique symbol };
type PaymentAmount = number & { readonly brand: unique symbol };
```
