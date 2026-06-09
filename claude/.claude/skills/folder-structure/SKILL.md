---
name: folder-structure
description: Design and audit project folder structures using screaming architecture, feature-based organization, vertical slices, protected domain cores, ports/adapters boundaries, lint-enforced import rules, and code colocation. Use when creating, reviewing, or refactoring source trees, deciding where files belong, naming domains/features/use cases, setting shared/core/common boundaries, or aligning frontend/backend/monorepo folders with business capabilities instead of technical file types.
---

# Folder Structure

Create source trees that tell a newcomer what the product does before they notice the framework. Prefer business capabilities, use cases, and vertical slices at the first meaningful levels; use technical folders only where they clarify a slice's internals or an infrastructure edge.

Read `references/research-notes.md` when documenting rationale, comparing named approaches, or needing source links.

## Default Workflow

1. Map the product language before naming folders.
   - Read routes, tests, domain models, README docs, user stories, and existing UI labels.
   - Extract nouns and verbs users would recognize: `checkout`, `reserve-ticket`, `send-invoice`, `gift-funding`, `recipient`, `booking`.
   - If the domain language is unclear, ask one targeted question before inventing generic names.

2. Choose the outer shape from the repo type.

| Context | Prefer |
|---------|--------|
| Small or early app | Keep it shallow. Add folders only when files change together or business names become clear. |
| Single app | `src/app` for composition, then business feature/context folders or `src/features/<capability>`. |
| Framework-constrained app | Keep required framework folders thin; put real behavior in business slices they call. |
| DDD or hexagonal app | Bounded context or capability first, with an explicit protected `domain/` core inside each opted-in context. |
| Monorepo | `apps/<product>` plus `packages` or `libs` grouped by scope: product area first, shared second. |

3. Define slices by cohesion.
   - A slice is code that changes together to support one user-visible capability, workflow, route group, or domain concept.
   - Co-locate implementation, tests, schemas, fixtures, styles, and small helpers with the slice that owns them.
   - Create only the segments a slice actually needs. Empty `api`, `ui`, `model`, or `lib` folders are noise.

4. Set dependency rules before moving files.
   - Composition imports features; features should not import composition.
   - Sibling features should not import each other's internals. Share through an explicit public API, a higher-level orchestrator, or a promoted shared/domain module.
   - In DDD or hexagonal contexts, domain/use-case code must not import framework, database, HTTP, queue, UI, adapter, or infrastructure modules.
   - Shared code must not import feature code.

5. Propose the tree and the rules together.
   - Show the directory tree.
   - Add 3-6 placement rules that explain where new files go.
   - Add 2-4 import/dependency rules that keep the structure honest.
   - Include lint/import-boundary rules when the project uses DDD, hexagonal architecture, or another explicit layered boundary.

## Feature Anatomy

Use technical segments inside a feature only after the feature name has already made the business purpose clear.

```text
src/
  checkout/
    apply-discount/
      apply-discount.ts
      apply-discount.test.ts
      apply-discount.schema.ts
      index.ts
    collect-payment/
      collect-payment.ts
      collect-payment.test.ts
      ports.ts
      index.ts
```

For frontend slices, this shape is often useful:

```text
src/
  app/
    routes.tsx
    providers.tsx
  pages/
    checkout/
      ui/
      index.ts
  features/
    apply-discount/
      ui/
      model/
      api/
      index.ts
  entities/
    cart/
      model/
      ui/
      index.ts
  shared/
    ui/
    api-client/
    config/
```

For backend or service code without DDD/hex, keep the slice shallow:

```text
src/
  billing/
    collect-payment/
      collect-payment.ts
      collect-payment.test.ts
      ports.ts
      index.ts
    invoice/
      invoice.ts
      invoice.test.ts
      index.ts
  infrastructure/
    billing/
      stripe-payment-gateway.ts
      billing-repository.ts
  app/
    http/
      billing-routes.ts
```

## Protected Domain Core

When a project opts into DDD or hexagonal architecture, make `domain/` visible. This is the deliberate exception to "avoid technical folders": `domain/` marks the protected core of the hexagon, not a framework category.

Prefer bounded context first, protected core second:

```text
src/
  billing/
    domain/
      invoice/
        invoice.ts
        invoice-id.ts
        invoice-repository.ts     # driven port owned by the aggregate
        index.ts
      payment/
        payment-gateway.ts        # driven port named by business capability
        payment-result.ts
        index.ts
      money.ts                    # shared kernel only if truly universal
    use-cases/
      collect-payment/
        collect-payment.ts
        collect-payment.test.ts
        index.ts
    adapters/
      driven/
        stripe-payment-gateway.ts
        postgres-invoice-repository.ts
        invoice-row.ts
        invoice-mapper.ts
      fakes/
        fake-invoice-repository.ts
    delivery/
      billing-routes.ts           # thin driving adapter when framework allows
```

If the framework forces routes elsewhere, keep those files thin and make the dependency direction obvious:

```text
src/
  app/
    api/
      billing/
        route.ts                  # parse, wire, delegate, respond
  billing/
    domain/
    use-cases/
    adapters/
```

