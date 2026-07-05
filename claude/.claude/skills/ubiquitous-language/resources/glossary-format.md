# Glossary Format and Bootstrap

## Format: Contextive YAML, one glossary per bounded context

`<context>.glossary.yml`, living in the repo (typically beside the context's code or in a `glossaries/` folder — Contextive's folder-based scoping maps contexts in a monorepo). Contextive is the established format with editor support: LSP-based hover definitions and autocomplete for glossary terms across file types in VS Code, IntelliJ, and Neovim — the vocabulary teaches itself ambiently while people type.

```yaml
# ordering.glossary.yml
contexts:
  - name: Ordering
    domainVisionStatement: >
      Customers assemble orders and pay; the context owns the order
      lifecycle from basket to confirmed receipt.
    paths:
      - src/ordering
    terms:
      - name: Order
        definition: A customer's request to purchase, from basket to fulfilment.
        examples:
          - A customer paying by card receives a confirmed order and a receipt.
      - name: Receipt
        definition: The confirmed proof of payment for an order.
      - name: abandonCheckout
        definition: >
          Customer leaves the checkout flow before payment, releasing any
          held inventory.
        examples:
          - Held seats are released when the customer abandons checkout.
```

Deprecation example — the replaced word becomes an alias **on the canonical term** (Contextive's alias semantics), and the lint convention layers deprecation on top:

```yaml
      - name: Order
        definition: A customer's request to purchase, from basket to fulfilment.
        aliases:
          - Booking # DEPRECATED 2026-07-04 — lint rejects it naming Order; see ADR
```

Note: Contextive treats aliases as neutral alternatives (hover on `Booking` shows Order's definition — helpful during migration). Treating an alias as *deprecated* — rejected by the lint with the replacement named — is this framework's convention layered on the same field.

Conventions:

- **Aliases carry deprecations**: when a term is replaced, the old word becomes an `aliases` entry on the new term — this is what lets the lints reject the old word *and name its replacement* in the error message.
- **Examples matter**: one domain sentence per term where possible — they feed test titles and hover docs.
- **The glossary is the index, not the truth**: the code and the team's speech are the current language; the glossary is reconciled against them by lint on every build, which is what keeps it alive rather than rotting.

## Bootstrap paths

**Greenfield** — the glossary is born from the authoring loop: the Example Mapping stage (acceptance-testing A2) surfaces the story's nouns and verbs; each one enters through the protocol as it is first used. Small, accurate, and growing — never a big up-front vocabulary exercise.

**From a working conversation** — mine a design session, grill-me transcript, or story-splitting output for candidate terms: recurring nouns and verbs, anything two people used differently, anything that needed explaining. Each candidate goes through PROPOSE individually — extraction gathers candidates; only the protocol admits them.

**Brownfield** — harvest candidates from the code that already speaks the language: exported domain identifiers, event names, database entities. Expect collisions and near-duplicates — surfacing them is the value (each collision is a DETECT trigger). Admit terms as slices touch them, matching the protected-core ratchet: the glossary grows with the strangled core, not ahead of it.

## What does NOT belong in a glossary

- Technical vocabulary (`map`, `parse`, `index`, `id`) — that's the lint layer's stopword list, not the domain language.
- Framework and library names.
- Terms from *other* bounded contexts — if Ordering keeps talking about Shipping's concepts, that's a context-mapping conversation (domain-driven-design skill), not a glossary entry.
