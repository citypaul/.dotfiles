---
name: hexagonal-architecture
description: Hexagonal (ports and adapters) architecture patterns for TypeScript. Use when implementing ports, adapters, dependency inversion, or domain isolation. Only applies to projects that explicitly use hexagonal architecture. Do NOT use for projects without ports/adapters structure.
---

# Hexagonal Architecture (Ports & Adapters)

This skill applies only to projects that have opted in to hexagonal architecture. Do not apply these patterns to projects that use a different architecture.

## Core Concept

Business logic lives in the center. External systems connect through ports (interfaces) and adapters (implementations). Dependencies point inward — adapters depend on ports, never the reverse.

```
┌─────────────────────────────────────┐
│           Adapters (outer)          │
│  ┌───────────────────────────────┐  │
│  │        Ports (middle)         │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │    Domain (center)      │  │  │
│  │  │    Pure business logic  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Ports = Interfaces

Ports define the contracts between layers. They are always `interface` types.

```typescript
// Port: defines WHAT operations exist, not HOW they work
export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface PaymentGateway {
  charge(amount: number, paymentInfo: PaymentInfo): Promise<Result<Transaction>>;
}
```

## Adapters = Implementations

Adapters implement ports for specific technologies.

```typescript
// Adapter: implements the port for PostgreSQL
export class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | undefined> {
    // PostgreSQL-specific implementation
  }
  async save(user: User): Promise<void> {
    // PostgreSQL-specific implementation
  }
  async delete(id: string): Promise<void> {
    // PostgreSQL-specific implementation
  }
}

// Adapter: implements the port for testing
export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  // In-memory implementation for tests
}
```

## Dependency Injection

Dependencies are always injected via parameters. Never create implementations internally.

**❌ WRONG — Creating implementation internally**

```typescript
export const createOrderProcessor = ({
  paymentGateway,
}: {
  paymentGateway: PaymentGateway;
}): OrderProcessor => {
  const orderRepository = new InMemoryOrderRepository(); // ❌ Hardcoded!
  return {
    processOrder(order) {
      orderRepository.save(order);
      return paymentGateway.charge(order.total);
    },
  };
};
```

**✅ CORRECT — Injecting all dependencies**

```typescript
export const createOrderProcessor = ({
  paymentGateway,
  orderRepository,
}: {
  paymentGateway: PaymentGateway;
  orderRepository: OrderRepository;
}): OrderProcessor => {
  return {
    processOrder(order) {
      orderRepository.save(order);
      return paymentGateway.charge(order.total);
    },
  };
};
```

**Why:** Any implementation works (in-memory for tests, PostgreSQL for production). Loose coupling. Testable without mocking frameworks.

## File Organization

| Layer | Location | Contains | Examples |
|-------|----------|----------|----------|
| Domain | `src/domain/` | Pure business logic, types | `User`, `Order`, `calculateTotal` |
| Ports | `src/ports/` or `src/interfaces/` | Interface definitions | `UserRepository`, `PaymentGateway` |
| Schemas | `src/schemas/` | Validation (Zod/Standard Schema) | `UserSchema`, `OrderSchema` |
| Adapters | `src/adapters/` or `src/infrastructure/` | Port implementations | `PostgresUserRepository`, `StripeGateway` |
| Use Cases | `src/use-cases/` or `src/services/` | Application logic | `createUserService`, `processOrder` |

**Key rules:**
- Domain and ports have zero external dependencies
- Adapters import from ports, never the reverse
- Schemas live in domain or a shared location — never duplicated in adapters
- Business logic is framework-agnostic

## Schema Placement

Schemas belong in the domain or a shared location. Never duplicate validation logic across adapters.

```typescript
// ✅ CORRECT — Schema in domain/shared, used by adapters
// src/schemas/user.ts
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// src/adapters/express-routes.ts
import { CreateUserSchema } from '../schemas/user.js';
// Validate at the adapter boundary
```

## Factory Functions Over Classes

For domain services, prefer factory functions:

```typescript
export const createOrderService = ({
  orderRepository,
  paymentGateway,
}: {
  orderRepository: OrderRepository;
  paymentGateway: PaymentGateway;
}): OrderService => ({
  async createOrder(order) {
    await orderRepository.save(order);
    return { success: true, data: order };
  },
});
```

**Why:** No `this` context issues. Natural dependency injection. Easier to compose and test.

## Checklist

- [ ] Domain logic has zero framework dependencies
- [ ] All external boundaries use ports (interfaces)
- [ ] Adapters implement ports, not the reverse
- [ ] Dependencies injected via parameters, never created internally
- [ ] Schemas defined once in domain/shared, not in adapters
- [ ] Factory functions for services (not classes)
- [ ] Dependencies point inward (adapters → ports → domain)
