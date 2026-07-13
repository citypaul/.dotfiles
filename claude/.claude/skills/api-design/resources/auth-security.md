# Authentication and Token Security

Deep-dive on JWT security based on RFC 8725 "JWT Best Current Practices" (BCP 225, February 2020). See `api-security.md` for OWASP API Top 10 and authentication pattern selection, `http-fundamentals.md` for browser security headers, and the `secure-oauth-oidc` skill for OAuth 2.0 or OpenID Connect design, implementation, review, testing, and migration.

## JWT Security (RFC 8725)

### Algorithm Allowlisting

The most critical JWT security rule. Never let the JWT header's `alg` value alone dictate which algorithm is used -- this is the root cause of the `alg: "none"` and RSA/HMAC confusion attacks.

```typescript
// ❌ WRONG -- library picks algorithm from token header
const payload = jwt.verify(token, key);

// ✅ CORRECT -- caller specifies accepted algorithms
const payload = jwt.verify(token, key, { algorithms: ['ES256'] });
```

Rules:
- Libraries MUST let the caller specify which algorithms are acceptable
- Libraries MUST NOT use any algorithm not in the caller's allowlist
- SHOULD NOT generate or consume JWTs using `alg: "none"` unless the JWT is already protected end-to-end by TLS
- Each key MUST be used with exactly one algorithm, enforced at configuration time

### Claim Validation

Every JWT consumer MUST validate these claims:

| Claim | Validation |
|-------|-----------|
| `iss` (issuer) | Confirm the signing/encryption keys actually belong to the claimed issuer. Reject on mismatch. |
| `sub` (subject) | Confirm the subject value corresponds to a valid subject and/or issuer-subject pair. |
| `aud` (audience) | When the same issuer issues JWTs for multiple parties, check `aud` matches your own identifier. Reject if absent or mismatched. |
| `exp` (expiration) | Reject expired tokens. |

### Explicit Typing

Use the `typ` header to prevent cross-JWT confusion (e.g., using an access token where a refresh token is expected):

```typescript
// Access token
{ "typ": "at+jwt", "alg": "ES256" }

// Refresh token
{ "typ": "rt+jwt", "alg": "ES256" }
```

When multiple kinds of JWTs can be issued by the same issuer, use mutually exclusive validation rules: distinct `typ` values, different required claims, different keys, different `aud` values, or different issuers.

### Input Sanitization

JWT header values are attacker-controlled input:

- **`kid`** (key ID) -- sanitize before use in database queries. Can be a SQL/LDAP injection vector.
- **`jku`** and **`x5u`** -- contain URLs that the verifier may fetch. Validate against an allowlist. Ensure no cookies are sent in the fetch request (prevent SSRF).

### Encoding and Compression

- MUST use UTF-8 for all JSON encoding/decoding in headers and claims
- SHOULD NOT compress data before encryption -- compression leaks information about plaintext content (CRIME/BREACH-style compression oracle attacks)

## OAuth and OpenID Connect routing

Load the `secure-oauth-oidc` skill for any OAuth 2.0 or OIDC work. Its RFC 9700 control catalog preserves normative strength and applicability, while its OIDC guide covers issuer and transaction binding, Discovery, ID Token validation, UserInfo subject matching, multi-issuer clients, logout, and negative tests. Do not recreate an OAuth checklist here: protocol controls must be selected from the complete flow, client type, trust topology, and applicable profile.

## JWT review checklist

- [ ] Accepted algorithms are configured by the verifier, not selected from an untrusted token header
- [ ] Keys are bound to exactly one algorithm and expected issuer
- [ ] The validation rules distinguish each JWT kind and prevent cross-JWT substitution
- [ ] Required claims and application-specific semantics are validated before the payload is consumed
- [ ] `kid`, `jku`, and `x5u` cannot cause injection, SSRF, or trust in attacker-selected keys
- [ ] Tokens and claims containing sensitive data are excluded from URLs, logs, traces, and errors
