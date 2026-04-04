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

// ✅ CORRECT — verifies the user owns this resource
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const order = await orderService.getById(req.params.id);
  if (order.userId !== req.user.id) {
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

Return 404 (not 403) when a user doesn't have access — confirming an object exists is itself an information leak.

### 2. Broken Authentication

Weak authentication mechanisms, missing rate limiting on auth endpoints, credential stuffing.

Mitigations:
- Rate limit authentication endpoints aggressively
- Use strong password policies or passwordless auth
- Implement account lockout after failed attempts
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

Schema validation at the boundary (see `typescript-strict` skill) prevents mass assignment by design — only fields defined in the schema are accepted.

### 4. Unrestricted Resource Consumption

Missing rate limits, no pagination limits, unbounded queries, expensive operations without throttling.

Mitigations:
- Rate limit all endpoints (see main skill: Rate Limiting section)
- Set maximum page sizes on pagination
- Limit query complexity (especially for GraphQL)
- Set request body size limits
- Use timeouts on all downstream calls

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

// ✅ CORRECT — validate and restrict
app.post('/api/webhooks', async (req, res) => {
  const url = new URL(req.body.callbackUrl);
  if (url.hostname === 'localhost' || url.hostname.startsWith('10.')) {
    return res.status(422).json({ ... }); // Block internal addresses
  }
  // Additional: allowlist domains, block private IP ranges
});
```

### 8. Security Misconfiguration

Missing security headers, verbose error messages in production, unnecessary HTTP methods enabled, CORS misconfiguration.

Checklist:
- Set `Content-Type: application/problem+json` on error responses (not `text/html`)
- Disable stack traces in production error responses
- Remove `X-Powered-By` and other server identification headers
- Configure CORS restrictively — don't use `Access-Control-Allow-Origin: *` for authenticated APIs
- Disable HTTP methods you don't use (OPTIONS, TRACE)

### 9. Improper Inventory Management

Forgotten old API versions still running, undocumented endpoints, debug endpoints left in production.

Mitigations:
- Maintain an API inventory (OpenAPI spec as source of truth)
- Decommission old versions on schedule (see `resources/api-evolution.md`)
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

### OAuth 2.0 + PKCE

Standard for delegated authorization (user grants access to a third-party app).

- Use **Authorization Code flow with PKCE** (RFC 7636) for all public clients (SPAs, mobile apps, CLI tools)
- The Implicit flow is deprecated — don't use it for new implementations
- Scopes should be granular and documented
- Access tokens should be short-lived (minutes to hours)
- Refresh tokens should be rotated on use (one-time use)

### JWT Considerations

JWTs are useful for stateless authentication but have important tradeoffs:

- **JWTs cannot be revoked** without additional infrastructure (blocklist/denylist)
- **Keep them short-lived** (5-15 minutes for access tokens)
- **Never store sensitive data in the payload** — it's base64-encoded, not encrypted
- **Always validate**: signature, algorithm (`alg` header — reject `none`), issuer, audience, expiration
- **Use asymmetric signing** (RS256/ES256) for distributed systems — verifiers don't need the signing key

### Decision Framework

| Scenario | Pattern |
|----------|---------|
| Server-to-server, trusted environment | API keys |
| User-facing app, delegated access | OAuth 2.0 + PKCE |
| Microservices, stateless auth needed | JWT (short-lived) + refresh tokens |
| Internal tools, SSO integration | OAuth 2.0 with your identity provider |

## Security Checklist

When reviewing an API for security:

- [ ] Object-level authorization on every endpoint (not just authentication)
- [ ] Schema validation at every input boundary
- [ ] Rate limiting on all endpoints, aggressive on auth endpoints
- [ ] No internal details in error responses (stack traces, file paths, SQL)
- [ ] CORS configured restrictively
- [ ] API keys in headers only, never in URLs
- [ ] Third-party API responses validated before use
- [ ] All endpoints documented in API spec — no shadow endpoints
- [ ] Short-lived tokens with proper validation
- [ ] SSRF protections on any endpoint accepting URLs
