# Source Notes and Rights Status

## Historical import

Local PR [#122](https://github.com/citypaul/.dotfiles/pull/122) consolidated 15
top-level bundles from `markdown-viewer/skills`. The exact source snapshot was
`2da933424ebb4ed652a05d012401f7fdae69575e`, immediately before local commit
`cc1739e62bc4a6a39a6a3dd8deedc60a9a0470e0` and merge
`067db3c26cec8c34c4284a06f4a511a41a2b83bb`:

- [Pinned source tree](https://github.com/markdown-viewer/skills/tree/2da933424ebb4ed652a05d012401f7fdae69575e)
- [Contemporaneous README licence declaration](https://github.com/markdown-viewer/skills/blob/2da933424ebb4ed652a05d012401f7fdae69575e/README.md#L252-L254)

The snapshot README said `MIT`, but its history contained no `LICENSE`,
`LICENCE`, `COPYING`, or `NOTICE` file and supplied no complete copyright and
permission notice. The former local `LICENSE` invented a holder/year not found
upstream and was removed. Upstream later changed its README declaration to
GPL-3.0 in
[`c9c64d1fe2bcf630c5534a6e32f201fc3c2be0f9`](https://github.com/markdown-viewer/skills/commit/c9c64d1fe2bcf630c5534a6e32f201fc3c2be0f9);
that later declaration is not silently retrofitted to the earlier snapshot.

## Current-tree remediation

On 2026-08-09 the imported `examples.md` and all eight engine/reference files
were deleted. The routing core was independently rewritten around destination
support, evidence authority, accessibility, security, and observable validation
gates. It relies on official format documentation rather than copied syntax or
examples from the historical source.

The current bundle therefore does not depend on permission for the removed
expression. Historical releases still require written permission with the
correct full notice, or coordinated history/tag/release remediation. This note
records that unresolved history rather than implying a current rewrite changes
past distribution.
