# Hono Reference Implementation

One concrete binding of the registrar model, using `OpenAPIHono` (`@hono/zod-openapi`). The model itself is framework-neutral; the closing section maps the same responsibilities onto Fastify, Express, and plain Fetch routers.

## Composition Prepares the Registrar

```typescript
// composition/create-endpoints.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

export const createEndpointRegistrar = (deps: {
  readonly sessions: SessionResolver;        // cookie → AuthenticatedPrincipal | 'no-session'
  readonly browserPolicy: BrowserPolicy;     // origin allowlist, fetch-metadata, csrf, content types
  readonly abuse: AbusePolicy;               // rate limits, payload caps — keyed by contract
  readonly errors: ProblemDetailsTranslator;
  readonly telemetry: EntryTelemetry;
}) => {
  const app = new OpenAPIHono({ defaultHook: deps.errors.onValidationFailure });
  const catalog: EntryCatalogEntry[] = [];

  app.openAPIRegistry.registerComponent('securitySchemes', 'session', {
    type: 'apiKey', in: 'cookie', name: '__Host-session',
  });
  app.openAPIRegistry.registerComponent('securitySchemes', 'csrfToken', {
    type: 'apiKey', in: 'header', name: 'X-CSRF-Token',
  });

  const register = <C extends HttpEndpointContract>(contract: C, handler: HandlerFor<C>) => {
    const route = createRoute({
      method: contract.method,
      path: contract.path,
      summary: contract.summary,
      request: withoutBody(contract.request),             // params/query validate up front; a declared body NEVER pre-validates — it arrives as the handler's thunk
      responses: contract.responses,
      security: securityFor(contract.access),             // public: [] · read: [{session:[]}] · mutation: [{session:[],csrfToken:[]}] — one object = AND
      middleware: middlewareFor(contract, deps),          // derived, never caller-supplied
    });
    app.openapi(route, toHonoHandler(contract, handler));
    if (contract.request?.body) {
      // Document the body without installing its validator: the OpenAPI registry
      // carries the schema; the handler's body() thunk parses after authorization.
      app.openAPIRegistry.registerPath(withRequestBody(route, contract.request.body));
    }
    catalog.push(toCatalogEntry(contract));               // after a successful mount — no phantom entries
  };

  // Expose only what composition and the gates need: a request handler to serve,
  // read-only route/document enumeration, and the derived catalog. Never return the
  // raw OpenAPIHono — a raw `app.get()` mount is exactly the bypass gate 5 exists
  // to catch, so don't hand out the means.
  return {
    register,                                   // throws after finalize() — registration is sealed
    finalize,                                   // seals and RETURNS the serveable { fetch } host
    routes: () => app.routes,                   // gate 5 input
    document: () => app.getOpenAPI31Document(docConfig),   // gates 4/8 input
    catalog: () => [...catalog],
  };
};
```

`toHonoHandler` is the adapter that makes leaves framework-neutral: it reads `c.var.principal`, `c.req.valid('param')`/`valid('query')`, and — when the contract declares a body — builds `body: () => parseWith(contract.request.body, c.req)` (size-limited, strict media type), then calls the `HandlerFor` shape.

`finalize()` is mandatory, idempotent, and *structurally* sealing: it is the only thing that returns a serveable host (`{ fetch: app.fetch }`), so composition cannot mount an unfinalized registrar — there is nothing to mount — and `register` throws once sealed. It mounts, for every catalog path, an `app.all` fallback answering 405 with an accurate `Allow` header — covering `OPTIONS` too, which in this same-origin profile serves no preflight and grants nothing — and records each fallback as a `kind: 'method-denial'` catalog entry carrying that `allow` list (no fabricated access class — a path can host a public GET and a protected POST, so denial is the entry's behavior). The fallback *is* in `app.routes`, keeping runtime reconciliation bidirectional. Hono synthesizes `HEAD` inside dispatch, so it never appears in `app.routes`: `finalize()` appends a `derived-head` entry per GET (inheriting that GET's classification), and gate 5's normalization counts the GET route as covering it.

