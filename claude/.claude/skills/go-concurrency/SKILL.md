---
name: go-concurrency
description: Go concurrency patterns. Use when writing concurrent Go code.
---

# Go Concurrency Patterns

## Core Principle

**Don't communicate by sharing memory; share memory by communicating.** Use channels for coordination, mutexes only when necessary, and always handle cancellation via context.

---

## Goroutine Patterns

### Basic Goroutine with Error Handling

```go
// ❌ WRONG - Error lost in goroutine
go func() {
    err := doWork()
    if err != nil {
        log.Println(err)  // Error logged but not propagated
    }
}()

// ✅ CORRECT - Propagate error via channel
func processAsync(ctx context.Context) <-chan error {
    errCh := make(chan error, 1)

    go func() {
        defer close(errCh)

        if err := doWork(ctx); err != nil {
            errCh <- err
            return
        }
    }()

    return errCh
}

// Usage
errCh := processAsync(ctx)
if err := <-errCh; err != nil {
    return fmt.Errorf("async processing: %w", err)
}
```

### Worker Pool Pattern

```go
func processItems(ctx context.Context, items []Item, workers int) error {
    // Create work channel
    work := make(chan Item, len(items))
    errCh := make(chan error, 1)

    // Create WaitGroup for workers
    var wg sync.WaitGroup

    // Start workers
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for item := range work {
                if err := processItem(ctx, item); err != nil {
                    select {
                    case errCh <- err:
                        // First error wins
                    default:
                        // Error channel full, skip
                    }
                    return
                }
            }
        }()
    }

    // Send work
    for _, item := range items {
        select {
        case work <- item:
        case <-ctx.Done():
            close(work)
            return ctx.Err()
        }
    }
    close(work)

    // Wait for workers
    wg.Wait()
    close(errCh)

    // Check for errors
    if err := <-errCh; err != nil {
        return err
    }

    return nil
}
```

### Fan-Out/Fan-In Pattern

```go
// Fan-out: distribute work to multiple goroutines
func fanOut(ctx context.Context, input <-chan int, workers int) []<-chan int {
    outputs := make([]<-chan int, workers)

    for i := 0; i < workers; i++ {
        outputs[i] = worker(ctx, input)
    }

    return outputs
}

func worker(ctx context.Context, input <-chan int) <-chan int {
    output := make(chan int)

    go func() {
        defer close(output)
        for n := range input {
            select {
            case output <- process(n):
            case <-ctx.Done():
                return
            }
        }
    }()

    return output
}

// Fan-in: merge multiple channels into one
func fanIn(ctx context.Context, channels ...<-chan int) <-chan int {
    output := make(chan int)
    var wg sync.WaitGroup

    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for n := range c {
                select {
                case output <- n:
                case <-ctx.Done():
                    return
                }
            }
        }(ch)
    }

    go func() {
        wg.Wait()
        close(output)
    }()

    return output
}
```

---

## Channel Patterns

### Buffered vs Unbuffered

```go
// Unbuffered - synchronous, sender blocks until receiver ready
ch := make(chan int)

// Buffered - asynchronous up to capacity
ch := make(chan int, 10)

// Use unbuffered when:
// - You need synchronization between sender and receiver
// - You want to ensure message is received before continuing

// Use buffered when:
// - Producer is faster than consumer
// - You want to decouple producer from consumer
// - Implementing async patterns (like worker pools)
```

### Channel Direction

```go
// Send-only channel
func producer(out chan<- int) {
    out <- 42  // Can only send
    // <-out  // Compile error!
}

// Receive-only channel
func consumer(in <-chan int) {
    v := <-in  // Can only receive
    // in <- 42  // Compile error!
}

// Bidirectional channel (usually internal)
func internal(ch chan int) {
    ch <- 42
    v := <-ch
}
```

### Closing Channels

```go
// ✅ CORRECT - Sender closes channel
func producer() <-chan int {
    ch := make(chan int)

    go func() {
        defer close(ch)  // Sender closes
        for i := 0; i < 10; i++ {
            ch <- i
        }
    }()

    return ch
}

// ❌ WRONG - Receiver closes channel
func consumer(ch <-chan int) {
    for v := range ch {
        fmt.Println(v)
    }
    close(ch)  // Never do this! Sender should close
}

// Check if channel is closed
v, ok := <-ch
if !ok {
    // Channel is closed
}

// Range automatically handles closed channels
for v := range ch {
    fmt.Println(v)
}
// Loop exits when channel is closed
```

