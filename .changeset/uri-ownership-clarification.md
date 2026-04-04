---
"@paulhammond/dotfiles": patch
---

fix: remove URI Ownership section — protocol-spec guidance not relevant to normal web development

Removed the URI Ownership subsection from api-design SKILL.md and simplified the URI Design section in http-fundamentals.md. RFC 8820's "don't hardcode paths" applies to protocol specifications for third-party implementation, not to documenting your own REST API. Kept the practical URI schemes guidance (use HTTPS, avoid custom schemes).
