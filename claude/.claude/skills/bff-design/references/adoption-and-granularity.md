# Adoption and Granularity

When a BFF earns its place, how many to run, who owns them, and what each one costs.

## Before Deciding, Gather

The decisions below hinge on facts — collect them first instead of rediscovering the list mid-advisory: client types and their *recallability* (web tab-hours vs app-store years); team topology (who owns which frontend, whether iOS/Android are one team); upstream shape (many services or one general-purpose API/monolith); the authorization server's capabilities (token exchange? back-channel logout?); data sensitivity (default: an app with logins handles personal data); partner/third-party plans; and operational maturity (how many deployables the teams can responsibly run).

## Adoption Signals

**For.** Newman's trigger: "the moment that you need to provide specific functionality for a mobile UI or third party… I would strongly consider using a BFF for each party from the outset." The founding problem was coordination latency — at SoundCloud, every new endpoint meant convincing the backend team, writing a story, prioritizing, waiting. If your frontend teams live in that queue, the BFF moves the contract inside the team that needs it. The second, independent argument is security: the IETF browser-apps guidance (BCP-track) ranks BFF > token-mediating backend > browser-only OAuth "in decreasing order of security" and strongly recommends BFF for business, sensitive, and personal-data applications — tokens never reach the browser. That argument applies even to a single-client system with no aggregation need.

**Against — with explicit precedence.** Azure's non-fit — interfaces making "the same or similar requests to the backend," or "only one interface interacts with the backend" — is about the *aggregation/divergence* motive only. It vetoes a BFF only when no other signal fires: a single-interface SPA handling personal data still gets the BFF on the security signal alone (the two sources answer different questions; token confinement needs no aggregation motive). Also: if you already run GraphQL with frontend-specific resolvers, or a meta-framework server, you may already have the pattern — improve what exists.

**The over/under-fetching origin.** Calçado's profile page needed a fan of generic-resource calls (`/tracks/1234`, `/users/86762`, …); the BFF collapsed them into one `GET /user-profile/123` shaped for the screen. A BFF is the Presentation Model pattern deployed server-side: response shaping per experience is its job so the domain services never carry per-client variants.

**One upstream is still a valid BFF.** The most common starting point is a single general-purpose API or monolith, not a service fleet. The adoption case still holds — shaping, payload thinning, token confinement, team-pace ownership — while the aggregation machinery collapses to its single-upstream form: one deadline, one empirical timeout, one retry owner, one fast-fail, but overload protection stays whole (see the aggregation reference — a single slow dependency can still exhaust the BFF). Treat the monolith as "the domain services layer" and let the BFF fan out only when the backend actually does.

**Getting there is a strangler migration, not a cutover.** Stand the BFF up beside the general-purpose API; move one page or screen at a time behind it; delete the platform API's per-client endpoints as each moves; run the coexistence period deliberately with a published end date. The largest adoption cost is usually this migration, not the steady state — say so in the advisory, and sequence highest-pain screens first so the coordination-latency win shows up early.

## Granularity: Experience First, Conway Second

