# Glossary Format and Bootstrap

## Format: Use the Repository's Declared Schema

Preserve the repository's declared glossary location and schema. Keep one naming authority per bounded context and make its scope explicit. Do not introduce a second format merely because an example below uses it.

If a project has no glossary schema and deliberately chooses Contextive, `<context>.glossary.yml` can live beside the context's code or in a purpose-owned glossary location. Contextive provides folder scoping and editor support. The following is illustrative, not mandatory:

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
          - Booking # DEPRECATED 2026-07-04 — lint names Ordering / Order; see decision record
```

Note: Contextive treats aliases as neutral alternatives (hover on `Booking` shows Order's definition — helpful during migration). Treating an alias as *deprecated* — rejected by the lint with the replacement named — is this framework's convention layered on the same field.

Conventions:

- **Aliases name their owner and replacement**: when a term is rejected or replaced, record enough metadata for feedback to name the owning bounded context and canonical term. In Contextive, the old word can be an `aliases` entry on the canonical term, with the repository's deprecation convention layered on top.
- **Forms are explicit where they matter**: record canonical case, plural, identifier spelling, or public wire name when a mechanical guard cannot derive it safely.
- **Aliases are context-scoped**: a word rejected in one bounded context may remain valid in another; never flatten every context into one global banned-word list.
- **Examples matter**: one domain sentence per term where possible — they feed test titles and hover docs.
- **The glossary is the naming authority**: code, speech, plans, research, and comments can expose drift or candidate terms, but they do not silently override canonical spelling, capitalization, or meaning.

## Bootstrap paths

**Greenfield** — an example-mapping or acceptance conversation surfaces the story's nouns and verbs; each one enters through the protocol as it is first used. Small, accurate, and growing — never a big up-front vocabulary exercise.

**From a working conversation** — mine a design session, research note, plan, or story-splitting output for candidate terms: recurring nouns and verbs, anything two people used differently, anything that needed explaining. Each candidate goes through PROPOSE individually — extraction gathers candidates; only the protocol admits them.

**Brownfield** — harvest candidates from exported domain identifiers, event names, database entities, comments, and tests. Existing code is evidence, not automatic authority. Expect collisions and near-duplicates — surfacing them is the value. Admit terms as slices touch them, matching the protected-core ratchet: the glossary grows with the protected capability, not ahead of it.

Keep every working name visibly provisional and record the owner or decision route that will ratify or replace it. Historical plans and specifications can explain why a name once existed, but they do not override the current glossary.

## What does NOT belong in a glossary

- Technical vocabulary (`map`, `parse`, `index`, `id`) — that's the lint layer's stopword list, not the domain language.
- Framework and library names.
- Terms from *other* bounded contexts — if Ordering keeps talking about Shipping's concepts, that's a context-mapping conversation (domain-driven-design skill), not a glossary entry.
