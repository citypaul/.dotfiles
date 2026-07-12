---
"@citypaul/dotfiles": patch
---

structure-codebase: resolve the endpoint-first-BFF vs in-BFF-hexagon ambiguity. When a BFF legitimately owns an internal capability hexagon, the hexagon owns the use-case, ports, and driven adapters — but the inbound HTTP leaf always stays at `endpoints/<url>/<method>.ts`, discoverable by its URL. States the underlying principle once (the public interface's shape — URL tree, command tree — is the primary navigation axis) and adds the buried-route-leaf anti-pattern.
