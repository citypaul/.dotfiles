---
name: twelve-factor
description: 12-Factor App patterns for TypeScript services. Use when building deployable services, configuring environment variables, connecting to backing services, structuring application startup/shutdown, or handling graceful shutdown and process signals. Only applies to service/API projects. Do NOT use for libraries, CLI tools, or static sites.
---

# Twelve-Factor App Patterns

This skill applies to service and API projects that will be deployed as running processes. Do not apply these patterns to libraries, CLI tools, or static sites.

Based on [12factor.net](https://12factor.net). Focuses on the factors that directly affect code: config, dependencies, backing services, stateless processes, disposability, and logging. Infrastructure-only factors (codebase, build/release/run, concurrency) are omitted.

## When to Apply

- **Greenfield projects**: All 12-factor rules are mandatory. Structure the application to follow every applicable factor from the start.
- **Brownfield projects**: Aim to follow as many factors as possible. Adopt incrementally in this priority order:
  1. **Config** (Factor III) — add env var validation without restructuring
  2. **Logs** (Factor XI) — switch to structured stdout logging
  3. **Disposability** (Factor IX) — add graceful shutdown handlers
  4. **Stateless processes** (Factor VI) — migrate in-memory state to backing services
  5. **Backing services** (Factor IV) — abstract connections behind config URLs

## Config (Factor III)

Store all configuration in environment variables. Never hardcode URLs, credentials, or per-environment values.

**Validate config at startup with a schema:**

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_KEY: z.string().min(1),
});

type Config = z.infer<typeof ConfigSchema>;

export const createConfig = (env: Record<string, string | undefined> = process.env): Config =>
  ConfigSchema.parse(env);
```

**Inject config via options objects — never import `process.env` deep in the call tree:**

```typescript
export const createUserService = ({ config }: { config: Config }) => ({
  async getUser(id: string) {
    const response = await fetch(`${config.API_URL}/users/${id}`);
    return response.json();
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

**Rules:**
- Every dependency in `package.json` (or equivalent manifest)
- Lockfile (`package-lock.json`, `pnpm-lock.yaml`) committed to repo
- No `exec('imagemagick ...')` or `child_process` calls to assumed system tools
- If a system tool is required, document it explicitly and check for it at startup
- Pin dependency versions for reproducible builds

## Backing Services (Factor IV)

Treat every backing service (database, cache, queue, email, storage) as an attached resource identified by a URL in config.

```typescript
export const createApp = ({ config }: { config: Config }) => {
  const db = createDbPool({ connectionString: config.DATABASE_URL });
  const cache = createRedisClient({ url: config.REDIS_URL });
  const queue = createQueueClient({ url: config.QUEUE_URL });

  return {
    db,
    cache,
    queue,
    async shutdown() {
      await Promise.all([db.end(), cache.quit(), queue.close()]);
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
  async set(sessionId: string, data: T, ttlSeconds: number) {
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
```

**Why these are wrong:** In-memory state is lost on restart and invisible to other process instances. Local filesystem state cannot be shared across processes. Use backing services (Redis, S3, database) instead.

See the `functional` skill for immutable data patterns that naturally support statelessness.

## Disposability (Factor IX)

Maximize robustness with fast startup and graceful shutdown.

```typescript
export const startServer = async ({ app, config }: { app: App; config: Config }) => {
  const server = app.listen(config.PORT);

  const shutdown = async (signal: string) => {
    try {
      server.close();
      await app.shutdown();
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', message: 'Shutdown error', signal, error }));
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
};
```

**Rules:**
- Handle SIGTERM and SIGINT for graceful shutdown
- Stop accepting new connections, then drain in-flight requests
- Close database pools, Redis connections, queue consumers
- Keep startup fast — defer heavy initialization to first request if needed
- Design background jobs to be reentrant/idempotent so interrupted work can be safely retried

## Logs (Factor XI)

Treat logs as event streams. Write structured output to stdout. Never route or store logs from within the app.

### Semantic Requirements

Regardless of which logging library or implementation a project uses, all loggers must satisfy these properties:

- **Structured output** — logs are machine-parseable (JSON preferred), not free-form strings
- **stdout/stderr only** — the app never writes to log files, never configures file transports
- **Standard levels** — at minimum: `debug`, `info`, `warn`, `error` — configurable via environment
- **Contextual data** — logs accept structured metadata (key-value pairs), not just message strings
- **Timestamp included** — every log entry includes an ISO 8601 timestamp

Projects may use any logging library (pino, winston with console transport, OpenTelemetry, custom) as long as these semantics are met. The specific interface may vary per project. If an existing logger is missing levels or structured data support, it should be adapted to meet these requirements.

### Example (illustrative — adapt to project conventions)

```typescript
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export const createLogger = ({ config }: { config: Pick<Config, 'LOG_LEVEL'> }) => {
  const shouldLog = (level: keyof typeof LOG_LEVELS) =>
    LOG_LEVELS[level] >= LOG_LEVELS[config.LOG_LEVEL];

  const log = (level: keyof typeof LOG_LEVELS, message: string, data?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    const output = JSON.stringify({ level, message, ...data, timestamp: new Date().toISOString() });
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
// scripts/migrate.ts — ships with the app, uses the same config
const config = createConfig();
const db = createDbPool({ connectionString: config.DATABASE_URL });
await runMigrations(db);
await db.end();
```

Admin scripts live in the repo alongside application code. They are not separate tools or ad-hoc shell commands.

## Checklist

- [ ] All config comes from environment variables, validated at startup with a schema
- [ ] `.env.example` documents required variables (no real credentials)
- [ ] All dependencies explicitly declared in manifest with lockfile committed
- [ ] Backing services connected via config URLs, swappable without code changes
- [ ] No in-memory session state, no local filesystem state between requests
- [ ] SIGTERM/SIGINT handlers for graceful shutdown
- [ ] Database pools and connections closed on shutdown
- [ ] Logs written as structured JSON to stdout, no file transports
- [ ] App binds to a port from config, includes its own HTTP server
- [ ] Same backing service types used in development and production
- [ ] Admin scripts live in the repo and use the same config/dependencies
