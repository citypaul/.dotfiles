# Upstream Identity

How the BFF carries the user's identity toward upstream services. The rule it all serves: downstream authorization is decided on the *originating user's* verified identity, never on "the BFF called me" (OWASP ASVS 5.0 §8.3.3; the enforcement side lives in `bff-entry-points`). Protocol invariants belong to `secure-oauth-oidc`; this reference is the BFF-shaped application of them.

## The Confused Deputy, Concretely

The anti-pattern: the BFF authenticates to upstreams with its own client-credentials token and appends `X-User-Id: 123`. The upstream cannot distinguish forged from genuine context — anything holding a service credential can now act as any user (OWASP Microservices Security Cheat Sheet: plain-header identity is acceptable only in "highly trusted environments," which yours is not). The safe shape: the user's identity reaches the upstream inside something *a trusted authority issued and the upstream verifies* — cryptographically for self-contained JWTs (phantom-token JWTs, transaction tokens from the trust domain's token service), or via introspection for opaque access tokens (RFC 7662); exchanged and OBO tokens may be either format. Workload identity (mTLS/SPIFFE) answers "which service is calling"; it never substitutes for "on whose behalf" — a mesh-authenticated service forwarding forged user headers is precisely the confused deputy. Use both layers for their own questions.

## Token Layering: Cookie → Opaque → JWT

