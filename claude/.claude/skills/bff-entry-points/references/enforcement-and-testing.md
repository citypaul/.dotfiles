# Enforcement and Testing

Declarations without gates are documentation. This reference defines the automated gates that make the classification model mechanically true, and the test matrix that proves each protected surface fails closed. House testing rules apply (`testing`, `tdd`): behavior through public contracts, factories over fixtures, and a negative test passes only when the system fails closed **before** the protected action — an error after the effect is not a pass.

## Gates

Each gate is an automated check that fails the build. Prefer boot-time and test-time gates over review discipline.

| # | Gate fails when | Mechanism |
|---|-----------------|-----------|
| 1 | A mounted production endpoint has no access declaration | Registrar accepts only contracts (type-level); reconciliation test catches routes mounted around it |
| 2 | The public endpoint set differs from the reviewed allowlist | Snapshot test over the catalog's `public` subset; a diff is a security review, not a snapshot update |
| 3 | A protected endpoint lacks its expected session or mutation policy | Chain-behavior tests per classification (below) driven from the catalog |
| 4 | Runtime access and OpenAPI security metadata disagree | Test walks the generated document: protected read ⇒ `[{ session: [] }]`; browser mutation ⇒ the single ANDed object `[{ session: [], csrfToken: [] }]`; public ⇒ `security: []`; no operation with absent `security` |
| 5 | A production route bypasses the prepared registrar | *Runtime* route table ↔ catalog reconciliation — the framework's live route collection (Hono `app.routes`, Fastify `onRoute` capture, Express router walk), not the OpenAPI document, which a raw `app.get()` bypass never reaches |
| 6 | A raw WebSocket upgrade bypasses its protected registrar | Every live upgrade listener/path ↔ catalog `UPGRADE` entries |
| 7 | A development-only endpoint appears in production composition | Compose the production app in-test; assert no `.dev` paths in catalog or route table (plus the one-way import rule from `structure-codebase`) |
| 8 | An endpoint is documented but not mounted, or mounted but absent from the catalog | Same reconciliation as gates 4–5, run in both directions, by catalog `kind`: declared HTTP entries reconcile against both the runtime table and OpenAPI; derived entries (405/`OPTIONS` fallbacks, synthesized `HEAD`) reconcile against the runtime table only, with GET covering framework-synthesized HEAD; `UPGRADE` entries skip the OpenAPI half — the catalog is their documentation of record |
| 9 | A protected application operation exists outside the declared operation inventory | Feature-local operation manifests, mirroring endpoint contracts (shape below); driving adapters may import operations only through manifests (restricted-import rule), so an undeclared or deep-imported operation is unreachable from adapters and mechanically detectable. Direct-test enrollment is driven from the derived operation catalog. No semantic "does it perform effects" heuristic — the declaration is the discriminant, exactly as for routes |
| 10 | Production code imports a test principal factory, or code outside the upgrade registrar attaches an `upgrade` listener | Restricted-import rules — the same one-way mechanism as dev-only routes |
| 11 | The application package imports an HTTP framework, cookie library, or identity-provider SDK | Workspace package manifest or restricted-import/architecture rule (`structure-codebase` owns the tooling) |
| 12 | An undeclared method on a cataloged path is served instead of denied | Driven from `method-denial` catalog entries: request each undeclared method per path, assert 405 with the entry's recorded `Allow`; seed a violation by mounting a route around `finalize()` |

Gates 1–8 police the entry surface; gates 9–11 police the interior, because the route-facing gates cannot see an unauthorized *operation* — a newly exported `deleteWorkspace(userId: string)` compiles happily and appears in no catalog. Gate 9 closes that by the same move as the routes: an explicit declaration reconciled against reality, which makes "every protected operation has a direct test" enumerable instead of aspirational. The manifest is ordinary code with a stable identity per operation:

```typescript
// application/workspaces/operations.ts — the only module adapters may import operations from
export const workspaceOperations = declareOperations({
  deleteWorkspace: { access: 'protected', make: createWorkspaceDeletion },
  renameWorkspace: { access: 'protected', make: createWorkspaceRename },
});
```

Types, schemas, and ports export normally; *operations* exist for adapters only via a manifest entry. The derived operation catalog is the union of manifests; reconciliation asserts every manifest entry has an enrolled direct refusal test, and the restricted-import rule makes a manifest-bypassing deep import a lint failure rather than a code review hope.

The method surface is part of gate 5's reconciliation: undeclared methods answer 405, and synthesized `HEAD`/`OPTIONS`/preflight behavior derives from declared routes and is exercised by the suite rather than escaping the catalog.

Implementation notes:

