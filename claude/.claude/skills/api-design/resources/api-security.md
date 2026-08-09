# API Security

Deep-dive on security at the API boundary. See the main `api-design` skill for validation patterns and error security (RFC 9457 §5). See the `typescript-strict` skill for schema-first validation at trust boundaries.

## OWASP API Security Top 10 (2023)

The authoritative security checklist for APIs. Ordered by prevalence and impact.

### 1. Broken Object Level Authorization (BOLA)

The most common and dangerous API vulnerability. The API doesn't verify that the authenticated user has access to the specific object they're requesting.

```typescript
// ❌ WRONG — only checks authentication, not authorization
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const order = await orderService.getById(req.params.id);
  return res.json(order); // Any authenticated user can see ANY order
});

// ✅ CORRECT — the lookup is scoped to the authenticated principal
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const order = await orderService.findForUser(req.params.id, req.user.id);
  if (!order) {
    return res.status(404).json({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Order not found',
    });
  }
  return res.json(order);
});
```

Prefer a principal-scoped lookup so a missing order and an order owned by someone else produce the same absence result. Return the same 404 status and representation in both cases—confirming an object exists is itself an information leak—and avoid materially different timing where practicable. Keep any diagnostic or audit context out of the response and in protected internal telemetry.

### 2. Broken Authentication

Weak authentication mechanisms, missing rate limiting on auth endpoints, credential stuffing.

Mitigations:
- Rate limit authentication endpoints aggressively
- Use strong password policies or passwordless auth
- Throttle repeated failures by account and source with exponential backoff;
  use temporary lockout only after a threat-modelled threshold/window, with
  safe recovery, monitoring, and protection against attacker-induced denial
  of service
- Never expose whether an email/username exists in error responses ("Invalid credentials" not "User not found")

### 3. Broken Object Property Level Authorization

Mass assignment — accepting fields the user shouldn't be able to set. Excessive data exposure — returning fields the user shouldn't see.

```typescript
// ❌ WRONG — accepts any field from the request body
const user = await userService.update(req.params.id, req.body);

// ✅ CORRECT — explicitly pick allowed fields
const allowedUpdates = UpdateUserSchema.parse(req.body);
const user = await userService.update(req.params.id, allowedUpdates);
```

Boundary validation prevents mass assignment only when the schema is explicitly
closed or strips unknown keys before the service sees them. Some validators
retain additional properties by default or offer passthrough modes. Use an
allowlist and keep a negative test proving privileged unknown fields cannot
reach the operation (see `typescript-strict`).

### 4. Unrestricted Resource Consumption

Missing rate limits, no pagination limits, unbounded queries, expensive operations without throttling.

Mitigations:
- Rate limit unauthenticated, costly, or abuse-prone operations according to
  measured risk; document any client-visible quota policy
- Set maximum page sizes on pagination
- Limit query complexity (especially for GraphQL)
- Set request body size limits
- Give network and downstream operations explicit deadlines where the client
  and operation support cancellation or timeout

### 5. Broken Function Level Authorization

Admin endpoints accessible to regular users. Different authorization requirements for different operations on the same resource.

```typescript
// ❌ WRONG — same middleware for all operations
app.use('/api/users', requireAuth);

// ✅ CORRECT — different authorization per operation
app.get('/api/users/:id', requireAuth, async (req, res) => { ... });
app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => { ... });
```

### 6. Unrestricted Access to Sensitive Business Flows

Automated abuse of legitimate flows: ticket scalping, coupon abuse, spam account creation.

Mitigations:
- Rate limit business-critical endpoints more aggressively
- CAPTCHA for account creation and other abusable flows
- Device fingerprinting for high-value operations
- Anomaly detection on usage patterns

### 7. Server-Side Request Forgery (SSRF)

URLs in request parameters that the server fetches — allowing attackers to reach internal services.