`middlewareFor` is the exhaustive interpretation of the classification — the deep module's hidden interior:

```typescript
const middlewareFor = (contract: HttpEndpointContract, deps: Deps) => {
  const base = [deps.telemetry.entry(contract), deps.abuse.limitsFor(contract)] as const;
  switch (contract.access.kind) {                         // contract, not just access.kind:
    case 'public':                                        // abuse limits and payload caps are per-endpoint
      return base;
    case 'protected-read':
      return [...base, requireSession(deps.sessions)] as const;
    case 'protected-browser-mutation':
      return [
        ...base,
        rejectCrossSite(deps.browserPolicy),    // Origin + Fetch Metadata + content type, before session
        requireSession(deps.sessions),
        requireCsrf(deps.browserPolicy),        // session-bound, after session resolution
      ] as const;
    default:
      return assertNever(contract.access);      // 'protected-upgrade' is not an HTTP mount; a new kind fails here
  }
};
```

`requireSession` sets `c.set('principal', principal)` or short-circuits with the stable 401 (`WWW-Authenticate: Session`, problem-details body). Handlers read `c.var.principal` — typed non-optional only for protected contracts via `HandlerFor<C>`.

## Endpoint Leaves

```typescript
// endpoints/health/get.ts
export const healthContract = {
  method: 'get', path: '/health',
  access: { kind: 'public', justification: 'k8s liveness probe; verdict-only body' },
  summary: 'Liveness', responses: okJson(HealthSchema),
} satisfies HttpEndpointContract;

// endpoints/api/orders/by-order-id/cancel/post.ts
export const cancelOrderContract = {
  method: 'post', path: '/api/orders/{orderId}/cancel',
  access: { kind: 'protected-browser-mutation' },
  summary: 'Cancel an order',
  request: { params: OrderIdParams, body: CancelOrderCommandSchema },
  responses: cancelOrderResponses,
} satisfies HttpEndpointContract;

export const registerCancelOrder = (endpoints: EndpointRegistrar, orders: ForCancellingOrders) =>
  endpoints.register(cancelOrderContract, async ({ principal, params, body }) => {
    const result = await orders.cancelOrder({
      principal,
      orderId: params.orderId,
      command: body,                 // deferred thunk — the operation authorizes, then awaits it
    });
    return respondWith(result);      // composition-owned: not-found → 404, not-order-owner → 403, ok → 200
  });
```

## Hono-Specific Cautions

- **Every sub-app in the tree must be `OpenAPIHono`.** A plain `Hono` instance silently drops the OpenAPI (and thus security-metadata) declarations mounted beneath it — gate 4 will catch it, but know why.
- **Declared body schemas validate before the handler runs — so the registrar never declares them.** `createRoute`'s `request.body` installs a pre-handler validator, which would parse the body before the operation authorizes. The registrar therefore strips the body from the runtime route (`withoutBody`), registers the schema for documentation via `openAPIRegistry.registerPath`, and delivers the body as the handler's post-authorization `body()` thunk (size-limited, strict media type). Seed the ordering test: a spy on the schema proves parsing happens after the operation's authorization step.
- **Gate 5 reads `app.routes`, not the OpenAPI document.** A raw `app.get('/admin', ...)` never reaches the generated spec, so OpenAPI-paths reconciliation would miss exactly the bypass the gate exists for. Reconcile the runtime route collection (normalized method + translated path) against the catalog, and seed the violation test with a direct mount to prove the gate fails.
- Per-route `middleware` in `createRoute` needs `as const` for context typing; the registrar supplies it — endpoint owners never touch the field.
- `app.use(path, mw)` with an OpenAPI path needs `route.getRoutingPath()` (`{param}` → `:param`); avoid the trap by keeping all middleware inside `middlewareFor`.
- Middleware ordering is registration order. The registrar owns ordering; do not add global `app.use` calls after routes are mounted.
- `upgradeWebSocket` runs as a route handler, so route middleware executes — but header-mutating middleware on WS routes can throw on immutable headers. Prefer the sibling upgrade registrar below even on Hono, for uniformity with runtimes where upgrades bypass routing.

