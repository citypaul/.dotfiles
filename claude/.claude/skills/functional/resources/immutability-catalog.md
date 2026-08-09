# Immutability Catalog

Reference card for fixing mutation bugs: `readonly` typing, plus immutable alternatives to every common array and object mutation.

---

## Readonly Keyword for Immutability

Use `readonly` on data structures whose contract is immutable. Local implementation state may remain mutable when it is encapsulated and clearer.

### readonly on Properties

```typescript
// ✅ CORRECT - Immutable data structure
type Scenario = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

// ⚠️ MUTABLE - Appropriate only when this is intentional implementation state
type Scenario = {
  id: string;
  name: string;
};
```

### ReadonlyArray vs Array

```typescript
// ✅ CORRECT - Immutable array
type Scenario = {
  readonly mocks: ReadonlyArray<Mock>;
};

// ⚠️ MUTABLE - Appropriate only when callers are allowed to mutate the array
type Scenario = {
  readonly mocks: Mock[];
};
```

### Nested readonly

```typescript
// ✅ CORRECT - Deep immutability
type Mock = {
  readonly method: 'GET' | 'POST';
  readonly response: {
    readonly status: number;
    readonly body: readonly unknown[];
  };
};
```

### Why readonly Matters

- **Compiler enforces immutability**: TypeScript errors on mutation attempts
- **Self-documenting**: Signals "don't mutate this"
- **Functional programming alignment**: Natural fit for FP patterns
- **Prevents accidental bugs**: Can't accidentally mutate data

---

## Immutable Array Operations

**Common array mutations and their immutable alternatives:**

```typescript
// ⚠️ MUTATING - Avoid when preserving the original array is part of the contract
items.push(newItem);        // Add to end
items.pop();                // Remove last
items.unshift(newItem);     // Add to start
items.shift();              // Remove first
items.splice(index, 1);     // Remove at index
items.reverse();            // Reverse order
items.sort();               // Sort
items[i] = newValue;        // Update at index

// ✅ CORRECT - Immutable alternatives
const withNew = [...items, newItem];           // Add to end
const withoutLast = items.slice(0, -1);        // Remove last
const withFirst = [newItem, ...items];         // Add to start
const withoutFirst = items.slice(1);           // Remove first
const removed = [...items.slice(0, index),     // Remove at index
                 ...items.slice(index + 1)];
const reversed = [...items].reverse();         // Reverse (copy first!)
const sorted = [...items].sort();              // Sort (copy first!)
const updated = items.map((item, idx) =>       // Update at index
  idx === i ? newValue : item
);
```

**Common patterns:**

```typescript
// Filter out specific item
const withoutItem = items.filter(item => item.id !== targetId);

// Replace specific item
const replaced = items.map(item =>
  item.id === targetId ? newItem : item
);

// Insert at specific position
const inserted = [
  ...items.slice(0, index),
  newItem,
  ...items.slice(index)
];
```

---

## Immutable Object Updates

```typescript
// ⚠️ MUTATING - Avoid when preserving the original object is part of the contract
user.name = "New";
Object.assign(user, { name: "New" });

// ✅ CORRECT
const updated = { ...user, name: "New" };
```

---

## Nested Updates

```typescript
// ✅ CORRECT - Immutable nested update
const updatedCart = {
  ...cart,
  items: cart.items.map((item, i) =>
    i === targetIndex ? { ...item, quantity: newQuantity } : item
  ),
};

// ✅ CORRECT - Immutable nested array update
const updatedOrder = {
  ...order,
  items: [
    ...order.items.slice(0, index),
    updatedItem,
    ...order.items.slice(index + 1),
  ],
};
```
