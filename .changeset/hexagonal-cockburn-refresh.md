---
"@paulhammond/dotfiles": minor
---

Reconcile the `hexagonal-architecture` and `folder-structure` skills with the source pattern, from a cover-to-cover read of _Hexagonal Architecture Explained_ (Cockburn & Garrido de Paz).

Corrections: the pattern is symmetric (inside vs outside) — the left/right asymmetry exists only in implementation as who-knows-whom (provided vs required interfaces); runtime configurability of driven actors is the actual pattern requirement (parameter injection is one of three sanctioned configurator shapes, kept as this skill's house default). Disclosures: the source convention purpose-names every port (`ForGettingTaxRates`, `ForPaying`) — this skill's role-noun driven ports are now a documented house choice with book-style names as equal alternatives. New: actor/interactor and primary/secondary vocabulary, pattern-requirements vs house-style checklist tiers, the "a port is only real if it has a test interactor" principle, two anti-patterns (port for a domain concept; nested hexagons), a `greenfield-sequence` resource (folders first, disposable first test, walking skeleton), purpose-named `ports/` folder conventions, and per-chapter citations in references. Fakes location reconciled to `adapters/fakes/` across both skills.
