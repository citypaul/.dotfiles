---
name: go-strict
description: Go best practices and patterns. Use when writing any Go code.
---

# Go Strict Mode

## Core Rules

1. **Always handle errors** - never ignore with `_`
2. **Context first parameter** - never store in structs
3. **Small interfaces** - define at consumer, not provider
4. **No Get prefix** - use `Name()` not `GetName()`

---

## Error Handling

### Never Ignore Errors

```go
// ❌ WRONG - Ignoring error
result, _ := doSomething()

// ❌ WRONG - Ignoring error with blank identifier
_, _ = fmt.Fprintf(w, "hello")

// ✅ CORRECT - Always handle errors
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething failed: %w", err)
}

// ✅ CORRECT - Handle even "minor" errors
if _, err := fmt.Fprintf(w, "hello"); err != nil {
    return fmt.Errorf("writing response: %w", err)
}
```

### Wrap Errors with Context

```go
// ❌ WRONG - Losing context
if err != nil {
    return err
}

// ❌ WRONG - String concatenation
if err != nil {
    return errors.New("failed: " + err.Error())
}

// ✅ CORRECT - Wrap with context using %w
if err != nil {
    return fmt.Errorf("fetching user %s: %w", userID, err)
}
```

For detailed error handling patterns, load the `go-error-handling` skill.

---

## Interface Design

### Small Interfaces

**The Rule:** Interfaces should have 1-3 methods maximum. Larger interfaces are harder to implement and test.

```go
// ❌ WRONG - Too many methods (God interface)
type UserService interface {
    Create(ctx context.Context, user User) error
    Get(ctx context.Context, id string) (User, error)
    Update(ctx context.Context, user User) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, filter Filter) ([]User, error)
    Search(ctx context.Context, query string) ([]User, error)
    Authenticate(ctx context.Context, email, password string) (User, error)
    ResetPassword(ctx context.Context, email string) error
}

// ✅ CORRECT - Small, focused interfaces
type UserReader interface {
    Get(ctx context.Context, id string) (User, error)
}

type UserWriter interface {
    Create(ctx context.Context, user User) error
    Update(ctx context.Context, user User) error
}

type UserDeleter interface {
    Delete(ctx context.Context, id string) error
}

// Compose when needed
type UserStore interface {
    UserReader
    UserWriter
    UserDeleter
}
```

### Define Interfaces at Consumer

**The Rule:** Define interfaces where they're used, not where they're implemented.

```go
// ❌ WRONG - Interface defined in provider package
// package database
type UserRepository interface {
    Get(ctx context.Context, id string) (User, error)
    Save(ctx context.Context, user User) error
}

type PostgresUserRepository struct { ... }

// ✅ CORRECT - Interface defined in consumer package
// package service
type UserGetter interface {
    Get(ctx context.Context, id string) (User, error)
}

type UserService struct {
    users UserGetter  // Only depends on what it needs
}

// package database - no interface, just implementation
type PostgresUserRepository struct { ... }

func (r *PostgresUserRepository) Get(ctx context.Context, id string) (User, error) {
    // Implementation
}
```

**Why define at consumer?**
- Consumer defines exactly what it needs
- No coupling to provider's interface
- Easy to mock in tests
- Follows Interface Segregation Principle

### Accept Interfaces, Return Structs

```go
// ❌ WRONG - Returning interface
func NewService() ServiceInterface {
    return &service{}
}

// ✅ CORRECT - Return concrete type
func NewService(deps Dependencies) *Service {
    return &Service{deps: deps}
}

// ❌ WRONG - Accepting concrete type
func ProcessUser(repo *PostgresRepository) error

// ✅ CORRECT - Accept interface
func ProcessUser(repo UserGetter) error
```

---

## Context Usage

### Context as First Parameter

```go
// ❌ WRONG - Context not first
func GetUser(id string, ctx context.Context) (User, error)

// ❌ WRONG - Context in struct
type Service struct {
    ctx context.Context  // Never store context!
}

// ✅ CORRECT - Context as first parameter
func GetUser(ctx context.Context, id string) (User, error)

// ✅ CORRECT - Pass context through
func (s *Service) GetUser(ctx context.Context, id string) (User, error) {
    return s.repo.Get(ctx, id)
}
```

### Never Store Context in Structs

