# Source Notes

This skill adapts Mintuz's `acceptance-review` at commit
[`976d4a0ccda4fc8468ffd2e96e0c6f7db5f42324`](https://github.com/mintuz/skills/tree/976d4a0ccda4fc8468ffd2e96e0c6f7db5f42324/src/core/skills/acceptance-review),
under MIT.

Local changes:

- replace the unavailable `decision-trace` dependency with an explicit
  authority check and `Indeterminate` fallback;
- add a machine-readable verdict;
- align historical-artifact and external-write boundaries with the canonical
  local skills;
- keep implementation, verification, and delivery claims as separate evidence
  lanes.

Normative language is informed by
[RFC 8174](https://www.rfc-editor.org/info/rfc8174/). Concrete acceptance
examples are compatible with the collaborative discovery model described by
[Cucumber BDD](https://cucumber.io/docs/bdd/); neither source requires a
specific test syntax.
