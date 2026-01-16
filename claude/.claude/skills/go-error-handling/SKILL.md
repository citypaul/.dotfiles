---
name: go-error-handling
description: Go error handling patterns. Use when working with errors in Go code.
---

# Go Error Handling Patterns

## Core Principle

**Errors are values.** Handle them explicitly, wrap them with context, and use the standard library patterns (`errors.Is`, `errors.As`, `%w`).

---

## Sentinel Errors

### Defining Sentinel Errors

```go
package user

import "errors"

// Sentinel errors - predefined errors for specific conditions
var (
    ErrNotFound      = errors.New("user not found")
    ErrAlreadyExists = errors.New("user already exists")
    ErrInvalidEmail  = errors.New("invalid email format")
)
```

### Using errors.Is

```go
import "errors"

func GetUser(ctx context.Context, id string) (User, error) {
    user, err := repo.Get(ctx, id)
    if err != nil {
        // Check for specific error
        if errors.Is(err, ErrNotFound) {
            return User{}, fmt.Errorf("user %s: %w", id, ErrNotFound)
        }
        return User{}, fmt.Errorf("getting user %s: %w", id, err)
    }
    return user, nil
}

// Caller can check for the sentinel
user, err := GetUser(ctx, "123")
if errors.Is(err, user.ErrNotFound) {
    // Handle not found case
}
```

### Why errors.Is, Not ==

```go
// ❌ WRONG - Direct comparison breaks with wrapping
if err == ErrNotFound {
    // Won't match if error was wrapped!
}

// ✅ CORRECT - errors.Is unwraps the error chain
if errors.Is(err, ErrNotFound) {
    // Works even if error was wrapped multiple times
}
```

---

## Error Wrapping

### Using fmt.Errorf with %w

```go
// ❌ WRONG - Losing error context
func GetUser(id string) (User, error) {
    user, err := db.Query(id)
    if err != nil {
        return User{}, err  // Caller has no context!
    }
    return user, nil
}

// ❌ WRONG - Breaking error chain
func GetUser(id string) (User, error) {
    user, err := db.Query(id)
    if err != nil {
        return User{}, errors.New("database error")  // Original error lost!
    }
    return user, nil
}

// ✅ CORRECT - Wrap with context using %w
func GetUser(id string) (User, error) {
    user, err := db.Query(id)
    if err != nil {
        return User{}, fmt.Errorf("querying user %s: %w", id, err)
    }
    return user, nil
}
```

### Adding Context at Each Layer

```go
// Repository layer
func (r *UserRepository) Get(ctx context.Context, id string) (User, error) {
    row := r.db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = ?", id)
    var user User
    if err := row.Scan(&user.ID, &user.Email, &user.Name); err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return User{}, ErrNotFound
        }
        return User{}, fmt.Errorf("scanning user row: %w", err)
    }
    return user, nil
}

// Service layer
func (s *UserService) GetUser(ctx context.Context, id string) (User, error) {
    user, err := s.repo.Get(ctx, id)
    if err != nil {
        return User{}, fmt.Errorf("getting user %s: %w", id, err)
    }
    return user, nil
}

// Handler layer
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    user, err := h.service.GetUser(r.Context(), id)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            http.Error(w, "User not found", http.StatusNotFound)
            return
        }
        log.Printf("error getting user: %v", err)
        // Error message now has full context:
        // "getting user 123: scanning user row: connection refused"
        http.Error(w, "Internal error", http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(user)
}
```

---

## Custom Error Types

### Defining Custom Errors

```go
// Custom error with additional context
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Usage
func ValidateUser(u User) error {
    if u.Email == "" {
        return &ValidationError{
            Field:   "email",
            Message: "email is required",
        }
    }
    if !strings.Contains(u.Email, "@") {
        return &ValidationError{
            Field:   "email",
            Message: "invalid email format",
        }
    }
    return nil
}
```

### Using errors.As

```go
// Check if error is of specific type
func HandleError(err error) {
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        // Handle validation error specifically
        fmt.Printf("Validation error on field %s: %s\n",
            validationErr.Field, validationErr.Message)
        return
    }

    // Handle other errors
    fmt.Printf("Unexpected error: %v\n", err)
}
```

### Custom Error with Wrapped Cause

```go
type DatabaseError struct {
    Operation string
    Table     string
    Err       error  // Wrapped error
}

func (e *DatabaseError) Error() string {
    return fmt.Sprintf("database %s on %s failed: %v", e.Operation, e.Table, e.Err)
}

// Implement Unwrap for errors.Is/As to work
func (e *DatabaseError) Unwrap() error {
    return e.Err
}

// Usage
func (r *Repository) Save(user User) error {
    _, err := r.db.Exec("INSERT INTO users ...")
    if err != nil {
        return &DatabaseError{
            Operation: "insert",
            Table:     "users",
            Err:       err,
        }
    }
    return nil
}

// Caller can still use errors.Is on wrapped error
err := repo.Save(user)
if errors.Is(err, sql.ErrConnDone) {
    // Connection was closed
}
```

---

## Error Handling at Boundaries

### HTTP Handlers

```go
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var input CreateUserInput
    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    user, err := h.service.CreateUser(r.Context(), input)
    if err != nil {
        // Map errors to HTTP responses
        switch {
        case errors.Is(err, ErrAlreadyExists):
            http.Error(w, "User already exists", http.StatusConflict)
        case errors.Is(err, ErrInvalidEmail):
            http.Error(w, "Invalid email format", http.StatusBadRequest)
        default:
            // Log full error, return generic message
            h.logger.Error("creating user", "error", err)
            http.Error(w, "Internal server error", http.StatusInternalServerError)
        }
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}
```