```go
// ❌ WRONG - Context stored in struct
type Handler struct {
    ctx    context.Context
    logger Logger
}

func NewHandler(ctx context.Context, logger Logger) *Handler {
    return &Handler{ctx: ctx, logger: logger}
}

// ✅ CORRECT - Context passed to methods
type Handler struct {
    logger Logger
}

func NewHandler(logger Logger) *Handler {
    return &Handler{logger: logger}
}

func (h *Handler) Handle(ctx context.Context, req Request) error {
    // Use ctx here, don't store it
}
```

**Why not store context?**
- Context has request scope, struct may outlive request
- Context cancellation won't work properly
- Violates Go idioms

---

## Naming Conventions

### No Get Prefix

```go
// ❌ WRONG - Get prefix
func (u *User) GetName() string
func (u *User) GetEmail() string
func (s *Service) GetUserByID(id string) (User, error)

// ✅ CORRECT - No prefix for simple getters
func (u *User) Name() string
func (u *User) Email() string
func (s *Service) UserByID(id string) (User, error)

// ✅ CORRECT - Use descriptive names
func (s *Service) FindUserByEmail(email string) (User, error)
func (s *Service) ListActiveUsers() ([]User, error)
```

### Exported vs Unexported

```go
// Exported (uppercase) - public API
type User struct {
    ID    string  // Exported field
    Name  string  // Exported field
    email string  // Unexported - internal only
}

func NewUser(name, email string) *User  // Exported constructor
func (u *User) Validate() error          // Exported method

// Unexported (lowercase) - internal
type userCache struct { ... }            // Internal type
func (u *User) sanitize() { ... }        // Internal method
```

### Package Naming

```go
// ❌ WRONG - Redundant package names
package userservice
func userservice.NewUserService()  // Stutter!

// ❌ WRONG - Generic names
package util
package common
package helpers

// ✅ CORRECT - Concise, no stutter
package user
func user.NewService()

// ✅ CORRECT - Specific purpose
package auth
package storage
package http
```

### Variable Naming

```go
// ❌ WRONG - Long names for short scope
for index := 0; index < len(items); index++ {
    currentItem := items[index]
}

// ✅ CORRECT - Short names for short scope
for i := 0; i < len(items); i++ {
    item := items[i]
}

// ✅ CORRECT - Longer names for longer scope
func ProcessPayment(ctx context.Context, payment Payment) error {
    validatedPayment, err := validatePayment(payment)
    // ...
}

// Common short names:
// i, j, k - loop indices
// ctx - context.Context
// err - error
// req, resp - request/response
// db - database
// tx - transaction
```

---

## Struct Patterns

### Constructor Functions

```go
// ❌ WRONG - No constructor, caller must know internals
type Service struct {
    DB     *sql.DB
    Cache  Cache
    Logger Logger
}

// Usage requires knowing all fields
s := &Service{
    DB:     db,
    Cache:  cache,
    Logger: logger,
}

// ✅ CORRECT - Constructor function
type Service struct {
    db     *sql.DB    // unexported
    cache  Cache      // unexported
    logger Logger     // unexported
}

func NewService(db *sql.DB, cache Cache, logger Logger) *Service {
    return &Service{
        db:     db,
        cache:  cache,
        logger: logger,
    }
}

// Usage is clean
s := NewService(db, cache, logger)
```

### Functional Options Pattern

For optional configuration:

```go
// Option type
type Option func(*Server)

// Option functions
func WithPort(port int) Option {
    return func(s *Server) {
        s.port = port
    }
}

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithLogger(l Logger) Option {
    return func(s *Server) {
        s.logger = l
    }
}

// Constructor with options
func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        port:    8080,           // default
        timeout: 30 * time.Second, // default
        logger:  defaultLogger,  // default
    }

    for _, opt := range opts {
        opt(s)
    }

    return s
}

// Usage
server := NewServer("localhost",
    WithPort(9000),
    WithTimeout(time.Minute),
)
```

### Composition Over Inheritance

```go
// ❌ WRONG - Trying to use inheritance (Go doesn't have it)
// No way to do this in Go!

// ✅ CORRECT - Embedding for composition
type BaseRepository struct {
    db *sql.DB
}

func (r *BaseRepository) Query(ctx context.Context, query string) (*sql.Rows, error) {
    return r.db.QueryContext(ctx, query)
}

type UserRepository struct {
    BaseRepository  // Embedded - gains all methods
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (User, error) {
    rows, err := r.Query(ctx, "SELECT * FROM users WHERE id = ?")
    // ...
}
```

