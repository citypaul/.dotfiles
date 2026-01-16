---
name: go-testing
description: Go testing patterns. Use when writing Go tests or test factories.
---

# Go Testing Patterns

## Core Principle

**Test behavior, not implementation.** Tests should verify WHAT the code does through its public API, not HOW it does it internally.

---

## Table-Driven Tests

Go's idiomatic pattern for testing multiple cases:

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {
            name:    "valid email",
            email:   "user@example.com",
            wantErr: false,
        },
        {
            name:    "missing @ symbol",
            email:   "userexample.com",
            wantErr: true,
        },
        {
            name:    "missing domain",
            email:   "user@",
            wantErr: true,
        },
        {
            name:    "empty string",
            email:   "",
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail(%q) error = %v, wantErr %v", tt.email, err, tt.wantErr)
            }
        })
    }
}
```

### Table Test Structure

```go
tests := []struct {
    name     string      // Descriptive test name
    input    InputType   // Test input
    want     OutputType  // Expected output
    wantErr  bool        // Expected error condition
    setup    func()      // Optional setup function
    teardown func()      // Optional cleanup function
}{
    // Test cases
}
```

### When to Use Table Tests

✅ **Use table tests for:**
- Multiple similar test cases
- Boundary conditions
- Valid/invalid input combinations

❌ **Don't use table tests for:**
- Single complex scenarios
- Tests requiring significantly different setup
- Tests with complex assertions

---

## Test Factory Pattern

### Basic Factory with Functional Options

```go
// Default factory
func newTestUser(opts ...func(*User)) User {
    u := User{
        ID:        "user-123",
        Email:     "test@example.com",
        Name:      "Test User",
        Role:      RoleUser,
        CreatedAt: time.Now(),
    }

    for _, opt := range opts {
        opt(&u)
    }

    return u
}

// Option helpers
func withEmail(email string) func(*User) {
    return func(u *User) {
        u.Email = email
    }
}

func withRole(role Role) func(*User) {
    return func(u *User) {
        u.Role = role
    }
}

func withID(id string) func(*User) {
    return func(u *User) {
        u.ID = id
    }
}

// Usage in tests
func TestUserService_GetUser(t *testing.T) {
    user := newTestUser(
        withEmail("admin@example.com"),
        withRole(RoleAdmin),
    )

    // Test with customized user
}
```

### Factory Composition

```go
func newTestOrder(opts ...func(*Order)) Order {
    o := Order{
        ID:        "order-123",
        UserID:    "user-123",
        Items:     []OrderItem{newTestOrderItem()},
        Total:     100.00,
        Status:    StatusPending,
        CreatedAt: time.Now(),
    }

    for _, opt := range opts {
        opt(&o)
    }

    return o
}

func newTestOrderItem(opts ...func(*OrderItem)) OrderItem {
    item := OrderItem{
        ID:       "item-123",
        Name:     "Test Product",
        Price:    25.00,
        Quantity: 1,
    }

    for _, opt := range opts {
        opt(&item)
    }

    return item
}

// Usage with nested factories
func TestOrderService_CalculateTotal(t *testing.T) {
    order := newTestOrder(func(o *Order) {
        o.Items = []OrderItem{
            newTestOrderItem(func(i *OrderItem) { i.Price = 100.00 }),
            newTestOrderItem(func(i *OrderItem) { i.Price = 50.00 }),
        }
    })

    total := CalculateTotal(order)
    assert.Equal(t, 150.00, total)
}
```

---

## Using testify

### assert vs require

```go
import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestUserService(t *testing.T) {
    // require - stops test on failure (use for setup/preconditions)
    user, err := service.CreateUser(ctx, input)
    require.NoError(t, err)           // Stop if error - can't continue
    require.NotNil(t, user)           // Stop if nil - can't access fields

    // assert - continues test on failure (use for assertions)
    assert.Equal(t, "test@example.com", user.Email)
    assert.Equal(t, "Test User", user.Name)
    assert.WithinDuration(t, time.Now(), user.CreatedAt, time.Second)
}
```

**Rule of thumb:**
- `require` - For setup, preconditions, things that must succeed to continue
- `assert` - For actual test assertions, multiple related checks

### Common testify Assertions

```go
// Equality
assert.Equal(t, expected, actual)
assert.NotEqual(t, unexpected, actual)

// Nil/Not Nil
assert.Nil(t, value)
assert.NotNil(t, value)

// Boolean
assert.True(t, condition)
assert.False(t, condition)

// Error handling
assert.NoError(t, err)
assert.Error(t, err)
assert.ErrorIs(t, err, ErrNotFound)
assert.ErrorContains(t, err, "not found")

// Collections
assert.Len(t, slice, 3)
assert.Contains(t, slice, element)
assert.Empty(t, slice)
assert.NotEmpty(t, slice)

// Strings
assert.Contains(t, "hello world", "world")
assert.HasPrefix(t, str, "hello")
assert.HasSuffix(t, str, "world")

