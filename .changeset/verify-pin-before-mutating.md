---
"@citypaul/dotfiles": patch
---

Verify the first-party pin is reachable before touching installed skills

The installer pins first-party skills to the current checkout's exact HEAD. When
that commit has never been pushed, the remote cannot serve it — but the failure
surfaced only after every selected skill had already been moved into a backup
directory, leaving the user's skills stranded mid-install with an opaque
`upload-pack: not our ref` (or, before local fetches, a bare HTTP 404).

The pinned first-party revision is now fetched as a preflight, before the
manifest is validated or anything is backed up, and the fetch is memoised so the
later install reuses it rather than fetching the same commit twice. A failure
now aborts with nothing changed and names the actual cause:

```
✗ Cannot reach pinned revision <sha> in citypaul/.dotfiles

This usually means the commit has not been pushed. The installer pins
first-party skills to this checkout's exact HEAD, so a local-only commit
cannot be fetched back from GitHub.

Fix it with one of:
  • git push
  • ./install-claude.sh --version $(git rev-parse origin/main)
  • ./install-claude.sh --version v4.12.0

Nothing was changed. Your installed skills are untouched.
```

Covered by `test/install-claude-unpushed-version.sh`, which asserts the install
fails, no backup directory is created, existing skills survive, the Skills CLI
is never invoked, and the error names both the cause and the remedy.
