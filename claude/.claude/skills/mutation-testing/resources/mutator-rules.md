# Mutator Rules Reference

Load this resource when planning tests, scanning changed code for likely test gaps, manually applying mutations, or interpreting surviving mutants from Stryker.

## Quick Scan

For each changed behavior, ask:

- **Arithmetic operators**: Would changing `+`, `-`, `*`, `/`, or `%` be detected?
- **Conditionals**: Are boundary values tested for `<`, `<=`, `>`, `>=`?
- **Equality**: Are both equal and not-equal cases observable?
- **Boolean logic**: Is there a mixed `true`/`false` case that distinguishes `&&` from `||`?
- **Return statements**: Would changing or deleting the returned value fail?
- **Method calls**: Would removing, swapping, or changing the method fail?
- **String literals**: Would an empty or changed string fail?
- **Array operations**: Would an empty array or removed filtering/sorting fail?
- **Optional chaining**: Are `null` and `undefined` cases covered when safety is promised?
- **Side effects**: Would deleting the body or skipping a collaborator call fail?

Fix obvious gaps immediately. If the expected behavior is a domain/product judgment, ask the human using the harness's ask-question facility.

## Mutation Operators

### Arithmetic Operators

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `a + b` | `a - b` | Addition behavior |
| `a - b` | `a + b` | Subtraction behavior |
| `a * b` | `a / b` | Multiplication behavior |
| `a / b` | `a * b` | Division behavior |
| `a % b` | `a * b` | Modulo behavior |

Avoid identity values that hide the difference: `0` for `+/-`, `1` for `*/`.

### Conditional Expressions

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `a < b` | `a <= b` | Equality boundary |
| `a < b` | `a >= b` | Both sides of condition |
| `a <= b` | `a < b` | Equality boundary |
| `a <= b` | `a > b` | Both sides of condition |
| `a > b` | `a >= b` | Equality boundary |
| `a > b` | `a <= b` | Both sides of condition |
| `a >= b` | `a > b` | Equality boundary |
| `a >= b` | `a < b` | Both sides of condition |

Boundary tests should usually cover just below, exactly at, and just above the threshold.

### Equality Operators

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `a === b` | `a !== b` | Equal and not-equal cases |
| `a !== b` | `a === b` | Equal and not-equal cases |
| `a == b` | `a != b` | Equal and not-equal cases |
| `a != b` | `a == b` | Equal and not-equal cases |

### Logical Operators

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `a && b` | `a \|\| b` | One operand true, the other false |
| `a \|\| b` | `a && b` | One operand true, the other false |
| `a ?? b` | `a && b` | Nullish-only fallback behavior |

Avoid only testing all-true or all-false combinations.

### Boolean Literals and Negation

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `true` | `false` | Both true and false outcomes |
| `false` | `true` | Both true and false outcomes |
| `!(a)` | `a` | Negation is necessary |

### Block Statements and Side Effects

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `{ code }` | `{ }` | Observable side effects of the block |

Tests that only assert "does not throw" often miss empty-body mutants. Verify returned values, persisted state, emitted events, messages, permissions, or meaningful collaborator calls.

### String Literals

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `"text"` | `""` | Non-empty string behavior |
| `""` | `"Stryker was here!"` | Empty string behavior |

### Array Declarations

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `[1, 2, 3]` | `[]` | Non-empty array behavior |
| `new Array(1, 2)` | `new Array()` | Array contents matter |

### Unary and Update Operators

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `+a` | `-a` | Sign matters |
| `-a` | `+a` | Sign matters |
| `++a` | `--a` | Increment vs decrement |
| `a++` | `a--` | Increment vs decrement |

### Method Expressions

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `startsWith()` | `endsWith()` | Correct string position |
| `endsWith()` | `startsWith()` | Correct string position |
| `toUpperCase()` | `toLowerCase()` | Case transformation |
| `toLowerCase()` | `toUpperCase()` | Case transformation |
| `some()` | `every()` | Partial vs full match |
| `every()` | `some()` | Full vs partial match |
| `filter()` | removed | Filtering is necessary |
| `reverse()` | removed | Order matters |
| `sort()` | removed | Ordering is necessary |
| `min()` | `max()` | Correct extremum |
| `max()` | `min()` | Correct extremum |
| `trim()` | removed | Trimming is necessary |
| `trimStart()` | `trimEnd()` | Correct trim direction |
| `trimEnd()` | `trimStart()` | Correct trim direction |

### Optional Chaining

| Original | Mutated | Test should verify |
|----------|---------|-------------------|
| `foo?.bar` | `foo.bar` | Null/undefined handling |
| `foo?.[i]` | `foo[i]` | Null/undefined handling |
| `foo?.()` | `foo()` | Null/undefined handling |

## Red Flags

- Tests only verify "no error thrown"
- Tests only check one side of a condition
- Tests use identity values (`0`, `1`, empty string, empty array)
- Tests only verify a function was called, not the observable result
- Tests do not verify return values
- Tests use all-true or all-false values for logical expressions
- Boundary values are not tested
- Side effects are not asserted

## Equivalent Mutants

Equivalent mutants produce the same observable behavior as the original code. They cannot be killed by a useful test.

Common patterns:

- Identity operations: `+= 0`, `-= 0`, `*= 1`, `/= 1`
- Boundary mutations where equal values make both branches equivalent
- Dead or impossible code paths
- Branches with the same observable outcome

Handle equivalent mutants by documenting why behavior cannot differ. If many equivalent mutants appear, consider whether the production code can be simplified.

## Strengthening Patterns

### Boundary Values

Weak:

```typescript
it('validates age', () => {
  expect(isAdult(25)).toBe(true);
  expect(isAdult(10)).toBe(false);
});
```

Strong:

```typescript
it('validates age at boundary', () => {
  expect(isAdult(17)).toBe(false);
  expect(isAdult(18)).toBe(true);
  expect(isAdult(19)).toBe(true);
});
```

### Boolean Combinations

Weak:

```typescript
it('returns access result', () => {
  expect(canAccess(true, true)).toBe(true);
});
```

Strong:

```typescript
it('grants access when admin', () => {
  expect(canAccess(true, false)).toBe(true);
});

it('grants access when owner', () => {
  expect(canAccess(false, true)).toBe(true);
});

it('denies access when neither', () => {
  expect(canAccess(false, false)).toBe(false);
});
```

### Non-Identity Values

Weak:

```typescript
it('calculates', () => {
  expect(multiply(10, 1)).toBe(10);
  expect(add(5, 0)).toBe(5);
});
```

Strong:

```typescript
it('calculates', () => {
  expect(multiply(10, 3)).toBe(30);
  expect(add(5, 3)).toBe(8);
});
```

### Observable Side Effects

Weak:

```typescript
it('processes order', () => {
  processOrder(order);
});
```

Strong:

```typescript
it('processes order', () => {
  const result = processOrder(order);
  expect(result.status).toBe('confirmed');
  expect(orderRepository.savedOrders()).toContainEqual(order);
});
```
