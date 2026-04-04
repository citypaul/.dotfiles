---
name: api-design
description: Stable API and interface design patterns. Use when designing REST endpoints, module boundaries, component prop interfaces, or any public contract between systems. Covers contract-first development, error semantics (RFC 9457), REST conventions, pagination, idempotency, rate limiting, and backward compatibility. For TypeScript type patterns (branded types, discriminated unions, schemas), see typescript-strict. For validation at trust boundaries, see typescript-strict.
---

# API and Interface Design

For TypeScript type patterns (branded types, discriminated unions, schema-first), see the `typescript-strict` skill. For immutability patterns, see the `functional` skill. For testing API behavior, see the `testing` skill. For versioning strategies and deprecation patterns, see `resources/api-evolution.md`. For security at the API boundary, see `resources/api-security.md`. For HTTP protocol fundamentals (caching, URI design, browser security, content negotiation), see `resources/http-fundamentals.md`. For JWT and OAuth 2.0 security deep-dive, see `resources/auth-security.md`.

## When to Use

- Designing new API endpoints
- Defining module boundaries or contracts between teams
- Creating component prop interfaces
- Changing existing public interfaces
- Establishing database schema that informs API shape

## Core Principles

### Hyrum's Law

> With a sufficient number of users of an API, all observable behaviors of your system will be depended on by somebody, regardless of what you promise in the contract.

Every public behavior — including undocumented quirks, error message text, timing, and ordering — becomes a de facto contract once users depend on it.

- **Be intentional about what you expose.** Every observable behavior is a potential commitment.
- **Don't leak implementation details.** If users can observe it, they will depend on it.
- **Plan for deprecation at design time.** Removing things users depend on always costs more than expected.
- **Tests are not enough.** Even with perfect contract tests, Hyrum's Law means "safe" changes can break real users who depend on undocumented behavior.

### The One-Version Rule

Avoid forcing consumers to choose between multiple versions of the same dependency or API. Diamond dependency problems arise when different consumers need different versions of the same thing. Design for a world where only one version exists at a time — extend rather than fork.

### Contract First

Define the interface before implementing it. The contract is the spec — implementation follows.

```typescript
type TaskAPI = {
  readonly createTask: (input: CreateTaskInput) => Promise<Task>;
  readonly listTasks: (params: ListTasksParams) => Promise<PaginatedResult<Task>>;
  readonly getTask: (id: TaskId) => Promise<Task>;
  readonly updateTask: (id: TaskId, input: UpdateTaskInput) => Promise<Task>;
  readonly deleteTask: (id: TaskId) => Promise<void>;
};
```

This aligns with TDD: define the contract (what you want), write tests against it, then implement.

### Prefer Addition Over Modification

Extend interfaces without breaking existing consumers:

```typescript
type CreateTaskInput = {
  readonly title: string;
  readonly description?: string;
  readonly priority?: 'low' | 'medium' | 'high';  // Added later, optional
  readonly labels?: ReadonlyArray<string>;           // Added later, optional
};
```

What breaks backward compatibility:
- Removing fields
- Changing field types
- Making optional fields required
- Changing enum values

What preserves backward compatibility:
- Adding new optional fields
- Adding new enum values (if consumers handle unknown values)
- Adding new endpoints

## Consistent Error Semantics

Pick one error strategy and use it everywhere. Don't mix patterns where some endpoints throw, others return null, and others return `{ error }`.

### RFC 9457 (Problem Details for HTTP APIs)

The standard format for machine-readable API errors. Use `application/problem+json` as the Content-Type.

**Standard members:**

```typescript
type ProblemDetail = {
  readonly type: string;       // URI identifying the error type (defaults to "about:blank")
  readonly title: string;      // Human-readable summary — MUST NOT change between occurrences
  readonly status: number;     // HTTP status code — MUST match the actual HTTP response status
  readonly detail: string;     // Explanation specific to this occurrence — help the client fix it
  readonly instance?: string;  // URI identifying this specific occurrence
};
```

When `type` is absent or `"about:blank"`, the problem has no additional semantics beyond the HTTP status code. Use `title` matching the standard HTTP phrase (e.g., "Not Found" for 404).

When `type` is a resolvable URI (http/https), it SHOULD point to human-readable documentation explaining how to resolve the problem.

**Example — single error:**

```json
{
  "type": "https://api.example.com/problems/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Your account balance of $5.00 is insufficient for a $10.00 transfer.",
  "instance": "/transfers/abc123",
  "balance": 30
}
```

**Extension members** (like `balance` above) are allowed — clients MUST ignore extensions they don't recognize, which enables forward-compatible evolution of error responses.

