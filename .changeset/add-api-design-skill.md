---
"@paulhammond/dotfiles": minor
---

feat: add api-design skill with deep-dive resources

Adapted from addyosmani/agent-skills, significantly expanded and modified to align with existing conventions.

Main skill covers:
- Hyrum's Law, One-Version Rule, contract-first development
- RFC 9457 error semantics (Problem Details for HTTP APIs) with security considerations
- Idempotency patterns (Stripe's idempotency keys for POST)
- Rate limiting (standard headers, 429 responses, Retry-After)
- REST conventions, pagination, filtering, input/output separation
- Backward compatibility, red flags, rationalizations, verification checklist

Deep-dive resources:
- resources/api-evolution.md — versioning strategies (Stripe date-pinning, URL, header), Postel's Law, Sunset/Deprecation headers, enum evolution, consumer-driven contract testing (Pact)
- resources/api-security.md — OWASP API Security Top 10 with TypeScript examples, authentication patterns (API keys, OAuth2+PKCE, JWT), security checklist

REFERENCES.md updated with authoritative sources (RFC 9457, RFC 8594, OWASP, Google/Microsoft/Zalando API guides, Brandur Leach, Phil Sturgeon, Arnaud Lauret, Joshua Bloch)
