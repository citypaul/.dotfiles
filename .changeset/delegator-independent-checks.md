---
"@conjurer-rich/dotfiles": minor
---

`delegating-github-issues`: independent checks run before the PR opens. The run dispatches `tdd-guardian`, an `acceptance-review` subagent and a whole-PR review in parallel. It then allows one bounded repair round, in which the implementer refreshes its gate evidence and the failed checks run again. The walkthrough's Fix step goes to the implementer, not the delegator. Derived acceptance criteria wait for a 👍 from the authenticated login. An issue waiting on the human is never re-posted, and Pick skips it. The implementer runs the pre-PR gate in full, including its glossary step, and waits for the complete test suite, which runs as a background task.

`browser-ux-walkthrough`: a caller that must not write production code skips the Fix step and re-walks the affected surfaces after its implementer's fix.