## The Sibling Upgrade Registrar (Node)

```typescript
// composition/create-upgrades.ts — raw 'upgrade' events bypass HTTP middleware entirely
export const createUpgradeRegistrar = (deps: Deps & { readonly server: HttpServer }) => {
  const wss = new WebSocketServer({ noServer: true });
  const entries: Array<readonly [UpgradeContract, UpgradeSpec]> = [];

  // ONE dispatcher for the whole surface; only this module touches 'upgrade'.
  deps.server.on('upgrade', async (req, socket, head) => {
    try {
      if (!deps.browserPolicy.isExactAllowedOrigin(req.headers.origin)) {
        return refuse(socket, 403);                               // 1. exact Origin FIRST — before any
      }                                                           //    path matching, so a hostile origin
      const match = findContract(entries, req.url);               //    learns nothing about which paths exist
      if (!match) return refuse(socket, 404);                     // terminal deny-all: no dangling sockets
      const [contract, spec] = match.entry;
      const session = await deps.sessions.resolve(req.headers.cookie);
      if (session.kind !== 'authenticated') return refuse(socket, 401);   // 2. session
      const params = parseParams(contract.request, match.rawParams);      // trust boundary: parse, don't assert
      if (!params.success) return refuse(socket, 404);
      const authorized = await spec.authorize({ principal: session.principal, params: params.data });
      if (authorized.outcome !== 'ok') {
        return refuse(socket, authorized.outcome === 'not-found' ? 404 : 403);  // 3. in-application
      }
      wss.handleUpgrade(req, socket, head, (ws) =>                // 4. only now accept
        // Promise.resolve().then(...) — not Promise.resolve(fn()) — so a SYNCHRONOUS
        // throw from onConnection lands in this catch too, never in the outer one:
        // by this point the 101 is sent and an HTTP refusal would be protocol nonsense.
        Promise.resolve()
          .then(() => spec.onConnection(ws, { principal: session.principal, params: params.data }))
          .catch((error) => {
            deps.telemetry.connectionFailure(error);
            ws.close(1011);                                       // internal error, WebSocket semantics
          }));
    } catch (error) {
      // Pre-handshake failure only: async listeners are not covered by Node's
      // default error handling — an unhandled rejection here would leave the
      // socket dangling. Fail closed with an HTTP refusal.
      deps.telemetry.upgradeFailure(error);
      refuse(socket, 500);
    }
  });

  const register = (contract: UpgradeContract, spec: UpgradeSpec) => {
    entries.push([contract, spec] as const);
  };

  return { register, catalog: () => entries.map(([contract]) => toCatalogEntry(contract)) };
};
```

`refuse` writes a minimal HTTP status response and destroys the socket — a refused handshake, identical per failure class, never an accepted-then-closed connection. Production composition merges `endpoints.catalog()` and `upgrades.catalog()` into the one derived catalog the gates consume; a restricted-import rule makes this module the only legal caller of `server.on('upgrade', ...)`, which is what gate 6 checks.

## Mapping to Other Frameworks

| Responsibility | Hono | Fastify | Express / Fetch router |
|----------------|------|---------|------------------------|
| Contract carrier | `createRoute` (+ `security`) | route `config` object | contract object passed to your registrar |
| Chain installation | `middleware` from `middlewareFor` | plugin `onRequest`/`preValidation` hooks derived from `config` | wrapper composing handler with chain |
| Boot-time fail-closed | registrar is the only mount path | `onRoute` hook throws on missing `config.access` | registrar is the only mount path |
| Route enumeration for gates | runtime `app.routes` (normalized) | `printRoutes` / `onRoute` capture | router-stack walk (`express-list-endpoints`) |
| Upgrade protection | route handler runs middleware (see caution) | `@fastify/websocket` pre-handshake hooks (register the plugin before routes) | sibling upgrade registrar on the raw server |

The invariants — exhaustive classification, composition-prepared chain, derived catalog, sibling upgrade protection — are the model. Everything else in this file is replaceable binding detail.
