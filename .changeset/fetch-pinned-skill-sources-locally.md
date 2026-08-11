---
"@citypaul/dotfiles": patch
---

Install commit-pinned skill sources from local pinned git fetches instead of
whole-repository archive downloads. The pinned Skills CLI cannot fetch a
commit SHA itself (`git clone --branch` rejects SHAs) and its archive
downloader enforces 10MB/25MB/1000-file caps that the impeccable and herdr
commit archives exceed. Each pinned source is now fetched with a shallow
`git fetch` of exactly the reviewed commit — sparse-filtered to a declared
subdirectory when the repository is far larger than its skills — and handed
to the CLI as a local path, so no size overrides are needed at all.

This supersedes the earlier raised download cap
(`SKILLS_DOWNLOAD_MAX_BYTES`): local sources bypass the CLI's downloader
entirely, so the override is removed.

Also repoint the Next.js skills to their new home: vercel-labs/next-skills
was retired. `next-best-practices` and `next-upgrade` now ship inside
Next.js itself (bundled docs plus the AGENTS.md that `next dev` generates),
and `next-cache-components` split into `next-cache-components-optimizer` and
`next-cache-components-adoption`, which install from the `skills/` directory
of vercel/next.js at a reviewed commit — an ~8MB sparse fetch instead of a
52MB whole-monorepo archive.