// Time
assert.WithinDuration(t, expected, actual, time.Second)

// Custom message
assert.Equal(t, expected, actual, "user email should match input")
```

---

## Mocking with Interfaces

### Interface-Based Mocking

```go
// Define interface at consumer
type UserRepository interface {
    Get(ctx context.Context, id string) (User, error)
    Save(ctx context.Context, user User) error
}

// Mock implementation for tests
type mockUserRepository struct {
    users map[string]User
    err   error
}

func newMockUserRepository() *mockUserRepository {
    return &mockUserRepository{
        users: make(map[string]User),
    }
}

func (m *mockUserRepository) Get(ctx context.Context, id string) (User, error) {
    if m.err != nil {
        return User{}, m.err
    }
    user, ok := m.users[id]
    if !ok {
        return User{}, ErrNotFound
    }
    return user, nil
}

func (m *mockUserRepository) Save(ctx context.Context, user User) error {
    if m.err != nil {
        return m.err
    }
    m.users[user.ID] = user
    return nil
}

// Helper methods for test setup
func (m *mockUserRepository) withUser(user User) *mockUserRepository {
    m.users[user.ID] = user
    return m
}

func (m *mockUserRepository) withError(err error) *mockUserRepository {
    m.err = err
    return m
}

// Usage in tests
func TestUserService_GetUser(t *testing.T) {
    user := newTestUser()
    repo := newMockUserRepository().withUser(user)
    service := NewUserService(repo)

    result, err := service.GetUser(ctx, user.ID)

    require.NoError(t, err)
    assert.Equal(t, user, result)
}

func TestUserService_GetUser_NotFound(t *testing.T) {
    repo := newMockUserRepository()  // Empty - no users
    service := NewUserService(repo)

    _, err := service.GetUser(ctx, "nonexistent")

    assert.ErrorIs(t, err, ErrNotFound)
}
```

### When NOT to Use Mocks

❌ **Don't mock:**
- The function being tested
- Simple data structures
- Standard library types (usually)

✅ **Do mock:**
- External services (HTTP, database, email)
- Time-dependent code (`time.Now`)
- File system operations
- Random number generation

---

## HTTP Handler Testing

### Using httptest

```go
func TestUserHandler_GetUser(t *testing.T) {
    // Setup
    user := newTestUser()
    repo := newMockUserRepository().withUser(user)
    handler := NewUserHandler(NewUserService(repo))

    // Create request
    req := httptest.NewRequest(http.MethodGet, "/users/"+user.ID, nil)
    w := httptest.NewRecorder()

    // Execute
    handler.GetUser(w, req)

    // Assert
    resp := w.Result()
    defer resp.Body.Close()

    assert.Equal(t, http.StatusOK, resp.StatusCode)

    var got User
    err := json.NewDecoder(resp.Body).Decode(&got)
    require.NoError(t, err)
    assert.Equal(t, user.ID, got.ID)
    assert.Equal(t, user.Email, got.Email)
}

func TestUserHandler_GetUser_NotFound(t *testing.T) {
    repo := newMockUserRepository()
    handler := NewUserHandler(NewUserService(repo))

    req := httptest.NewRequest(http.MethodGet, "/users/nonexistent", nil)
    w := httptest.NewRecorder()

    handler.GetUser(w, req)

    assert.Equal(t, http.StatusNotFound, w.Code)
}
```

### Testing JSON Requests

```go
func TestUserHandler_CreateUser(t *testing.T) {
    repo := newMockUserRepository()
    handler := NewUserHandler(NewUserService(repo))

    // Create JSON body
    input := CreateUserInput{
        Email: "new@example.com",
        Name:  "New User",
    }
    body, _ := json.Marshal(input)

    req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    handler.CreateUser(w, req)

    assert.Equal(t, http.StatusCreated, w.Code)

    var created User
    err := json.NewDecoder(w.Body).Decode(&created)
    require.NoError(t, err)
    assert.Equal(t, input.Email, created.Email)
    assert.NotEmpty(t, created.ID)
}
```

### Table-Driven HTTP Tests

```go
func TestUserHandler_CreateUser_Validation(t *testing.T) {
    tests := []struct {
        name       string
        input      CreateUserInput
        wantStatus int
    }{
        {
            name:       "valid input",
            input:      CreateUserInput{Email: "test@example.com", Name: "Test"},
            wantStatus: http.StatusCreated,
        },
        {
            name:       "missing email",
            input:      CreateUserInput{Name: "Test"},
            wantStatus: http.StatusBadRequest,
        },
        {
            name:       "invalid email",
            input:      CreateUserInput{Email: "notanemail", Name: "Test"},
            wantStatus: http.StatusBadRequest,
        },
        {
            name:       "missing name",
            input:      CreateUserInput{Email: "test@example.com"},
            wantStatus: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            repo := newMockUserRepository()
            handler := NewUserHandler(NewUserService(repo))

            body, _ := json.Marshal(tt.input)
            req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(body))
            req.Header.Set("Content-Type", "application/json")
            w := httptest.NewRecorder()

            handler.CreateUser(w, req)

            assert.Equal(t, tt.wantStatus, w.Code)
        })
    }
}
```

---

## Coverage Commands

```bash
# Run tests with coverage
go test -coverprofile=coverage.out ./...

