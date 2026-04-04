---
name: api-design
description: Stable API and interface design patterns. Use when designing REST endpoints, module boundaries, component prop interfaces, or any public contract between systems. Covers contract-first development, error semantics, REST conventions, pagination, and backward compatibility. For TypeScript type patterns (branded types, discriminated unions, schemas), see typescript-strict. For validation at trust boundaries, see typescript-strict.
---

# API and Interface Design

For TypeScript type patterns (branded types, discriminated unions, schema-first), see the `typescript-strict` skill. For immutability patterns, see the `functional` skill. For testing API behavior, see the `testing` skill.

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

```typescript
type APIError = {
  readonly error: {
    readonly code: string;        // Machine-readable: "VALIDATION_ERROR"
    readonly message: string;     // Human-readable: "Email is required"
    readonly details?: unknown;   // Additional context when helpful
  };
};
```

### HTTP Status Code Mapping

| Status | Meaning | When to use |
|--------|---------|-------------|
| 400 | Bad Request | Client sent malformed data |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate, version mismatch |
| 422 | Unprocessable Entity | Validation failed (semantically invalid) |
| 500 | Internal Server Error | Server error (never expose internal details) |

### Validation at API Boundaries

Validate where external input enters your system. Trust internal code after validation. See the `typescript-strict` skill for schema-first patterns.

```typescript
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid task data',
        details: result.error.flatten(),
      },
    });
  }

  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

Third-party API responses are untrusted data — always validate their shape and content before use.

## REST Conventions

### Resource Naming

| Pattern | Convention | Example |
|---------|-----------|---------|
| Endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | is/has/can prefix | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |

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

## Red Flags

- Endpoints that return different shapes depending on conditions
- Inconsistent error formats across endpoints
- Breaking changes to existing fields (type changes, removals)
- List endpoints without pagination
- Verbs in REST URLs (`/api/createTask`, `/api/getUsers`)
- Third-party API responses used without validation
- No typed input/output schemas for endpoints

## Verification

After designing an API:

- [ ] Every endpoint has typed input and output schemas
- [ ] Error responses follow a single consistent format
- [ ] Validation happens at system boundaries only
- [ ] List endpoints support pagination
- [ ] New fields are additive and optional (backward compatible)
- [ ] Naming follows consistent conventions across all endpoints
- [ ] Contract defined before implementation (contract-first)
