---
name: twelve-factor
description: 12-Factor App patterns for deployable applications. Use when configuring environment variables, connecting to backing services, structuring application startup/shutdown, or handling graceful shutdown and process signals. Applies to any deployed application (services, APIs, frontends, workers). Server-specific factors (port binding, concurrency, disposability) apply only to backend services.
---

# Twelve-Factor App Patterns

Core factors (config, dependencies, backing services, logs) apply to any deployed application — services, frontends, workers, and CLI tools. Server-specific factors (port binding, concurrency, disposability) apply only to backend services that run as long-lived processes.

Based on [12factor.net](https://12factor.net). Focuses on the factors that directly affect code: config, dependencies, backing services, stateless processes, disposability, logging, and concurrency. Purely operational factors (codebase management, build pipelines) are omitted.

## When to Apply

- **Greenfield projects**: All 12-factor rules are mandatory. Structure the application to follow every applicable factor from the start.
- **Brownfield projects**: Aim to follow as many factors as possible. Adopt incrementally in this priority order:
  1. **Config** (Factor III) — add env var validation without restructuring
  2. **Logs** (Factor XI) — switch to structured stdout logging
  3. **Disposability** (Factor IX) — add graceful shutdown handlers
  4. **Backing services** (Factor IV) — abstract connections behind config URLs
  5. **Stateless processes** (Factor VI) — migrate in-memory state to backing services

## Config (Factor III)

Store all configuration in environment variables. Never hardcode URLs, credentials, or per-environment values.

**Validate config at startup with a schema. Fail fast if config is invalid:**

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_KEY: z.string().min(1),
  SENTRY_DSN: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().transform((s) => s.split(',')).default(''),
});

type Config = z.infer<typeof ConfigSchema>;

export const createConfig = (env: Record<string, string | undefined> = process.env): Config => {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    console.error(JSON.stringify({ level: 'error', message: 'Invalid config', errors: result.error.flatten() }));
    process.exit(1);
  }
  return result.data;
};
```

**Inject config via options objects — never import `process.env` deep in the call tree:**

```typescript
const UserSchema = z.object({ id: z.string(), name: z.string(), email: z.string().email() });
type User = z.infer<typeof UserSchema>;

export const createUserService = ({ config }: { config: Pick<Config, 'API_URL'> }) => ({
  async getUser(id: string): Promise<User> {
    const response = await fetch(`${config.API_URL}/users/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`);
    const data: unknown = await response.json();
    return UserSchema.parse(data);
  },
});
```

**Provide `.env.example` as documentation (never `.env` with real values):**

```
PORT=3000
DATABASE_URL=postgres://localhost:5432/myapp
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:8080
LOG_LEVEL=info
API_KEY=your-api-key-here
SENTRY_DSN=
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

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

```typescript
import which from 'which';

export const checkSystemDependencies = (required: readonly string[]) => {
  const missing = required.filter((cmd) => !which.sync(cmd, { nothrow: true }));
  if (missing.length > 0) {
    throw new Error(`Missing required system dependencies: ${missing.join(', ')}`);
  }
};
```

**Rules:**
- Every dependency in `package.json` (or equivalent manifest)
- Lockfile (`package-lock.json`, `pnpm-lock.yaml`) committed to repo
- No `exec('imagemagick ...')` or `child_process` calls to assumed system tools
- If a system tool is required, document it explicitly and check for it at startup

## Backing Services (Factor IV)

Treat every backing service (database, cache, queue, email, storage) as an attached resource identified by a URL in config.

```typescript
export const createApp = ({ config }: { config: Config }) => {
  const db = createDbPool({ connectionString: config.DATABASE_URL });
  const cache = createRedisClient({ url: config.REDIS_URL });

  return {
    db,
    cache,
    async shutdown() {
      await Promise.all([db.end(), cache.quit()]);
    },
  };
};
```

**The code makes no distinction between local and third-party services.** Swapping a local PostgreSQL for a managed cloud database requires only a config change, never a code change.

