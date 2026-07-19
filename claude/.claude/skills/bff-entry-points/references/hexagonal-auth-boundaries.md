# Hexagonal Auth Boundaries

Where authentication ends, where authorization lives, and how identity crosses the boundary. This deepens the `hexagonal-architecture` rule — authentication is adapter work, authorization is application policy — into an enforceable contract.

## The Provider-Free Principal

The BFF translates a validated session into a small provider-free value before invoking any operation:

```typescript
declare const authenticated: unique symbol;

type AuthenticatedPrincipal = {
  readonly [authenticated]: true;   // opaque brand — structural assembly won't type-check
  readonly userId: UserId;          // branded domain type
  readonly tenantId: TenantId;      // branded domain type
};
```

The brand is what makes "cannot mint it" true at the type level: possessing a `UserId` and `TenantId` is not enough to assemble a principal, because the symbol is not exported. TypeScript cannot stop a deliberate `as` cast — the brand raises the bar from accident to intent; the direct provider-free authorization tests remain the real guarantee.

- Each authentication mode has exactly one production constructor, owned by the adapter that performs that mode's authentication: session resolution constructs it for browser callers; a service-credential verifier constructs it for service endpoints; tests use a test factory. Endpoint handlers, workflows, and application code receive it; they never mint it. Enforce this mechanically, not by convention: brand the type, export the constructor only from the authenticating modules, and add a restricted-import rule that keeps the test factory out of production code (the same one-way mechanism as dev-only routes).
- It carries only what the application needs to authorize and attribute. Add fields (an organization ID) only when application policy consumes them.
- The model assumes one active tenant per session. A user who belongs to several tenants switches by establishing a new session context — rotate the session, mint a new principal. When a URL names a tenant that differs from `principal.tenantId`, that is an authorization refusal (no-oracle 404), never a "helpful" switch.
- It never carries provider material: no token claims, no Keycloak/IdP groups, no cookie names, no session IDs, no HTTP anything. If application code needs a fact, express it as a domain fact; if the fact only exists in the provider's vocabulary, translate it at session resolution or query it through a driven port in domain language.

Inner code must not depend on Hono, cookies, Keycloak, OAuth tokens, provider groups, HTTP status codes, or browser fields. Mechanize the check — a workspace package whose manifest simply lacks those dependencies, or restricted-import/architecture rules in a single-package service (`structure-codebase` owns the enforcement tooling). This is a gate, not review discipline.

## System and Non-Browser Callers

The authorization precondition holds for every driving adapter, so every driving adapter must be able to present an honest principal — "who is calling?" has an answer for a CLI and a job runner too, or the operation cannot be invoked at all.

- **A CLI acting for a human operator** authenticates that operator (device flow, local credential helper — `secure-oauth-oidc`) and constructs the same user principal a session would have produced. It gets no shortcut for being "internal".
- **Scheduled jobs and system work** are not users. Give them their own discriminated identity, constructed only by the composition root that schedules them — composition *is* the authority on which system jobs exist:

```typescript
type CallerPrincipal =
  | { readonly kind: 'user'; readonly userId: UserId; readonly tenantId: TenantId }
  | { readonly kind: 'system'; readonly job: SystemJobName };
```

- Operations declare what they accept. A product operation takes a user principal; system maintenance (purging expired workspaces across tenants) is a *separate, system-facing operation* with its own authorization rule over the system principal — never a user operation with `userId` made optional, and never a loop borrowing a fake user. Effects attribute to the system actor (`archived-by: system/retention`), so audit trails stay honest.
- Introduce the `CallerPrincipal` union only when system callers exist; a BFF whose only driving adapter is the browser keeps the plain `AuthenticatedPrincipal`.

## Authentication vs Authorization

**Authentication answers "who is calling?"** It is driving-adapter work: cookies, session stores, token validation, IdP interaction. Its output is the principal — or a stable 401.

**Authorization answers "may this caller perform this product operation?"** It is application policy, executed inside the operation itself, in product language, before any protected effect:

```typescript
// application/orders/cancel-order.ts
const createOrderCancellation = (orders: OrderRepository): ForCancellingOrders => ({
  cancelOrder: async ({ principal, orderId }) => {
    const order = await orders.findById(orderId);
    if (!order || order.tenantId !== principal.tenantId) {
      return { outcome: 'not-found' };            // no-oracle: existence undisclosed
    }
    if (order.placedBy !== principal.userId) {
      return { outcome: 'not-order-owner' };       // disclosed product refusal
    }
    // effects only after both checks
    ...
  },
});
```

This precondition holds for every driving adapter — HTTP, CLI, test harness, another BFF, a queue consumer added next year. HTTP middleware that authenticates perfectly protects nothing if a direct caller can invoke `cancelOrder` without the check (OWASP ASVS 5.0 §8.3.1: enforce authorization at a trusted service layer; A01 Broken Access Control is the most common web vulnerability class precisely because checks live only at the edge).

The BFF's contribution to authorization is exactly one thing: an honest principal. The decision belongs to the operation.

## Product Language, Not an Authorization Bucket

Express authorization as focused product rules inside the operations that own them — `order.tenantId !== principal.tenantId`, "only the organizer closes funding" — not as a generic `authorization/` utilities module. A shared `canAccess(user, resource, action)` bucket grows into an untestable rules engine that no operation owns; product rules scattered as data (roles, grants) belong behind a driven port in domain language (`ForCheckingPublishRights`, not `PermissionService.check`). A genuine policy-engine integration (Oso/Cerbos/OpenFGA) is a driven adapter behind such a port.