**Example — validation errors** (multiple problems of the same type use an extension array with JSON Pointer):

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Your request is not valid.",
  "status": 422,
  "detail": "2 validation errors",
  "errors": [
    { "detail": "must be a positive integer", "pointer": "#/age" },
    { "detail": "must be 'green', 'red' or 'blue'", "pointer": "#/profile/color" }
  ]
}
```

For multiple problems of **different types**, return the most relevant or urgent one — don't create batch problem types (they don't map well into HTTP semantics).

**When NOT to use Problem Details:**
- Generic problems expressed well by plain status codes (e.g., a simple 404 doesn't always need a body)
- When your application already defines a more appropriate error format
- As a debugging tool for internal implementation

Errors should be **actionable**: the consumer should know what went wrong, why, and what to do about it.

**Security (RFC 9457 §5):** Error responses must help clients correct issues, not serve as debugging tools. Every field in a problem detail is a potential information leak:
- **Never expose stack traces, internal paths, or server implementation details** — these are attack vectors
- **Vet new problem types** for information that could compromise the system or user privacy
- **Avoid linking to internal occurrence data** through the HTTP interface (e.g., don't link to internal log entries)
- **The `status` field duplicates the HTTP status code** — if they disagree, clients may behave unpredictably; keep them in sync

### HTTP Status Code Mapping

| Status | Meaning | When to use |
|--------|---------|-------------|
| 400 | Bad Request | Client sent malformed data |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate, version mismatch |
| 422 | Unprocessable Entity | Validation failed (semantically invalid) |
| 429 | Too Many Requests | Rate limit exceeded (include `Retry-After` header) |
| 500 | Internal Server Error | Server error (never expose internal details) |

### Validation at API Boundaries

Validate where external input enters your system. Trust internal code after validation. See the `typescript-strict` skill for schema-first patterns.

```typescript
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      type: 'https://api.example.com/problems/validation-error',
      title: 'Validation Error',
      status: 422,
      detail: 'Invalid task data',
      errors: result.error.flatten(),
    });
  }

  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

Third-party API responses are untrusted data — always validate their shape and content before use.

## Idempotency

Network failures happen. Clients retry. Without idempotency, retries create duplicate charges, duplicate orders, duplicate records.

### HTTP Method Idempotency

| Method | Safe | Idempotent | Notes |
|--------|------|------------|-------|
| GET | Yes | Yes | No side effects |
| PUT | No | Yes | Same request = same result |
| DELETE | No | Yes | Deleting twice = same outcome |
| POST | No | **No** | Needs explicit idempotency handling |
| PATCH | No | Not guaranteed | Depends on implementation |

### Idempotency Keys for POST

For non-idempotent operations (especially those involving money, orders, or state changes), use client-provided idempotency keys:

```typescript
app.post('/api/payments', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return res.status(400).json({
      type: 'https://api.example.com/problems/missing-idempotency-key',
      title: 'Missing Idempotency Key',
      status: 400,
      detail: 'POST /api/payments requires an Idempotency-Key header',
    });
  }

  const cached = await idempotencyStore.get(idempotencyKey);
  if (cached) {
    return res.status(cached.status).json(cached.body);
  }

  const payment = await paymentService.create(result.data);
  await idempotencyStore.set(idempotencyKey, {
    status: 201,
    body: payment,
  });

  return res.status(201).json(payment);
});
```

Design principles:
- Keys should be scoped to the API key / authenticated user
- Keys should expire (24 hours is typical)
- If parameters differ on retry with the same key, return an error
- Design for "at-least-once" delivery — assume every request might be sent multiple times

### Making DELETE Idempotent

DELETE should succeed even if the resource is already gone:

```typescript
app.delete('/api/tasks/:id', async (req, res) => {
  const deleted = await taskService.delete(req.params.id);
  // Return 204 whether the resource existed or was already deleted
  return res.status(204).send();
});
```

## Rate Limiting

Communicate limits clearly via headers on **every** response — not just 429s.

### Standard Headers

```
RateLimit-Limit: 1000          # Max requests per window
RateLimit-Remaining: 742       # Requests left in current window
RateLimit-Reset: 60            # Seconds until window resets
```

