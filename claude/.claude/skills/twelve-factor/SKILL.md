---
name: twelve-factor
description: Twelve-Factor App patterns for software-as-a-service and long-running process applications. Use when configuring deploy-time environment, backing services, process startup/shutdown, or operational parity. Apply individual principles to frontends, serverless functions, and CLIs only where their runtime and platform make them relevant.
---

# Twelve-Factor App Patterns

The original methodology targets software-as-a-service applications. Its principles can inform other deployables, but port binding, concurrency, process disposability, runtime config, and artifact parity do not map literally to every frontend, serverless function, or CLI.

Based on [12factor.net](https://12factor.net). All 12 factors are covered below: rules, anti-patterns, and code-level implications live here; Node/TypeScript implementation examples live in `resources/`.

See the `typescript-strict` skill for schema-first patterns at trust boundaries. See the `testing` skill for how to TDD these patterns — config validation, shutdown behavior, and backing service integration are all testable through behavior-driven tests.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `node-patterns.md` | Implementing any factor in Node/TypeScript — config schema validation, options-object injection, `.env.example`, system dependency checks, backing service factories, Redis session store, web/worker entry points, health checks, graceful shutdown, structured logger, admin scripts |

---

## When to Apply

- **Greenfield SaaS/process applications**: assess all twelve factors and adopt the ones that fit the runtime and platform.
- **Brownfield applications**: adopt improvements incrementally from observed risk. A common starting order is:
  1. **Config** (Factor III) — add env var validation without restructuring
  2. **Logs** (Factor XI) — switch to structured process-stream logging
  3. **Disposability** (Factor IX) — add graceful shutdown handlers
  4. **Backing services** (Factor IV) — inject platform-appropriate resource bindings
  5. **Stateless processes** (Factor VI) — migrate in-memory state to backing services

## Codebase (Factor I)

One codebase tracked in revision control, many deploys. A codebase can be a repository or a clearly owned part of a monorepo; do not split repositories merely to satisfy the label. Share code through an explicit owned package or module rather than copy-paste.

In a monorepo, each service should have its own entry point, its own deploy pipeline, and its own set of backing service connections. A single repo is fine as long as each service deploys independently.

## Config (Factor III)

Store deploy-varying configuration outside the build. Environment variables
are the Twelve-Factor default; use an equivalent platform-native secret or
configuration injection mechanism when the runtime requires it. Never hardcode
credentials or environment-specific endpoints.

**Rules:**
- Validate config at startup with a schema — fail fast (exit non-zero, clear error) if config is invalid
- Inject config via options objects — never import `process.env` deep in the call tree
- Document required configuration in the platform-appropriate example or schema; use `.env.example` when environment variables are the configuration interface (never commit `.env` with real values)

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

**Why these are wrong:** Config that varies by deploy belongs outside source and
build artifacts, supplied through the runtime's supported injection mechanism.
Environment-name branching creates combinatorial explosion and breaks dev/prod
parity.

## Dependencies (Factor II)

Explicitly declare all dependencies. Never rely on implicit system-wide packages.

**Rules:**
- Every dependency in `package.json` (or equivalent manifest)
- Lockfile (`package-lock.json`, `pnpm-lock.yaml`) committed to repo
- Dependencies are isolated — the app does not leak from or depend on the system environment (use `node_modules`, not global installs)
- System tools invoked through subprocesses are explicit runtime dependencies: document, version where practical, and check them at startup or build time

## Backing Services (Factor IV)

Treat every backing service (database, cache, queue, email, storage) as an attached resource supplied at composition time through injected configuration. A URL is common, but platform bindings, socket paths, resource names, handles, and structured credentials are valid when they are the platform contract.

**Domain code makes no distinction between local and third-party services.** Swapping equivalent providers changes injected resource configuration, not domain behavior; a provider with a different protocol may also require a different adapter. See `resources/node-patterns.md` for a factory that wires URL-based backing services as one common example.

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

**Why these are wrong:** In-memory state is lost on restart and invisible to other process instances. Local filesystem state cannot be shared across processes. An in-process scheduler runs once in every replica, causing duplicate jobs unless a separate coordination mechanism intervenes. Use backing services (Redis, S3, database) and an external scheduler or explicit distributed coordination instead.

See the `functional` skill for immutable data patterns that naturally support statelessness.

## Concurrency (Factor VIII)

Scale out via the process model. Design the app so work can be divided across process types.

**Rules:**
- Separate entry points for each process type (web, worker, scheduler) — see `resources/node-patterns.md`
- Move durable or long-running background work to an appropriate worker/queue; keep small request-owned work inline when that is simpler and meets latency/retry requirements
- Each process type scales independently
- Declare process types in the platform's existing configuration (`Procfile` is one example)

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
- Keep startup fast without moving unsafe initialization failures into the first live request
- Design background jobs to be reentrant/idempotent so interrupted work can be safely retried
- Provide the health/readiness mechanism expected by the deployment platform when it uses probes

## Logs (Factor XI)

Treat logs as event streams. Write structured records to the process streams captured by the deployment platform; stdout is the normal application stream and stderr may carry error records or diagnostics when the collector captures both. Never route or store logs in files from within the app.

This factor owns log *transport and shape*. For what goes into the stream — wide events / canonical log lines, traces, SLOs, alerting — see the `observability` skill.

For internet-facing servers, RFC 6302 (BCP 162) specifies minimum logging requirements: source and destination addresses and ports, timestamps (preferably UTC), and transport protocol. These should be captured at the server/framework level in addition to application-level structured logging.

### Semantic Requirements

For long-running services, start from these properties and defer exact fields to the repository's observability and platform contracts:

- **Structured output** — logs are machine-parseable (JSON preferred), not free-form strings
- **process streams only** — use the platform's documented stdout/stderr contract; the app never writes to log files or configures file transports
- **Useful severity** — follow the platform's recognized levels and make the threshold deploy-time configurable where needed
- **Contextual data** — logs accept structured metadata (key-value pairs), not just message strings
- **Timestamp included** — every log entry includes an ISO 8601 timestamp
- **Request correlation** — include a trace or request identifier on request-scoped records where correlation is available; prefer the platform's W3C trace context integration

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

**Why these are wrong:** File transports mean the app is routing its own logs. Unstructured string interpolation produces logs that cannot be parsed or queried. The execution environment (container orchestrator, PaaS) captures its documented process streams and routes them to the appropriate destination.

## Build, Release, Run (Factor V)

Strictly separate build and run stages. Config is injected at release/run time, never baked into the build.

**Code-level implications for runtime-configured process apps:**
- Prefer the same build artifact across environments
- Inject deploy-varying config at release/run time. Compile-time configuration is a different contract and may be necessary for static frontends
- Releases are immutable — code changes require a new build, not runtime patching

## Port Binding (Factor VII)

The app is self-contained and exports its service by binding to a port.

```typescript
const server = app.listen(config.PORT, () => {
  logger.info('Server started', { port: config.PORT });
});
```

This factor applies to long-running web services. Static sites, serverless handlers, and platforms that intentionally own the server lifecycle follow their platform contract instead.

## Dev/Prod Parity (Factor X)

Keep development and production similar in the characteristics that affect behavior. Exact products may differ when a compatible substitute is deliberate and contract-tested.

**Rules:**
- Prefer production-equivalent backing services for integration and parity tests where semantic differences matter
- Use the repository's existing local-service mechanism; containers are one option, not a requirement
- Config schema validation (Factor III) catches mismatches at startup

## Admin Processes (Factor XII)

Run admin tasks (migrations, data fixes, console sessions) as one-off processes using the same codebase and config. See `resources/node-patterns.md` for a migration script example.

Admin scripts live in the repo alongside application code (e.g. `scripts/migrate.ts`). They are not separate tools or ad-hoc shell commands. Admin processes run in an identical environment to the app — same release, same config, same dependencies.

## Testing 12-Factor Patterns

12-factor patterns are testable through behavior-driven tests:

- **Config**: test that `createConfig` throws on missing required vars and returns correct defaults
- **Disposability**: test that shutdown closes all connections (inject test doubles for db/cache)
- **Backing services**: test supported resource bindings through injected configuration
- **Statelessness**: test that request handlers do not depend on prior request state

Config injection via options objects makes all of these patterns naturally testable without mocking `process.env` or global state. See the `testing` skill for factory patterns and behavior-driven test examples.

## Checklist

- [ ] One owned codebase has many deploys; shared code has an explicit owner
- [ ] Runtime-configured process apps prefer the same build artifact across environments
- [ ] Deploy-varying config is injected outside the build and validated at startup with a schema
- [ ] Startup fails fast with a clear error message if config is invalid
- [ ] The platform-appropriate example or schema documents required config; `.env.example` is used when environment variables are the interface (no real credentials)
- [ ] All dependencies explicitly declared in manifest with lockfile committed
- [ ] Backing services are injected as platform-appropriate resource locators, handles, or credentials; equivalent providers are swappable at composition time
- [ ] No in-memory session state, no local filesystem state between requests
- [ ] Separate process types exist where work has distinct scaling or lifecycle needs
- [ ] SIGTERM/SIGINT handlers with drain timeout for graceful shutdown
- [ ] Database pools and connections closed on shutdown
- [ ] Platform-required health/readiness probes are implemented
- [ ] Logs are structured on the platform-captured process streams, with no file transports
- [ ] Request-scoped logs include available correlation context
- [ ] Long-running web services satisfy the platform's port-binding contract
- [ ] Development and production backing services are parity-tested where differences matter
- [ ] Admin scripts live in the repo and use the same config/dependencies
