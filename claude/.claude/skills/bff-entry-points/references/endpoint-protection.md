# Endpoint Protection

The endpoint contract, the session cookie profile, browser-request policy, and the derived entry catalog. All examples are TypeScript and framework-neutral; `references/hono-example.md` shows one concrete binding.

## The Endpoint Contract

A feature-local contract is the single artifact that declares everything reviewable about an entry point:

```typescript
type HttpEndpointContract = {
  readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete';  // lowercase, matching OpenAPI operations
  readonly path: string;                       // OpenAPI syntax: '/api/orders/{orderId}' — canonical form everywhere
  readonly access: HttpEndpointAccess;         // the canonical union minus 'protected-upgrade'
  readonly summary: string;                    // OpenAPI operation summary
  readonly request?: RequestSchemas;           // params/query/body schemas (Zod or Standard Schema)
  readonly responses: ResponseSchemas;
};

type HttpEndpointAccess = Exclude<EndpointAccess, { kind: 'protected-upgrade' }>;
// 'protected-upgrade' is a valid catalog access kind but never a valid HTTP mount —
// the upgrade registrar owns it (realtime reference), so the HTTP registrar's switch
// stays exhaustive over HttpEndpointAccess with an assertNever default.

// The type-level fail-closed property: the handler signature is computed from the
// declaration along two orthogonal axes — the access kind grants (or withholds) the
// principal, and the presence of a body schema grants the deferred body thunk.
type HandlerFor<C extends HttpEndpointContract> =
  (request: ValidatedRequest<C>            // params/query, validated up front
    & (C['access']['kind'] extends 'public'
        ? unknown
        : { readonly principal: AuthenticatedPrincipal })
    & (C['request'] extends { readonly body: BodySchema }
        ? { readonly body: () => Promise<BodyOf<C>> }   // deferred: parse on first await
        : unknown)
  ) => Promise<ResponseFor<C>>;
```

The thunk exists exactly when the contract declares a body, for public and protected endpoints alike, and the registrar never installs pre-handler body validation — one uniform rule. A public handler simply awaits `body()` at entry; a protected mutation's operation authorizes on `{ principal, params }` first and awaits the thunk after. Every protected mutation's direct refusal test passes a spy thunk and asserts it was never invoked — that enrolls each operation in the ordering invariant instead of trusting one registrar test.

For mutations, put the target's identity in the path and hand the operation a deferred body thunk — the operation authorizes on `{ principal, params }`, then awaits `body()` to parse the command with the trust-boundary schema. That satisfies the ordering (authorize, *then* parse) without moving schemas inward. In OpenAPI-integrated routers, this means the registrar must not install body validation as pre-handler middleware for mutations: register the body schema for documentation separately and parse it inside the thunk (the Hono reference shows the mechanism). Enforce body-size limits ahead of any parsing, and seed a test that proves the parser runs only after the operation's authorization step — pre-authorization body parsing is an ordering violation, not a preference.

