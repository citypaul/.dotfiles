---
name: bff-entry-points
description: "Design and protect browser-facing BFF and backend HTTP entry points: an explicit public/protected access classification for every production route, a composition-prepared endpoint registrar that installs session, Origin, Fetch Metadata, CSRF, and content-type policy by construction, provider-free authorization inside the application, protected SSE and WebSocket registration, browser session coordination, and automated enforcement gates. Use when adding or reviewing HTTP endpoints, authentication middleware, session cookies, CSRF or Origin policy, realtime streams, login/logout flows, or auditing which routes are public. For whether to adopt a BFF, granularity, aggregation, and upstream identity mediation use bff-design; for physical BFF route layout use structure-codebase; for REST semantics, pagination, and versioning use api-design; for OAuth/OIDC protocol flows use secure-oauth-oidc; for ports-and-adapters implementation use hexagonal-architecture."
---

# BFF Entry Points

A BFF is a driving host: it owns the browser-facing HTTP boundary and invokes application operations on behalf of one user experience. This skill owns the *behavioral security model* of that boundary — who may call each entry point, how that is enforced by construction, and how the application stays safe when a caller is not a browser. It follows the IETF's BCP-track guidance for browser-based apps: tokens stay server-side, the browser holds only a session cookie (draft-ietf-oauth-browser-based-apps §6.1 — BCP-track, in the RFC Editor queue at the time of writing; RFC 9700 / BCP 240 is the published OAuth security baseline).

Load `bff-design` for the pattern-level decisions this skill assumes are settled — whether to have a BFF at all, how many, aggregation and partial-failure design, and mediating user identity toward upstream services. Load `structure-codebase` for the physical `endpoints/` tree, route catalog files, and dev-only routing; this skill defines what each endpoint leaf must declare and how registration enforces it. Load `hexagonal-architecture` for ports and adapters; this skill deepens its rule that authentication is adapter work and authorization is application policy. Load `api-design` for REST conventions, error body shape (RFC 9457), rate limiting, and versioning. Load `secure-oauth-oidc` for the OAuth/OIDC flows behind login; this skill owns the application session that results. Load `codebase-design` when shaping the registrar's contract — it is a deliberately deep module.

Read the relevant reference before implementing:

- Read [`references/endpoint-protection.md`](references/endpoint-protection.md) for the endpoint contract shape, session cookie profile, Origin/Fetch Metadata/CSRF/content-type policy, and the derived entry catalog.
- Read [`references/hexagonal-auth-boundaries.md`](references/hexagonal-auth-boundaries.md) for `AuthenticatedPrincipal`, in-application authorization, actor mapping, and row-level security as containment.
- Read [`references/realtime-entry-points.md`](references/realtime-entry-points.md) for protected SSE streams and the protected WebSocket upgrade registrar.
- Read [`references/browser-session-coordination.md`](references/browser-session-coordination.md) for the single browser-side authentication coordinator.
- Read [`references/enforcement-and-testing.md`](references/enforcement-and-testing.md) for the automated gates, positive controls, and hostile test matrix.
- Read [`references/hono-example.md`](references/hono-example.md) for a concrete Hono registrar; the model is framework-neutral and maps to Fastify, Express, and Fetch-based routers.

## Core Model: Explicit Access Classification

Every production entry point declares its access classification. There is no implicit default — an unclassified route is a build failure, not "protected by whatever middleware happens to run first" (OWASP API5:2023 mandates deny-by-default with explicit grants; CWE-306 names the missing check, not the broken check, as the vulnerability).

Minimum classification for browser-facing HTTP endpoints:

| Classification | Meaning | Registrar installs |
|----------------|---------|--------------------|
| `public` | Intentionally callable without an application session | Validation, abuse controls, explicitly unauthenticated docs |
| `protected-read` | Safe method for an authenticated user | Session resolution → 401 → in-application authorization |
| `protected-browser-mutation` | State change initiated by a browser | Origin/Fetch Metadata/content-type policy → session → CSRF → authorization |

```typescript
// Canonical definition — references restate it only by pointer.
type EndpointAccess =
  | { readonly kind: 'public'; readonly justification: string }
  | { readonly kind: 'protected-read' }
  | { readonly kind: 'protected-browser-mutation' }
  | { readonly kind: 'protected-upgrade' };   // raw WebSocket upgrades — realtime reference
```

