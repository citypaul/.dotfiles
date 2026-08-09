# Documentation For AI Agents

Good agent documentation and good human documentation mostly converge:
clear structure, self-contained pages, exact examples, text alternatives
for visual information, and machine-readable contracts.

## `llms.txt`: Consumer-Driven, Not A Default

`llms.txt` is an emerging convention, not a guaranteed discovery or SEO
channel. Add it only when a real consumer, product requirement, or measured
workflow uses it. Generate it from maintained documentation when practical;
do not create a second hand-maintained source of truth. Verify current
consumer support before recommending companion formats such as
`llms-full.txt`.

## Serve Clean Source When It Earns Its Place

When agents are a supported audience, expose clean Markdown or another
stable text representation from the same source as the human site. Preserve
headings, code fences, link targets, warnings, and exact identifiers. Measure
whether the endpoint is used and remove it if no maintained consumer depends
on it.

## Make Pages Retrievable And Usable

- Give each page one primary reader job and enough context to stand alone.
- Use a consistent heading hierarchy and descriptive titles.
- Include imports, prerequisites, expected output, and recovery steps with
  runnable examples.
- Put selectable options, flags, states, and error codes in explicit lists or
  tables rather than hiding them in prose.
- State every screenshot's load-bearing information in text.
- Keep architecture and agent-guidance files free of secrets.
- Give errors stable identifiers, causes, and concrete remediation.

## Evidence Rule

Treat claims about crawler adoption, agent traffic, model behavior, or format
support as time-sensitive. Cite a current primary source or direct measurement,
date the claim, and avoid turning one vendor's telemetry into a universal rule.