On 429 responses, always include `Retry-After`:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Limit: 1000
RateLimit-Remaining: 0
RateLimit-Reset: 30
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded 1000 requests per hour. Retry after 30 seconds."
}
```

### Design Considerations

- **Different limits for different operations** — reads are cheaper than writes
- **Communicate limits in documentation** — don't make consumers discover them by hitting 429s
- **Recommend exponential backoff with jitter** in your docs — naive retry loops cause thundering herds

## HTTP Caching

Assign explicit freshness lifetimes on responses. Don't rely on heuristic freshness.

| Directive | Meaning | Common misconception |
|-----------|---------|----------------------|
| `Cache-Control: max-age=N` | Fresh for N seconds. Preferred over `Expires`. | -- |
| `Cache-Control: no-cache` | May be stored, but must revalidate before every use. | Often confused with "don't cache" |
| `Cache-Control: no-store` | Must NOT be stored at all. Use this to prevent caching. | -- |
| `Cache-Control: must-revalidate` | Once stale, must revalidate. Cannot serve stale when disconnected. | -- |

Practical rules:
- Even short freshness (e.g., `max-age=5`) enables reuse across multiple clients
- Assign ETags for efficient revalidation without re-transferring the body
- If a request header changes the response, use `Vary` on ALL responses from that resource (including the default)
- Use `no-store` for responses containing sensitive data (not `no-cache`)

See `resources/http-fundamentals.md` for full caching guidance including content negotiation, header design, and protocol version independence.

## REST Conventions

### Resource Naming

| Pattern | Convention | Example |
|---------|-----------|---------|
| Endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | is/has/can prefix | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |
| Headers | No `X-` prefix (RFC 6648/BCP 178). Use Structured Fields (RFC 8941). | `Example-Request-Id` |

### Resource Design

```
GET    /api/tasks              → List tasks (with query params for filtering)
POST   /api/tasks              → Create a task
GET    /api/tasks/:id          → Get a single task
PATCH  /api/tasks/:id          → Update a task (partial)
DELETE /api/tasks/:id          → Delete a task

GET    /api/tasks/:id/comments → List comments for a task (sub-resource)
POST   /api/tasks/:id/comments → Add a comment to a task
```

Use PATCH for partial updates (only provided fields change). Use PUT only when the client sends the complete object.

### Pagination

Always paginate list endpoints:

```typescript
// Request
// GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

// Response shape
type PaginatedResult<T> = {
  readonly data: ReadonlyArray<T>;
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  };
};
```

### Filtering

Use query parameters for filters:

```
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

### Input/Output Separation

Separate what the caller provides from what the system returns:

```typescript
// Input: what the caller provides
type CreateTaskInput = {
  readonly title: string;
  readonly description?: string;
};

// Output: includes server-generated fields
type Task = {
  readonly id: TaskId;
  readonly title: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: UserId;
};
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll document the API later" | The types ARE the documentation. Define them first. |
| "We don't need pagination for now" | You will the moment someone has 100+ items. Add it from the start. |
| "PATCH is complicated, let's just use PUT" | PUT requires the full object every time. PATCH is what clients actually want. |
| "We'll version the API when we need to" | Breaking changes without versioning break consumers. Design for extension from the start. |
| "Nobody uses that undocumented behavior" | Hyrum's Law: if it's observable, somebody depends on it. |
| "Internal APIs don't need contracts" | Internal consumers are still consumers. Contracts prevent coupling and enable parallel work. |
| "Retries are the client's problem" | Without idempotency, retries create duplicates. Design for at-least-once delivery. |
| "We'll add rate limiting later" | By then, clients have built around unlimited access. Rate limits are part of the contract. |
| "Error messages are just for debugging" | Errors are part of your API's developer experience. Make them actionable, not diagnostic. |

## Red Flags

- Endpoints that return different shapes depending on conditions
- Inconsistent error formats across endpoints
- Error responses that expose stack traces or internal paths
- Breaking changes to existing fields (type changes, removals)
- List endpoints without pagination
- Verbs in REST URLs (`/api/createTask`, `/api/getUsers`)
- Third-party API responses used without validation
- No typed input/output schemas for endpoints
- POST endpoints without idempotency handling for state-changing operations
- No rate limit headers on responses
- Retry logic without exponential backoff
- Missing browser security headers on API responses (`X-Content-Type-Options`, CSP, `Referrer-Policy`)
- Custom `X-` prefixed headers (deprecated by RFC 6648)

## Verification

After designing an API:

- [ ] Every endpoint has typed input and output schemas
- [ ] Error responses follow RFC 9457 (or a single consistent format)
- [ ] Error responses never leak implementation details (stack traces, internal paths)
- [ ] Validation happens at system boundaries only
- [ ] List endpoints support pagination
- [ ] New fields are additive and optional (backward compatible)
- [ ] Naming follows consistent conventions across all endpoints
- [ ] Contract defined before implementation (contract-first)
- [ ] POST endpoints that create resources or change state have idempotency handling
- [ ] Rate limit headers included on responses
- [ ] Content-Type is `application/problem+json` for error responses
- [ ] Browser security headers on all responses (`X-Content-Type-Options: nosniff`, `CSP: default-src 'none'`, `Referrer-Policy: no-referrer`)
- [ ] Caching strategy defined (explicit `Cache-Control`, ETags for revalidation, `Vary` where needed)
