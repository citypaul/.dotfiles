---
name: api-design
description: Stable consumer-facing API and interface design patterns. Use when designing REST endpoints, cross-team boundaries, or any externally consumed or versioned service contract. Covers contract-first development, error semantics (RFC 9457), REST conventions, pagination, idempotency, rate limiting, and backward compatibility. For an in-process feature or module's coherent responsibility and interface depth, use codebase-design. For TypeScript type patterns and trust-boundary validation, see typescript-strict.
---

# API and Interface Design

Use this skill for consumer compatibility and protocol semantics. For an in-process module's responsibility, full caller burden, information hiding, and depth, load `codebase-design`; use both when an internal module also exposes a public or cross-team contract. Use `evaluate-existing-solutions` only when a material gateway, framework, SDK, provider, or protocol-implementation choice remains unresolved; API semantics and compatibility stay here.

For TypeScript type patterns (branded types, discriminated unions, schema-first), see the `typescript-strict` skill. For immutability patterns, see the `functional` skill. For testing API behavior, see the `testing` skill. For OAuth 2.0 or OpenID Connect, load the `secure-oauth-oidc` skill rather than treating authentication as an ordinary API-key decision. For browser-facing BFF entry points — public/protected access classification, session cookies, CSRF/Origin/Fetch Metadata policy, protected SSE/WebSocket registration, and endpoint-protection enforcement — load the `bff-entry-points` skill; error shape and REST semantics stay here. For the BFF pattern itself (adoption, granularity, aggregation, upstream identity), load `bff-design` — a single-consumer BFF deployed in lockstep with its frontend legitimately relaxes the versioning discipline this skill mandates for externally consumed contracts.

**Supporting resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `problem-details.md` | Implementing RFC 9457 error responses — member semantics, single-error and validation-error JSON examples, extension members, §5 security guidance |
| `api-evolution.md` | Versioning strategies and deprecation patterns |
| `api-security.md` | Securing the API boundary |
| `auth-security.md` | JWT BCP security and routing to the dedicated OAuth/OIDC skill |
| `http-fundamentals.md` | HTTP protocol fundamentals — caching directives, content negotiation, browser security, status codes, header design |
| `source-notes.md` | Reviewing provenance, the immutable audit baseline, license scope, and local departures |

## When to Use

- Designing new API endpoints
- Defining contracts between teams or independently released consumers
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

### Choosing an Error Format

Within one versioned API contract, use one documented error shape unless a
protocol-specific endpoint requires another. Consistency matters more than
which compatible format you choose.

**For public APIs with external consumers**, use RFC 9457 (Problem Details). It's the industry standard, machine-readable, and what third-party developers expect. Use `application/problem+json` as the Content-Type.

**For internal APIs with a single frontend**, a simpler consistent shape is a valid choice. The minimum viable error response needs: a machine-readable error code, an optional human-readable message, and the correct HTTP status code. This is less ceremony than RFC 9457 while still being consistent and actionable.

```typescript
// Simpler shape — sufficient for internal APIs
type ApiError = {
  readonly error: string;                          // Machine-readable code (UPPER_SNAKE_CASE)
  readonly message?: string;                       // Human-readable description
  readonly fieldErrors?: Record<string, string>;   // For validation errors
};
```

If you start with a simpler format, design it so it can evolve toward RFC 9457 later (e.g., `error` maps to `title`, `message` maps to `detail`). Don't paint yourself into a corner.

### RFC 9457 (Problem Details for HTTP APIs)

The standard format for machine-readable API errors for public APIs. Use `application/problem+json` as the Content-Type. Standard members: `type` (URI identifying the error type), `title` (stable, human-readable summary), `status` (must match the actual HTTP status), `detail` (occurrence-specific explanation), `instance` (optional occurrence URI). Extension members are allowed — clients must ignore extensions they don't recognize.

Errors should be **actionable**: the consumer should know what went wrong, why, and what to do about it. Error responses are not a debugging tool — never expose stack traces, internal paths, or implementation details.

Include a correlation identifier (the trace ID, or an opaque reference to it) as an extension member or via `instance`, so a user-reported error joins to its trace and canonical log event — see the `observability` skill. The trace ID reveals nothing internal; it is a lookup key, not a detail leak.

See `resources/problem-details.md` for full member semantics, single-error and validation-error JSON examples, extension member rules, when NOT to use Problem Details, and RFC 9457 §5 security guidance.