```typescript
// ❌ WRONG — blindly fetches user-provided URL
app.post('/api/webhooks', async (req, res) => {
  const response = await fetch(req.body.callbackUrl); // SSRF risk
});

// ✅ PREFERRED — accept callbacks only to explicitly trusted destinations.
// safeOutboundFetch also resolves every A/AAAA answer, rejects non-global
// addresses, and repeats those checks for every redirect before connecting.
app.post('/api/webhooks', async (req, res) => {
  const url = new URL(req.body.callbackUrl);
  const allowedHosts = new Set(['hooks.partner.example']);

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    !allowedHosts.has(url.hostname)
  ) {
    return res.status(422).json({ ... });
  }

  await safeOutboundFetch(url);
});
```

Prefer an outbound proxy or a well-reviewed SSRF-safe client for `safeOutboundFetch`; a string check for `localhost` or selected private prefixes is not sufficient. If arbitrary destinations are a product requirement, resolve and validate every IPv4 and IPv6 address against the complete special-use address registry, pin the validated address for the connection, disable redirects or revalidate each hop, and constrain ports and protocols.

### 8. Security Misconfiguration

Missing security headers, verbose error messages in production, unnecessary HTTP methods enabled, CORS misconfiguration.

Checklist:
- Set `Content-Type: application/problem+json` on error responses (not `text/html`)
- Disable stack traces in production error responses
- Remove `X-Powered-By` and other server identification headers
- Configure CORS restrictively — don't use `Access-Control-Allow-Origin: *` for authenticated APIs
- Disable HTTP methods you don't use (e.g. TRACE — but keep OPTIONS if you serve cross-origin browser clients; CORS preflight requires it)

### 9. Improper Inventory Management

Forgotten old API versions still running, undocumented endpoints, debug endpoints left in production.

Mitigations:
- Maintain an API inventory (OpenAPI spec as source of truth)
- Decommission old versions on schedule (see `api-evolution.md`)
- Review deployed endpoints regularly — remove anything not in the spec
- Never deploy debug/test endpoints to production

### 10. Unsafe Consumption of APIs

Blindly trusting data from third-party APIs. This is #10 in OWASP but critical — an upstream compromise becomes your compromise.

```typescript
// ❌ WRONG — trusts third-party response
const userData = await thirdPartyApi.getUser(id);
await db.insert('users', userData); // Unsanitized data into your database

// ✅ CORRECT — validate at the boundary
const rawData = await thirdPartyApi.getUser(id);
const userData = ExternalUserSchema.parse(rawData); // Validate shape and content
await db.insert('users', userData);
```

This aligns with the main skill's principle: third-party API responses are untrusted data.

## Authentication Patterns

### API Keys

Simple, good for server-to-server communication.

- **Always send in headers** (`Authorization: Bearer sk_live_...`), never in URL query params — URLs end up in logs, browser history, and referer headers
- Scope keys by permission level (read-only vs read-write)
- Support key rotation without downtime (accept old and new keys during transition)
- Prefix keys by environment (`sk_live_`, `sk_test_`) to prevent accidental cross-environment use

### OAuth 2.0 and OpenID Connect

OAuth delegates access; OpenID Connect adds authentication. Select a grant and identity profile from the actual goal, client type, user-agent context, issuer/resource topology, and provider capabilities—authorization code is not the answer to machine, device, or token-exchange use cases.

For redirect-based authorization-code flows, RFC 9700 requires PKCE for public clients and recommends it for confidential clients; use `S256`. It also requires exact redirect matching, forbids the resource-owner-password grant, and forbids clients from placing access tokens in URI query parameters. Responses that issue access tokens at the authorization endpoint SHOULD NOT be used unless every named injection and leakage vector is mitigated.

PKCE protects authorization-code exchanges involving a user-agent redirect; do not attach it mechanically to non-authorization-code grants. For service-to-service access, prefer platform workload identity or federation where available. Otherwise, use the client-credentials grant only for a confidential client, with short-lived, audience-restricted access tokens and sender constraint where supported. RFC 6749 says a client-credentials response should not include a refresh token, so do not import an end-user refresh-token pattern into that flow. For sign-in and SSO, use OpenID Connect (or another authentication protocol such as SAML where required); OAuth alone delegates authorization and does not establish an interoperable login protocol.