- Gates 4–8 are one test file over three inputs: the derived catalog, the framework's *runtime* route enumeration (Hono `app.routes`, Fastify `printRoutes`/`onRoute`, an Express router walk — never the OpenAPI document, which a bypass mount doesn't reach), and the generated OpenAPI document. Build it once; it grows with the surface for free. Normalize the runtime table's paths back to contract form (OpenAPI `{param}` syntax) so reconciliation compares one spelling.
- Gate 6's mechanism is the import restriction plus a boot assertion: only the upgrade registrar may attach `upgrade` listeners (gate 10), the dispatcher is terminal deny-all, and the composed server asserts exactly one `upgrade` listener at startup. Raw listeners are opaque functions — you cannot enumerate their paths, so you make the registrar the only path there is.
- Catalog-driven test enrollment (gates 3 and 9): each protected catalog entry and each protected operation must have a registered test case — a map from entry/operation name to its positive control and hostile rows, asserted complete in the gate test. A new endpoint or operation fails CI until its cases are enrolled; that is the difference between "driven from the catalog" and wishful thinking.
- Prefer a boot-time assertion as well (register-time throw on unclassified routes, in the spirit of Fastify's `onRoute` or Spring Security's terminal `anyRequest().denyAll()`): the build fails even when someone skips the tests.
- Optionally lint the generated OpenAPI in CI with the Spectral OWASP ruleset — it proves declaration, not enforcement; keep the runtime reconciliation regardless.

## Positive Controls

For every protected endpoint, one test proves an authorized same-tenant user succeeds through the full chain — real registrar, real policy, fake driven adapters. Without positive controls, a registrar bug that rejects everything looks like "secure" in the negative matrix. Drive these from the catalog so a new endpoint without a positive control fails gate 3. Public endpoints get a positive control too: the unauthenticated call succeeds *and* the reviewed abuse policy (rate limits, payload caps — a prepared registrar dependency, not per-endpoint improvisation) is observably installed.

## Hostile Matrix

Run per classification, through the HTTP surface, asserting both the stable response *and* that no effect occurred:

| Case | Expected |
|------|----------|
| Missing session | 401, identical status/headers/body across causes, same code path (no cause-specific fast path) |
| Expired session | 401, same |
| Revoked session (logged out server-side) | 401, same |
| Disabled/inactive user with a live session | 401; where a realtime surface exists, open connections for that session are closed |
| Wrong Origin on a mutation | Policy rejection (403) revealing nothing about session state |
| Missing/wrong CSRF token with a valid session | Policy rejection before the operation is invoked |
| Wrong content type | 415 before body parsing |
| Cross-tenant resource access | No-oracle 404, indistinguishable from true not-found |
| Inaccessible resource within tenant | Per product decision: disclosed 403 or no-oracle 404 — but consistent |
| Forged actor input (client-supplied `userId`/`tenantId` in body) | Ignored or rejected; effects attribute to the session principal only |
| Dependency failure mid-chain | Fail closed: 5xx with no partial effects, no fallback-to-allow |

"No effect" is asserted through fakes: repository saved nothing, publisher published nothing, no credential was issued.

## Direct Provider-Free Tests (Most Important)

For every protected operation, a test invokes it directly — no HTTP, no cookies, no registrar — with an unauthorized principal from the test factory, and proves refusal happens before any effect (canonical example in `references/hexagonal-auth-boundaries.md`, "Direct Provider-Free Tests"). Assert three things: the refusal result, the fakes showing zero effects, and — for operations taking a deferred body — a spy body thunk that was never invoked, which enrolls every mutation in the authorize-then-parse invariant rather than trusting one registrar test.

If this test cannot be written, authorization lives only in HTTP middleware — that is the finding, and it is a defect regardless of how good the middleware is. Gate 9's operation enumeration makes "every" checkable; the enrollment map above makes a missing test a CI failure.

Registrar unit tests are separate: the registrar itself is production machinery and gets behavior tests for chain ordering (policy before session before CSRF before handler), stable 401 shape, and doc emission per classification. Mutation-test it like any code; where a control is configuration (cookie flags, header values), record `N/A` plus configuration/integration evidence per the house `tdd` rule instead of fabricating structural mutants.

## Browser Tests

The required set is defined once, in `references/browser-session-coordination.md` ("Browser Test Coverage") — initial signed-out entry, later authentication loss, safe deep-link restoration, ambiguous realtime failures with the deduplicated probe, valid-session transport failure, and the 401/403/404 distinction. Do not restate it here or in project docs; link it.

## Completion Check

- Does every gate in the table run in CI, and does each fail on a seeded violation (prove it once — a gate that has never failed is unverified)?
- Does every protected endpoint have a positive control and its classification's hostile rows?
- Does every protected operation have a direct provider-free refusal test asserting no effect?
- Are 401 responses identical in content and code path across missing/expired/revoked/disabled?
- Is the public allowlist snapshot small enough for a human to actually review?
