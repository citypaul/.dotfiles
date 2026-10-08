# Documentation

## Choose the page's job

Use Diátaxis as a decision aid. Supporting material can cross a boundary when
it helps the same reader; split only when purposes or audiences become unclear.

| Reader need | Useful shape |
| --- | --- |
| Learn by doing | Tutorial: destination, prerequisites, a managed path, observable results |
| Complete a known task | How-to: starting conditions, ordered actions, relevant branches, recovery |
| Look something up | Reference: consistent entries, exact names, defaults, types, constraints, errors |
| Understand how or why | Explanation: context, concepts, mechanism, worked example, implications, limits |
| Decide | Proposal or decision record: decision, evidence, options, trade-offs, rationale |
| Recover from a problem | Troubleshooting: recognisable symptom, diagnostic evidence, action, expected result |
| Understand a change | PR description or release note: affected user, before/after behaviour, migration, validation |

Do not create empty sections to satisfy this taxonomy. A short conceptual note,
example, runbook, or overview may need only a few paragraphs.

## READMEs and procedures

Let the first screen answer what the project does, who it helps, and where to
start. Put setup steps in executable order: prerequisites and installation
before commands that depend on them. Include a representative use and the
observable result. A README can be the whole manual for a small project;
when maintained docs exist, it should provide orientation and routes into them.

Keep copyable commands, flags, paths, and configuration exact. Mark placeholders
clearly and explain where their values come from. Avoid hidden setup, real
secrets, and commands whose destructive effect is left implicit. Put warnings
before the affected action and recovery advice beside a likely failure.

## Retrieval and layout

- Use titles and headings that reveal the question answered. Keep heading
  levels logical and follow the target format's conventions.
- Add a table of contents when it helps navigation. Check anchors against the
  actual renderer; slug rules differ between systems.
- Use explicit lists or tables for options, flags, states, and errors. Keep
  entry structures consistent and give preconditions and outcomes where needed.
- Keep pages self-contained enough for a reader arriving through search.
  State diagrams' and screenshots' essential information in nearby text.
- End on the last useful point or next action. A recap is useful only when it
  improves recall or navigation.

## Evidence and maintenance

Check current source, tests, and accepted decisions before repeating prose
claims. Run the repository's existing documentation checks. Test executable
examples and check links where practical; record what was not verified.
Generated reference still needs review against the actual implementation.
Prose lint diagnoses mechanics, not whether a reader understands the page.

Describe shipped behaviour in maintained documentation.
Keep plans and specification workspaces only while their outcomes remain unfinished,
subject to the repository's retention policy. During authorised cleanup, promote
lasting constraints to their owner before removing obsolete material:

| Lasting information | Owner |
| --- | --- |
| Behaviour or regression | Source and executable tests |
| Accepted architecture decision | Accepted decision record |
| Setup, package contract, or operations | Maintained package or operational docs |
| Domain terminology | Authoritative glossary |
| Temporary sequencing or blockers | Active plan or status |

Ordinary writing does not authorise unrelated deletion. When cleanup is in
scope, repair incoming links and use Git history for superseded implementation
plans unless retention rules require an archive. Documentation indexes should
distinguish current authority, active work, decisions, and historical evidence.
Introduce historical identifiers by their purpose so prose remains intelligible.

Use narrow history queries when current evidence leaves a question unanswered:

```sh
git log -S '<concept>'
git log -G '<pattern>'
git log --all -- <path>
git show <commit>:<path>
```

History establishes what was true at a revision, not current behaviour. Date or
generate changing counts and compatibility claims, or give their maintenance an
owner. Keep release-specific language in versioned material. Update affected
docs with behaviour changes. Documentation edits do not inherently require
TDD; a new executable guard needs evidence that it detects a real failure.

## Documentation also consumed by agents

Keep human clarity and exact contracts in the same maintained source. Expose
Markdown or a machine-readable representation when an actual consumer needs
it. Add `llms.txt` only for an identified requirement or measured workflow;
verify current consumer support rather than assuming discovery or SEO benefits.
