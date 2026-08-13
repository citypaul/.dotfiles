---
"@citypaul/dotfiles": patch
---

Let the installer run from anywhere

`--version` defaulted to the current checkout's exact HEAD, unconditionally. That
made the script usable only from a checkout whose HEAD happened to be pushed:

- Run it from a checkout with an unpushed commit and the install aborted
  (`upload-pack: not our ref`).
- Run a stray copy of the script, or pipe it from `curl`, and it refused before
  starting: *"--version requires an exact reviewed release tag or commit outside
  a git checkout"*.

The default is now worked out rather than assumed, and still resolves to an exact
immutable revision in every case:

| Situation | Pin |
|---|---|
| `--version REF` passed | that revision, validated as before |
| Inside a checkout, HEAD is on the remote | HEAD — a contributor still installs exactly what they inspected |
| Inside a checkout, HEAD is not on the remote | latest release, with a notice naming both commits |
| No checkout at all | latest release |

The latest release is read straight from the remote's tags, so it needs no local
clone. A failure to reach the repository at all is still an error, but now says so
plainly instead of blaming `--version`.

Verified against the real remote: outside a checkout and from an unpushed checkout
both install the newest tag; a pushed checkout still pins to its own HEAD.
