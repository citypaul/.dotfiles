# Realtime Entry Points

SSE and WebSocket entry points carry the same protected data as JSON endpoints but are the routes most likely to escape blanket middleware. They get the same classification, the same ordering, and first-class entries in the derived catalog.

## SSE Is an HTTP Entry Point

A Server-Sent Events stream is an ordinary HTTP GET with a streaming response. Register it through the protected HTTP registrar as a `protected-read`; the whole chain — session resolution, 401, in-application authorization — completes **before the stream starts**. Once headers are flushed, there is no protocol-honest way to say 401.

Constraints the browser imposes (WHATWG HTML spec):

- `EventSource` cannot send custom headers; authentication is the session cookie (`withCredentials: true` for cross-origin, though a BFF serves same-origin). Never move tokens into the stream URL.
- A non-200 response fails the connection with a generic `error` event — the page cannot see the status code. A 401, a 500, and a wrong content type are indistinguishable to script. This opacity is why the browser coordinator probes `current-user` on stream failure instead of guessing (see `references/browser-session-coordination.md`).
- Redirects are followed transparently — an SSE endpoint that redirects to a login page fails opaquely on `Content-Type`. Protocol failures only.
- Respond 204 to tell a reconnecting `EventSource` to stop (spec-defined), e.g. after a deliberate stream retirement.

A `protected-read` SSE endpoint needs no Origin/CSRF layer, and that asymmetry with WebSockets (below) is principled: an SSE response is an ordinary HTTP response — same-origin policy protects its content, `SameSite` withholds the cookie from cross-site readers, and a read causes no effects. A WebSocket is bidirectional after a handshake that CORS and SOP ignore, so it gets a mandatory Origin check. An "SSE" endpoint that causes effects when opened is misclassified — effects belong in mutations.

The endpoint sketch — same registrar, streaming response:

```typescript
// endpoints/api/orders/by-order-id/events/get.ts
export const orderEventsContract = {
  method: 'get', path: '/api/orders/{orderId}/events',
  access: { kind: 'protected-read' },
  summary: 'Live order events (SSE)',
  request: { params: OrderIdParams },
  responses: sseResponses(OrderEventSchema),   // content: text/event-stream; 401/404 as problem details
} satisfies EndpointContract;

endpoints.register(orderEventsContract, async ({ principal, params, stream }) => {
  const subscription = await orders.observeOrder({ principal, orderId: params.orderId });
  if (subscription.outcome !== 'ok') return toHttpResponse(subscription);   // 404/403 before any bytes
  return stream.sse(subscription.events);      // framework streaming helper; headers flush here
});
```

Server-side rules:

- Authorize the *subscription* in the application ("may this principal observe this order's events?") before allocating connection resources — the same operation a future CLI subscriber would call.
- Keep connection-local writer/cursor state with the endpoint; shared fan-out lives in a workflow (`structure-codebase`).

## Raw WebSocket Upgrades Need a Sibling Registrar

A raw upgrade may bypass the HTTP framework entirely: in Node, the server emits `upgrade` and Express-style middleware never runs — "your auth middleware does not apply" is the single most common WebSocket vulnerability. Fastify runs `onRequest`/`preValidation` hooks before the handshake; Hono treats `upgradeWebSocket` as a route handler; a raw `ws` server runs nothing. Whatever the framework, the protection must not depend on ordinary middleware executing.

Provide a sibling **protected-upgrade registrar**, prepared by the same composition with the same session resolution and policy, interpreting an upgrade contract:

```typescript
type UpgradeContract = {
  readonly path: string;                      // OpenAPI syntax, same as HTTP contracts: '/api/orders/{orderId}/live'
  readonly access: { readonly kind: 'protected-upgrade' };   // the fourth kind of the canonical union
  readonly summary: string;
  readonly request?: { readonly params: ParamSchemas };      // parse, don't assert — same trust-boundary rule
};

upgrades.register(liveOrderContract, {
  authorize: ({ principal, params }) =>
    orders.authorizeLiveView({ principal, orderId: params.orderId }),  // in-application
  onConnection: (socket, ctx) => { ... },
});
```

The registrar enforces, in order, before accepting the upgrade or allocating any protected resource:

