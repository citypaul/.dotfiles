---
name: secure-oauth-oidc
description: "Design, implement, audit, test, troubleshoot, or migrate secure OAuth 2.0 and OpenID Connect (OIDC) systems using RFC 9700 / BCP 240. Use for authorization servers and OpenID Providers, OAuth clients and OIDC relying parties, resource servers, native apps, browser-based apps, multi-issuer login, redirect URIs, authorization code and PKCE flows, state and nonce handling, ID Token validation, token storage and replay, refresh-token rotation, sender-constrained tokens (DPoP or mTLS), mix-up and injection attacks, discovery and metadata, reverse proxies, or migration away from implicit and resource-owner-password grants."
---

# Secure OAuth and OpenID Connect

Treat OAuth security as a set of end-to-end protocol invariants, not a checklist of parameters. Use RFC 9700 / BCP 240 as the baseline, then add the requirements of the selected OAuth extension, OpenID Connect, platform profile, and deployment.

OAuth delegates access. OpenID Connect adds authentication. Never infer a login identity from OAuth alone, and never use an access token as an ID Token.

## Load the right references

| Reference | Load when |
|---|---|
| `references/rfc9700-control-catalog.md` | Always for a security design or review; it preserves requirement strength, applicability, and section provenance |
| `references/attack-and-test-catalog.md` | Threat-modeling, incident analysis, adversarial review, or writing negative tests |
| `references/oidc-validation.md` | Any OIDC, ID Token, UserInfo, Discovery, multi-issuer, or federated-login work |
| `references/review-and-delivery.md` | Auditing an implementation, reporting findings, planning remediation, or defining completion evidence |
| `references/standards-map.md` | Selecting extensions/profiles, resolving source precedence, or checking whether a standard is stable and current |

Read only the references needed for the task. Do not rely on memory for exact normative language when the control catalog provides it.

## Establish the security profile first

Before recommending code or configuration, identify:

1. **Goal** — delegated API access, user authentication, both, machine-to-machine access, device authorization, or token exchange.
2. **Parties** — authorization server / OpenID Provider, client / relying party, resource server, resource owner / end-user, browser or system user agent, and TLS-terminating intermediaries.
3. **Client type and execution context** — confidential or public; server-side web app, browser app, native app, service, CLI, or device. Classify by whether credentials can actually remain confidential, not by a registration label.
4. **Flows and response modes** — enumerate every grant, response type, response mode, callback, token exchange, refresh path, logout path, and back-channel call that is enabled, including legacy paths.
5. **Trust topology** — single issuer or multiple; static or dynamic discovery/registration; one or many resource servers; same-party or third-party components; proxies and service meshes.
6. **Applicable profile** — RFC 9700 baseline plus OIDC Core, native-app BCP, DPoP, mTLS, PAR/JAR/JARM, FAPI, or another deployment profile. A stricter profile adds requirements; it does not erase the baseline.
7. **Evidence** — exact code, config, metadata, library and version, tests, and runtime behavior. Mark anything not inspected as unknown.

If the task is underspecified, inspect the repository and deployed metadata first. Ask only for choices that materially change the profile and cannot be discovered safely.

## Build a transaction ledger

Trace each flow from initiation through callback, token use, refresh, revocation, and logout. Record who creates, stores, transmits, validates, consumes, expires, and invalidates each artifact:

| Artifact | Required binding or validation |
|---|---|
| Authorization request | intended issuer, client, exact redirect URI, response type/mode, requested resource and privilege |
| `state` | high-entropy, one-time, securely bound to the initiating user-agent session; integrity-protected when it carries application state |
| PKCE verifier/challenge | transaction-specific; verifier secret retained by the initiating client instance; `S256`; authorization server records whether a challenge was present |
| OIDC `nonce` | transaction-specific and bound to the initiating session; validated in the correct ID Token before any returned token is used |
| Authorization response | expected session, issuer, redirect endpoint, response mode, and error/success semantics |
| Authorization code | client, redirect URI, transaction/PKCE challenge, single use, short lifetime |
| Access token | issuer, intended resource/audience, privilege, lifetime, token type, and sender key when constrained |
| Refresh token | client instance, grant, consented scope/resources, replay-detection family or sender key, expiry/revocation state |
| ID Token | expected issuer, relying-party audience, signature/algorithm, time claims, nonce and flow-specific hashes |

Missing or implicit bindings are where mix-up, CSRF, code injection, token substitution, and replay attacks hide.

## Apply the RFC 9700 baseline

Use the control catalog for exact wording and conditionality. At minimum, verify these boundaries:

### Redirect and authorization boundary

- Require exact string matching against pre-registered redirect URIs. Allow only the native loopback port exception defined by RFC 8252; do not generalize it to host, path, scheme, or other clients.
- Reject open redirectors at both client and authorization server boundaries.
- Never send authorization responses over unencrypted connections except the narrowly defined native loopback case.
- Prevent CSRF with a transaction-bound mechanism. PKCE can carry this burden only after support is known; otherwise use a one-time session-bound `state`, or OIDC `nonce` where its guarantees apply.
- For clients using multiple issuers, bind the chosen issuer to the user-agent session and validate the issuer in the authorization response. Prefer RFC 9207 `iss` or an equivalent signed response; distinct redirect URIs are the fallback.
- Do not use HTTP 307 after credential-bearing form submission; use 303 for an HTTP redirect.

### Authorization-code boundary

- Require PKCE for public clients and recommend it for confidential clients. Default to PKCE for all authorization-code clients unless an applicable profile says otherwise.
- Use `S256`, keep verifier/challenge transaction-specific, enforce the verifier, and reject a token request that supplies a verifier when the authorization request had no challenge.
- Make authorization codes short-lived and single-use. Treat a second redemption as a compromise signal; the authorization server SHOULD revoke all tokens previously issued based on that code.
- Do not mistake client authentication for protection against code injection; the legitimate confidential client can redeem an injected code.