Placement rules for opted-in DDD/hex code:

- Put entities, value objects, domain services, specifications, domain errors, repository interfaces, gateway interfaces, and business result types in `domain/`.
- Put use cases/application services in `use-cases/` when separating orchestration from the pure domain model; they are still inside the hexagon and protected from adapters.
- Put concrete DB, API, queue, email, payment, filesystem, and SDK implementations in `adapters/driven/` or `infrastructure/`.
- Put route handlers, controllers, CLI commands, queue consumers, cron triggers, and server actions in `delivery/` or framework-required `app/` folders.
- Keep adapter DTOs, DB rows, SDK response types, mappers, and query DTOs with the adapter. Map them to domain types at the boundary.
- Keep shared-kernel types tiny. `Money`, `EmailAddress`, and `Clock` can be shared; `Invoice`, `GiftIdea`, and `User` usually belong to a bounded context.

## Import Boundary Rules

For DDD/hex projects, add lint rules after the first protected slice exists. Prefer the repo's existing lint stack. If there is no boundary tool yet, start with ESLint's built-in `no-restricted-imports`, then move to `eslint-plugin-boundaries`, `eslint-plugin-import`, or Nx module-boundary rules when the repo already uses them.

Use these rules as intent, adapting paths and aliases to the codebase:

```js
// eslint.config.js
export default [
  {
    files: ["src/**/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "**/adapters/**",
              "**/infrastructure/**",
              "**/delivery/**",
              "**/app/**",
              "**/use-cases/**",
              "next",
              "next/**",
              "react",
              "react-dom",
              "react/**",
              "drizzle-orm",
              "@prisma/client",
              "@aws-sdk/**",
            ],
            message: "Domain model must not import use cases, adapters, frameworks, or infrastructure.",
          },
        ],
      }],
    },
  },
  {
    files: ["src/**/use-cases/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "**/adapters/**",
              "**/infrastructure/**",
              "**/delivery/**",
              "**/app/**",
              "next",
              "next/**",
              "react",
              "react-dom",
              "react/**",
              "drizzle-orm",
              "@prisma/client",
              "@aws-sdk/**",
            ],
            message: "Use cases are inside the hexagon and must not import concrete adapters or frameworks.",
          },
        ],
      }],
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "**/domain/**",
              "**/use-cases/**",
              "**/adapters/**",
              "**/infrastructure/**",
              "**/delivery/**",
              "**/features/**",
            ],
            message: "Shared code must not depend on product slices or architecture layers.",
          },
        ],
      }],
    },
  },
];
```

Also enforce these boundaries in review, even before lint exists:

- `domain/` imports only same-context domain modules and intentional shared-kernel modules.
- `use-cases/` imports domain and port interfaces, but not concrete adapters.
- Driven adapters import domain ports/types and implement them; the domain never imports adapters.
- Driving adapters import use cases and adapter factories; they do not contain business rules.
- Cross-context imports go through explicit public APIs, events, or anti-corruption layers.

For monorepos:

```text
apps/
  booking-web/
  check-in-web/
packages/
  booking/
    reserve-ticket/
    pay-for-booking/
  check-in/
    verify-passenger/
  shared/
    date-time/
    test-factories/
```

## Naming Rules

- Prefer names from the domain glossary, user journey, or route language.
- Use verbs for use cases and interactions: `reserve-ticket`, `apply-discount`, `invite-member`.
- Use nouns for domain concepts: `cart`, `invoice`, `recipient`, `booking`.
- Avoid top-level `controllers`, `services`, `models`, `components`, `hooks`, `utils`, and `helpers` as the main architecture.
- If a shared folder is needed, name subfolders by purpose: `shared/money`, `shared/date-time`, `shared/ui`, not `shared/utils`.

## Sharing Rules

Keep code local until reuse is real and the abstraction has a stable name.

Promote code out of a feature only when:
- At least two slices need it now, not hypothetically.
- The promoted name describes a business or platform capability.
- The source slice will no longer feel like the hidden owner.
- Tests move with the behavior or cover it through the new public API.

Do not create a central shared area for "maybe reusable someday" code. That becomes a dumping ground and makes the architecture whisper "miscellaneous".

## Migration Strategy

When refactoring an existing tree:

1. Pick one vertical slice with tests or add characterization tests first.
2. Create the target business folder and move only the files needed for that slice.
3. Add an `index.ts` or equivalent public API where other slices need to depend on it.
4. Update imports with the smallest safe move.
5. Add lint/import rules once the first pattern is proven.
6. Repeat slice by slice; delete empty legacy folders only after their last file moves.

## Review Checklist

- The first two meaningful levels reveal the product domain or user workflows.
- Files that change together are close together.
- Tests, fixtures, styles, and schemas live near the code they verify or support.
- Framework-required files are thin entrypoints, not the architectural center.
- DDD/hex projects have an explicit protected `domain/` core and lint rules preventing inward dependencies from importing outward layers.
- Cross-feature imports go through public APIs or higher-level orchestration.
- Shared folders are small, named by purpose, and free of feature dependencies.
- No empty template folders exist just to satisfy a pattern.
