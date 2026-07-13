# OpenID Connect Security and Validation

Use this reference with [OpenID Connect Core 1.0, Errata Set 2](https://openid.net/specs/openid-connect-core-1_0.html), [OpenID Connect Discovery 1.0, Errata Set 2](https://openid.net/specs/openid-connect-discovery-1_0.html), RFC 9700, and RFC 8725. It describes a safe implementation order; follow the exact flow/profile section for normative details.

## Contents

- [Keep protocol objects separate](#keep-protocol-objects-separate)
- [Transaction and issuer binding](#transaction-and-issuer-binding)
- [Discovery and key trust](#discovery-and-key-trust)
- [Atomic ID Token validation](#atomic-id-token-validation)
- [Flow-specific validation](#flow-specific-validation)
- [UserInfo and subject identity](#userinfo-and-subject-identity)
- [Refresh and session continuity](#refresh-and-session-continuity)
- [Negative test matrix](#negative-test-matrix)
- [False assurances](#false-assurances)

## Keep protocol objects separate

| Object | Intended consumer and purpose | Never use it as |
|---|---|---|
| ID Token | The registered relying party; asserts an authentication event and subject under an issuer. | An API bearer token or general authorization decision. |
| Access token | The intended resource server; authorizes scoped/resource-bound access. It may be opaque to the client. | Proof that the current browser user authenticated, or a substitute for an ID Token. |
| Authorization code | Authorization server token endpoint; one-time intermediate credential bound to client/redirect/transaction. | User identity or a reusable session credential. |
| Refresh token | Authorization server; continues a grant under client, scope, resource, replay, and lifetime controls. | A resource-server credential or evidence of a fresh user authentication. |
| `state` | Client callback correlation/CSRF control and optionally protected application state. | Issuer validation, proof of user identity, or PKCE verifier. |
| PKCE verifier/challenge | Client-instance binding for an authorization code; can also protect CSRF when support is assured. | Client authentication, issuer validation, or access-token sender constraint. |
| OIDC `nonce` | ID Token-to-authentication-transaction binding and replay signal. | A universal pure-OAuth CSRF control or a public-client replacement for PKCE. |

Request OIDC with the `openid` scope. A provider returning OAuth tokens without an ID Token under a non-OIDC flow has not authenticated the user to the client.

## Transaction and issuer binding

Before redirecting, store server-side or in an integrity-protected transaction record:

- expected issuer and the issuer-bound metadata version/endpoints;
- client ID and exact redirect URI;
- response type/mode and requested scopes/resources;
- one-time state, nonce, PKCE verifier/challenge/method;
- creation/expiry time and initiating browser/session binding;
- requested `max_age`, `acr`, essential claims, and any profile fields.

On callback, select this record by a non-secret correlation handle and validate it before code exchange. Do not select an issuer, token endpoint, JWKS URL, or algorithm from untrusted callback/token fields.

For a multi-issuer RP:

1. Bind the intended issuer to the initiating browser transaction.
2. Validate authorization-response issuer identification before sending the code to any token endpoint. Prefer RFC 9207 `iss`, JARM, or an ID Token returned in the authorization response and processed as RFC 9207 requires.
3. Compare the received issuer with the stored issuer exactly and abort on mismatch.
4. Use only the token endpoint, keys, UserInfo endpoint, and algorithms bound to that expected issuer.

Validating only the ID Token returned by the token endpoint is too late to stop a mix-up: the client may already have sent the code or credentials to the wrong endpoint.

## Discovery and key trust

Build one unbroken trust chain:

```text
issuer selected for the transaction
  = issuer used to retrieve /.well-known/openid-configuration
  = metadata issuer
  = authorization-response issuer
  = ID Token iss
```

Rules:

- Treat the issuer as a case-sensitive HTTPS URL with no query or fragment. A path component is significant.
- Compare issuer strings exactly. Do not apply Unicode normalization, add/remove trailing slashes, lowercase paths, or alias tenant URLs.
- Require the metadata `issuer` to equal the issuer used to retrieve the document. Abort and discard the metadata on any validation failure.
- Validate TLS server identity and follow current BCP 195. Apply an explicit allowlist/tenant policy when user input can initiate Discovery; block SSRF targets such as loopback, link-local, private/internal networks, alternate URL schemes, and unsafe redirects unless the deployment deliberately supports them.
- Bind authorization, token, UserInfo, JWKS, registration, revocation, and logout endpoints to the validated issuer. Never compose a configuration from multiple discovery documents.
- Fetch signing keys only from the validated issuer's metadata/trust configuration. Do not follow an untrusted token `jku`/`x5u`, use `iss` as an arbitrary fetch URL, or choose a key solely by `kid` without issuer and algorithm context.
- Cache metadata/keys with bounded lifetime and safe key rotation. On an unknown `kid`, perform at most a bounded refresh from the already trusted `jwks_uri`; rate-limit it and reject if no valid issuer key exists.
- Pin allowed algorithms to the registration/profile and issuer metadata. Do not let the JOSE header expand the allowlist or switch key families.

When identifier-based Issuer Discovery uses WebFinger:

- apply the exact OIDC Discovery identifier-normalization algorithm; protect any browser form that accepts the identifier against CSRF;
- use TLS with certificate validation and request the exact `http://openid.net/specs/connect/1.0/issuer` relation (the `rel` request filter is RECOMMENDED);
- accept the issuer only from an `href` for that exact relation and require an HTTPS URI with a host and no query or fragment;
- do not assume the identifier's host and the returned issuer are related—the specification explicitly permits them to differ, so apply the RP's issuer/tenant trust policy before starting authentication;
- require the provider metadata `issuer` to equal the WebFinger issuer, the configuration-request issuer, and every resulting ID Token `iss` exactly.

For an issuer with a path, construct the OIDC configuration URL using Discovery §4.1 rather than a generic RFC 8414 helper whose well-known transformation may differ. Preserve the issuer string itself unchanged for all equality checks.

## Atomic ID Token validation

Validate all requirements before creating/updating a local session, accepting account linkage, calling UserInfo for identity, or using any returned access token. A safe order is:

First enforce the ID Token schema: `iss`, `sub`, `aud`, `exp`, and `iat` are required by OIDC Core. Require a case-sensitive `sub` string no longer than 255 ASCII characters. Treat `acr`, `amr`, roles, groups, email, and other claims as claims to validate under application policy—not automatic authorization facts.

1. **Load expected context.** Select the stored transaction, expected issuer, client ID, negotiated algorithms/encryption, issuer keys, nonce, and requested assurance values. Do not trust token claims yet.
2. **Parse defensively.** Enforce compact-JWT structure and size/complexity limits. Treat JOSE headers and claims as attacker-controlled data.
3. **Decrypt when negotiated.** Use the registered algorithms/keys. If encrypted ID Tokens were negotiated and the token is not encrypted, reject by default (OIDC Core says the RP should reject).
4. **Verify cryptographic protection.** Require a signature under an allowed algorithm and a key belonging to the expected issuer as the secure default. OIDC Core permits TLS server validation instead for an ID Token received directly from the token endpoint in code flow; use that exception only when explicitly justified and no stricter profile applies.
5. **Validate `iss`.** Require exact equality with the expected issuer selected before token parsing.
6. **Validate subject and audience.** Require a valid `sub`. Require `aud` to contain the RP's issuer-specific `client_id`; reject the token if the RP is absent or if additional audiences are not trusted. Validate `azp` according to the applicable extension/profile; when present, require it to identify the intended client unless that profile defines otherwise.
7. **Validate time.** Require numeric `exp` and `iat`; current time must be before `exp`, with small documented clock skew. Apply an `iat` future/maximum-age policy appropriate to replay retention and the profile. Validate `nbf` when the token/profile uses it.
8. **Validate transaction.** If nonce was sent, require an exact match and enforce the deployment's one-time/replay policy. Follow the special RFC 9700 code-injection ordering below.
9. **Validate requested assurance.** If `max_age` or `auth_time` was requested, enforce authentication recency. If `acr` or another essential claim was requested, validate that the returned value satisfies—not merely exists for—the policy.
10. **Validate flow hashes and profile claims.** Enforce `at_hash`, `c_hash`, JARM claims, or other bindings when the selected response type/profile requires them.
11. **Commit atomically.** Mark the transaction/nonce/state used and create or update the session in one race-safe operation. Discard all tokens on any failure.

Use a mature OIDC validator configured with the expected context. Do not implement JOSE, hash-claim, or key-selection cryptography from scratch.

## Flow-specific validation

### Authorization code flow

- Apply RFC 9700 authorization code + PKCE controls; public RPs still MUST use PKCE.
- Validate the token response under OAuth and then the ID Token under OIDC Core §3.1.3.7.
- If using OIDC `nonce` instead of PKCE as the RFC 9700 code-injection defense for a confidential client, validate the nonce in the ID Token from the **token endpoint**, even if a front-channel ID Token was received. Disregard every ID Token and access token until it succeeds.
- In plain code flow, `at_hash` in the token-endpoint ID Token is optional under OIDC Core; if present, it may be validated. Do not misreport its absence as an OIDC violation unless another profile requires it.

### Implicit flow

RFC 9700 says clients SHOULD NOT use responses that issue access tokens at the authorization endpoint unless injection and leakage are comprehensively mitigated. Prefer migration to code + PKCE.

If an applicable legacy profile still permits it:

- validate the ID Token signature (the direct-token TLS exception does not apply to front-channel tokens);
- require and validate nonce;
- when an access token is returned with the ID Token, require `at_hash` and validate it against that access token;
- validate state/issuer/response mode and still sender-constrain/audience-restrict the access token because hash validation does not prevent direct replay at a resource server.

### Hybrid flow

Prefer code + PKCE unless a profile specifically requires hybrid behavior.

- Validate the front-channel ID Token as a front-channel token, including signature and nonce.
- When the front-channel response includes an access token, require and validate `at_hash`.
- When it includes a code with an ID Token, require `c_hash`; validate it as the profile/Core flow requires.
- Validate the token-endpoint ID Token independently under code-flow rules. When both ID Tokens are returned, require identical `iss` and `sub` and apply the profile's consistency rules to authentication claims.

### JARM

Treat a JARM response JWT as its own typed authorization-response object. Validate signature/encryption, expected issuer, client audience, time, response mode, state, and profile-specific replay claims before extracting a code. JARM strengthens response integrity; it does not remove PKCE, redirect, token, or resource-server controls unless its complete profile explicitly says so.

## UserInfo and subject identity

- Call only the validated issuer's HTTPS UserInfo endpoint using an access token intended for it.
- Validate the UserInfo response format, negotiated encryption/signature, and TLS/issuer context.
- Require UserInfo `sub` and compare it exactly with the validated ID Token `sub`. On mismatch, discard the entire UserInfo response.
- Key the local federated identity by the tuple `(iss, sub)`. OIDC Core guarantees uniqueness/stability only for that pair.
- Do not key accounts by email, phone, display name, username, or an unqualified `sub`. These claims can change, collide, be reassigned, or differ across issuers.
- Treat account linking, issuer migration, and email-based discovery as privileged workflows with explicit reauthentication and anti-takeover controls. `email_verified` is not universal proof of durable account ownership.
- Minimize requested scopes/claims and avoid placing unnecessary personal data in ID Tokens, logs, sessions, or analytics.

## Refresh and session continuity

When an OP issues a new ID Token during refresh:

- validate it again before use;
- require `iss`, `sub`, and the complete `aud` value to be exactly the same as in the original ID Token;
- require `iat` to represent the new ID Token's issuance time;
- preserve the original authentication time semantics: when present, `auth_time` describes the original authentication, not the refresh;
- expect `nonce` to be absent (OIDC Core says it SHOULD NOT be included); if it is present, require it to equal the original ID Token's nonce exactly;
- apply the selected extension's refreshed-`azp` consistency rules when that extension causes `azp` to be present;
- do not interpret refresh as fresh user authentication or satisfaction of a new `max_age`/step-up requirement;
- apply RFC 9700 refresh-token rotation/sender-constraint, scope/resource binding, inactivity, and revocation controls.

Session/logout specifications add their own issuer, audience, browser, and token-hint rules. Load and validate the exact logout/session specification in use; do not infer logout security from OIDC Core alone. Local logout, OP logout, refresh-token revocation, access-token expiry, and back-channel session termination are different events.

## Negative test matrix

| Boundary | Reject these cases before session/token use |
|---|---|
| Transaction | Missing, wrong, replayed, expired, cross-browser, or concurrently reused state/nonce/PKCE transaction. |
| Issuer | Different host/path/port, trailing-slash alias, Unicode-normalized equivalent, wrong authorization-response `iss`, token `iss` chosen before stored context. |
| Discovery | Malicious/cross-site identifier submission; unsafe normalization; wrong WebFinger relation; non-HTTPS/query/fragment issuer; untrusted cross-host issuer; metadata issuer mismatch; attacker JWKS/token/UserInfo endpoint; redirect to internal address; mixed endpoints from two issuers; stale/unknown key without bounded refresh. |
| JOSE | `alg=none`, disallowed algorithm, algorithm/key-type confusion, wrong issuer key, attacker `jku`/`x5u`, duplicate/ambiguous headers, invalid encryption nesting. |
| Audience | Missing client ID, client ID for another issuer/tenant, untrusted additional audiences, wrong `azp`. |
| Time/assurance | Expired token, excessive skew, implausible `iat`, stale `auth_time` under `max_age`, unacceptable `acr`, missing essential claim. |
| Flow binding | Wrong/missing nonce, `at_hash`, or `c_hash` where required; swapped code/access token; front-channel token accepted under token-endpoint rules. |
| UserInfo | Wrong endpoint/issuer, invalid content type/signature, `sub` absent or different from ID Token, over-broad claims. |
| Refresh | Changed `iss`/`sub`/audience, refresh treated as reauthentication, replayed refresh token, scope/resource escalation. |

Also assert atomic failure: no cookie/session, account link, UserInfo-derived identity, API request, token cache write, or user-visible logged-in state exists after rejection.

## False assurances

- **“The JWT library verified it.”** Verify exactly which algorithms, key source, issuer, audience, times, nonce, hashes, and token type were configured.
- **“We compare `iss` after decoding.”** An unverified claim must not choose the key URL or endpoint used to validate itself.
- **“Discovery handles multi-tenancy.”** Discovery creates data to validate; it does not make a user-supplied issuer trusted or bind the issuer to a browser transaction.
- **“`sub` is globally unique.”** Only `(iss, sub)` is the stable identifier guaranteed by OIDC Core.
- **“Verified email means same account.”** Email is a mutable attribute and account-linking input, not the protocol subject key.
- **“UserInfo is from the same user because the access token came with the ID Token.”** OIDC Core explicitly requires exact `sub` comparison to prevent token substitution.
- **“Nonce replaces PKCE.”** Not for public clients, not for code theft redeemed directly, and not without validating the token-endpoint ID Token before any token use.
- **“An ID Token can call our API.”** Its audience is the RP; APIs require access tokens intended and validated for the resource server.
- **“A JWT access token can log the user in.”** It is an authorization credential for its resource server and may have different subject semantics, including client-only grants.
- **“Logout invalidates everything.”** Prove which local session, OP session, refresh grant, access token, and downstream session actually terminates.
