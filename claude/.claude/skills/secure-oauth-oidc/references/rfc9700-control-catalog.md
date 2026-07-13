# RFC 9700 Control Catalog

Use this catalog to preserve the requirement strength and applicability of [RFC 9700 / BCP 240](https://www.rfc-editor.org/rfc/rfc9700.html). It is a navigation and review aid, not a substitute for the RFC. Follow the linked section when wording or an exception is disputed, and check the [RFC info/errata page](https://www.rfc-editor.org/info/rfc9700/) before making a high-stakes claim.

## Contents

- [How to classify a result](#how-to-classify-a-result)
- [Core baseline](#core-baseline)
- [Redirect and browser controls](#redirect-and-browser-controls)
- [Issuer and transaction binding](#issuer-and-transaction-binding)
- [Access and refresh token controls](#access-and-refresh-token-controls)
- [Deployment controls](#deployment-controls)
- [Applicability traps](#applicability-traps)

## How to classify a result

- **MUST / MUST NOT / REQUIRED** — report a violation when the control applies and contrary behavior is evidenced.
- **SHOULD / SHOULD NOT / RECOMMENDED** — require either implementation or a documented, deployment-specific reason with compensating controls and residual risk. Absence is not automatically the same severity as a MUST violation.
- **MAY** — an allowed option, not proof of security and not a mandatory control.
- Separate the RFC's normative strength from exploit severity. A conditional MUST can be inapplicable; a violated SHOULD can still be critical in a concrete threat model.
- RFC 9700 updates but does not replace RFCs 6749, 6750, and 6819. Requirements inherited from those RFCs still apply.

## Core baseline

| ID | Party / condition | Control | Strength | Source |
|---|---|---|---|---|
| B01 | All implementers | Upgrade ecosystems toward this BCP as soon as feasible. | RECOMMENDED | [§1](https://www.rfc-editor.org/rfc/rfc9700.html#section-1) |
| B02 | Authorization server comparing redirects | Compare the supplied redirect URI to a pre-registered URI by exact string matching. The only exception is the port of a native-app localhost loopback redirect. | MUST | [§2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1), [§4.1.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.1.3) |
| B03 | Client and authorization server | Do not expose endpoints that redirect to an arbitrary URI taken from a query parameter. | MUST NOT | [§2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1), [§4.11](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.11) |
| B04 | Client callback | Prevent CSRF. PKCE may provide the binding only when support is assured; OIDC `nonce` provides the OIDC binding; otherwise use a one-time `state` bound to the user agent. | MUST | [§2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1), [§4.7.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.7.1) |
| B05 | Client using two or more authorization servers | Implement a mix-up defense. Prefer issuer identification; distinct redirect URIs are the fallback. | REQUIRED / SHOULD | [§2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1), [§4.4.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.4.2) |
| B06 | Authorization server redirecting a request that may contain credentials | Prevent the redirect from forwarding the user's credentials. | MUST | [§2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1), [§4.12](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.12) |
| B07 | Authorization-code client | Prevent code injection and code misuse with a client-instance / transaction binding. | MUST | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1) |
| B08 | Public authorization-code client | Use PKCE. | MUST | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1) |
| B09 | Confidential authorization-code client | Use PKCE by default. A confidential OIDC client may instead use `nonce` only with the precautions in §4.5.3.2. | RECOMMENDED / conditional MAY | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1), [§4.5.3.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.5.3.2) |
| B10 | PKCE or OIDC `nonce` | Make the value transaction-specific and securely bind it to the client and initiating user agent. | MUST | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1) |
| B11 | PKCE client | Use a challenge method that does not reveal the verifier in the authorization request; `S256` is the only method identified by RFC 9700. | SHOULD | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1) |
| B12 | Authorization server | Support PKCE. | MUST | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1) |
| B13 | Authorization server receiving a valid challenge | Enforce the matching verifier at the token endpoint. | MUST | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1) |
| B14 | Authorization server | Reject a token request containing `code_verifier` when the authorization request for that code contained no `code_challenge`. | MUST | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1), [§4.8.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.8.2) |
| B15 | Authorization server | Provide a way for clients to determine PKCE support; publish `code_challenge_methods_supported` in metadata where possible. | MUST / RECOMMENDED | [§2.1.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.1) |
| B16 | Client considering implicit or another token-at-authorization-endpoint response | Do not use it unless access-token injection and every named leakage vector are mitigated; prefer a response that issues access tokens at the token endpoint. | SHOULD NOT / SHOULD | [§2.1.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1.2) |
| B17 | Authorization and resource servers | Use sender-constrained access tokens, such as mTLS or DPoP, to reduce stolen-token replay. | SHOULD | [§2.2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.2.1) |
| B18 | Public client receiving refresh tokens | Sender-constrain refresh tokens or rotate them with reuse detection. | MUST | [§2.2.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.2.2), [§4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2) |
| B19 | Authorization server / access token design | Restrict privileges to the minimum required and restrict the token to intended resources and actions. | SHOULD | [§2.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.3) |
| B20 | Authorization server / access token design | Audience-restrict an access token to one resource server, or a small set when one is infeasible. | SHOULD | [§2.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.3) |
| B21 | Resource server | Refuse a token not intended for that resource server. | MUST | [§2.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.3) |
| B22 | Any OAuth deployment | Do not use the resource-owner-password-credentials grant. | MUST NOT | [§2.4](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.4) |
| B23 | Authorization server where credentials can be issued and kept confidential | Enforce client authentication; prefer asymmetric client authentication such as mTLS or `private_key_jwt`. | SHOULD / RECOMMENDED | [§2.5](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.5) |
| B24 | Authorization server and client | Publish and consume RFC 8414 authorization-server metadata when available. | RECOMMENDED | [§2.6](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.6) |
| B25 | Client-to-resource-server path | Use end-to-end TLS conforming to BCP 195; when TLS terminates earlier, apply §4.13. | RECOMMENDED | [§2.6](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.6) |
| B26 | Authorization response | Do not transmit it over an unencrypted connection. Do not register `http` redirects except native-app loopback redirects under RFC 8252. | MUST NOT | [§2.6](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.6) |
| B27 | Authorization endpoint | Do not support CORS. Browser-direct endpoints such as token, metadata, JWKS, and dynamic registration may support it when needed. | MUST NOT | [§2.6](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.6) |
| B28 | Every implementation | Extend the RFC's minimal A1–A5 attacker model with attackers relevant to the actual environment. | MUST | [§3](https://www.rfc-editor.org/rfc/rfc9700.html#section-3) |

## Redirect and browser controls

| ID | Party / condition | Control | Strength | Source |
|---|---|---|---|---|
| R01 | Web server hosting a redirect URI | Do not expose an open redirector. | MUST NOT | [§4.1.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.1.3) |
| R02 | Redirect-based client | Prefer the authorization-code response type over a response that issues an access token at the authorization endpoint. | SHOULD | [§4.1.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.1.3) |
| R03 | Authorization and callback pages | Avoid third-party resources and links to external sites; suppress Referer data with an appropriate Referrer Policy as defense in depth. | SHOULD NOT / mitigation | [§4.2.4](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.2.4) |
| R04 | Authorization server | Invalidate each authorization code after first token-endpoint use. On a second redemption attempt, revoke tokens derived from that code. | MUST / SHOULD | [§4.2.4](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.2.4) |
| R05 | Client | Invalidate `state` after its first callback use. | SHOULD | [§4.2.4](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.2.4) |
| R06 | Client | Do not pass access tokens in URI query parameters. | MUST NOT | [§4.3.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.3.2) |
| R07 | Authorization server with an invalid `client_id` / `redirect_uri` combination | Do not automatically redirect the user agent. | MUST NOT (inherited from RFC 6749) | [§4.11.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.11.2) |
| R08 | Authorization server redirecting to a registered client | Always authenticate the user before redirecting. Except for silent authentication, prompt the user for credentials when needed before redirecting. Take precautions against attacker-registered phishing redirects. | MUST | [§4.11.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.11.2) |
| R09 | Authorization server automatically redirecting | Automatically redirect only to a redirect URI the server trusts; otherwise warn or require a user decision. | SHOULD | [§4.11.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.11.2) |
| R10 | Redirect after a request that may contain user credentials | Do not use 307. If using HTTP redirection, use 303. | MUST NOT / SHOULD | [§4.12](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.12) |
| R11 | Authorization server UI | Prevent clickjacking across authorization and related authentication/authorization pages; use CSP Level 2+ in addition to compatible defenses. | MUST / SHOULD | [§4.16](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.16) |
| R12 | In-browser authorization response sender | Compare receiver origins exactly, send only to trusted registered origins, and never use a wildcard `postMessage` target. | MUST / MUST NOT | [§4.17.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.17.2) |
| R13 | In-browser authorization response receiver | Prevent message injection and compare the initiator origin exactly with the expected authorization-server origin. | MUST | [§4.17.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.17.2) |
| R14 | Any in-browser response transport | Apply all §2.1 authorization-response protections even though the transport is not an HTTP redirect. | MUST | [§4.17.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.17.2) |

## Issuer and transaction binding

| ID | Party / condition | Control | Strength | Source |
|---|---|---|---|---|
| I01 | Multi-issuer client | For every authorization request, store the selected issuer (or equivalent endpoint-tuple identifier) and bind it to the user agent. Storing only the authorization endpoint URL is insufficient. | MUST | [§4.4.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.4.2) |
| I02 | Client using issuer identification | Compare the issuer in the authorization response with the stored issuer and abort on mismatch; evaluate `iss` under RFC 9207. | MUST | [§4.4.2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.4.2.1) |
| I03 | Client using distinct-redirect fallback | Use a different redirect URI per issuer, compare the actual callback URI to the issuer's registered URI, and abort on mismatch. Use this defense only when issuer identification is unavailable. | MUST / SHOULD only as fallback | [§4.4.2.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.4.2.2) |
| I04 | Confidential OIDC client using `nonce` against code injection | Validate `nonce` in the ID Token returned from the token endpoint, even if an earlier ID Token arrived at the authorization endpoint. Do not use any returned ID or access token before that succeeds. | MUST | [§4.5.3.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.5.3.2) |
| I05 | Client relying on PKCE as its CSRF control | First establish that the authorization server supports PKCE. If support is absent or unknown, use `state` or OIDC `nonce`. | MUST | [§4.7.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.7.1) |
| I06 | Client carrying application data in `state` | When integrity matters, bind the state to the browser session and/or sign or encrypt it to prevent tampering and swapping. | MUST | [§4.7.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.7.1) |

## Access and refresh token controls

| ID | Party / condition | Control | Strength | Source |
|---|---|---|---|---|
| T01 | Authorization server | Ensure access tokens are sender-constrained and audience-restricted where architecture permits. | SHOULD | [§4.10](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.10) |
| T02 | Resource server | Treat access tokens as sensitive secrets; never store or transfer them in plaintext. | MUST | [§4.9.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.9.3) |
| T03 | Authorization server deciding on refresh tokens | Perform a client/use-case risk assessment before issuing refresh tokens. | MUST | [§4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2) |
| T04 | Authorization server issuing refresh tokens | Bind each refresh token to the scope and resource servers consented by the resource owner. | MUST | [§4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2) |
| T05 | Public-client refresh-token family | Use sender constraint or rotation with reuse detection; on detected reuse, revoke the active family/grant as defined by the mechanism. | MUST | [§4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2) |
| T06 | Self-contained refresh token encoding its grant | Integrity-protect the refresh-token value. | MUST | [§4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2) |
| T07 | Refresh token | Expire it after a deployment-defined inactivity period. | SHOULD | [§4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2) |
| T08 | Authorization server sharing a namespace between client IDs and user subjects | Do not let clients choose values that can impersonate users; if unavoidable, give the resource server an unambiguous way to distinguish client-only from user grants. | SHOULD NOT / MUST fallback | [§4.15.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.15.1) |

## Deployment controls

| ID | Party / condition | Control | Strength | Source |
|---|---|---|---|---|
| D01 | TLS-terminating reverse proxy | Sanitize inbound security-relevant headers so outside callers cannot supply trusted proxy assertions. | MUST | [§4.13](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.13) |
| D02 | Reverse-proxy-to-application hop | Ensure the authenticity of the communicating entities, and protect the link against eavesdropping, injection, and replay. | Essential (non-BCP14) / MUST for link protection | [§4.13](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.13) |
| D03 | Resource server evaluating token audience/privilege | Enforce the intended audience and authorized action on every protected request, not merely at token issuance. | MUST for audience refusal; enforcement invariant for privilege | [§2.3](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.3) |

## Applicability traps

- **Exact redirect matching is not origin matching.** Compare the full registered string under RFC 3986 simple string comparison. Do not normalize, wildcard, suffix-match, or silently ignore query/path differences.
- **The loopback exception is narrow.** It permits a variable port for a native app's localhost loopback redirect. It does not permit arbitrary `http`, wildcard hosts, arbitrary paths, or browser/server clients.
- **A single-issuer client does not need a mix-up defense solely for RFC 9700.** Verify that issuer choice cannot become dynamic through tenant input, discovery, configuration, or attacker-controlled metadata before calling it single-issuer.
- **PKCE support is not the same as PKCE enforcement.** Check challenge generation, code binding, verifier validation, and downgrade rejection.
- **Confidential client authentication does not close code injection.** The legitimate client performs the authenticated exchange for the attacker.
- **OIDC `nonce` is a conditional alternative for confidential clients, not a public-client PKCE replacement.** Follow I04 and the OIDC validation reference.
- **Sender constraint requires enforcement by the resource server.** A `cnf` claim or `DPoP` token type without proof validation and replay controls is decoration.
- **Refresh rotation without family/reuse state is ordinary replacement, not replay detection.** Verify the server retains the relationship and revokes the surviving family after reuse.
- **RFC 9700 is a baseline, not a complete protocol profile.** Add OIDC Core, RFC 8252, RFC 9449, FAPI, or other applicable requirements rather than attributing them all to RFC 9700.