### Package Boundaries

```go
// package user - defines its own errors
package user

var (
    ErrNotFound = errors.New("user not found")
    ErrInvalid  = errors.New("invalid user data")
)

// package order - maps user errors to its own
package order

import "myapp/internal/user"

var (
    ErrUserNotFound = errors.New("order user not found")
)

func (s *OrderService) CreateOrder(ctx context.Context, userID string, items []Item) (Order, error) {
    _, err := s.userService.GetUser(ctx, userID)
    if err != nil {
        if errors.Is(err, user.ErrNotFound) {
            // Map to order package's error
            return Order{}, ErrUserNotFound
        }
        return Order{}, fmt.Errorf("checking user: %w", err)
    }
    // ...
}
```

---

## Testing Error Conditions

### Testing with errors.Is

```go
func TestUserRepository_Get_NotFound(t *testing.T) {
    repo := NewUserRepository(db)

    _, err := repo.Get(ctx, "nonexistent")

    // Use errors.Is for checking
    assert.ErrorIs(t, err, ErrNotFound)
}
```

### Testing with errors.As

```go
func TestValidateUser_InvalidEmail(t *testing.T) {
    user := User{Email: "notanemail"}

    err := ValidateUser(user)

    var validationErr *ValidationError
    require.ErrorAs(t, err, &validationErr)
    assert.Equal(t, "email", validationErr.Field)
}
```

### Testing Error Messages

```go
func TestService_WrapsErrors(t *testing.T) {
    // Setup mock to return an error
    mockRepo := &MockRepository{
        err: errors.New("connection refused"),
    }
    service := NewService(mockRepo)

    _, err := service.GetUser(ctx, "123")

    // Check error message contains context
    assert.ErrorContains(t, err, "getting user 123")
    assert.ErrorContains(t, err, "connection refused")
}
```

---

## Error Handling Patterns

### Early Return Pattern

```go
// ✅ GOOD - Early returns, clear flow
func ProcessOrder(ctx context.Context, orderID string) error {
    order, err := getOrder(ctx, orderID)
    if err != nil {
        return fmt.Errorf("getting order: %w", err)
    }

    if err := validateOrder(order); err != nil {
        return fmt.Errorf("validating order: %w", err)
    }

    if err := chargePayment(ctx, order); err != nil {
        return fmt.Errorf("charging payment: %w", err)
    }

    if err := shipOrder(ctx, order); err != nil {
        return fmt.Errorf("shipping order: %w", err)
    }

    return nil
}
```

### Defer for Cleanup

```go
func ProcessFile(filename string) error {
    f, err := os.Open(filename)
    if err != nil {
        return fmt.Errorf("opening file: %w", err)
    }
    defer f.Close()  // Always close, even on error

    // Process file...
    return nil
}
```

### Multiple Returns with Named Error

```go
func UpdateUser(ctx context.Context, id string, updates UserUpdates) (user User, err error) {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return User{}, fmt.Errorf("starting transaction: %w", err)
    }

    // Use named return for cleanup
    defer func() {
        if err != nil {
            tx.Rollback()
        }
    }()

    user, err = getUserForUpdate(ctx, tx, id)
    if err != nil {
        return User{}, fmt.Errorf("getting user: %w", err)
    }

    user = applyUpdates(user, updates)

    if err = saveUser(ctx, tx, user); err != nil {
        return User{}, fmt.Errorf("saving user: %w", err)
    }

    if err = tx.Commit(); err != nil {
        return User{}, fmt.Errorf("committing transaction: %w", err)
    }

    return user, nil
}
```

---

## Anti-Patterns

### Ignoring Errors

```go
// ❌ NEVER - Ignoring errors
result, _ := doSomething()
```

### Losing Error Context

```go
// ❌ WRONG - Creating new error, losing original
if err != nil {
    return errors.New("operation failed")
}

// ✅ CORRECT - Wrap to preserve chain
if err != nil {
    return fmt.Errorf("operation failed: %w", err)
}
```

### Checking Error Strings

```go
// ❌ WRONG - Fragile string comparison
if err.Error() == "user not found" {
    // Breaks if error message changes
}

// ❌ WRONG - Fragile string contains
if strings.Contains(err.Error(), "not found") {
    // Breaks if error message changes
}

// ✅ CORRECT - Use sentinel errors
if errors.Is(err, ErrNotFound) {
    // Works regardless of wrapping or message changes
}
```

### Panic for Expected Errors

```go
// ❌ WRONG - Using panic for expected conditions
func GetUser(id string) User {
    user, err := db.Query(id)
    if err != nil {
        panic(err)  // Don't panic for expected errors!
    }
    return user
}

// ✅ CORRECT - Return error for expected conditions
func GetUser(id string) (User, error) {
    user, err := db.Query(id)
    if err != nil {
        return User{}, err
    }
    return user, nil
}
```

---

## Summary Checklist

When handling errors in Go, verify:

- [ ] Never ignoring errors with `_`
- [ ] Wrapping errors with context using `fmt.Errorf` and `%w`
- [ ] Using `errors.Is` for sentinel error checks (not `==`)
- [ ] Using `errors.As` for custom error type checks
- [ ] Custom errors implement `Error()` method
- [ ] Custom errors with wrapped cause implement `Unwrap()`
- [ ] Errors mapped appropriately at boundaries (HTTP, packages)
- [ ] No string comparison for error checking
- [ ] No panic for expected error conditions
- [ ] Tests use `assert.ErrorIs` and `assert.ErrorAs`
