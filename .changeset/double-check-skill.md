---
"@paulhammond/dotfiles": minor
---

Add the `double-check` skill — independent cross-provider verification

New auto-discovered skill that gets a second opinion on finished work from a *different* AI provider's CLI agent (codex, claude, gemini, or cursor-agent) running locally, then drives a constructive back-and-forth between the two agents until both genuinely agree. Host-agnostic: it detects the hosting agent's model lab and always picks a verifier from a different lab, configured for the best available model and highest reasoning effort, in a read-only sandbox. Includes a provider command reference and a verifier brief template in `resources/`.