- **One experience, one BFF** (Newman, via Gleadow). SoundCloud's practice makes the unit concrete: the iOS and Android *listener* apps share one BFF because they are one experience; the creator app (Pulse) has its own. Platform alone does not split a BFF; a genuinely different experience does.
- **Team structure can override the experience default.** Separate iOS and Android teams justify separate BFFs even for near-identical experiences — the pattern's value is a team owning its own pace (Newman: "team structure should drive how many BFFs you have"). The inverse case — one experience, two teams wanting to share a BFF — is an ownership smell: appoint one owning team or split the BFF; never co-own it.
- **Micro-frontends pair vertically — when the slice is really vertical.** Where an MFE is a separately *owned* business capability, it brings its own BFF slice, owned by the same team, deployed together (Leitner; Mezzalira's one-API-entry-point-per-business-domain); a single shared BFF under many such teams reintroduces exactly the coordination the split was meant to remove. But an MFE that is merely a technical subdivision inside one experience and one team does not earn its own deployable — it shares the experience's BFF as a module.

## Ownership and the Deployment Unit

The frontend team owns the BFF — language choice, release cadence, priorities (Newman; Azure states it independently). BFF and frontend form one deployment unit: "once you change the BFF you usually need to change the client and vice versa" (Leitner) — same repo where practical. In Team Topologies terms this makes frontend-plus-BFF a single stream-aligned team's end-to-end slice (an application of their model; they do not name BFFs).

**Versioning by consumer recallability.** With exactly one consumer you control both sides, so contract ceremony collapses — the canonical treatments barely mention versioning. What remains is skew tolerance, scaled by how long old consumers survive:

- **Web**: old bundles live for browser-tab-hours in open tabs and CDN caches. The BFF briefly serves versions N and N−1: additive changes, tolerant-reader clients, expand-contract migrations. No URL versioning.
- **Mobile**: app-store binaries live for *years* and cannot be recalled. A mobile BFF *concentrates* the skew — it holds per-version response shaping in one owned place so domain services can move on. This is the inverse of the web relaxation and needs real versioned surfaces from day one.
- If a migration window needs any guarantee, use consumer-driven contract tests (the frontend's expectations, executable — Pact-style) rather than version numbers; with one known consumer, CDC is cheap and exact.

**Hyrum's Law still applies, scaled down**: its force grows with consumer count; one consumer you control is the one situation where observable-behavior coupling is manageable by discipline (`api-design` owns the many-consumer case).

## Honest Cost Accounting

Each BFF-as-service is a full deployable: own lifecycle, deployment pipeline, security surface, patching, monitoring, SLOs, plus one added network hop and probable duplication (Azure's cost list). Three legitimate shapes, keyed to what you actually exercise:

| Shape | When |
|-------|------|
| Modular-monolith BFF — per-experience modules, one deployable | Boundaries and ownership wanted, but independent scaling/cadence/language not yet exercised; one pipeline is an asset |
| BFF per experience as separate services | Teams genuinely release at different cadences, scale differently, or choose different stacks — the costs are being paid for something |
| Meta-framework server as the web BFF | You already run Next/Remix/SvelteKit with a server; a separate web BFF beside it is redundant (see `references/alternatives.md`) |

The shapes compose per experience — a Next.js web BFF beside a separate mobile BFF is normal. The one combination ownership rules out: an experience's BFF as a module inside *another team's* deployable (a mobile module in the web team's Next server) — the module shape requires the owning team to own the deployable.

State the benefit side next to the costs: the measurable wins are endpoint-change lead time (the coordination queue the pattern removes — measure it before and after) and payload size / request count per screen. A cost sheet with no revenue line reads as a reason to do nothing.

Netflix's Android team went the other way — from a monolithic API to their own Node.js BFF microservice — and explicitly accepted the operational burden as the price of control and observability ("each client team owns their respective endpoints"). Both directions are defensible; what is not defensible is paying microservice costs for boundaries a module would give you.

**Shared-library caution**: pushing common BFF code into libraries too early produces upgrade cascades across every BFF when the library wobbles (SoundCloud's experience). Prefer duplication until the rule of three, then push domain-shaped logic *down* into a service, not sideways into a library.

## Mobile BFF Specifics

- Payload thinning and request-frequency reduction are the headline wins (SoundCloud: mobile needed smaller payloads, fewer requests; Azure's mobile example prioritizes bandwidth efficiency and caching).
- Device shaping: the BFF is where per-device capabilities, image sizing, and pagination-batch differences live.
- Client-team observability: Netflix's Android BFF let the team trial msgpack payloads within a day — control over the wire format is a team-velocity feature.
- Version skew is the defining constraint (above): design the mobile BFF's surface as versioned from the first release. Mechanism: a coarse path-versioned surface (`/v3/...`) or minimum-supported-version negotiation with a forced-upgrade policy — pick one and pair it with a support window ("we serve the last N releases") so per-version shaping has a retirement schedule instead of accreting forever.
- **Client identity differs from the web.** The browser-apps token-confinement rationale does not transfer wholesale: a native app is an OAuth *public client* with secure storage, doing the authorization-code+PKCE flow per the native-apps BCP (`secure-oauth-oidc`). The mobile BFF's boundary is a bearer-user classification (`bff-entry-points`' extension model, not a cookie session): validate issuer, audience, scopes, and authorized-party so only tokens minted for *this* surface pass — which authenticates the user and the issuing client registration, never the binary itself; attestation is a risk signal on top. Upstream mediation then proceeds exactly as for the web BFF — exchange per upstream, narrow audiences (`references/upstream-identity.md`).

## Sources

Sam Newman, "Backends For Frontends" (samnewman.io); Phil Calçado, BFF origin and GraphQL/BFF essays (philcalcado.com); SoundCloud Backstage "Service Architecture — BFFs" and ThoughtWorks "BFF @ SoundCloud"; Azure Architecture Center "Backends for Frontends" (2025); IETF draft-ietf-oauth-browser-based-apps (BCP-track); Netflix TechBlog (Android BFF swap); David Leitner (SQUER) on micro-frontend BFFs; Luca Mezzalira, *Building Micro-Frontends*; Ian Robinson, "Consumer-Driven Contracts" (martinfowler.com); Fowler, "Tolerant Reader"; hyrumslaw.com.