# View coverage report in terminal
go tool cover -func=coverage.out

# View coverage in browser (HTML report)
go tool cover -html=coverage.out

# Run tests with verbose output
go test -v ./...

# Run specific test
go test -v -run TestUserService_GetUser ./...

# Run tests matching pattern
go test -v -run "TestUserService.*" ./...

# Run with race detector
go test -race ./...

# Run benchmarks
go test -bench=. ./...
```

---

## Test Organization

### File Naming

```
user/
├── service.go           # Production code
├── service_test.go      # Unit tests (same package)
├── service_integration_test.go  # Integration tests
└── export_test.go       # Export internals for testing (if needed)
```

### Test Package Options

```go
// Option 1: Same package (white-box testing)
// file: service_test.go
package user

func TestService_privateMethod(t *testing.T) {
    // Can access unexported functions/types
}

// Option 2: Separate package (black-box testing)
// file: service_test.go
package user_test

import "myapp/internal/user"

func TestService_PublicAPI(t *testing.T) {
    // Can only access exported functions/types
    // Better for testing public API behavior
}
```

**Recommendation:** Use `package user_test` (black-box) for most tests. It ensures you're testing the public API and catches accidental API changes.

---

## Anti-Patterns

### Testing Implementation Details

```go
// ❌ WRONG - Testing internal method calls
func TestService_CallsRepository(t *testing.T) {
    // Testing HOW, not WHAT
    assert.True(t, repo.getCalled)
}

// ✅ CORRECT - Testing behavior through public API
func TestService_ReturnsUserWhenExists(t *testing.T) {
    repo := newMockUserRepository().withUser(expectedUser)
    service := NewService(repo)

    user, err := service.GetUser(ctx, "user-123")

    require.NoError(t, err)
    assert.Equal(t, expectedUser, user)
}
```

### Shared Mutable State

```go
// ❌ WRONG - Shared state between tests
var testUser = User{ID: "123", Email: "test@example.com"}

func TestA(t *testing.T) {
    testUser.Email = "modified@example.com"  // Modifies shared state!
}

func TestB(t *testing.T) {
    // testUser.Email might be "modified@example.com" - test pollution!
}

// ✅ CORRECT - Fresh state per test
func TestA(t *testing.T) {
    user := newTestUser()  // Factory creates fresh instance
    // ...
}

func TestB(t *testing.T) {
    user := newTestUser()  // Fresh instance, not affected by TestA
    // ...
}
```

### Testing Trivial Code

```go
// ❌ WRONG - Testing getters/setters
func TestUser_GetName(t *testing.T) {
    u := User{Name: "Test"}
    assert.Equal(t, "Test", u.Name)  // Pointless!
}

// ✅ CORRECT - Test meaningful behavior
func TestUser_FullName(t *testing.T) {
    u := User{FirstName: "John", LastName: "Doe"}
    assert.Equal(t, "John Doe", u.FullName())
}
```

---

## Test Helpers

### t.Helper()

```go
// Mark functions as test helpers for better error reporting
func assertUserEquals(t *testing.T, expected, actual User) {
    t.Helper()  // Error will point to caller, not this function

    assert.Equal(t, expected.ID, actual.ID, "user ID mismatch")
    assert.Equal(t, expected.Email, actual.Email, "user email mismatch")
    assert.Equal(t, expected.Name, actual.Name, "user name mismatch")
}

func TestSomething(t *testing.T) {
    expected := newTestUser()
    actual, _ := service.GetUser(ctx, expected.ID)

    assertUserEquals(t, expected, actual)  // Error points here, not inside helper
}
```

### t.Cleanup()

```go
func TestWithTempFile(t *testing.T) {
    // Create temp file
    f, err := os.CreateTemp("", "test")
    require.NoError(t, err)

    // Register cleanup - runs after test completes
    t.Cleanup(func() {
        os.Remove(f.Name())
    })

    // Test code using f
}
```

---

## Summary Checklist

When writing Go tests, verify:

- [ ] Tests verify behavior through public API (not implementation)
- [ ] Using table-driven tests for multiple similar cases
- [ ] Factory functions create fresh test data (no shared state)
- [ ] `require` for setup/preconditions, `assert` for test assertions
- [ ] Mocking only external dependencies (not the code under test)
- [ ] HTTP tests use httptest package
- [ ] No testing of trivial code (getters, simple assignments)
- [ ] Test helpers use `t.Helper()` for better error reporting
- [ ] Tests run with `-race` flag to detect race conditions
- [ ] Coverage checked with `go test -coverprofile`