### Token boundary

- Do not use the resource-owner-password grant. Avoid implicit or any response that returns access tokens from the authorization endpoint unless every specified injection and leakage vector is demonstrably mitigated.
- Never put access tokens in URI query parameters.
- Restrict access tokens by resource/audience and least privilege; require each resource server to enforce both.
- Prefer sender-constrained access tokens using DPoP or mTLS. Verify both token binding and proof at the resource server; possession of a bound token alone is insufficient.
- For public clients, sender-constrain refresh tokens or rotate them with reuse detection. Bind every refresh token to the consented scope and resource servers.
- Treat tokens as secrets in storage, transit, logs, traces, errors, URLs, analytics, and test fixtures. Do not make a storage claim more absolute than the applicable platform/profile supports; explain the threat and evidence.

### Deployment boundary

- Publish and consume authorization-server metadata; validate the issuer and do not mix endpoints or keys across issuers.
- At TLS-terminating proxies, strip or overwrite attacker-supplied security headers and protect the proxy-to-application hop against eavesdropping, injection, and replay.
- Prevent clickjacking across authorization, login, consent, device, and error pages with CSP `frame-ancestors` plus appropriate compatibility defenses.
- Keep third-party resources off authorization and callback pages where they can receive Referer data; set an intentional Referrer Policy.
- For `postMessage` flows, use exact registered target origins, never `*`, validate the sender origin exactly, and apply every ordinary authorization-response control.
- Do not enable CORS at the authorization endpoint. CORS is not an OAuth CSRF defense.

## Add the OIDC identity layer

For OIDC work, load `references/oidc-validation.md` and keep three concerns separate:

- `state` correlates the authorization response and protects the client callback.
- PKCE binds an authorization code to the initiating client instance and can protect against CSRF when support is assured.
- `nonce` binds an ID Token to an authentication transaction and can, under RFC 9700's stated conditions, protect a confidential OIDC client against code injection.

Validate an ID Token as a protocol object, not merely as a signed JWT. Bind the local account to `(iss, sub)`, validate the relying-party audience and authorized party, enforce time and nonce semantics, validate flow-specific token hashes when required, and require UserInfo `sub` to match the ID Token `sub`.

Do not parse an access token for identity at a client unless a specific access-token profile makes that a supported contract. Even a valid JWT access token is addressed to a resource server, not the relying party.

## Choose the task path

### Design or migration

1. Produce the security profile and trust-boundary diagram or flow trace.
2. State each transaction binding and token validation invariant.
3. Remove insecure grants before adding optional hardening.
4. Choose interoperable controls and confirm provider/library support from current primary documentation.
5. Define negative tests and observability before implementation.
6. For migrations, inventory every client and callback, stage compatibility deliberately, define rollback, and time-box any weaker transitional mode.

### Implementation

1. Use a maintained OAuth/OIDC library rather than hand-rolling protocol or cryptography.
2. Inspect the exact library version and configuration path; defaults and method names are not evidence.
3. Put validation at the trust boundary and fail closed before creating a session or forwarding a token.
4. Keep secrets and raw tokens out of telemetry. Record safe identifiers, decision reasons, issuer, client ID, audience, grant type, and replay events instead.
5. Add behavior-driven positive and negative tests. When production code changes, use the repository's testing/TDD workflow where available.

### Review or incident diagnosis

1. Follow an attack path from attacker capability to asset and impact; do not report parameter absence without proving applicability.
2. Distinguish **normative non-compliance**, **exploitable weakness**, **defense-in-depth gap**, and **unknown**.
3. Give file/line, configuration path, metadata field, HTTP trace, or reproducible scenario as evidence. Redact all credentials and token values.
4. During an incident, preserve evidence, contain token/code/credential exposure, revoke affected grants or token families, rotate compromised keys, and then fix the enabling control. Do not destroy evidence or probe systems outside authorization.
5. Use `references/review-and-delivery.md` for the report and completion contract.

## Reject false assurances

- Presence of `state` is not protection unless it is unpredictable, one-time, validated, and bound to the initiating session.
- PKCE is not client authentication, does not validate the issuer, and does not repair arbitrary authorization-request tampering.
- OIDC `nonce` is not a generic pure-OAuth defense and does not stop a thief redeeming a public client's stolen code.
- TLS does not stop endpoint mix-up, browser history, Referer leakage, open redirects, or a compromised endpoint.
- A valid JWT signature does not establish the expected issuer, audience, token type, freshness, nonce, or authorization.
- DPoP or mTLS cannot help when the attacker obtains both token and usable key material; XSS or a compromised client can collapse that boundary.
- CORS, SameSite cookies, client secrets in browser code, and hiding parameters are not substitutes for protocol bindings.
- A provider's successful happy path is not security evidence. Exercise hostile redirects, replay, issuer substitution, and validation failures.

## Delivery contract

Return:

1. **Scope and profile** — parties, client types, flows, issuers, resources, and standards applied.
2. **Flow and trust boundaries** — artifact bindings and validation points.
3. **Findings or design decisions** — requirement strength, evidence, attack scenario, remediation, and verification.
4. **Satisfied controls** — only those supported by evidence.
5. **Unknowns and assumptions** — never silently convert missing evidence into compliance.
6. **Tests and runtime checks** — positive, negative, replay, and failure-path coverage.
7. **Residual risk and migration constraints** — explicit exceptions, owners, and expiry dates.

Do not declare an OAuth/OIDC system secure merely because all happy-path tests pass or all checklist rows are filled. Declare only what the inspected evidence proves.