1. **Validate the exact allowed Origin.** The handshake is immune to CORS and SOP — Cross-Site WebSocket Hijacking is CSRF on the handshake (RFC 6455 §10.2 makes Origin checking the server's job). Exact string match against the allowlist; `null` and absent are rejected for browser-facing upgrades.
2. **Resolve the application session** from the cookie presented with the handshake.
3. **Authorize the requested product/session access inside the application** — the same provider-free operation any adapter would call.
4. Only then `accept`/`handleUpgrade` and allocate connection state.

Failures are protocol failures: refuse the handshake with 401/403/404 semantics matching the HTTP surface (RFC 6455 §4.2.2) — a minimal status response written to the socket before destroying it, identical per failure class (a browser page cannot read it, but non-browser callers and the hostile test matrix can). Never complete the handshake first and "check later" — a connected socket has already leaked existence and holds resources.

The upgrade registrar attaches **one** dispatcher listener for the whole surface, and the dispatcher is terminal deny-all: an upgrade request matching no registered contract is refused and the socket destroyed, never left dangling for another listener. The Origin check runs *before* path matching — otherwise a hostile origin reads 404-vs-403 as an endpoint-existence oracle. The whole dispatcher fails closed, with the failure mode matching the protocol phase: a pre-handshake error refuses and destroys the raw socket with an HTTP status, while a failure after the upgrade is accepted (including a rejected `onConnection`) closes the established WebSocket with close code 1011 — an accepted socket can no longer be "refused". Async listener rejections are otherwise unhandled in Node, and the dependency-failure hostile case seeds both phases — including both a synchronously throwing and a promise-rejecting `onConnection`, which must each produce the 1011 close and never an HTTP refusal. Pair this with an import-boundary rule that only the upgrade registrar may call `server.on('upgrade', ...)` — that rule is what makes gate 6 mechanically checkable.

Authentication material: the session cookie presented at handshake is the right credential for a same-origin BFF. Do not put bearer tokens in the URL query (logged everywhere; RFC 6750 §2.3). If a cookie is impossible (cross-origin realtime host), use single-use short-TTL tickets issued by a protected HTTP endpoint — the ticket request is itself a protected-read that returns a real 401, which conveniently gives the browser its authentication signal before connecting.

**Catalog inclusion:** the upgrade registrar records `{ method: 'UPGRADE', path, access }` entries in the same derived catalog. The enforcement gate asserts every live upgrade listener corresponds to a catalog entry — a WebSocket path must not escape protection merely because ordinary middleware does not execute for it. OpenAPI cannot describe the socket, but the catalog still can; document the entry point's existence and access mode alongside the HTTP surface.

## Mid-Session Authentication Loss

The handshake authenticates once; sessions do not last forever.

- On logout, account disable, or session revocation, close affected sockets and end affected streams server-side. Keep a connection registry — sockets *and* SSE writers, keyed by session ID — as a composition-owned resource; session invalidation announces itself (a driven port or event on the session store) and composition closes what the registry finds. In multi-instance deployments the announcement must travel (pub/sub on the session store, or each instance re-validating its connections' sessions on a short heartbeat) — a logout on node A must reach the socket on node B.
- Idle/absolute session expiry is revocation as far as live connections are concerned: either enforce a maximum connection lifetime no longer than the session's remaining lifetime, or re-validate the session on the heartbeat cadence and close on expiry. The hostile matrix's "expired session → 401" covers the next request; this rule covers the connection that never makes one.
- End a revoked SSE stream by simply ending the response — not with 204, which tells `EventSource` to stop reconnecting and would rob the client of the 401-on-reconnect that drives its signed-out transition. The reconnect re-enters the registrar chain and gets the stable 401.
- Close with an application-defined close code in the 4000–4999 range (e.g. `4001` = authentication no longer valid). Post-handshake application close codes *are* visible to the page — unlike handshake failures, which all collapse to the opaque 1006 (WHATWG deliberately hides handshake status to prevent network probing). The browser treats `4001` as a strong hint, not proof: it still confirms with the deduplicated current-user probe before entering the signed-out state (see `references/browser-session-coordination.md`).
- The browser cannot distinguish a rejected handshake from a network failure; on `close`/`error` it runs one deduplicated `current-user` probe and only enters the signed-out state on a confirmed 401 (see `references/browser-session-coordination.md`). A valid session leaves the failure to transport retry.
- Re-authentication after reconnect is automatic: the reconnect re-enters the registrar chain. Do not build an in-band "re-auth message" protocol on a socket whose session died — close and reconnect.

## Completion Check

- Is every SSE stream registered as a protected read whose chain completes before the first byte of the stream?
- Does every raw upgrade path go through the protected-upgrade registrar — Origin, session, in-application authorization, then accept?
- Do upgrade entries appear in the derived catalog, and does a gate fail when a live listener lacks one?
- Does session revocation reach open sockets and streams?
- Do realtime failures surface to the browser as one deduplicated probe, not an immediate sign-out or an infinite silent retry?

## Sources

WHATWG HTML (server-sent events processing model: non-200 → fail, no status exposure; 204 stops reconnection); WHATWG WebSocket spec (handshake failures deliberately indistinguishable, close code 1006); RFC 6455 §4.2.2, §10.2 (Origin checking, refusing handshakes); RFC 6750 §2.3 (no tokens in URLs); PortSwigger Cross-Site WebSocket Hijacking; Heroku WebSocket security (ticket pattern); @fastify/websocket (pre-handshake hooks; registration-order requirement); Hono WebSocket helper; websocket.org / Node `upgrade`-event analyses (middleware bypass).
