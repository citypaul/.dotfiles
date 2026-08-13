---
"@citypaul/dotfiles": patch
---

Let the installer run from anywhere

`--version` defaulted to the current checkout's exact HEAD, unconditionally. That
made the script usable only from a checkout whose HEAD happened to be pushed:

- Run it from a checkout with an unpushed commit and the install aborted
  (`upload-pack: not our ref`).
- Run a stray copy of the script and it refused before starting: *"--version
  requires an exact reviewed release tag or commit outside a git checkout"*.
- Worst of all, a piped install (`... | bash`) leaves `BASH_SOURCE` unset, so
  `dirname ""` resolved to `.` — the directory the user happened to be standing
  in. Running the one-liner from inside *any* other repository pinned the
  install to **that** repository's HEAD, producing
  `upload-pack: not our ref <sha>` for a commit that was never in this project.

The default is now worked out rather than assumed, and still resolves to an exact
immutable revision in every case:

| Situation | Pin |
|---|---|
| `--version REF` passed | that revision, validated as before |
| Inside a checkout **of this repository**, HEAD is on the remote | HEAD — a contributor still installs exactly what they inspected |
| Inside a checkout, HEAD is not on the remote | latest release, with a notice naming both commits |
| No checkout at all | latest release |

The latest release is read straight from the remote's tags, so it needs no local
clone. A failure to reach the repository at all is still an error, but now says so
plainly instead of blaming `--version`.

The script's own location now counts only when it is a real file inside a real
checkout of this repository, so an unrelated repo — or the current directory of a
piped install — can never become the version source. `--version <tag>` also
resolves against the remote, so it works with no checkout at all.

Verified against the real remote: piped from inside an unrelated repository, piped
from a plain directory, and run from an unpushed checkout all install the newest
release; a pushed checkout of this repository still pins to its own HEAD; and
`--version v4.12.0` resolves to that tag's commit without a checkout.
