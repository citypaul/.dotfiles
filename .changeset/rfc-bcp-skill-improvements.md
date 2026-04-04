---
"@paulhammond/dotfiles": minor
---

feat: enrich api-design skill with RFC BCP guidance (HTTP fundamentals, JWT/OAuth security, caching)

New resources:
- `http-fundamentals.md`: HTTP protocol guidance from RFC 9205 (BCP 56) — caching, URI design, browser security, content negotiation, status code discipline
- `auth-security.md`: JWT and OAuth 2.0 security deep-dive from RFC 8725 (BCP 225) and RFC 9700 (BCP 240) — algorithm allowlisting, PKCE, token handling, redirect validation

Updates:
- `api-design/SKILL.md`: added HTTP Caching section, URI Ownership principle, header naming guidance (no X- prefix), browser security headers in red flags and verification checklist
- `api-security.md`: expanded JWT/OAuth sections with RFC references, added Browser Security Headers and Transport Security sections, expanded security checklist
- `REFERENCES.md`: added 9 new RFC/BCP sources (RFC 9205, 8820, 8725, 9700, 9325, 8996, 6648, 8941, 6302)
- `twelve-factor/SKILL.md`: added RFC 6302 (BCP 162) logging recommendations for internet-facing servers to Factor XI