Load the `secure-oauth-oidc` skill before designing or reviewing an OAuth/OIDC flow. It provides the full RFC 9700 / BCP 240 and OIDC workflow, including applicability-aware controls, issuer and transaction binding, attack analysis, and negative tests. Use `auth-security.md` for JWT BCP guidance.

### JWT Considerations

JWTs are useful for stateless authentication but have important tradeoffs:

- **JWTs cannot be revoked** without additional infrastructure (blocklist/denylist)
- **Keep them short-lived** (5-15 minutes for access tokens)
- **Never store sensitive data in the payload** — it's base64-encoded, not encrypted
- **Hardcode your allowed algorithms** — never let the token's `alg` header alone dictate the algorithm (prevents `alg: none` and RSA/HMAC confusion attacks)
- **Validate `iss`, `sub`, `aud`, `exp`** on every JWT
- **Use explicit `typ` headers** to prevent cross-JWT confusion (e.g., `at+jwt` for access tokens)
- **Use asymmetric signing** (RS256/ES256) for distributed systems — verifiers don't need the signing key

See `auth-security.md` for the full deep-dive on JWT security (RFC 8725 / BCP 225), including algorithm allowlisting, key-algorithm binding, input sanitization, and compression oracle attacks.

### Decision Framework

| Scenario | Pattern |
|----------|---------|
| Simple service authentication with no delegated authorization | Scoped, rotatable API key over TLS |
| Redirect-based user authorization | OAuth 2.0 authorization code + PKCE (`S256`); add OpenID Connect when authenticating the user |
| Service-to-service API access | Platform workload identity/federation where available; otherwise OAuth 2.0 client credentials for a confidential client, using short-lived, audience-restricted access tokens |
| Internal-tool sign-in or SSO | OpenID Connect with the identity provider, or another authentication protocol such as SAML where required—not bare OAuth |

## Browser Security Headers

A malicious page can issue requests to an API the user's browser can reach
(RFC 9205 / BCP 56), but response headers must match the entry point and the
content it serves. Apply the following baseline to browser-facing JSON
responses when the deployment policy does not already provide an equivalent;
do not mechanically add browser document policy to every machine-only API:

```
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'
Referrer-Policy: no-referrer
```

Additional:
- Use application-specific media types in `Content-Type` (e.g., `application/vnd.myapp+json`)
- Set `HttpOnly` flag on cookies
- Avoid compressing sensitive data (tokens, passwords) alongside attacker-controlled content -- compression oracles (CRIME/BREACH) allow secret recovery

See `http-fundamentals.md` for full HTTP protocol security guidance.

## Transport Security

Use TLS for all API communication. Per RFC 9325 (BCP 195):
- TLS 1.2 is the minimum acceptable version
- TLS 1.3 is preferred
- TLS 1.0 and TLS 1.1 are deprecated (RFC 8996 / BCP 195)

## Security Checklist

When reviewing an API for security:

- [ ] Object-level authorization on every access or operation involving a protected object (not just authentication)
- [ ] Schema validation at every input boundary
- [ ] Rate limiting covers unauthenticated, costly, and abuse-prone operations; auth controls are deliberately aggressive
- [ ] No internal details in error responses (stack traces, file paths, SQL)
- [ ] CORS configured restrictively
- [ ] API keys in headers only, never in URLs
- [ ] Third-party API responses validated before use
- [ ] All endpoints documented in API spec — no shadow endpoints
- [ ] Short-lived tokens with proper validation (algorithm, iss, sub, aud, exp)
- [ ] SSRF protections on any endpoint accepting URLs
- [ ] Browser-facing entry points apply security headers suited to their content and deployment policy
- [ ] TLS 1.2+ enforced, TLS 1.0/1.1 disabled
- [ ] Public authorization-code clients use PKCE with `S256`; confidential authorization-code clients use it unless the RFC 9700 OpenID Connect `nonce` alternative and its required precautions are deliberately selected
- [ ] Service-to-service flows use workload identity/federation or confidential-client credentials, without assuming refresh tokens
- [ ] Sign-in and SSO use OpenID Connect or another authentication protocol, not bare OAuth