### HTTP Status Code Mapping

| Status | Meaning | When to use |
|--------|---------|-------------|
| 400 | Bad Request | Client sent malformed data |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate, version mismatch |
| 422 | Unprocessable Content | Validation failed (semantically invalid) |
| 429 | Too Many Requests | Rate limit exceeded; include `Retry-After` when a meaningful retry time is known |
| 500 | Internal Server Error | Server error (never expose internal details) |

**422 vs 409 — pick the one that matches the failure:**
- **422** when the input itself is semantically invalid (missing required field, value out of allowed range, wrong format the schema didn't catch).
- **409** when the input is well-formed but conflicts with current state (duplicate resource, optimistic-locking version mismatch, wrong lifecycle stage like "already cancelled").

The distinction is whether the client could fix the request without first fixing the world. 422 → fix the request. 409 → resolve the conflict, then retry.

### Validation at API Boundaries

Validate untrusted representation and endpoint-schema input where it enters the
system, then pass the derived type through internal code. This does not replace
domain smart constructors or transition checks: invariant enforcement remains
with the model that owns the value. See `typescript-strict` and
`domain-driven-design`.

Return 400 when the representation itself cannot be parsed (for example malformed JSON). Once parsing succeeds, return 422 when the value fails the endpoint schema or business validation. Pick and document a different house mapping only when every example, error translator, and consumer uses it consistently.

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
| GET | Yes | Yes | Read-only requested semantics; incidental logging/metrics are allowed |
| PUT | No | Yes | Same request has the same intended effect; response status/body may differ |
| DELETE | No | Yes | Deleting twice = same outcome |
| POST | No | **No** | Needs explicit idempotency handling |
| PATCH | No | Not guaranteed | Depends on implementation |

### Idempotency Keys for POST

For non-idempotent operations (especially those involving money, orders, or state changes), use client-provided idempotency keys:

```typescript
app.post('/api/payments', async (req, res) => {
  const rawIdempotencyKey = req.headers['idempotency-key'];
  const idempotencyKey =
    typeof rawIdempotencyKey === 'string' &&
    /^[\x21-\x7e]{1,128}$/.test(rawIdempotencyKey)
      ? rawIdempotencyKey
      : undefined;
  if (!idempotencyKey) {
    return res.status(400).json({
      type: 'https://api.example.com/problems/invalid-idempotency-key',
      title: 'Invalid Idempotency Key',
      status: 400,
      detail: 'POST /api/payments requires one visible-ASCII Idempotency-Key of at most 128 characters',
    });
  }

  const result = CreatePaymentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json(toValidationProblem(result.error));
  }

  const scope = req.user.id;
  const fingerprint = stableHash(result.data);
  const claim = await idempotencyStore.claim({
    scope,
    key: idempotencyKey,
    fingerprint,
  });

  if (claim.status === 'parameters-mismatch') {
    return res.status(409).json(toProblem('IDEMPOTENCY_PARAMETERS_MISMATCH'));
  }
  if (claim.status === 'completed') {
    return res.status(claim.response.status).json(claim.response.body);
  }
  if (claim.status === 'in-progress') {
    res.setHeader('Retry-After', '1');
    return res.status(409).json(toProblem('IDEMPOTENCY_REQUEST_IN_PROGRESS'));
  }

  // createOnce durably owns operationId + fingerprint beyond response-cache
  // expiry. For an external provider it also persists/reuses the provider's
  // payment/intent ID, so recovery never depends on a time-limited request key.
  const payment = await paymentService.createOnce({
    operationId: claim.operationId,
    input: result.data,
  });
  await idempotencyStore.complete(claim.id, { status: 201, body: payment });

  return res.status(201).json(payment);
});
```

Design principles:
- Keys should be scoped to the API key / authenticated user
- Choose response-cache and claim retention from the documented maximum client
  retry/reconciliation window and effect risk; 24 hours is not a universal rule
- Keep a durable operation identity (and fingerprint or tombstone) after cached
  response eviction, or return an explicit expired/unknown outcome until
  non-duplication can be established — never silently treat a risky reused key
  as a fresh operation
- If parameters differ on retry with the same key, return an error
- Claim a key atomically; a separate read-then-create sequence is race-prone
- Coordinate the business effect with the claim through one transaction or a durable downstream operation ID
- For external payments, persist and reconcile the provider payment/intent ID;
  bound any request-idempotency-key retry to the provider's documented retention
- Represent in-progress claims explicitly and define retry/recovery for a worker that fails after claiming
- Design for "at-least-once" delivery — assume every request might be sent multiple times

### Making DELETE Idempotent

DELETE must have an idempotent effect: repeating it does not delete anything
else or create a second side effect. The repeated response may remain `204`,
or it may be `404` when absence is meaningful to clients. Choose and document
one contract:

```typescript
app.delete('/api/tasks/:id', async (req, res) => {
  const deleted = await taskService.delete(req.params.id);
  // This API deliberately treats already-absent as success.
  return res.status(204).send();
});
```

## Rate Limiting

When an API exposes a quota policy, communicate the applicable policy and
remaining state consistently on responses where that information is useful
to clients. Do not invent quota headers for endpoints without such a policy.

### Standard Headers (IETF draft — not yet an RFC)

The IETF standardization effort is `draft-ietf-httpapi-ratelimit-headers` (version 11, May 2026 — still an active working group draft). Current drafts define two structured fields:

```
RateLimit-Policy: "hour";q=1000;w=3600   # Policy: quota of 1000 per 3600s window
RateLimit: "hour";r=742;t=60             # Current state: 742 remaining, resets in 60s
```

Earlier drafts used a triplet — `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` — and many shipped APIs still use that triplet or the unstandardized `X-RateLimit-*` family. Expect any of these when consuming APIs. For new APIs, prefer the current draft fields; whichever names you choose, document them — header names are part of your contract, and the draft may still change before becoming an RFC.

On 429 responses, include `Retry-After` when the server can give a meaningful
retry time. It is a stable, standard HTTP header, but HTTP permits a 429
response without it:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Policy: "hour";q=1000;w=3600
RateLimit: "hour";r=0;t=30
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

Practical rules:
- Prefer `Cache-Control: max-age=N` over `Expires` — even short freshness (e.g., `max-age=5`) enables reuse across multiple clients
- Assign ETags for efficient revalidation without re-transferring the body
- If a request header changes the response, use `Vary` on ALL responses from that resource (including the default)
- Use `no-store` for responses containing sensitive data — `no-cache` does NOT mean "don't cache" (it means "stored but revalidate before use")

See `resources/http-fundamentals.md` for the full `Cache-Control` directive table plus content negotiation, header design, and protocol version independence.

## REST Conventions

### Resource Naming

| Pattern | Convention | Example |
|---------|-----------|---------|
| Endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | is/has/can prefix | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |
| Headers | No `X-` prefix (RFC 6648/BCP 178) | `Example-Request-Id` |

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

### Actions That Don't Map to CRUD

Operations like "cancel an order", "submit a draft", "approve a request", or "capture a payment" aren't reads or writes of a single field — they're domain actions. Don't try to squeeze them into PATCH. There is **no single industry consensus** on how to model them; three patterns are all in active use by major APIs, and the best choice depends on the action.

| Pattern | Example | Used by |
|---------|---------|---------|
| **Noun sub-resource** (action as record) | `POST /orders/42/cancellation` | Zalando guidelines; Stripe refunds (`POST /v1/refunds`) |
| **Verb sub-resource** | `POST /orders/42/cancel` | Stripe (`/payment_intents/{id}/cancel`, `/capture`, `/expire`), GitHub (`/issues/{n}/lock`), most public APIs |
| **Colon custom verb** | `POST /orders/42:cancel` | Google AIP-136; Microsoft Azure REST guidelines |

**Choosing between them:**

- **Use the noun sub-resource when the action produces an entity worth auditing.** A cancellation has a timestamp, a reason, an actor — modelling it as a resource lets clients `GET /orders/42/cancellation` later to inspect it. Same for refunds, approvals, submissions.
- **Use the verb sub-resource when the action is a transition with no interesting record of its own.** "Capture a payment", "lock an issue", "expire a session" don't leave behind a meaningful `Capture` entity — forcing one is awkward. This is by far the most common pattern in real-world public APIs.
- **Use the colon custom verb if you've adopted Google AIP or Microsoft Azure conventions** and want a clean syntactic separation between sub-resources and action verbs. Outside those ecosystems it's rare and some HTTP tooling mishandles `:` in paths.

**Don't mix patterns within one API** — pick one and apply it consistently. Stripe is internally inconsistent (refunds-as-noun alongside cancel-as-verb) and consumers report it as a recurring source of confusion. Consistency beats theoretical purity.

Whichever pattern you choose: **POST** is the right method (the action has side effects and is not idempotent without explicit help), and idempotency keys still apply for any action that creates state or moves money.

### Bulk Operations

When a client needs to act on many resources at once, don't abuse the single-resource endpoint with loops or arrays of IDs in query params. Use a dedicated batch endpoint:

```
POST   /api/orders/batch                 → Create many orders
POST   /api/orders/batch-cancel          → Cancel many orders
```

Design considerations:
- Define partial-success semantics explicitly: does one failure roll back the batch, or does the response report per-item status?
- Return a body shaped like `{ results: [{ id, status, error? }, ...] }` so the client can recover per-item.
- Cap the batch size and document the limit; reject oversized batches with 413 or 422.
- Apply idempotency keys at the batch level, not per item, so retries don't partially re-apply.

### Pagination

Paginate list endpoints whose result can grow beyond a bounded, safe response.
Small closed enumerations may return the complete set when that bound is part
of the contract:

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
| "We don't need a bound for this growing list" | Define pagination or another documented safe bound before the result can grow beyond one response. Closed, contractually bounded lists do not need ceremonial pagination. |
| "PATCH is complicated, let's just use PUT" | PUT requires the full object every time. PATCH is what clients actually want. |
| "We'll version the API when we need to" | Breaking changes without versioning break consumers. Design for extension from the start. |
| "Nobody uses that undocumented behavior" | Hyrum's Law: if it's observable, somebody depends on it. |
| "Internal APIs don't need contracts" | Internal consumers are still consumers. Contracts prevent coupling and enable parallel work. |
| "Retries are the client's problem" | Without idempotency, retries create duplicates. Design for at-least-once delivery. |
| "We'll add an abuse control after this expensive public operation is attacked" | Protect unauthenticated, costly, or abuse-prone operations from the start. Publish quota headers only when a client-visible quota is actually part of the contract. |
| "Error messages are just for debugging" | Errors are part of your API's developer experience. Make them actionable, not diagnostic. |

## Red Flags

- Endpoints that return different shapes depending on conditions
- Inconsistent error formats across endpoints
- Error responses that expose stack traces or internal paths
- Breaking changes to existing fields (type changes, removals)
- Potentially unbounded list endpoints without pagination or another explicit bound
- Verbs in REST URLs (`/api/createTask`, `/api/getUsers`)
- Third-party API responses used without validation
- No typed input/output schemas for endpoints
- Retriable POST operations where duplicate attempts can repeat a state-changing effect and no idempotency strategy is defined
- Documented quota policies whose responses do not expose enough state for clients to behave correctly
- Retry logic without exponential backoff
- Browser-served responses missing the entry point's applicable security headers
- Custom `X-` prefixed headers (deprecated by RFC 6648)

## Verification

After designing an API:

- [ ] Every endpoint has a typed output contract and typed input where input exists
- [ ] Error responses follow a single consistent format (RFC 9457 for public APIs, or a simpler consistent shape for internal APIs)
- [ ] Error responses never leak implementation details (stack traces, internal paths)
- [ ] Untrusted representation/schema validation happens at trust boundaries; domain invariants remain enforced by their owner
- [ ] Growing list endpoints have pagination or another documented safe bound
- [ ] New fields are additive and optional (backward compatible)
- [ ] Naming follows consistent conventions across all endpoints
- [ ] Contract defined before implementation (contract-first)
- [ ] Retriable POST operations define how duplicate attempts avoid repeated effects
- [ ] APIs with documented quota policies expose the client-visible limit state consistently
- [ ] Content-Type is `application/problem+json` for RFC 9457 responses, `application/json` for simpler formats
- [ ] Browser-facing entry points apply security headers suited to the served content and deployment policy
- [ ] Caching strategy defined (explicit `Cache-Control`, ETags for revalidation, `Vary` where needed)

## Attribution

This skill adapts Addy Osmani's MIT-licensed `api-and-interface-design` skill. Local history records the adaptation but not the original upstream import revision. See `resources/source-notes.md` for the immutable audit baseline (which is not an import-revision claim), retained ideas, and local departures; see `LICENSE` for the applicable upstream notice.
