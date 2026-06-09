# MSW (Mock Service Worker) Integration

Mock APIs at the network level. MSW has two setups — pick the one that matches your test environment:

| Environment | API | Import |
|---|---|---|
| Vitest Browser Mode (real browser) | `setupWorker` | `msw/browser` |
| Node / jsdom / happy-dom | `setupServer` | `msw/node` |

**Mixing these up is a common failure mode.** `setupServer` patches Node's request modules and does nothing inside a real browser; Browser Mode tests need the Service Worker-based `setupWorker`.

## Why MSW

**Network-level interception:**
- Intercepts requests at network layer (not fetch/axios mocks)
- Same handlers work in tests, Storybook, development
- No client-specific mocking logic
- Tests real request logic (serialization, headers, status handling)

```typescript
// ❌ WRONG - Mocking fetch implementation
vi.spyOn(global, 'fetch').mockResolvedValue({
  json: async () => ({ users: [...] }),
}); // Tight coupling, won't work in Storybook
```

```typescript
// ✅ CORRECT - MSW intercepts at network level
http.get('/api/users', () => {
  return HttpResponse.json({ users: [...] });
});
```

## Shared Handlers

Both setups consume the same handlers:

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json({
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    });
  }),
];
```

## Browser Mode: setupWorker

**One-time prerequisite** — generate the Service Worker script into your served public directory:

```bash
npx msw init public/
```

**In a setup file** (Browser Mode `setupFiles` run inside the browser):

```typescript
// vitest.browser.setup.ts
import { setupWorker } from 'msw/browser';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { handlers } from './mocks/handlers';

export const worker = setupWorker(...handlers);

beforeAll(() => worker.start({ onUnhandledRequest: 'error' }));
afterEach(() => worker.resetHandlers());
afterAll(() => worker.stop());
```

- `worker.start()` is async — returning the promise from `beforeAll` makes Vitest wait for it
- `onUnhandledRequest: 'error'` fails fast on requests with no handler (use `'bypass'` if tests legitimately hit real endpoints, e.g. Vite module requests are bypassed automatically)

**Per-test overrides** with `worker.use()`:

```typescript
import { worker } from '../vitest.browser.setup';
import { http, HttpResponse } from 'msw';

it('should handle API error', async () => {
  worker.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
  );

  // ...render and assert error UI
});
```

The `afterEach` `resetHandlers()` removes the override so other tests see the defaults.

## Node / jsdom: setupServer

**In a setup file:**

```typescript
// test-setup.ts
import { setupServer } from 'msw/node';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Per-test overrides** with `server.use()`:

```typescript
import { server } from '../test-setup';
import { http, HttpResponse } from 'msw';

it('should handle API error', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
  );

  // ...render and assert error UI
  await screen.findByText(/failed to load users/i);
});
```

**After each test, `resetHandlers()` restores the default handlers.**
