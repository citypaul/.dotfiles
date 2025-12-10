---
name: functional
description: Functional programming patterns with immutable data. Use when writing logic or data transformations.
---

# Functional Patterns

## Core Principles

- **No data mutation** - immutable structures only
- **Pure functions** wherever possible
- **Composition** over inheritance

## Immutable Array Operations

```typescript
// ❌ WRONG - Mutations
items.push(newItem);
items.sort();

// ✅ CORRECT - Immutable
const withNew = [...items, newItem];
const sorted = [...items].sort();
```

## Immutable Object Updates

```typescript
// ❌ WRONG
user.name = "New";

// ✅ CORRECT
const updated = { ...user, name: "New" };
```

## Nested Updates

```typescript
// ✅ CORRECT
const updatedCart = {
  ...cart,
  items: cart.items.map((item, i) =>
    i === 0 ? { ...item, quantity: 5 } : item
  ),
};
```

## Early Returns Over Nesting

```typescript
// ❌ WRONG
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// ✅ CORRECT
if (!user || !user.isActive || !user.hasPermission) {
  return;
}
// do something
```

## Result Type for Error Handling

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```
