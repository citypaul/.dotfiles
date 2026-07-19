# Alternatives

What to run instead of — or alongside — per-experience BFFs, with the honest tradeoffs. The comparisons below carry live disagreements in the field; where practitioners genuinely disagree, both positions are stated.

## The Decision Table

| Option | Right when | Watch out |
|--------|-----------|-----------|
| Per-experience BFFs | Multiple client types with divergent needs; frontend teams need their own pace; sensitive browser apps | Each is a deployable with real costs; duplication managed by the push-down ladder |
| Shared API gateway (+ per-client config) | Cross-cutting concerns only: token validation, rate limiting, routing, monitoring | Per-client shaping in gateway config recreates the one-size-fits-all bottleneck in YAML |
| GraphQL federation | Many teams; the *domain schema's* ownership is the bottleneck; platform team exists to run the supergraph | Field-level authorization most teams under-invest; persisted queries effectively mandatory; does not remove experience ownership |
| Token-mediating backend (IETF §6.2) | Proxying everything is genuinely impractical (latency-critical direct paths) | Access token reaches the browser — explicitly the weaker tier; never the default |
| Direct SPA→API with CORS | Small, low-sensitivity app; one first-party API; no aggregation need | Browser-only OAuth is the weakest IETF tier; revisit when data sensitivity grows |
| Meta-framework server (Next/Remix/SvelteKit) | You already have one — it *is* the web BFF | Route handlers are public by default; apply `bff-entry-points` inside the framework |
| Typed RPC in a monorepo (tRPC/oRPC, server actions) | One TS team, client and server versioned together | This is a BFF contract by construction; server actions alone lack API-layer affordances |

## Gateway vs BFF: Layered, Not Either/Or

Azure treats them as distinct, composable patterns: **gateway aggregation** reduces client chattiness at a shared tier; **BFF** exists because "a single backend service doesn't need to handle the conflicting requirements of various client types." The stable composition: gateway owns cross-cutting mechanics (edge token validation, rate limiting, routing, monitoring), BFFs behind it own experience shaping. A shared gateway accumulating per-client response shaping is Newman's general-purpose-API bottleneck rebuilt in configuration.

## GraphQL: Orthogonal, Not a Substitute

Calçado's reframe — comparing BFFs and GraphQL is a category error: "you can build your GraphQL APIs as many BFFs or as an OSFA API." GraphQL is a protocol choice *inside* the ownership decision. What the evidence supports:

- **ThoughtWorks Radar** blesses GraphQL specifically for server-side resource aggregation inside BFF/aggregator patterns, and warns against turning it into a server-to-server protocol. (Both entries date from 2019–2020 and the Radar does not continuously reassess old blips — cite the positioning with its date, not as current sentiment.)
- **Netflix runs both**: federated Domain Graph Services solve *graph contribution* ownership across dozens of teams, while device teams still own their client BFF endpoints — federation solved schema ownership, not experience ownership.
- **Toast is the honest counter-case**: ~100 teams migrated per-SPA BFFs → Apollo Federation because N BFFs cost real duplication and staleness; it worked — and brought edge-authorization pain (the whole query is in the body) solved with persisted/pre-registered queries.
- **The recurring critique**: GraphQL authorization is field-level, not endpoint-level; the per-endpoint classification model that makes `bff-entry-points` enforceable maps poorly onto one flexible endpoint. Choosing GraphQL-as-BFF buys schema flexibility at the price of an authorization model most teams under-invest in; persisted queries restore a reviewable operation surface and should be treated as mandatory in production.
- **Crossover signals, not a team-count threshold** (Toast is one data point — ~100 teams — not a general number): federation starts beating N BFFs when you observe duplicated resolver/domain-model work across BFFs, schema staleness and bypassing, ownership conflicts over shared types, and — decisively — a platform team genuinely staffed to run the supergraph, its governance, and persisted-query infrastructure. Absent those signals, N-BFF duplication is the cheaper problem.

## Token-Mediating Backend

The IETF draft's middle tier (§6.2): the backend is the confidential client and keeps refresh tokens; the browser receives access tokens and calls resource servers directly. Cookie rules identical to a BFF. The draft's own framing is nearly grudging: only when requirements *prevent* a proxying BFF should TMB be considered. Position it as a documented compromise for topologies with latency-critical direct paths — never the default, and the browser-held access token re-opens the XSS-exfiltration class the BFF exists to close.

## The Meta-Framework Server Is Already a BFF

Remix documents its server as exactly this ("a web server with a job scoped to serving the frontend web app and connecting it to the services it needs"); Next.js ships an official BFF guide for route handlers (aggregation, proxying, cookie handling — with the caveats that route handlers are *public* endpoints needing their own protection, and server components should fetch from source rather than through your own route handlers). Consequences:

- Adding a separate web-BFF service beside a meta-framework server is redundant — the framework server is the BFF; invest in its internal module boundaries (`structure-codebase`) and its entry-point protection (`bff-entry-points`) instead.
- The "BFF becomes public API" guardrails apply *inside* the framework: publicly reachable route handlers are exactly how a partner integration quietly adopts your frontend's private API.
- Typed monorepo RPC (tRPC/oRPC) formalizes the BFF's deployment-lockstep property in types — client and server contracts versioned together by construction. Server actions alone are a mutation primitive, not an API layer; teams needing one have publicly migrated back to tRPC.
- **Edge deployment** (Workers/Vercel edge) works as a BFF/token handler, at the cost of a session-state decision a regional stateful BFF never faces: encrypted stateless cookies vs edge KV/durable storage — which is the same stateful-vs-stateless revocation tradeoff as Duende-vs-Curity (`references/upstream-identity.md`). Serverless per-request isolation also breaks in-process connection registries; realtime revocation reach (`bff-entry-points`) needs the store-driven variant.

## Choosing

Ask in order: (1) Who is the bottleneck — experience shaping (BFF) or domain-schema contribution (federation) or neither (gateway suffices)? (2) Do you already run a server per frontend (meta-framework) — then improve it, don't duplicate it. (3) Is the browser app sensitive enough that tokens must stay server-side (BFF or nothing)? (4) Can you afford the deployables — if not, modular-monolith BFF (`references/adoption-and-granularity.md`). Record the decision and its expiry conditions; "we chose no BFF" is a decision with a trigger for revisiting (second client type arriving).

## Sources

Azure Architecture Center (Backends for Frontends; Gateway Aggregation); Phil Calçado, "Some thoughts on GraphQL vs BFF"; ThoughtWorks Radar (GraphQL for server-side resource aggregation; GraphQL); Netflix (InfoQ "Scaling GraphQL Adoption at Netflix"; TechBlog Android BFF); Toast Technology ("From BFFs to Federation"); Apollo GraphQL adoption-patterns guide; IETF draft-ietf-oauth-browser-based-apps (§6.1–6.3 ranking, TMB); Remix BFF guide; Next.js Backend-for-Frontend guide; tRPC blog on server actions; Documenso migration write-up; ZITADEL/Cloudflare on edge token handlers.
