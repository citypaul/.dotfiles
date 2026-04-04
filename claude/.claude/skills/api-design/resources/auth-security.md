# Authentication and Token Security

Deep-dive on JWT and OAuth 2.0 security based on RFC 8725 "JWT Best Current Practices" (BCP 225, February 2020) and RFC 9700 "Best Current Practice for OAuth 2.0 Security" (BCP 240, January 2025). See `api-security.md` for OWASP API Top 10 and authentication pattern selection. See `http-fundamentals.md` for browser security headers.

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

## OAuth 2.0 Security (RFC 9700)

### Grant Type Selection

| Grant Type | Recommendation |
|-----------|---------------|
| Authorization Code + PKCE | Use for ALL client types (web apps, native apps, SPAs) |
| Resource Owner Password Credentials | MUST NOT use. Exposes credentials to client, prevents MFA/WebAuthn. |
| Implicit (`response_type=token`) | SHOULD NOT use. Tokens leak via URLs, browser history, and Referer headers. |

### PKCE (Proof Key for Code Exchange)

PKCE is mandatory, not optional:

- Authorization servers MUST support PKCE (RFC 7636)
- Public clients MUST use PKCE. Confidential clients SHOULD also use PKCE.
- Use `S256` as the code challenge method (not `plain`)
- Challenge and verifier MUST be transaction-specific and securely bound to the client and user agent
- Authorization servers MUST enforce `code_verifier` at the token endpoint if `code_challenge` was present
- Authorization servers MUST prevent PKCE downgrade attacks: reject a `code_verifier` if no `code_challenge` was in the original request

### Redirect URI Validation

- Authorization servers MUST use exact string matching for redirect URIs. No pattern matching, no wildcards.
- Exception: native apps using localhost, where variable port numbers MUST be allowed.
- MUST NOT allow `http://` redirect URIs except for native apps using loopback interface.
- Clients and authorization servers MUST NOT expose open redirectors -- endpoints that forward the browser to arbitrary URIs from query parameters.

### Token Handling

**Access tokens:**
- MUST NOT pass in URI query parameters (e.g., `?access_token=...`). Use the `Authorization` header. Query parameters leak via browser history, server logs, and Referer headers.
- SHOULD be audience-restricted to specific resource servers. Resource servers MUST verify the audience.
- SHOULD be restricted to minimum required privileges (scope, resources, actions).
- SHOULD be sender-constrained via DPoP (RFC 9449) or Mutual TLS (RFC 8705) to prevent stolen token replay.

**Refresh tokens:**
- For public clients, MUST be sender-constrained or use refresh token rotation.
- MUST be bound to the scope and resource servers as consented by the resource owner.
- SHOULD expire after inactivity (no refresh request for a period).

**Authorization codes:**
- MUST be invalidated after first use.
- If a code is redeemed twice, the authorization server SHOULD revoke all tokens previously issued for that code.

### CSRF Defense

Clients MUST prevent CSRF on their redirection endpoint. Acceptable mechanisms:

1. **PKCE** (if the authorization server definitely supports it)
2. **OpenID Connect `nonce`**
3. **One-time-use `state` parameter** cryptographically bound to the user agent session

### Redirect Security

- Authorization servers MUST NOT use HTTP 307 redirects for requests that may contain user credentials (e.g., login form POSTs). Use HTTP 303 instead, which rewrites POST to GET and drops the form body.
- The OAuth redirect landing page SHOULD NOT include third-party resources or external links.
- Apply `Referrer-Policy: no-referrer` to suppress credential leakage via Referer headers.
- Invalidate `state` after first use at the redirection endpoint.

### Clickjacking Prevention

Authorization servers MUST prevent clickjacking on authorization endpoints and login pages:

- `Content-Security-Policy: frame-ancestors 'none'` (or specific trusted origins)
- `X-Frame-Options: DENY`
- Frame-busting JavaScript as a fallback

### Authorization Server Metadata

- Publish OAuth Authorization Server Metadata (RFC 8414) and have clients consume it.
- Prevents misconfiguration and facilitates key rotation and feature discovery.

### postMessage Security (Browser-Based Flows)

- MUST NOT use wildcard origins (`"*"`) when sending authorization responses via postMessage.
- Authorization servers MUST send only to the pre-registered, exact client origin.
- Clients MUST validate the sender origin using exact string matching.

## Practical Checklist

When implementing auth in a TypeScript application:

- [ ] JWT algorithms hardcoded in verification config (never from token header alone)
- [ ] `iss`, `sub`, `aud`, and `exp` validated on every JWT
- [ ] Explicit `typ` header on issued JWTs to prevent cross-JWT confusion
- [ ] Authorization Code + PKCE (S256) for all OAuth flows
- [ ] Tokens stored in memory or httpOnly cookies, never in URLs or localStorage
- [ ] Tokens sent via `Authorization` header, never as query parameters
- [ ] Exact redirect URI matching, no patterns or wildcards
- [ ] `Referrer-Policy: no-referrer` on OAuth callback pages
- [ ] CSP `frame-ancestors` on auth-related pages
- [ ] Refresh tokens rotated or sender-constrained for public clients
- [ ] Authorization codes invalidated after first use
- [ ] Short-lived access tokens with narrow audience and scope