In context-style frameworks (Hono's `(c) =>`) the same properties are delivered through typed context via a thin adapter the registrar owns: `c.var.principal` exists on the context type only for protected contracts. Either way, the load-bearing guarantee is that `AuthenticatedPrincipal` is a branded type whose constructor is exported only by session resolution — an endpoint cannot fabricate one (see the hexagonal reference for the brand), and an import-boundary gate keeps test factories out of production code.

Rules:

- The contract lives at the endpoint leaf — `endpoints/<url>/<method>.ts`, with path parameters as `by-<param>` directories, e.g. `endpoints/api/orders/by-order-id/cancel/post.ts` (`structure-codebase` owns the layout) — beside its handler and tests.
- Contract paths use OpenAPI `{param}` syntax; registrars translate to framework syntax and the catalog stores the contract form, so gate reconciliation compares one canonical spelling.
- `justification` on `public` is mandatory prose — it is what the allowlist review reads.
- Extending the model (service credentials, signed webhooks, admin) means adding a union member **and** a verification chain in the registrar for that member. Never express a new mode as options on an existing one.
- Schemas are real trust-boundary schemas (`typescript-strict`): parse, don't assert.

## Registrar Behavior by Classification

The registrar interprets the contract; the mapping is exhaustive — a `switch` on `access.kind` with no default fallthrough, so a new union member fails compilation until its chain exists.

**`public`** — mount the handler with validation, abuse controls, and telemetry. Emit OpenAPI with `security: []`: the *explicit empty requirement* is the greppable "intentionally unauthenticated" marker (OpenAPI 3.1 semantics). Never emit a public operation by omitting `security`. Public endpoints are tested too: the unauthenticated call succeeds, the body stays within its declared verdict-only bounds, and whatever abuse control the justification claims is actually present. Scope abuse controls sensibly — rate-limiting a Kubernetes liveness probe into a 429 causes an outage; probe paths get generous or infrastructure-scoped limits, recorded in the contract's `justification`.

**`protected-read`** — install, in order: session resolution → stable 401 → hand the handler an `AuthenticatedPrincipal`. Emit the session security scheme (`type: apiKey, in: cookie`) on the operation.

Methods outside the declared set are denied by construction: after all registrations, the registrar's mandatory `finalize()` seals registration and mounts a per-path fallback answering 405 with an accurate `Allow` header — including for `OPTIONS`, which in this same-origin profile serves no CORS preflight and grants nothing. `HEAD` follows the framework's GET synthesis and inherits GET's chain and classification. These synthesized behaviors enter the catalog as `derived-head` and `method-denial` entries so nothing escapes the model, with reconciliation rules per kind (below); the enforcement suite exercises them (OWASP ASVS 5.0 requires an explicit supported-method surface).

**`protected-browser-mutation`** — install, in order: browser-request policy (Origin, Fetch Metadata, content type) → session resolution → session-bound CSRF validation → hand over the principal. The operation the handler calls performs in-application authorization before acting on the body. Emit *both* requirements in one OpenAPI Security Requirement object — `security: [{ session: [], csrfToken: [] }]`, where `csrfToken` is `type: apiKey, in: header, name: X-CSRF-Token` — the single-object form means AND; separate array entries would mean OR (OpenAPI 3.1 semantics). Gate 4 checks mutations for exactly this shape.

**`protected-upgrade`** — never mounted here; the sibling upgrade registrar interprets it (`references/realtime-entry-points.md`). It appears in this list because the catalog spans both registrars.

Endpoints translate operation results through one composition-owned helper (`respondWith`): the shared outcome grammar — `not-found` → 404, disclosed refusal → 403, success → 2xx — is mapped once, not hand-written per endpoint, so no single endpoint can quietly turn a no-oracle `not-found` into an existence-confirming 403.

The handler type is derived from `access.kind`. This is the type-level fail-closed property:

```typescript
// public handler — no principal parameter exists
endpoints.register(healthContract, async () => ok({ status: 'pass' }));

// protected handler — principal is provided, and cannot be constructed by the endpoint
endpoints.register(cancelOrderContract, async ({ principal, params }) =>
  toHttpResponse(await orders.cancelOrder({ principal, orderId: params.orderId })),
);
```

Only session resolution (production) and a test factory (tests) construct `AuthenticatedPrincipal`. Do not export a constructor from composition.

## Session Cookie Profile

The BFF is a confidential OAuth client; tokens stay server-side and the browser holds one session cookie (draft-ietf-oauth-browser-based-apps §6.1; RFC 9700). The cookie profile, per OWASP Session Management Cheat Sheet and ASVS 5.0 §3.3:

```
Set-Cookie: __Host-session=<opaque id>; Secure; HttpOnly; SameSite=Strict; Path=/
```

- **Opaque, high-entropy ID** (≥128 bits, CSPRNG; ASVS 7.2.3). Server-side session record holds the tokens and user linkage; the cookie value means nothing.
- **`__Host-` prefix** — locks the cookie to this exact host over HTTPS with `Path=/` and no `Domain`. It is the interoperable baseline; the IETF direction adds `__Http-`/`__Host-Http-` (cookie provably set by the server, not script) — adopt the stronger prefix where verified in your target browsers, and keep the explicit attributes mandatory either way.
- **`SameSite=Strict`** is defense-in-depth, not the CSRF defense: it is registrable-domain-scoped, so a hostile or compromised sibling subdomain is still same-site (OWASP CSRF Cheat Sheet).
- **Rotate the session ID on every privilege change** — login above all (fixation defense); destroy the old ID.
- **Server-side idle and absolute timeouts** (ASVS 7.3.x); invalidate server-side on logout — deleting the cookie is not logout. If the IdP supports OIDC Back-Channel Logout, the BFF's server-side session store is exactly where the logout token acts.
- Session-bearing responses carry `Cache-Control: no-store`.

## Browser-Request Policy (Mutations)

Applied by the registrar before session resolution, so policy failures reveal nothing about session state.

The layers collapse into an exhaustive decision the middleware actually contains — every supplied signal is checked independently, expected values are exact, known non-matching or contradictory values reject, and only *unrecognized* Fetch Metadata values are ignored (treated as absent, per OWASP's forward-compatibility guidance):

1. **Origin is mandatory.** Require an exact allowlist match: full serialized origin (`scheme://host[:port]`), string equality, no suffix/prefix/regex matching (PortSwigger documents bypasses for each). Never allowlist `null` (sandboxed iframes, `data:` URLs, and cross-origin redirects all produce it). Absent → reject: a modern browser sends `Origin` on every state-changing request, and OWASP makes origin verification the mandatory fallback when Fetch Metadata is absent — with both missing there is nothing to verify. Non-browser automation does not belong on a `protected-browser-mutation` endpoint; give it a service-credential classification with its own chain.
2. **Fetch Metadata, when present, must be `same-origin`.** This profile serves a same-origin SPA — the allowlist normally contains exactly the BFF's own origin, so the only acceptable `Sec-Fetch-Site` on a mutation is `same-origin`. Known non-matching values reject: `cross-site` is an attack, `same-site` is a sibling subdomain you did not approve, `none` means the mutation did not come from your page (address bars don't POST). An *unrecognized* value is treated as absent — OWASP's forward-compatibility guidance — which is safe here because the exact-Origin rule already passed and the CSRF token still lies ahead. A contradictory pair — metadata claiming `same-origin` while `Origin` names another host — rejects because each check is independent and exact. (`Sec-` headers are forbidden request headers — browser scripts cannot forge them; Baseline since 2023.) Absent metadata is acceptable only because rule 1 already passed. A genuinely cross-origin frontend is a different animal: it needs deliberately designed credentialed CORS, preflight handling, and Origin policy — and if it is also cross-*site* — a different scheme-plus-registrable-domain, since same-site is schemeful; HTTPS `app.example` and `api.example` are same-site, but HTTP vs HTTPS on one domain is not — cookie delivery additionally forces `SameSite=None`, which this profile's `SameSite=Strict` cookie deliberately rules out. Design that as its own classification extension with its own reviewed chain, never by loosening these rules in place.
3. Content type; then, after session resolution, the CSRF token.

This is what stops a hostile sibling subdomain: it presents `Sec-Fetch-Site: same-site`, which is not the expected value for the primary origin, and its Origin is not on the allowlist — either check alone rejects it.

**Content type.** For contracts with a request body, require the exact expected media type (normally `application/json`) and reject others — or an absent header — with 415. HTML forms can only produce the three CORS-safelisted types, so this single check removes form-based CSRF for body-bearing endpoints; a scripted cross-origin JSON request triggers a preflight the attacker cannot pass. Parse strictly — no sniffing JSON out of `text/plain`. For body-less mutations (`POST .../archive`), an absent `Content-Type` is expected and passes — their CSRF protection rests on the Origin/metadata rules and the token, which is why those layers are unconditional.

**CSRF token.** Session-bound: synchronizer token for stateful sessions (the default for a BFF, which is stateful by definition), or signed (HMAC, session-bound) double-submit — the naive double-submit variant is bypassable via cookie tossing (OWASP CSRF Cheat Sheet). A required custom header is an acceptable equivalent for JSON-only APIs behind a strict CORS policy. Layers are cumulative: Origin + Fetch Metadata + content type + token; do not drop the token because SameSite exists.

**CSRF token lifecycle** — the half implementations forget. The server issues the token at session establishment and returns it in the login and `current-user` response bodies (or an `X-CSRF-Token` response header on those calls); it is not the session cookie and must be readable by script, so it never gets `HttpOnly`. The browser coordinator holds it and attaches it as a request header on every mutation. Rotate it with the session ID on every privilege change (login), invalidating the old token with the old session. An attacker's page can force requests but cannot read responses cross-origin, so it can never obtain a token bound to the victim's session.

Also send on every API response: `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: same-origin`, and accurate `Content-Type` (OWASP HTTP Headers Cheat Sheet).

## Failure Semantics Without Oracles

- 401 means "no valid session" and nothing else. Include a `WWW-Authenticate: Session` challenge (RFC 9110 requires at least one challenge; a custom scheme is legal, and only `Basic` triggers the browser's native dialog). Identical externally visible content — status, headers, body — whether the session is missing, expired, revoked, or the user is disabled, with no deliberate cause-specific fast path; the distinction is telemetry, not response content. (Exact response timing is nondeterministic; assert content identity and code-path parity, and reach for statistical timing analysis only where the threat model warrants it.)
- 403 is reserved for deliberately disclosed refusals: request-policy rejections (bad Origin on a mutation) and product outcomes the caller is entitled to learn.
- 404 is the response for resources the principal cannot know exist — cross-tenant IDs above all. RFC 9110 §15.5.4 sanctions hiding existence; GitHub's API practices it. The 404 must be indistinguishable in body and headers from a true not-found, produced by the same code path so no cause-specific timing shortcut exists.
- Error bodies are RFC 9457 problem details with no stack traces, no internal identifiers, no dependency names (`api-design` owns the shape).

## The Derived Entry Catalog

The registrar records every mount — HTTP routes and raw upgrades — into an in-memory catalog:

```typescript
type EntryCatalogEntry =
  | { readonly kind: 'declared';       // a contract-declared HTTP mount or UPGRADE path
      readonly method: string;          // or 'UPGRADE'
      readonly path: string;            // contract form: OpenAPI {param} syntax
      readonly access: EndpointAccess['kind'];
      readonly documented: boolean }    // true for HTTP operations, false for UPGRADE
  | { readonly kind: 'derived-head';    // framework HEAD synthesis over a declared GET
      readonly path: string;
      readonly access: EndpointAccess['kind'] }   // inherited from that GET
  | { readonly kind: 'method-denial';   // finalize()'s terminal 405 fallback for a path
      readonly path: string;
      readonly allow: readonly string[] };        // no access class — denial is its behavior
```

A denial entry deliberately has no access classification: a path can host a public GET and a protected POST, so a shared fallback could not truthfully inherit either — its declared behavior *is* method-not-allowed, and it gets its own gate row (undeclared method → 405 with the recorded `Allow`) instead of pretending to be an endpoint. Reconciliation rules by kind:

- **Declared HTTP entries** reconcile in all three directions: catalog ↔ runtime route table ↔ OpenAPI document (`documented: true`).
- **`derived-head` and `method-denial` entries** reconcile with the runtime table where the framework materializes them as routes; a framework that synthesizes `HEAD` inside dispatch (Hono) never shows it in the route table, so runtime normalization treats a GET route as covering its `derived-head` entry. Neither participates in OpenAPI reconciliation.
- **`UPGRADE` entries** are declared but `documented: false` — OpenAPI cannot describe a raw socket; the catalog itself is their documentation of record.

Production composition exports the composed app *and* its catalog. The catalog is derived output — tests consume it, humans read it, nobody edits it. Three reconciliations make it trustworthy (see `references/enforcement-and-testing.md` for the gates):

1. Catalog ↔ framework route table: nothing mounted outside the registrar, nothing registered but unmounted.
2. Catalog ↔ OpenAPI document: every operation's `security` matches its declared access; documented-but-unmounted and mounted-but-undocumented both fail.
3. Catalog public subset ↔ reviewed allowlist snapshot.

Dev-only endpoints live in a separate composition (`main.dev.ts` importing production one way — `structure-codebase`); the production catalog test proves their absence (OWASP API9:2023).

## Sources

OWASP: CSRF Prevention, Session Management, HTTP Headers, REST Security cheat sheets; ASVS 5.0 §3.3/§3.5/§7; API Security Top 10 2023 (API2, API5, API9). IETF: RFC 9110 §15.5, RFC 9457, RFC 9700 (BCP 240), draft-ietf-oauth-browser-based-apps §6.1. web.dev Fetch Metadata; MDN Origin/Sec-Fetch-Site; PortSwigger CORS/CSRF research; OpenAPI 3.1 Security Requirement Object semantics.