### Select Statement

```go
func process(ctx context.Context, input <-chan int, output chan<- int) {
    for {
        select {
        case v, ok := <-input:
            if !ok {
                return  // Input channel closed
            }
            select {
            case output <- v * 2:
            case <-ctx.Done():
                return
            }
        case <-ctx.Done():
            return  // Context cancelled
        }
    }
}

// Select with default (non-blocking)
select {
case v := <-ch:
    fmt.Println("received", v)
default:
    fmt.Println("no value ready")
}

// Select with timeout
select {
case v := <-ch:
    fmt.Println("received", v)
case <-time.After(5 * time.Second):
    fmt.Println("timeout")
}
```

---

## sync Package

### Mutex

```go
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}
```

### RWMutex

```go
type SafeMap struct {
    mu   sync.RWMutex
    data map[string]string
}

func (m *SafeMap) Get(key string) (string, bool) {
    m.mu.RLock()  // Multiple readers allowed
    defer m.mu.RUnlock()
    v, ok := m.data[key]
    return v, ok
}

func (m *SafeMap) Set(key, value string) {
    m.mu.Lock()  // Exclusive access for writes
    defer m.mu.Unlock()
    m.data[key] = value
}
```

### WaitGroup

```go
func processAll(items []Item) error {
    var wg sync.WaitGroup
    errCh := make(chan error, len(items))

    for _, item := range items {
        wg.Add(1)
        go func(it Item) {
            defer wg.Done()
            if err := process(it); err != nil {
                errCh <- err
            }
        }(item)  // Pass item to avoid closure capture issue
    }

    wg.Wait()
    close(errCh)

    // Collect errors
    var errs []error
    for err := range errCh {
        errs = append(errs, err)
    }

    if len(errs) > 0 {
        return errors.Join(errs...)
    }
    return nil
}
```

### Once

```go
var (
    instance *Service
    once     sync.Once
)

func GetService() *Service {
    once.Do(func() {
        instance = &Service{
            // Initialize expensive resources
        }
    })
    return instance
}

// Useful for lazy initialization and singletons
```

---

## Context for Cancellation

### Propagating Context

```go
func ProcessRequest(ctx context.Context, req Request) error {
    // Pass context to all operations
    user, err := getUser(ctx, req.UserID)
    if err != nil {
        return err
    }

    // Check if context is cancelled
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
    }

    return processUserData(ctx, user)
}
```

### Context with Timeout

```go
func CallExternalAPI(ctx context.Context) error {
    // Create timeout context
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()  // Always defer cancel!

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            return fmt.Errorf("API call timed out: %w", err)
        }
        return err
    }
    defer resp.Body.Close()

    return nil
}
```

### Context with Cancellation

```go
func RunServer(ctx context.Context) error {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    // Start background workers
    errCh := make(chan error, 1)

    go func() {
        errCh <- runWorker(ctx)
    }()

    go func() {
        errCh <- runServer(ctx)
    }()

    // Wait for first error or context cancellation
    select {
    case err := <-errCh:
        cancel()  // Cancel other goroutines
        return err
    case <-ctx.Done():
        return ctx.Err()
    }
}
```

---

## Race Detection

### Running with Race Detector

```bash
# Run tests with race detector
go test -race ./...

# Build with race detector
go build -race ./cmd/myapp

# Run with race detector
go run -race main.go
```

### Common Race Conditions

```go
// ❌ WRONG - Race condition on shared variable
var count int

go func() {
    count++  // RACE!
}()

fmt.Println(count)  // RACE!

// ✅ CORRECT - Use mutex
var (
    count int
    mu    sync.Mutex
)

go func() {
    mu.Lock()
    count++
    mu.Unlock()
}()

mu.Lock()
fmt.Println(count)
mu.Unlock()

// ✅ CORRECT - Use atomic
var count int64

go func() {
    atomic.AddInt64(&count, 1)
}()

fmt.Println(atomic.LoadInt64(&count))
```

---

## Testing Concurrent Code

### Using Channels for Synchronization

