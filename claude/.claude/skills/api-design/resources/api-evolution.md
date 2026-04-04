# API Evolution and Deprecation

Deep-dive on versioning strategies, deprecation patterns, and safe API evolution. See the main `api-design` skill for core principles (Hyrum's Law, contract-first, prefer addition over modification).

## Postel's Law (Robustness Principle)

> Be conservative in what you send, be liberal in what you accept.

Applied to APIs:
- **Servers**: Accept additional unknown fields gracefully — don't fail on extra input
- **Clients**: Ignore unknown fields in responses — don't break on additions
- **Both sides**: This enables additive evolution without breaking either side

This is why RFC 9457 requires clients to ignore unknown extension members — forward compatibility is built into the spec.

## Versioning Strategies

### Option 1: Don't Version — Evolve (Recommended)

The best versioning strategy is to avoid versioning entirely by designing for evolution:

- Only add, never remove
- New fields are always optional
- New enum values don't break consumers (consumers handle unknown values)
- Use feature flags to enable new behavior per-client

**Who does this:** Stripe (despite `/v1/` in the URL, they have never made a v2 — they evolve additively).

### Option 2: Date-Based Version Pinning (Stripe's Model)

When breaking changes are unavoidable, Stripe's approach is the industry benchmark:

- Each API key is pinned to the API version at the time of creation
- Versions are named by date (e.g., `2024-06-20`)
- Breaking changes are documented with migration guides
- Consumers upgrade at their own pace
- Stripe maintains dozens of API versions simultaneously via an internal compatibility layer

This inverts the typical versioning pain: the server does the work, not the consumer.

### Option 3: URL Path Versioning

```
GET /v1/tasks
GET /v2/tasks
```

**Who does this:** Most public APIs as a pragmatic default.

**Pros:** Visible, easy to route, easy to understand, easy to cache.
**Cons:** Changes the resource identity (a task at `/v1/tasks/123` and `/v2/tasks/123` is the same entity at two URIs — violates REST purity). Maintaining multiple versions multiplies cost.

### Option 4: Header Versioning

```
Accept: application/vnd.api.v3+json
```
or
```
API-Version: 2024-06-20
```

**Who does this:** GitHub (`Accept: application/vnd.github.v3+json`).

**Pros:** Keeps URI clean, doesn't change resource identity.
**Cons:** Less discoverable, harder to test (can't paste URL in browser), harder to cache.

### Decision Framework

| Situation | Strategy |
|-----------|----------|
| Greenfield API, you control clients | Evolve — don't version |
| Public API, diverse consumers | URL path versioning (pragmatic default) |
| API with paying customers who can't break | Date-based pinning (Stripe model) |
| Need versioning without changing URIs | Header versioning |

## Deprecation Signals

### The Sunset Header (RFC 8594)

Standard HTTP header indicating when an endpoint will be decommissioned:

```
Sunset: Sat, 01 Sep 2029 00:00:00 GMT
Link: <https://api.example.com/docs/migration>; rel="sunset"
```

The `Link` header with `rel="sunset"` points to migration documentation. This lets clients programmatically detect upcoming deprecations.

### The Deprecation Header (IETF Draft)

Signals that an endpoint is deprecated (still functional, but scheduled for removal):

```
Deprecation: Sat, 01 Jun 2028 00:00:00 GMT
```

Use both together: `Deprecation` signals "this is deprecated", `Sunset` signals "this will stop working on this date".

### Deprecation Checklist

1. **Communicate early** — announce deprecation well before removal (months, not weeks)
2. **Use headers** — `Deprecation` and `Sunset` headers on every response from deprecated endpoints
3. **Link to migration guides** — `Link` header with `rel="sunset"` pointing to docs
4. **Log usage** — track which consumers still use deprecated endpoints
5. **Provide migration path** — never deprecate without an alternative
6. **Set a timeline** — and stick to it

## Enum Evolution

Adding new enum values is a subtle breaking change — consumers with exhaustive switches will fail:

```typescript
// Consumer code — breaks when server adds "ARCHIVED" status
switch (task.status) {
  case 'PENDING': return handlePending(task);
  case 'IN_PROGRESS': return handleInProgress(task);
  case 'COMPLETED': return handleCompleted(task);
  // No default — TypeScript exhaustive check fails at compile time
}
```

**Mitigation strategies:**
- Document that enums may be extended — consumers should always handle unknown values
- Use a default/fallback case in documentation and client SDKs
- Consider using string types instead of strict enums for fields that will grow
- Treat enum additions as potentially breaking and communicate them in changelogs

## Consumer-Driven Contract Testing

**Pact** inverts the traditional API testing model: the consumer defines what it expects, and the provider verifies it can satisfy those expectations.

**Why it matters for evolution:** Before making any change, you know exactly which consumers would break.

Core concepts:
- **Consumer test**: "I expect endpoint X to return fields A, B, C"
- **Provider verification**: "Can I satisfy all my consumers' contracts?"
- **Can-I-Deploy**: CLI tool that tells you if it's safe to deploy

This is particularly valuable for internal APIs where you can mandate that consumers publish contracts.

## Summary

The priority order for API evolution:
1. **Design for evolution from day one** — additive changes, Postel's Law
2. **Use standard deprecation signals** — Sunset and Deprecation headers
3. **Version only when forced** — and prefer date-based pinning over URL versioning
4. **Use contract testing** — know what will break before you break it