**Layer tenancy and operation rules deliberately.** Prefer a tenant-scoped repository contract as the cross-cutting floor — `orders.findFor(principal.tenantId, orderId)` cannot return a foreign row, and the operation's `undefined` branch becomes the no-oracle `not-found`. The operation then expresses only *operation-level* rules (ownership, role, state). The explicit `order.tenantId !== principal.tenantId` comparison in the example above is the pattern for a repository that is *not* tenant-scoped; use one layer as the floor, know which one it is, and treat RLS (below) as the third, containment-only layer.

**Membership-shaped authorization** — the common multi-tenant shape, where users belong to many workspaces with roles — is a driven-port lookup in domain language, then a product rule on the result:

```typescript
interface WorkspaceDirectory {
  readonly membershipOf: (userId: UserId, workspaceId: WorkspaceId) => Promise<Membership | undefined>;
}

// inside deleteWorkspace:
const membership = await directory.membershipOf(principal.userId, workspaceId);
if (!membership) return { outcome: 'not-found' };            // non-member: existence undisclosed
if (membership.role !== 'owner') return { outcome: 'not-workspace-owner' };
```

Return refusals as result types, never throws (`hexagonal-architecture` house rule). The driving adapter translates:

| Application result | HTTP |
|--------------------|------|
| `not-found` (existence undisclosed, incl. cross-tenant) | 404 |
| Disclosed refusal (`not-order-owner`, `funding-closed`) | 403 with problem details |
| Success | 2xx |

Other driving adapters translate the same results into their own vocabulary — a CLI maps refusals to exit codes and stderr (`cli-design`), a queue consumer to reject/dead-letter decisions. The results are the contract; the status codes are one adapter's rendering.

## Actor Mapping After Authorization

Map the principal to an attributable domain actor — the aggregate-level identity that appears in events, audit records, and ownership fields — only after authorization succeeds:

1. Authenticate → principal (adapter).
2. Authorize the operation for that principal (application).
3. Resolve the acting domain identity (the `Organizer`, the `Contributor`) and attribute effects to it.

Never accept an actor, user ID, or tenant ID from the request body or query when the session already identifies the caller. A client-supplied `userId` field on a mutation is forged-actor input — the hostile test matrix covers it. The mechanism is strict schemas: request schemas for session-authenticated endpoints simply never declare actor or tenant fields, and strict parsing rejects unknown fields — so a forged field is a validation failure, not something silently stripped and forgotten. Where an operation legitimately acts *on* another user (admin resets a password), the target is a parameter, the actor is still the principal, and the authorization rule is explicit about the pair.

**Confused-deputy guard:** when the BFF calls downstream services, authorization downstream must be decided on the originating principal, not on the BFF's own service identity (ASVS 5.0 §8.3.3). Forward the user's identity (token exchange, signed headers per your platform); a downstream that trusts "the BFF called me" has no object-level authorization at all.

## Row-Level Security Is Containment

Database row-level security (or any storage-layer tenant filter) is the final backstop when an application check is missed — it bounds the blast radius. It is not the source of permission:

- RLS policies can be command-specific, role-specific, and use session context — but they rarely represent the full product permission model cleanly ("may cancel", "may invite", field-level restrictions, workflow state), and pushing it all into SQL policies moves product rules out of the tested application layer.
- Tenant context plumbing (`SET LOCAL` per transaction) is a known footgun under connection pooling; a silent misconfiguration fails open at the layer you stopped testing.
- An RLS-empty result must still surface as the no-oracle 404, which only the application can decide.

Keep both: authorization in the application as the decision, RLS as defense-in-depth containment. A test that disables the application check and observes RLS still filtering is a containment test, not an authorization test.

## Direct Provider-Free Tests

The most important test in this reference: invoke the protected operation directly — no HTTP, no cookies, no registrar — with an unauthorized principal from the test factory, and prove refusal happens before any effect:

```typescript
test('cancelOrder refuses a foreign tenant before touching effects', async () => {
  const orders = createFakeOrderRepository([anOrder({ tenantId: tenantA })]);
  const cancellation = createOrderCancellation(orders);

  const result = await cancellation.cancelOrder({
    principal: aPrincipal({ tenantId: tenantB }),
    orderId: anOrderId(),
  });

  expect(result).toEqual({ outcome: 'not-found' });
  expect(orders.savedOrders()).toHaveLength(0);   // fail closed before the protected action
});
```

If this test can only be written through HTTP, authorization lives in the adapter — that is the defect, not a test inconvenience. See `references/enforcement-and-testing.md` for the full matrix.

## Sources

OWASP ASVS 5.0 §8 (8.2.x object/function/field-level, 8.3.1 trusted service layer, 8.3.3 originating subject); OWASP Top 10 A01 Broken Access Control; NIST SP 800-162 (PEP/PDP vocabulary — HTTP middleware is one PEP, never the only one); Oso Authorization Academy (resource-level enforcement belongs in application code); PostgreSQL RLS documentation and Svix/Bytebase RLS-as-defense-in-depth analyses; RFC 9110 §15.5.4 (404 for existence-hiding).