For projects using hexagonal architecture, backing services map naturally to ports (interfaces) and adapters (implementations). See the `hexagonal-architecture` skill.

## Stateless Processes (Factor VI)

Execute the app as stateless, share-nothing processes. Any data that must persist lives in a backing service.

```typescript
export const createSessionStore = <T>({
  redis,
  schema,
}: {
  redis: RedisClient;
  schema: z.ZodType<T>;
}) => ({
  async get(sessionId: string): Promise<T | undefined> {
    const data = await redis.get(`session:${sessionId}`);
    return data ? schema.parse(JSON.parse(data)) : undefined;
  },
  async set({ sessionId, data, ttlSeconds }: { sessionId: string; data: T; ttlSeconds: number }) {
    await redis.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
  },
});
```

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

```typescript
// web.ts — handles HTTP requests
const config = createConfig();
const app = createApp({ config });
startServer({ app, config });

// worker.ts — processes background jobs
const config = createConfig();
const queue = createQueueConsumer({ url: config.QUEUE_URL });
queue.process('email', sendEmail);
queue.process('report', generateReport);
```

**Rules:**
- Separate entry points for each process type (web, worker, scheduler)
- HTTP handlers dispatch background work to a queue, never process it inline
- Each process type scales independently
- Use a `Procfile` or equivalent to define process types

```
web: node dist/web.js
worker: node dist/worker.js
```

## Disposability (Factor IX)

Maximize robustness with fast startup and graceful shutdown.

### Health Check Endpoints

```typescript
export const createHealthRoutes = ({ db }: { db: DbPool }) => ({
  '/health': async () => ({ status: 'ok' }),
  '/ready': async () => {
    await db.query('SELECT 1');
    return { status: 'ready' };
  },
});
```

### Graceful Shutdown

```typescript
const SHUTDOWN_TIMEOUT_MS = 30_000;

export const startServer = async ({ app, config }: { app: App; config: Pick<Config, 'PORT'> }) => {
  const server = app.listen(config.PORT);

  const shutdown = async (signal: string) => {
    const forceExit = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);

    try {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await app.shutdown();
      clearTimeout(forceExit);
      process.exit(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error(JSON.stringify({ level: 'error', message: 'Shutdown error', signal, error: message, stack }));
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
};
```

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

### Semantic Requirements

Regardless of which logging library or implementation a project uses, all loggers must satisfy these properties:

- **Structured output** — logs are machine-parseable (JSON preferred), not free-form strings
- **stdout/stderr only** — the app never writes to log files, never configures file transports
- **Standard levels** — at minimum: `debug`, `info`, `warn`, `error` — configurable via environment
- **Contextual data** — logs accept structured metadata (key-value pairs), not just message strings
- **Timestamp included** — every log entry includes an ISO 8601 timestamp
- **Request correlation** — include a `requestId` or trace ID to correlate logs across a single request

Projects may use any logging library (pino, winston with console transport, OpenTelemetry, custom) as long as these semantics are met. The specific interface may vary per project. If an existing logger is missing levels or structured data support, it should be adapted to meet these requirements.

### Example (illustrative — adapt to project conventions)

```typescript
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export const createLogger = ({ config }: { config: Pick<Config, 'LOG_LEVEL'> }) => {
  const shouldLog = (level: keyof typeof LOG_LEVELS) =>
    LOG_LEVELS[level] >= LOG_LEVELS[config.LOG_LEVEL];

  const log = (level: keyof typeof LOG_LEVELS, message: string, data?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    const output = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...data });
    (level === 'error' ? console.error : console.log)(output);
  };

  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
    error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
  };
};
```

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

Run admin tasks (migrations, data fixes, console sessions) as one-off processes using the same codebase and config.

```typescript
const config = createConfig();
const db = createDbPool({ connectionString: config.DATABASE_URL });
await runMigrations(db);
await db.end();
```

Admin scripts live in the repo alongside application code (e.g. `scripts/migrate.ts`). They are not separate tools or ad-hoc shell commands.

## Checklist

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
