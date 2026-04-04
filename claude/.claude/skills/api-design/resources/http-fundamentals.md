# HTTP Fundamentals

Deep-dive on correct HTTP usage based on RFC 9205 "Building Protocols with HTTP" (BCP 56, June 2022). See the main `api-design` skill for REST conventions, error semantics, and idempotency. See `api-security.md` for OWASP Top 10 and authentication patterns. See `api-evolution.md` for versioning and deprecation.

## The Cardinal Rule

Don't redefine HTTP semantics. Application-specific meaning belongs in **message content** and **application-specific headers**, not in redefined meanings of standard methods, status codes, or generic headers.

What this means in practice:
- Don't write specs like "a POST request MUST result in a 201 response" -- proxies, auth layers, and error conditions produce other status codes. Clients must handle all status codes gracefully.
- Don't assign custom meanings to standard status codes (e.g., using 200 with a body-level error indicator).
- Don't use standard header fields for application-specific data. Define new headers instead.

## URI Schemes

- Use `https` (not `http`) for authentication, integrity, and to mitigate pervasive monitoring (RFC 7258 / BCP 188).
- Avoid defining custom URI schemes -- they break browser compatibility, intermediary support, caching, cookies, CORS, HSTS, and same-origin policy.

## HTTP Method Constraints

Use only registered HTTP methods. Defining application-specific methods is not permitted -- HTTP now forbids it.

**GET:**
- Must not change application state or have significant side effects (logging is fine).
- Do NOT put semantically meaningful content in a GET request body -- intermediaries, caches, and generic HTTP software ignore or reject it.
- For complex queries, POST is acceptable but loses caching and linking benefits. Consider supporting both GET (simple queries via URL) and POST (complex/large queries via body).
- GET requests in TLS early data may be vulnerable to replay attacks.

**OPTIONS:**
- Don't use OPTIONS for metadata retrieval. It is not cacheable, not linkable, chatty, and inconsistently supported.
- Instead, use a well-known URI for server-wide metadata or a separate linked resource for per-resource metadata (discoverable via `Link` header on HEAD responses).

## Status Code Discipline

Use only registered HTTP status codes. Don't map application errors 1:1 to status codes -- the status code space is finite and shared by all HTTP applications.

- Use general codes (200, 400, 500) generously. Put fine-grained error details in the response body using RFC 9457 Problem Details (see main skill).
- Clients must handle unknown status codes by falling back to the generic x00 class (e.g., treat 499 as 400).
- Don't require specific reason phrases -- they have no function and don't exist in HTTP/2+.

**Redirection:**
- 301/302: allow method change from POST to GET (browsers do this).
- 307/308: preserve the original method.
- 301/308: permanent. 302/307: temporary.
- 303: tells client "result is at a different location via GET."
- Authorization and Cookie headers change when the origin/path changes on redirect.

## HTTP Caching

Assign explicit freshness lifetimes on responses. Don't rely on heuristic freshness.

**Core rules:**

| Directive | Meaning | Common misconception |
|-----------|---------|----------------------|
| `Cache-Control: max-age=N` | Fresh for N seconds. Preferred over `Expires`. | -- |
| `Cache-Control: no-cache` | **May be stored**, but must revalidate before every use. | Often confused with "don't cache" |
| `Cache-Control: no-store` | Must NOT be stored at all. Use this to prevent caching. | -- |
| `Cache-Control: must-revalidate` | Once stale, must revalidate. Cannot serve stale when disconnected. | -- |
| `Cache-Control: public` | Usually unnecessary. Only needed to cache authenticated responses. | -- |

**Practical guidance:**
- Even short freshness (e.g., `max-age=5`) enables reuse across multiple clients and requests.
- Assign validators (ETags) to enable efficient revalidation without re-transferring the body.
- If a request header changes the response (e.g., `Accept-Language`), either use `no-store` or send `Vary` on ALL responses from that resource (including the default).
- If your application has its own validity period separate from HTTP freshness, convey it in a separate application-specific field and document the relationship.

## Header Design

- **Don't use X- prefixed headers** (RFC 6648 / BCP 178 deprecated this practice).
- **Keep names short but specific.** Prefix with an application identifier (e.g., `Example-Request-Id`).
- **Use headers only when the information is useful to intermediaries or generic HTTP software.** Otherwise, put data in the message body or URL query string.
- Consider caching implications -- request headers that vary responses need the `Vary` response header.

## Browser Security for APIs

Even non-browser APIs are accessible from browsers. A malicious page can issue requests to any API the user's browser can reach. Send these headers on API responses:

```
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'
Referrer-Policy: no-referrer
```

Additional mitigations:
- Set `HttpOnly` flag on cookies to prevent script access.
- Avoid compressing sensitive data (authentication tokens, passwords) in the same response -- compression oracles (CRIME/BREACH) allow attackers to recover secrets.
- Implement CORS if you need to expose cross-origin data to browsers. Otherwise, the same-origin policy is your first line of defense.

## Cookie and Session Security

- If using cookies, scope them narrowly (`Path`, `Domain`, `SameSite`).
- If the app acts as an ambient authority (sensitive data accessible via cookie), use request-specific tokens (CSRF tokens) to verify client intent.
- Don't assume request ordering on a single connection -- HTTP is stateless. For strict ordering, wait for each response before issuing the next request.
