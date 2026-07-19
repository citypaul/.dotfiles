---
name: bff-design
description: "Decide whether a system needs a backend-for-frontend, how many, and what each one may own: adoption signals and honest costs, one-experience-one-BFF granularity with frontend-team ownership, the shape-don't-decide rule, upstream aggregation with partial-failure and resilience budgets, identity-keyed BFF caching, mediating user identity toward upstream services (token exchange, confused-deputy prevention), and the alternatives (shared gateway, GraphQL federation, token-mediating backend, direct SPA→API, meta-framework server as BFF). Use when adopting or splitting BFFs, aggregating upstream services, handling upstream failures, forwarding user identity downstream, weighing GraphQL against per-client BFFs, or auditing a BFF that has drifted into a public API or a business-logic layer. For protecting the BFF's own entry points use bff-entry-points; for physical route layout use structure-codebase; for externally consumed API contracts use api-design; for OAuth/OIDC protocol flows use secure-oauth-oidc."
---

# BFF Design

A backend-for-frontend is an ownership pattern before it is a technology: the API a client application uses is *part of that application*, owned by the team that owns the frontend, and consumed by no other application (Calçado, the pattern's originator). Architecturally it is a driving host for one user experience — it shapes, aggregates, and mediates; it does not decide.

This skill owns the pattern-level decisions: whether to have a BFF, how many, what each may own, how it aggregates and survives upstream failure, and how it carries user identity toward upstream services. Load `bff-entry-points` for protecting the BFF's own boundary — access classification, the prepared registrar, sessions/CSRF, realtime protection, enforcement gates; nothing in this skill repeats it. Load `structure-codebase` for the physical `endpoints/` tree, `hexagonal-architecture` for the driving-host framing, `api-design` for contracts with consumers you do not control (which a healthy BFF never has), and `secure-oauth-oidc` for the OAuth/OIDC protocol invariants behind everything in the upstream-identity reference.

Read the relevant reference before deciding:

- Read [`references/adoption-and-granularity.md`](references/adoption-and-granularity.md) when deciding whether to adopt, how many BFFs to run, who owns them, mobile version skew, and the deployable-vs-module sizing call.
- Read [`references/aggregation-and-resilience.md`](references/aggregation-and-resilience.md) when a BFF fans out to upstream services: composition, partial failure, timeout/retry budgets, and caching.
- Read [`references/upstream-identity.md`](references/upstream-identity.md) when the BFF calls upstream services on behalf of a user: token exchange, scope narrowing, confused-deputy prevention, revocation propagation.
- Read [`references/alternatives.md`](references/alternatives.md) when weighing a BFF against a shared gateway, GraphQL federation, a token-mediating backend, direct SPA→API, or a meta-framework server.

## Do You Need One?

| Signal | Reading |
|--------|---------|
| A second client *type* is arriving (mobile app, partner surface, TV) | Strongest adoption trigger — Newman: consider a BFF for each party from the outset |
| One page/screen fans out to many downstream calls | Aggregation belongs server-side, near the services, shaped per experience |
| Frontend teams queue behind a general-purpose API team for every endpoint | The SoundCloud problem — a BFF moves the contract inside the frontend team |
| Browser app handles sensitive/personal data (default: any app with logins qualifies) | The IETF browser-apps BCP-track guidance strongly recommends the BFF architecture on security grounds alone — tokens stay server-side |
| Only one interface, making simple, similar requests to one backend | Skip it — Azure's explicit "not suitable" case — *unless another row fires*: the rows answer different questions, and the security row alone justifies a BFF for a sensitive single-backend SPA (token confinement needs no aggregation motive) |
| You already run GraphQL with frontend-specific resolvers, or a meta-framework server (Next/Remix/SvelteKit) | You may already *have* a BFF — apply this skill to it instead of adding another box |

A meta-framework server is a BFF: Remix documents its server as exactly this, and Next.js route handlers carry the same responsibilities (and the same risks — they are publicly reachable by default, so `bff-entry-points` applies to them unchanged).

## One Experience, One BFF

The unit of granularity is the **experience** — one coherent product surface, whatever platforms render it. iOS and Android listener apps rendering the same experience are one consumer with two builds, not two consumers; the creator app is a different experience and gets its own BFF (SoundCloud's practice, Newman's rule).

- Experience sets the default count. Team structure can *override* it: separate iOS/Android teams may justify separate BFFs even for near-identical experiences, because the pattern's value is a team owning its own pace (Conway). One experience served by two teams is an ownership smell — pick a single owning team or accept the split; do not share the BFF across teams.
- The frontend team owns its BFF: language, release cadence, priorities. A BFF owned by a backend platform team recreates the coordination queue the pattern exists to remove.
- BFF and frontend are one logical deployment unit: same repo where practical, contracts co-evolved rather than versioned. Versioning discipline scales with *consumer recallability* — the adoption reference carries the web-relaxation vs mobile-concentration split and the CDC alternative.

## Shape, Don't Decide

The BFF owns presentation-model work: aggregation, reshaping, payload thinning, per-experience defaults, and translating upstream results into what one UI renders. It does not own:

- **Business rules.** Pricing, eligibility, workflow state — the moment a BFF decides these, it competes with the domain services and changes for two masters. SoundCloud's documented failure mode is feature integration and its business logic accreting in BFFs. The borderline test: filtering a list to what this user's tier *may see* is a decision (authorization-shaped — it belongs in the domain operation); truncating, reordering, or thinning what came back for this screen is shaping. When in doubt, apply the deletion test below.
- **Product authorization.** Decided inside the application operations it calls (`bff-entry-points`, hexagonal reference); the BFF contributes an honest principal, nothing more.
- **Durable domain state.** A BFF may cache and hold per-session/connection state; systems of record live behind the domain services.

Decision-shaped logic goes down into a domain service *immediately*, duplication or not — the ladder governs only presentation-adjacent duplication. When such logic appears in a second BFF, resist merging BFFs upward — "highly bloated code with multiple concerns squashed together" (Newman). The remedy ladder: tolerate the duplication first; extract a shared library only for non-domain plumbing (and beware upgrade cascades across BFFs); at the third occurrence — rule of three — ask whether the repeated logic was domain-shaped all along, and if so push it *down* into a domain service beneath all BFFs. The rule of three schedules *abstraction of presentation plumbing*; it never grants business or authorization decisions three free passes.

## Aggregation, Resilience, Identity — the Short Form

- Fan out in parallel; propagate a per-request deadline, reduced by time already spent; give each upstream an empirical timeout (a latency percentile, not a guess).
- Exactly one retry owner per edge, budgeted and jittered — layered retries multiply into self-inflicted denial of service.
- Classify every response section as required or optional *in the contract*; degrade optional sections (stale cache → default → empty-with-error) instead of failing the page; make partial responses an explicit, predictable shape.
- Cache with identity in the key or not at all: per-request memoization is always safe; shared caches key on tenant/user (or the coarser attribute actually used); an unkeyed identity-varying response is a cache-poisoning leak.
- Toward upstreams, forward the *user's* identity, never the BFF's service identity plus a user header — that is the confused deputy. With access tokens: exchange the session-bound token per upstream for a narrow-audience, down-scoped token (or acquire per-resource tokens where exchange is unavailable — the reference's ladder). A deployment on the transaction-token model instead propagates a trust-domain-scoped signed context unchanged, under that model's own rules. Either way, upstreams authorize on verified claims.

Each of these compresses a reference section with sources and mechanics — read the reference before implementing.

## The Public-API Failure Mode

The moment a second *experience* consumes a BFF, it stops being one: the contract freezes, the coordination tax returns, and "part of the application" silently becomes an unversioned public API. Guardrails, all three:

1. **Separate surfaces, honestly policed.** Browser and native apps are *public clients* — nothing they carry cryptographically authenticates the client software; even native-app registration identifies the registration, not the binary (RFC 8252). So "authenticate the client" is not literally available; what is: each BFF is its own host/origin with its own credential mode — the web BFF's browser-request policy and session issuance (`bff-entry-points`) excludes *browser-origin* cross-surface misuse, and a mobile BFF accepts only user bearer tokens whose issuer, audience, and authorized-party claims name *its* surface. A determined scripted client that obtains its own session is governed by these policies plus abuse controls, not cryptographically excluded — say so in the threat model instead of overclaiming. Attestation APIs and client telemetry are risk signals on top, never verified identity.
2. **A new consumer gets its own surface.** Another *experience* (including a partner integration you build and own — SoundCloud runs dedicated partner BFFs) gets its own BFF; consumers you do not control, or non-frontend consumers, get a real public API (`api-design`). A data feed is neither an experience nor the BFF's to serve: front it from the domain services — the BFF holds no durable state to feed from.
3. **Watch for it**: record the accepted credential mode, issuer, and client registration per request (see `observability` for the wide-event shape); an unfamiliar registration or credential mode in BFF telemetry is an architectural incident, not a support question.

**Recovering from drift** (the audit case — a second consumer is already coupled): declare it, freeze the contract additively, stand up the consumer's own surface (its BFF or a public API), migrate it strangler-style route by route with a published deprecation date, and only then enforce the boundary rejection. Enforcing first breaks a consumer you accepted; never enforcing means the drift is now the architecture.

## Anti-Patterns

- A BFF consumed by a second experience, a second team, or any consumer you do not control. (Two platform builds of one experience — iOS and Android renderings of the same app — are one consumer, not two.)
- Business rules, product authorization, or systems of record living in the BFF.
- One general-purpose "BFF" serving all clients — that is the one-size-fits-all API with a fashionable name.
- Merging BFFs upward to remove duplication instead of pushing shared domain logic down.
- A platform/backend team owning what the frontend team consumes.
- Sequential fan-out; retries at every layer; a page that 500s because one optional section's upstream is down.
- The BFF calling upstreams with client-credentials plus an `X-User-Id` header.
- Adding a separate BFF service beside a meta-framework server that already is one.
- Adopting N microservice BFFs when a modular-monolith BFF (per-experience modules, one deployable) serves the same boundaries at a fraction of the operational cost — each BFF is a full deployable with its own lifecycle, security surface, and SLOs.

## Completion Check

- Can you name the single experience this BFF serves and the single team that owns it?
- Would a second client type get its own BFF — and does the boundary reject unsupported origins, credential modes, and unknown client registrations today, with the scripted-client residual recorded in the threat model?
- Is every piece of logic in the BFF presentation-shaped — could you delete the BFF without losing a business rule?
- Does the aggregation contract say explicitly which sections may degrade, and does one optional upstream failure leave the page standing?
- Is there exactly one retry owner per edge, with deadlines propagated?
- Do upstream calls carry the user's verified identity rather than the BFF's own — exchanged, audience-narrowed access tokens, or an unchanged trust-domain transaction token under that model's rules?
- Are the BFF's own entry points classified and enforced per `bff-entry-points`?
- If you run a meta-framework server, have you applied this skill and `bff-entry-points` to it rather than treating it as "just the frontend"?