Best-in-class layering (Curity's phantom-token pattern):

1. **Browser** holds only the `__Host-` session cookie (`bff-entry-points`).
2. **BFF** holds the OAuth tokens server-side against that session, as a confidential client, refreshing transparently (the token-handler pattern: Duende's server-side session store, or Curity's OAuth Agent + Proxy split). Prefer *opaque* tokens at this edge — nothing readable leaks.
3. **Gateway/upstream boundary** swaps opaque for JWT (introspection with caching, or the split-token variant) so internal services always receive a verifiable JWT with the user's claims.

Vendor tradeoff to know: Duende-style server-side token storage supports instant session revocation and back-channel logout; Curity-style encrypted-cookie statelessness scales without a session store but cannot revoke a live session instantly. Pick by your revocation requirements, and note the stateful choice is what makes IdP-initiated logout actually work.

The layering above is described in Duende/Curity vocabulary because those are the reference implementations — the *whole* of it needs the same verify-at-implementation-time discipline as the exchange bullets below: confirm your IdP's opaque-token/introspection support, its RFC 7009 semantics (does revoking the refresh token kill the grant?), and its back-channel logout behavior before assuming the pattern transfers. Silence about a vendor here is not an endorsement.

## Per-Upstream Narrow Tokens

Do not spray the session's broad token at every upstream. Exchange it, per upstream, for a token with **one audience and minimal scopes**:

- **RFC 8693 Token Exchange** — `subject_token` in, down-scoped token out; audience restriction via `audience`/`resource` (RFC 8707). RFC 9700 (BCP 240) wants audience-restricted access tokens and upstreams that refuse mismatched audiences. Exchange must be limited to authenticated confidential clients with per-client policy — an open exchange endpoint turns any stolen token into every token.
- **Microsoft OBO** — Entra's equivalent (RFC 7523 jwt-bearer, `requested_token_use=on_behalf_of`); no RFC 8693 grant, no `act` claim (actor only inferable from `azp`). Same move, different encoding; the incoming token's audience must be the exchanging app, which is Entra's confused-deputy control.
- **Vendor reality check (statuses as verified mid-2026 — re-verify at implementation time)**: Keycloak's standard token exchange (26.2+) supports downscoping but its `scope` parameter can *upscope* to the client's optional scopes unless the `downscope-assertion-grant-enforcer` client policy is applied — configure it; no `actor_token` in the standard flow (delegation surfaces only as experimental features), no RFC 8707 `resource` parameter (audience is *filtered* from the token's existing audiences, never targeted at a URI), same-realm only. Auth0's exchange delegates subject-token validation to your own Action code. Delegation chains (`act`/`may_act`) are standardized but largely unavailable in mainstream IdPs' standard flows — treat nested-actor semantics as forward-looking; **transaction tokens** (IETF draft) are the emerging form of call-chain context — and a *different mediation model*, not a per-upstream access token: their `aud` names the whole trust domain, they propagate *unchanged* along the call chain in their own `Txn-Token` header, carry a purpose/context rather than upstream scopes, and are minted by a token service that authenticates the requesting workload. The per-upstream audience invariant in this reference governs access tokens; a deployment adopting transaction tokens validates them under that draft's own rules instead.
- **Exchange even for the token's own audience** when its scopes exceed what the call needs — forwarding the session token unchanged is acceptable only when the audience matches *and* the scopes are already minimal for that upstream. "Audience-restricted to that upstream and scoped to what the call needs" is one requirement, not two alternatives.
- **Cache exchanged tokens keyed by the canonical authorization request — `{session, audience/resource, normalized scopes}`** — stored with the server-side session state; that location is what makes logout purge atomic and multi-instance-correct (the session store is the shared truth). Scopes belong in the key: a `{session, audience}` key would happily serve a broad token to a narrow request — a scope elevation the cache itself manufactured (RFC 8693 treats audience, resource, and scope as independent request dimensions). The simpler alternative is one immutable, least-privilege authorization policy per audience, validated on every hit — then the audience *is* the scope set and the shorter key is sound. The session component implies the user and survives the BFF's transparent access-token refreshes, which a hash-of-incoming-token key would not. Entry lifetime = min(exchanged token's `exp`, session's remaining lifetime); the BFF session's lifetime should equal the refresh token's maximum (IETF browser-apps draft), and derived tokens must not outlive either.

**Never relay an upstream's token back to the browser**, and never forward a token to any audience it wasn't issued for (Microsoft's OBO warning, generalized). The BFF is where tokens terminate and are re-minted, not a pipe. The exchange subject is the session's *access token* (refresh tokens stay between the BFF and the AS).

**User-less calls stay client-credentials.** Genuinely user-free work — health probes, config fetch, cache warmup, scheduled maintenance — is correctly authenticated with the BFF's own workload/client-credentials identity. The prohibition is using that identity *as a substitute for user context* on user operations; it is not a ban on the credential.

**No token exchange available?** When the AS supports neither RFC 8693 nor OBO, do not fall back to `X-User-Id`. Two executable interim rungs, in order: (1) relay the user's token only where its audience exactly matches the upstream *and* its scopes are already least-privilege for that call; (2) acquire per-resource tokens via RFC 8707's actual sequence: list every upstream as a repeated `resource` parameter in the *authorization request* (establishing the grant's full breadth), redeem the code with a single `resource` for the first upstream's audience-restricted token, then use the grant-bound refresh token with one `resource` per subsequent token request — one access token per upstream, all under one user grant. If neither rung is available, the honest position is that your platform cannot yet do least-privilege mediation: an internal transaction-token service is the fix, but it is a *separate security-architecture project* — requester workload authentication, trust-domain boundary, subject-token validation, immutable context derivation, audience rules, and the prohibition on using transaction tokens as workload credentials are all normative in the IETF draft — designed and reviewed under `secure-oauth-oidc`, never improvised as an interim step. Record whichever rung as deliberate debt with an expiry tied to an AS upgrade; prefer RFC 8693 wherever it exists.

## Sender-Constraining, by Assurance Tier

- **Baseline**: bearer over TLS from the confidential BFF is accepted practice (the IETF browser-apps draft does not require more) — but RFC 9700's SHOULD means choosing bearer is a *documented exception*: record the rationale and residual risk, don't just default into it.
- **Hardened**: RFC 9700 says access tokens SHOULD be sender-constrained — DPoP (RFC 9449) or mTLS (RFC 8705). The BFF is the right place for DPoP keys (a server can actually protect them; the browser cannot).
- **FAPI-profiled deployments**: where the deployment adopts or claims the FAPI 2.0 Security Profile (typical in open-banking regimes, but it is the *profile adoption* that binds, not the industry label), sender-constrained tokens are a MUST — bearer is not acceptable.

## Logout and Revocation Propagation

Two independent signals; wire both:

- **BFF session ends** (user logout, session timeout, revocation): revoke the refresh token (RFC 7009 — revoking the refresh token invalidates the grant, where the AS supports it), drop cached exchanged tokens, destroy the server-side session. Short upstream access-token TTLs bound the tail — an already-issued self-contained JWT cannot be un-issued, which is another argument for introspected/phantom tokens internally.
- **IdP says logout** (OIDC Back-Channel Logout): the BFF exposes the back-channel endpoint and destroys matching sessions on a valid Logout Token — which requires the server-side session store, and should also close the session's live realtime connections (`bff-entry-points`, realtime reference).
- Do not assume one signal triggers the other — refresh-token revocation does not imply back-channel logout or vice versa across vendors.

## Checklist

Triage order when auditing: exploitable-now defects first (forgeable user context, cross-audience token acceptance, live tokens after logout), then credential-lifetime violations (unbounded caches, unrevoked grants), then structural drift (second consumers), then organizational shape.

- No upstream call carries the BFF's service identity as the authorization subject for user operations.
- Every upstream *access token* is audience-restricted to that upstream and scoped to what the call needs. (A deployment using transaction tokens validates those separately, per that model: trust-domain audience, unchanged propagation, workload-authenticated issuance.)
- Exchanged-token cache entries are keyed by `{session, audience/resource, normalized scopes}` (or per-audience immutable policy), live in the session store, and die with the session.
- No token issued for an upstream ever reaches the browser or a different upstream.
- Session end revokes the refresh token; back-channel logout destroys sessions; both paths tested.
- Assurance tier chosen deliberately: bearer baseline / DPoP-mTLS hardened / FAPI-mandated.

## Sources

RFC 8693 (Token Exchange), RFC 8707 (Resource Indicators), RFC 9700 / BCP 240, RFC 7009 (Revocation), RFC 9449 (DPoP), RFC 8705 (mTLS); draft-ietf-oauth-browser-based-apps; draft-ietf-oauth-transaction-tokens; Microsoft Entra OBO documentation; Keycloak standard token exchange (26.2+) docs; Auth0 Custom Token Exchange; Duende BFF token management and back-channel logout; Curity token handler, token exchange, and phantom/split-token guidance; OWASP Microservices Security Cheat Sheet; OWASP ASVS 5.0 §8.3.3; OIDC Back-Channel Logout 1.0; FAPI 2.0 Security Profile; SPIFFE.