---

## Dependency Injection

### Inject Dependencies, Don't Create Them

```go
// ❌ WRONG - Creating dependencies internally
type OrderService struct {
    db *sql.DB
}

func NewOrderService(db *sql.DB) *OrderService {
    return &OrderService{db: db}
}

func (s *OrderService) CreateOrder(ctx context.Context, order Order) error {
    // Creating dependency internally - hard to test!
    emailService := email.NewService()
    emailService.Send(order.UserEmail, "Order created")
    // ...
}

// ✅ CORRECT - Inject all dependencies
type EmailSender interface {
    Send(ctx context.Context, to, subject, body string) error
}

type OrderService struct {
    db    *sql.DB
    email EmailSender
}

func NewOrderService(db *sql.DB, email EmailSender) *OrderService {
    return &OrderService{
        db:    db,
        email: email,
    }
}

func (s *OrderService) CreateOrder(ctx context.Context, order Order) error {
    // Using injected dependency - easy to test!
    if err := s.email.Send(ctx, order.UserEmail, "Order created", "..."); err != nil {
        return fmt.Errorf("sending email: %w", err)
    }
    // ...
}
```

### Wire Dependencies at Main

```go
func main() {
    // Create all dependencies
    db := database.Connect()
    cache := redis.NewClient()
    logger := log.New(os.Stdout, "", log.LstdFlags)

    // Wire them together
    userRepo := postgres.NewUserRepository(db)
    userCache := redis.NewUserCache(cache)
    userService := user.NewService(userRepo, userCache, logger)

    // Create HTTP handlers
    handler := http.NewUserHandler(userService)

    // Start server
    server := http.NewServer(handler)
    server.ListenAndServe()
}
```

---

## Package Organization

### Standard Layout

```
project/
├── cmd/
│   └── myapp/
│       └── main.go         # Application entry point
├── internal/               # Private application code
│   ├── user/
│   │   ├── service.go
│   │   ├── service_test.go
│   │   └── repository.go
│   └── order/
│       └── ...
├── pkg/                    # Public libraries (optional)
│   └── validation/
│       └── ...
├── api/                    # API definitions (protobuf, OpenAPI)
├── go.mod
└── go.sum
```

### Package Principles

```go
// ❌ WRONG - Circular dependencies
// package user imports package order
// package order imports package user

// ✅ CORRECT - Dependency flows one way
// package user - no dependencies on other domain packages
// package order - may depend on user types/interfaces

// ❌ WRONG - Everything in one package
// package app
// user.go, order.go, payment.go, email.go, ...

// ✅ CORRECT - Cohesive packages
// package user - all user-related code
// package order - all order-related code
```

---

## Zero Values

### Design for Zero Values

```go
// ✅ GOOD - Zero value is useful
type Counter struct {
    count int  // Zero value (0) is valid
}

func (c *Counter) Increment() {
    c.count++
}

// Usage - no initialization needed
var c Counter
c.Increment()  // Works!

// ✅ GOOD - sync.Mutex zero value is ready to use
type SafeCounter struct {
    mu    sync.Mutex  // Zero value is unlocked mutex
    count int
}

// ❌ BAD - Zero value is broken
type Service struct {
    client *http.Client  // nil - will panic!
}

// ✅ GOOD - Handle zero value or require constructor
func (s *Service) client() *http.Client {
    if s.httpClient == nil {
        return http.DefaultClient
    }
    return s.httpClient
}
```

---

## Summary Checklist

When writing Go code, verify:

- [ ] All errors are handled (no `_` for errors)
- [ ] Errors wrapped with context using `%w`
- [ ] Context is first parameter, never stored in struct
- [ ] Interfaces are small (1-3 methods)
- [ ] Interfaces defined at consumer, not provider
- [ ] No `Get` prefix on getters
- [ ] Constructor functions for structs with unexported fields
- [ ] Dependencies injected, not created internally
- [ ] Package names are concise, no stutter
- [ ] Zero values are either useful or require constructor
- [ ] `go vet` passes with no issues
- [ ] `golangci-lint` passes (if configured)
