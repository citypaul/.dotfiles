---
name: twelve-factor
description: 12-Factor App patterns for deployable applications. Use when configuring environment variables, connecting to backing services, structuring application startup/shutdown, or handling graceful shutdown and process signals. Applies to any deployed application (services, APIs, frontends, workers). Server-specific factors (port binding, concurrency, disposability) apply only to backend services.
---

# Twelve-Factor App Patterns

Core factors (config, dependencies, backing services, logs) apply to any deployed application — services, frontends, workers, and CLI tools. Server-specific factors (port binding, concurrency, disposability) apply only to backend services that run as long-lived processes.

Based on [12factor.net](https://12factor.net). All 12 factors are covered below: rules, anti-patterns, and code-level implications live here; Node/TypeScript implementation examples live in `resources/`.

See the `typescript-strict` skill for schema-first patterns at trust boundaries. See the `testing` skill for how to TDD these patterns — config validation, shutdown behavior, and backing service integration are all testable through behavior-driven tests.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `node-patterns.md` | Implementing any factor in Node/TypeScript — config schema validation, options-object injection, `.env.example`, system dependency checks, backing service factories, Redis session store, web/worker entry points, health checks, graceful shutdown, structured logger, admin scripts |

---

## When to Apply

- **Greenfield projects**: All 12-factor rules are mandatory. Structure the application to follow every applicable factor from the start.
- **Brownfield projects**: Aim to follow as many factors as possible. Adopt incrementally in this priority order:
  1. **Config** (Factor III) — add env var validation without restructuring
  2. **Logs** (Factor XI) — switch to structured stdout logging
  3. **Disposability** (Factor IX) — add graceful shutdown handlers
  4. **Backing services** (Factor IV) — abstract connections behind config URLs
  5. **Stateless processes** (Factor VI) — migrate in-memory state to backing services

## Codebase (Factor I)

One codebase tracked in revision control, many deploys. Each deployable service has its own codebase. Shared code between services is extracted into libraries managed via the package manager, not copy-pasted.

In a monorepo, each service should have its own entry point, its own deploy pipeline, and its own set of backing service connections. A single repo is fine as long as each service deploys independently.

## Config (Factor III)

Store all configuration in environment variables. Never hardcode URLs, credentials, or per-environment values.

**Rules:**
- Validate config at startup with a schema — fail fast (exit non-zero, clear error) if config is invalid
- Inject config via options objects — never import `process.env` deep in the call tree
- Provide `.env.example` as documentation (never commit `.env` with real values)

See `resources/node-patterns.md` for the Zod config schema, options-object injection, and `.env.example` examples.

### Config Anti-Patterns

```typescript
const DB_HOST = 'prod-db.internal.example.com';

if (process.env.NODE_ENV === 'production') {
  connectTo('prod-db');
} else {
  connectTo('localhost');
}

const config = require(`./config.${process.env.NODE_ENV}.json`);
```

**Why these are wrong:** Config that varies by deploy belongs in env vars, not code. Environment-name branching creates combinatorial explosion and breaks dev/prod parity.

## Dependencies (Factor II)

Explicitly declare all dependencies. Never rely on implicit system-wide packages.

**Rules:**
- Every dependency in `package.json` (or equivalent manifest)
- Lockfile (`package-lock.json`, `pnpm-lock.yaml`) committed to repo
- Dependencies are isolated — the app does not leak from or depend on the system environment (use `node_modules`, not global installs)
- No `exec('imagemagick ...')` or `child_process` calls to assumed system tools
- If a system tool is required, document it explicitly and check for it at startup (see `resources/node-patterns.md` for a startup check)

## Backing Services (Factor IV)

Treat every backing service (database, cache, queue, email, storage) as an attached resource identified by a URL in config.

**The code makes no distinction between local and third-party services.** Swapping a local PostgreSQL for a managed cloud database requires only a config change, never a code change. See `resources/node-patterns.md` for a factory that wires backing services from config URLs.

For projects using hexagonal architecture, backing services map naturally to ports (interfaces) and adapters (implementations). See the `hexagonal-architecture` skill.

## Stateless Processes (Factor VI)

Execute the app as stateless, share-nothing processes. Any data that must persist lives in a backing service. See `resources/node-patterns.md` for a Redis-backed session store.

### Stateless Anti-Patterns

```typescript
const sessions = new Map<string, UserSession>();

app.post('/upload', (req, res) => {
  fs.writeFileSync(`/tmp/uploads/${req.file.name}`, req.file.data);
});

let requestCount = 0;
app.use(() => { requestCount++; });

setInterval(() => sendReport(), 60_000);
```

**Why these are wrong:** In-memory state is lost on restart and invisible to other process instances. Local filesystem state cannot be shared across processes. In-process schedulers run in only one instance. Use backing services (Redis, S3, database) and external schedulers instead.

See the `functional` skill for immutable data patterns that naturally support statelessness.

## Concurrency (Factor VIII)

Scale out via the process model. Design the app so work can be divided across process types.

**Rules:**
- Separate entry points for each process type (web, worker, scheduler) — see `resources/node-patterns.md`
- HTTP handlers dispatch background work to a queue, never process it inline
- Each process type scales independently
- Use a `Procfile` or equivalent to define process types

```
web: node dist/web.js
worker: node dist/worker.js
```

## Disposability (Factor IX)

Maximize robustness with fast startup and graceful shutdown. See `resources/node-patterns.md` for health check routes and a full graceful shutdown implementation.

**Rules:**
- Handle SIGTERM and SIGINT for graceful shutdown
- Set a drain timeout — force exit if shutdown hangs
- Await `server.close()` to drain in-flight connections
- Close database pools, Redis connections, queue consumers
- Exit with non-zero code on shutdown failure
- Keep startup fast — defer heavy initialization to first request if needed
- Design background jobs to be reentrant/idempotent so interrupted work can be safely retried
- Provide `/health` and `/ready` endpoints for orchestrator probes

## Logs (Factor XI)

Treat logs as event streams. Write structured output to stdout. Never route or store logs from within the app.

For internet-facing servers, RFC 6302 (BCP 162) specifies minimum logging requirements: source and destination addresses and ports, timestamps (preferably UTC), and transport protocol. These should be captured at the server/framework level in addition to application-level structured logging.

### Semantic Requirements

Regardless of which logging library or implementation a project uses, all loggers must satisfy these properties:

- **Structured output** — logs are machine-parseable (JSON preferred), not free-form strings
- **stdout/stderr only** — the app never writes to log files, never configures file transports
- **Standard levels** — at minimum: `debug`, `info`, `warn`, `error` — configurable via environment
- **Contextual data** — logs accept structured metadata (key-value pairs), not just message strings
- **Timestamp included** — every log entry includes an ISO 8601 timestamp
- **Request correlation** — include a `requestId` or trace ID to correlate logs across a single request

Projects may use any logging library (pino, winston with console transport, OpenTelemetry, custom) as long as these semantics are met. If an existing logger is missing levels or structured data support, adapt it to meet these requirements. See `resources/node-patterns.md` for an illustrative logger implementation.

### Logging Anti-Patterns

```typescript
import fs from 'fs';
fs.appendFileSync('/var/log/app.log', message);

import winston from 'winston';
const logger = winston.createLogger({
  transports: [new winston.transports.File({ filename: 'error.log' })],
});

console.log(`User ${userId} logged in`);
```

**Why these are wrong:** File transports mean the app is routing its own logs. Unstructured string interpolation produces logs that cannot be parsed or queried. The execution environment (container orchestrator, PaaS) captures stdout and routes it to the appropriate destination.

## Build, Release, Run (Factor V)

Strictly separate build and run stages. Config is injected at release/run time, never baked into the build.

**Code-level implications:**
- No environment-specific build outputs — the same build artifact deploys to every environment
- Config comes from env vars at runtime, not from compile-time substitution
- Releases are immutable — code changes require a new build, not runtime patching

## Port Binding (Factor VII)

The app is self-contained and exports its service by binding to a port.

```typescript
const server = app.listen(config.PORT, () => {
  logger.info('Server started', { port: config.PORT });
});
```

Do not rely on runtime injection of a web server (e.g., a separate Apache/Nginx process serving your app). The app includes its own HTTP server library as a dependency.

## Dev/Prod Parity (Factor X)

Keep development and production as similar as possible. Use the same type of backing services in all environments.

**Rules:**
- If production uses PostgreSQL, develop against PostgreSQL (not SQLite)
- If production uses Redis, develop against Redis (not in-memory maps)
- Use containers (Docker Compose) to run backing services locally
- Config schema validation (Factor III) catches mismatches at startup

## Admin Processes (Factor XII)

Run admin tasks (migrations, data fixes, console sessions) as one-off processes using the same codebase and config. See `resources/node-patterns.md` for a migration script example.

Admin scripts live in the repo alongside application code (e.g. `scripts/migrate.ts`). They are not separate tools or ad-hoc shell commands. Admin processes run in an identical environment to the app — same release, same config, same dependencies.

## Testing 12-Factor Patterns

12-factor patterns are testable through behavior-driven tests:

- **Config**: test that `createConfig` throws on missing required vars and returns correct defaults
- **Disposability**: test that shutdown closes all connections (inject test doubles for db/cache)
- **Backing services**: test that services work with any backing service URL (inject via config)
- **Statelessness**: test that request handlers do not depend on prior request state

Config injection via options objects makes all of these patterns naturally testable without mocking `process.env` or global state. See the `testing` skill for factory patterns and behavior-driven test examples.

## Checklist

- [ ] One codebase per deployable service; shared code extracted as libraries
- [ ] Same build artifact deploys to every environment (no env-specific builds)
- [ ] All config comes from environment variables, validated at startup with a schema
- [ ] Startup fails fast with a clear error message if config is invalid
- [ ] `.env.example` documents required variables (no real credentials)
- [ ] All dependencies explicitly declared in manifest with lockfile committed
- [ ] Backing services connected via config URLs, swappable without code changes
- [ ] No in-memory session state, no local filesystem state between requests
- [ ] Separate entry points for web and worker process types
- [ ] SIGTERM/SIGINT handlers with drain timeout for graceful shutdown
- [ ] Database pools and connections closed on shutdown
- [ ] `/health` and `/ready` endpoints for orchestrator probes
- [ ] Logs written as structured JSON to stdout, no file transports
- [ ] Logs include request correlation IDs
- [ ] App binds to a port from config, includes its own HTTP server
- [ ] Same backing service types used in development and production
- [ ] Admin scripts live in the repo and use the same config/dependencies