A project may extend the discriminated union — service credentials, signed webhooks, administrative operations — but every entry point still makes one explicit, exhaustive declaration, and each added kind defines its own verification chain in the registrar. Non-browser driving adapters (CLIs, job runners, queue consumers) are not exempt: each authenticates by its own mode and constructs its own caller principal (see the hexagonal reference's system-caller section).

**Public is a claim about callers, not about trust.** A public endpoint is still validated, rate-limited, monitored, and free of secrets — it is not network-private and not exempt from abuse controls. Health probes are the canonical example: public, but verdict-only (no dependency names, versions, or stack traces). The public set is an application decision; keep it small, snapshot it in a reviewed allowlist test, and treat any diff as a security review.

## Source of Truth and the Derived Catalog

Endpoint contracts stay feature-local: route, validation schemas, access declaration, handler, and documentation live together at the endpoint leaf, so one review sees the whole story.

Do not build a second, hand-maintained central route-security map. It will drift from runtime registration, and the drift is invisible until an incident. Instead, derive a central entry catalog from the two things that are already true:

1. the feature-local endpoint contracts; and
2. the explicit production composition — which contracts were actually mounted, including raw WebSocket upgrades.

The registrar records every mount; the catalog is its output, never an input. Enforcement tests reconcile the catalog against the framework's route table and the generated OpenAPI document, so central visibility is automated instead of maintained.

## The Prepared Registrar (a Deep Module)

Composition prepares the registrar once, supplying everything an endpoint must never choose for itself: session resolution, browser-request policy, safe error translation (RFC 9457 problem details without internals), and telemetry. An endpoint owner supplies only its contract and a thin handler.

```typescript
// composition/ — the only place that knows the enforcement machinery
const endpoints = createEndpointRegistrar({
  app,            // framework instance (Hono, Fastify, Fetch router...)
  sessions,       // cookie → validated session → AuthenticatedPrincipal
  browserPolicy,  // exact-origin allowlist, Fetch Metadata, CSRF, content types
  abuse,          // rate limits and payload caps, keyed by endpoint contract
  errors,         // safe problem-details translation
  telemetry,
});

// endpoints/api/orders/by-order-id/get.ts — contract + thin handler only
endpoints.register(getOrderContract, async ({ principal, params }) => {
  const result = await orders.viewOrder({ principal, orderId: params.orderId });
  return toHttpResponse(result);
});
```

The endpoint owner cannot choose, order, or omit authentication middleware — there are no optional flags. The handler's type is derived from the declaration (`HandlerFor<Contract>`, defined in the endpoint-protection reference): a `public` handler receives no principal; a protected handler receives an `AuthenticatedPrincipal` it could not have minted itself — non-constructibility is enforced by module boundary and an import-boundary gate, not convention. For public endpoints the registrar mounts the handler and emits explicitly unauthenticated API documentation (`security: []`, a deliberate greppable marker — never an omitted field). For protected endpoints it installs the verification chain by construction and emits matching OpenAPI security metadata, so runtime behavior and documentation cannot disagree.

This is a deep module in the `codebase-design` sense: a small stable contract (`register`) hiding ordering, header policy, error translation, and doc emission. Keep the registrar's core framework-neutral; only its inner adapter touches Hono/Fastify/Express APIs.

## Request Ordering

For a **protected read**:

1. resolve and validate the application session;
2. return a stable 401 when authentication is absent or invalid;
3. authorize the requested product resource or operation inside the application;
4. only then read, subscribe, issue credentials, or perform other protected work.

For a **protected browser mutation**:

1. reject invalid Origin, unsuitable Fetch Metadata, or unsupported content type — without revealing whether a session exists;
2. resolve the application session;
3. validate session-bound CSRF protection;
4. authorize the product operation;
5. only then parse or dispatch the body and perform effects.

Contract paths use OpenAPI `{param}` syntax everywhere (HTTP and upgrade contracts alike); the registrar translates to framework syntax, and the catalog stores the contract form. Put the target's identity in the path so authorization needs only params and principal, and hand the operation a deferred body: the registrar validates params and query up front but parses the body only when the handler's `body()` thunk is awaited — after the operation's authorization step. Where a framework wants to validate declared body schemas before the handler, the registrar disables that for mutations and registers the body schema for documentation separately (the Hono reference shows how); pre-authorization body parsing is a violation of this ordering, not a configurable preference, and a seeded test proves the parser runs only after authorization.

Stable failure semantics — same externally visible response per class, same code path (no cause-specific shortcut), never an oracle:

| Status | Meaning |
|--------|---------|
| 401 | Authentication is required or no longer valid |
| 403 | A deliberately disclosed request-policy or known-forbidden result |
| 404 | Inaccessible or cross-tenant resource whose existence must not be disclosed (RFC 9110 §15.5.4 explicitly sanctions this) |
| 415 | Unsupported content type |

API, SSE, and WebSocket entry points return protocol failures. They never redirect to an HTML login page — a redirected `fetch` yields unparseable 200 HTML, and a redirected `EventSource` fails opaquely on content type.

## Hexagonal Responsibility Split

The BFF is a driving adapter. It owns cookies and request headers, session resolution, Origin/Fetch Metadata/CSRF/content-type policy, HTTP and upgrade protocol responses, translating an authenticated session into a provider-free principal, and invoking the application operation:

```typescript
type AuthenticatedPrincipal = {
  readonly userId: UserId;      // branded domain types, not provider IDs
  readonly tenantId: TenantId;
};
```

The BFF does **not** own product authorization. Every protected application operation independently authorizes the principal before performing protected effects — a precondition that holds whether the caller is HTTP, a CLI, a test harness, another BFF, or a future driving adapter (OWASP ASVS 5.0 §8.3.1: enforce at a trusted service layer). Inner code never depends on Hono, cookies, Keycloak, OAuth tokens, provider groups, HTTP status codes, or browser fields.

Authentication answers "who is calling?" — adapter work. Authorization answers "may this caller perform this product operation?" — application policy in product language (`viewOrder` refusing a foreign tenant), never a generic authorization-utilities bucket. Map the principal to an attributable domain actor only after authorization succeeds. Database row-level security is final containment for missed checks, not the source of permission.

## Why This Design

Compared designs for endpoint protection:

| Design | Verdict |
|--------|---------|
| 1. Global path-prefix middleware with public exceptions | Implicit and order-fragile: protection depends on registration order and path matching, upgrade requests bypass it, and the exception list is an unreviewed public allowlist. Middleware-only protection is bypassed in the wild (Next.js CVE-2025-29927; Clerk CVE-2026-41248; Traefik fail-open GHSA-4mr2-fg2p-w63c). |
| 2. Central hand-maintained route-security map | A second source of truth that drifts from runtime registration; drift is silent and fails open. |
| 3. Optional route-local middleware | Fail-open by design — the vulnerability is the absence of a check (CWE-306); every route owner re-decides ordering, and one omission is invisible in review. |
| 4. Mandatory feature-local declarations + prepared registrar + derived catalog | **Preferred.** Fail-closed by construction, reviewable at the leaf, centrally visible via derivation, and enforceable by tests. |

Tradeoffs of design 4, accepted knowingly: the registrar is upfront machinery that must itself be tested; the classification model must stay exhaustive as new authentication modes appear (extend the union, never add boolean flags); catalog derivation needs both contracts *and* production composition, so composition stays explicit; and a very small service may reasonably start with design 1 plus the enumerate-all-routes audit test — but adopt the registrar before the second authentication mode or the first realtime endpoint arrives.

**Adopting on a brownfield system**, ratchet instead of rewriting: (1) add the route-enumeration test first, with every currently unclassified route in an explicit exceptions list — the list may only shrink; (2) mount all *new* endpoints through the registrar from day one; (3) migrate existing routes leaf by leaf, highest-privilege first; (4) add direct provider-free refusal tests operation by operation as each route migrates — where the test cannot be written, authorization is middleware-only and that operation is your next fix; (5) tighten the gates to zero exceptions and only then trust the catalog.

## Anti-Patterns

- A route mounted directly on the framework app in production code, bypassing the registrar.
- `requireAuth: false`, `skipCsrf`, or any boolean that lets an endpoint owner weaken its own chain.
- A hand-edited list of protected paths, or path-prefix matching as the authorization boundary.
- Authorization decided in HTTP middleware only — a non-HTTP caller then bypasses it entirely.
- `AuthenticatedPrincipal` carrying provider fields (token claims, Keycloak groups, cookie names) into the application.
- Trusting a client-supplied actor, user ID, or tenant ID instead of the session-derived principal.
- 403 on cross-tenant resources — it confirms existence; use the no-oracle 404.
- Redirecting an API, SSE, or WebSocket entry point to a login page.
- Provider tokens or callback parameters entering browser storage (OWASP Session Management Cheat Sheet; the BFF exists so the browser holds only a cookie).
- A dev-only endpoint reachable from production composition (OWASP API9:2023).

## Completion Check

- Does every mounted production entry point — including raw upgrades — have an explicit access classification?
- Can the public endpoint set be printed, and does a reviewed allowlist test pin it?
- Is there any way to mount a route without the registrar? If yes, does a gate fail?
- Do protected handlers receive a principal they cannot construct, typed by the declaration?
- Does a direct, provider-free test prove each protected operation refuses an unauthorized principal before any effect?
- Do runtime behavior, the derived catalog, and OpenAPI security metadata agree — verified by a test, not by discipline?
- Do 401, 403, 404, and 415 keep stable, non-oracle semantics across the whole surface?
- Does the browser have exactly one authentication coordinator, and does a realtime failure trigger one deduplicated current-user probe instead of an immediate sign-out?
