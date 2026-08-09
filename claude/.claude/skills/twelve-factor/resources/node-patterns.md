# Node/TypeScript Patterns for 12-Factor Apps

Implementation examples for the rules in `../SKILL.md`. These are illustrative — adapt names, libraries, and interfaces to project conventions.

## Config: Validate at Startup with a Schema (Factor III)

Parse configuration in a testable function. Let the process entry point report the validation error and exit non-zero:

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_KEY: z.string().min(1),
  SENTRY_DSN: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().default('').transform((s) => s === '' ? [] : s.split(',')),
});

type Config = z.infer<typeof ConfigSchema>;

export const createConfig = (env: Record<string, string | undefined> = process.env): Config => {
  return ConfigSchema.parse(env);
};
```

## Config: Inject via Options Objects (Factor III)

Never import `process.env` deep in the call tree:

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

## Config: `.env.example` as Documentation (Factor III)

When environment variables are the application's configuration interface, commit `.env.example` (never `.env` with real values):

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

## Dependencies: Check Required System Tools at Startup (Factor II)

```typescript
import which from 'which';

export const checkSystemDependencies = (required: readonly string[]) => {
  const missing = required.filter((cmd) => !which.sync(cmd, { nothrow: true }));
  if (missing.length > 0) {
    throw new Error(`Missing required system dependencies: ${missing.join(', ')}`);
  }
};
```

## Backing Services: URL-Based Attached Resource Example (Factor IV)

```typescript
export const createApp = ({ config }: { config: Pick<Config, 'DATABASE_URL' | 'REDIS_URL'> }) => {
  const db = createDbPool({ connectionString: config.DATABASE_URL });
  const cache = createRedisClient({ url: config.REDIS_URL });

  return {
    db,
    cache,
    async shutdown() {
      await Promise.all([db.end(), cache.quit()]);
    },
  } as const;
};
```

## Stateless Processes: Session Store in a Backing Service (Factor VI)

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

## Concurrency: Separate Entry Points per Process Type (Factor VIII)

```typescript
// web.ts — handles HTTP requests
const config = createConfig();
const app = createApp({ config });
await startServer({ app, config });

// worker.ts — processes background jobs from a queue backed by Redis
const config = createConfig();
const queue = createQueueConsumer({ url: config.REDIS_URL });
await queue.process('email', sendEmail);
await queue.process('report', generateReport);
```

## Disposability: Health Check Endpoints (Factor IX)

```typescript
export const createHealthRoutes = ({ db }: { db: DbPool }) => ({
  '/health': async () => ({ status: 'ok' }),
  '/ready': async () => {
    await db.query('SELECT 1');
    return { status: 'ready' };
  },
});
```

## Disposability: Graceful Shutdown (Factor IX)

```typescript
const SHUTDOWN_TIMEOUT_MS = 30_000;

export const startServer = async ({ app, config }: { app: App; config: Pick<Config, 'PORT'> }) => {
  const server = app.listen(config.PORT);
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (signal: 'SIGTERM' | 'SIGINT'): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      const forceExit = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);

      try {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await app.shutdown(); // one coordinator: backing services and telemetry
        clearTimeout(forceExit);
        process.exitCode = 0;
      } catch (err: unknown) {
        const diagnostic = JSON.stringify({
          level: 'error',
          message: 'Shutdown failed',
          signal,
          error_type: err instanceof Error ? err.name : 'UnknownError',
        });
        await new Promise<void>((resolve) => {
          process.stderr.write(`${diagnostic}\n`, () => resolve());
        });
        clearTimeout(forceExit);
        process.exitCode = 1;
      }
    })();
    return shutdownPromise;
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return server;
};
```

## Logs: Structured Process-Stream Logger (Factor XI)

Illustrative — adapt to project conventions (pino, winston with console transport, OpenTelemetry) as long as the semantic requirements in `../SKILL.md` are met:

```typescript
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogFields = Readonly<Partial<{
  trace_id: string;
  operation: string;
  outcome: string;
  duration_ms: number;
}>>;

export const createLogger = ({ config }: { config: Pick<Config, 'LOG_LEVEL'> }) => {
  const shouldLog = (level: keyof typeof LOG_LEVELS) =>
    LOG_LEVELS[level] >= LOG_LEVELS[config.LOG_LEVEL];

  const log = (level: keyof typeof LOG_LEVELS, message: string, fields: LogFields = {}) => {
    if (!shouldLog(level)) return;
    const output = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...fields });
    (level === 'error' ? console.error : console.log)(output);
  };

  return {
    debug: (message: string, fields?: LogFields) => log('debug', message, fields),
    info: (message: string, fields?: LogFields) => log('info', message, fields),
    warn: (message: string, fields?: LogFields) => log('warn', message, fields),
    error: (message: string, fields?: LogFields) => log('error', message, fields),
  };
};
```

Extend `LogFields` through an explicit reviewed allowlist. Do not accept arbitrary objects, raw error messages/stacks, request bodies, headers, tokens, or personal data; redact at source and keep detailed diagnostics behind separately controlled tooling.

## Admin Processes: One-Off Scripts with Same Config (Factor XII)

```typescript
const config = createConfig();
const db = createDbPool({ connectionString: config.DATABASE_URL });
try {
  await runMigrations(db);
} finally {
  await db.end();
}
```
