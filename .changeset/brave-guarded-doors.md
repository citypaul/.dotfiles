---
"@citypaul/dotfiles": minor
---

Add bff-entry-points skill for designing and protecting BFF/backend HTTP entry points

New skill teaching an explicit public/protected access classification for every
production entry point, a composition-prepared endpoint registrar that installs
session, Origin, Fetch Metadata, CSRF, and content-type policy by construction,
provider-free authorization inside the application (`AuthenticatedPrincipal`),
protected SSE and raw WebSocket upgrade registration, a single browser-side
authentication coordinator, and automated enforcement gates driven by a derived
entry catalog. Includes six deep-dive references (endpoint protection, hexagonal
auth boundaries, realtime entry points, browser session coordination, enforcement
and testing, and a concrete Hono example) grounded in current primary sources
(RFC 9700/BCP 240, draft-ietf-oauth-browser-based-apps, OWASP ASVS 5.0 and
cheat sheets, RFC 9110/9457, WHATWG specs).

Cross-references added from api-design, secure-oauth-oidc, structure-codebase,
and hexagonal-architecture (cross-cutting-concerns), plus registration in
CLAUDE.md and the README skills catalog. structure-codebase's Endpoint-First
BFF grammar now requires an explicit access classification on every endpoint
leaf (registrar-mounted, raw upgrades included) and flags unclassified or
catalog-bypassing production endpoints as an anti-pattern, delegating the
behavioral model to bff-entry-points.
