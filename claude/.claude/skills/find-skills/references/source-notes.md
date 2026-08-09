# Source Notes

The original local bundle was imported in repository commit
[`640ee0a`](https://github.com/citypaul/.dotfiles/commit/640ee0ab01a3dede41de90f717f5c5a80db596d2)
from Vercel Labs'
[`find-skills` at `0b8fb22`](https://github.com/vercel-labs/skills/blob/0b8fb22aaa7f82447d4befe1b6a95d30a5b279b8/skills/find-skills/SKILL.md).
A content comparison shows that import added only the local attribution line to
the upstream file. At that revision, upstream's `package.json` and README
declared MIT but supplied no root `LICENSE` or complete copyright notice.

This 8 August 2026 audit also inspected upstream at
[`941a7bc`](https://github.com/vercel-labs/skills/tree/941a7bcfeca4bf07913b9fb6f8ed81f20ff5297c/skills/find-skills)
as a comparison baseline; the local skill was not blindly rebased onto it.
That baseline contains the full upstream MIT notice added in
[`e173b8c`](https://github.com/vercel-labs/skills/commit/e173b8c88f2581cfdaa1b6767c6519a08155790e),
with `Copyright (c) 2026 Vercel, Inc.` The bundled `LICENSE` now preserves
that exact notice instead of inventing a holder for the older snapshot.

Local departures now include:

- a narrow external-skill trigger instead of treating ordinary tools and
  templates as skill searches;
- installed-skill coordination before ecosystem discovery;
- browsing as the default, with exact-version CLI execution only after review
  and authorization;
- complete-bundle, capability, provenance, maintenance, compatibility, and
  overlap checks;
- explicit treatment of candidate instructions as untrusted evidence; and
- installation only after the user authorizes the exact source and scope.
