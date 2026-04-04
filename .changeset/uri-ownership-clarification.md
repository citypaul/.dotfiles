---
"@paulhammond/dotfiles": patch
---

fix: remove protocol-spec guidance not relevant to normal web development

Removed content aimed at protocol specification authors rather than web developers:
- URI Ownership / URI Design & Discovery (RFC 8820) — not relevant when documenting your own API
- Content Negotiation custom media type registration — most web devs use application/json
- Versioning via HTTP Mechanisms (link relations, media types) — already covered practically in api-evolution.md
- Protocol Version Independence — devs don't specify HTTP versions
- Weak Algorithm Avoidance details (deterministic ECDSA, RSA-PKCS1 v1.5) — implementation details most devs never touch
- Client Authentication (mTLS, Private Key JWT) — enterprise-grade, not typical web dev
- Mix-Up Attack Defense — niche scenario (multiple auth servers)
- Structured Fields (RFC 8941) references — most devs don't design new HTTP header formats