```go
func TestConcurrentAccess(t *testing.T) {
    counter := NewSafeCounter()
    done := make(chan bool)

    // Start multiple goroutines
    for i := 0; i < 100; i++ {
        go func() {
            counter.Increment()
            done <- true
        }()
    }

    // Wait for all goroutines
    for i := 0; i < 100; i++ {
        <-done
    }

    assert.Equal(t, 100, counter.Value())
}
```

### Testing with Race Detector

```go
// Run this test with: go test -race
func TestNoRaceCondition(t *testing.T) {
    m := NewSafeMap()
    var wg sync.WaitGroup

    // Multiple writers
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            m.Set(fmt.Sprintf("key%d", n), "value")
        }(i)
    }

    // Multiple readers
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            m.Get(fmt.Sprintf("key%d", n))
        }(i)
    }

    wg.Wait()
}
```

### Testing Timeouts

```go
func TestOperationTimeout(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    err := SlowOperation(ctx)

    assert.ErrorIs(t, err, context.DeadlineExceeded)
}
```

### Testing Cancellation

```go
func TestCancellation(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())

    // Start operation
    errCh := make(chan error, 1)
    go func() {
        errCh <- LongRunningOperation(ctx)
    }()

    // Cancel immediately
    cancel()

    // Should return quickly with context error
    select {
    case err := <-errCh:
        assert.ErrorIs(t, err, context.Canceled)
    case <-time.After(time.Second):
        t.Fatal("operation did not respect cancellation")
    }
}
```

---

## Common Patterns

### Graceful Shutdown

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())

    // Handle shutdown signals
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigCh
        log.Println("Shutdown signal received")
        cancel()
    }()

    // Run server
    if err := runServer(ctx); err != nil && !errors.Is(err, context.Canceled) {
        log.Fatal(err)
    }
}

func runServer(ctx context.Context) error {
    server := &http.Server{Addr: ":8080"}

    // Start server in goroutine
    go func() {
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Printf("HTTP server error: %v", err)
        }
    }()

    // Wait for context cancellation
    <-ctx.Done()

    // Graceful shutdown with timeout
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    return server.Shutdown(shutdownCtx)
}
```

### Rate Limiting

```go
func rateLimitedProcessor(ctx context.Context, items <-chan Item, rate time.Duration) {
    ticker := time.NewTicker(rate)
    defer ticker.Stop()

    for {
        select {
        case item, ok := <-items:
            if !ok {
                return
            }
            process(item)
            <-ticker.C  // Wait for next tick
        case <-ctx.Done():
            return
        }
    }
}
```

---

## Anti-Patterns

### Goroutine Leak

```go
// ❌ WRONG - Goroutine leaks if channel never read
func leaky() chan int {
    ch := make(chan int)
    go func() {
        ch <- 42  // Blocks forever if no receiver
    }()
    return ch
}

// ✅ CORRECT - Use context for cancellation
func safe(ctx context.Context) <-chan int {
    ch := make(chan int)
    go func() {
        select {
        case ch <- 42:
        case <-ctx.Done():
        }
    }()
    return ch
}
```

### Closure Capture in Loop

```go
// ❌ WRONG - All goroutines see same value
for _, item := range items {
    go func() {
        process(item)  // item is shared, race condition!
    }()
}

// ✅ CORRECT - Pass as parameter
for _, item := range items {
    go func(it Item) {
        process(it)  // it is local copy
    }(item)
}

// ✅ CORRECT - Go 1.22+ loop variable semantics
// In Go 1.22+, loop variables are per-iteration by default
for _, item := range items {
    go func() {
        process(item)  // Safe in Go 1.22+
    }()
}
```

---

## Summary Checklist

When writing concurrent Go code, verify:

- [ ] All goroutines have proper error handling
- [ ] Context is propagated for cancellation
- [ ] Channels are closed by sender, not receiver
- [ ] WaitGroup used correctly (Add before goroutine)
- [ ] No goroutine leaks (check context cancellation paths)
- [ ] Loop variables passed as parameters (or using Go 1.22+)
- [ ] Race detector passes (`go test -race`)
- [ ] Mutexes protect all access to shared state
- [ ] Defer used for Unlock to prevent deadlocks
- [ ] Select used with context.Done for cancellation
