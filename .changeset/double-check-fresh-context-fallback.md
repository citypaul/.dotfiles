---
"@paulhammond/dotfiles": patch
---

Add a fresh same-provider fallback to the `double-check` skill.

Cross-provider verification remains the first choice. When every independent verifier is unavailable or inaccessible after retrying, the skill now launches a new same-provider agent or process with no inherited conversation context, preserves the adversarial convergence loop, and clearly reports the fallback as lower-independence rather than presenting it as a cross-provider check.
