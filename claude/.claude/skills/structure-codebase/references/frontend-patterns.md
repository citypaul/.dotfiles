# Frontend Structures

Use this reference for browser, mobile, desktop-web, design-system, meta-framework UI, and full-stack frontend structure. Frontend architecture is not a backend fallback: it has its own routing, rendering, state, data, reuse, and runtime boundaries.

## Contents

1. Inspect the frontend axes
2. Select the smallest honest shape
3. Route-colocated and feature-first targets
4. Meta-framework and runtime boundaries
5. State, data, UI, and generated code
6. Dependency rules and enforcement
7. Monorepos, design systems, and microfrontends
8. Migration and completion checks

## Inspect the Frontend Axes

Read the framework's routing/build conventions, navigation map, rendered screens, component stories, tests, state stores, queries/mutations, API clients, styling/tokens, and server/client markers. Distinguish these axes before naming folders:

| Axis | It answers |
|------|------------|
| Route or screen | Where does the user enter and navigate? |
| Product feature or flow | Which interaction and policy change together? |
| UI reuse level | Is this route-owned UI, product-feature UI, or a feature-agnostic design-system primitive? |
| State ownership | Is state local, route-scoped, feature-scoped, server-cached, or truly app-wide? |
| Data boundary | Who owns requests, schemas, mapping, cache keys, and mutations? |
| Runtime | Browser, server, worker, native shell, or shared provider-free module? |
| Package/owner | What needs a public API, independent consumers, or mechanical isolation? |

A route is not automatically a feature. A component is not automatically shared. A frontend “entity” is not automatically a DDD aggregate. A state store is not an architecture boundary.

## Select the Smallest Honest Shape

| Signal | Prefer |
|--------|--------|
| Small app or few cohesive screens | Framework defaults plus shallow route colocation |
| File-system router with mostly route-owned behavior | Route folders containing their private UI/data/tests |
| Interaction reused across routes | Product feature module with an explicit public API |
| Large client with many independently changing flows | Route/screen catalog plus feature-first modules and named foundations |
| Explicit Feature-Sliced Design adoption | Its standard layers and downward import rule; do not approximate it halfway |
| Frontend explicitly adopting ports and adapters | An earned provider-free inside with UI/navigation and provider edges outside; load the visible-hexagon reference |
| Meta-framework with server rendering/actions | Framework route tree plus enforced client/server module graphs |
| Multiple apps sharing stable UI/platform capabilities | Monorepo packages grouped by app/product scope, then shared ownership |
| Existing coherent structure | Preserve it unless the requested change or measured pain justifies migration |

Do not create `features/`, `pages/`, `entities/`, `widgets/`, `model/`, `api/`, or `ui/` merely to complete a template. Add a boundary when it improves discovery, cohesion, reuse ownership, lazy loading, runtime safety, or enforcement. A finished-state tree must give every new directory at least one named file, package, or concrete responsibility. State where a folder may be added later in prose instead of drawing an empty symmetric segment; reserve ellipses for unchanged or explicitly repeated existing detail.

## Route-Colocated Target

Prefer this when the router already provides strong ownership and most behavior belongs to one route:

```text
src/
├── app/ or routes/                       # framework-required route catalog
│   ├── checkout/
│   │   ├── route-or-page.tsx
│   │   ├── checkout-form.tsx
│   │   ├── checkout-data.ts
│   │   ├── checkout.test.tsx
│   │   └── checkout.stories.tsx
│   └── account/
│       └── route-or-page.tsx
├── design-system/                        # reusable product-feature-agnostic primitives
│   ├── tokens.ts
│   ├── button.tsx
│   └── dialog.tsx
├── platform/                             # named runtime capabilities
│   ├── api-client.ts
│   ├── analytics.ts
│   └── browser-storage.ts
└── generated/                            # generated clients/types; never hand-edited
    └── api-client.ts
```

Keep route-owned UI and data close to the route. Extract a product feature only when another route uses it, the route becomes hard to navigate, or the interaction needs an enforceable owner independent of the URL.

## Feature-First Target

Prefer this when important interactions span or recur across routes:

```text
src/
├── app/                                  # bootstrap, router, providers, global styles
├── routes/                               # URL/screen composition, loading/error states
│   ├── checkout/
│   │   └── route.tsx
│   └── order-history/
│       └── route.tsx
├── features/
│   ├── apply-discount/
│   │   ├── apply-discount-form.tsx
│   │   ├── apply-discount.ts
│   │   ├── discount-api.ts
│   │   ├── apply-discount.test.tsx
│   │   └── public.ts
│   └── reorder-purchase/
│       ├── reorder-purchase.ts
│       └── public.ts
├── design-system/
│   └── button.tsx
├── platform/
│   └── api-client.ts
└── generated/
    └── api-client.ts
```

Routes compose features and retain route-only behavior. Features own complete user interactions, not arbitrary nouns or one component each. Use local technical subfolders such as `ui/`, `state/`, `api/`, or `model/` only after a feature has enough files for the extra navigation level.

Feature-Sliced Design is a valid explicit architecture, not the universal frontend default. When selected, follow its actual layer semantics, slice public APIs, same-layer isolation, and downward dependency rule. Do not copy only `pages/features/entities/shared` names while allowing arbitrary cross-imports.

## Meta-Framework and Runtime Boundaries

Keep required route files where the framework discovers them. Use its colocation mechanisms—route folders, private folders, route groups, or ignored route files—rather than duplicating the route tree elsewhere without benefit.

For native apps, treat the navigation/screen registry as the route catalog and isolate push, deep links, secure storage, sensors, and other device APIs in named platform capabilities. Share provider-free product behavior across web/native only when its semantics match; do not assume component implementations or navigation models are portable.

Mark and enforce runtime ownership:

- Server-only modules own secrets, privileged provider clients, filesystem/database access, and server resource lifecycle.
- Client-only modules own browser APIs, interactive state, and event handlers.
- Shared modules contain only code safe for every importing runtime.
- Route modules may bridge framework-defined server and client graphs; do not treat them as ordinary universal modules.
- A backend hexagon consumed by the UI remains a server/package boundary. React components, view models, and client state do not enter it merely because they are pure.

If a frontend itself explicitly earns ports and adapters, apply the same inside/outside proof as any other hexagon: durable provider-free application policy and owned ports inside; UI/navigation as driving edges; browser storage, network clients, clocks, and device SDKs outside. Do not relabel ordinary components or API wrappers as a hexagon.

Use framework-native guards such as `server-only`, `.server` modules, package exports, or build/lint rules. Verify the built client graph; a folder name alone cannot prevent environment poisoning.

## State, Data, UI, and Generated Code

Place state at its narrowest real owner:

- Component interaction state stays with the component.
- URL/navigation state stays with the router.
- Server-fetched cache state stays with the route or feature query owner.
- Cross-component feature state stays inside the feature.
- App-wide stores contain only genuinely app-wide coordination; do not centralize state by library habit.

Keep endpoint functions, schemas, mapping, cache keys, mutations, and optimistic-update policy with the route or feature that owns the behavior. A base HTTP client, auth transport, or retry mechanism may live in a named platform capability. Generated clients stay in `generated/`; feature-owned wrappers translate generated/provider shapes before they spread through UI code.

Distinguish UI ownership:

- Route-only blocks stay with the route.
- Reusable product interaction UI stays with its feature.
- Product-wide, feature-agnostic visual primitives and tokens belong to the design system.
- A design system must not import product features, API clients, or application state.

Colocate focused tests, styles, fixtures, and stories with their owner. Promote them together when ownership changes.

## Dependency Rules and Enforcement

| Source | May import | Must not import |
|--------|------------|-----------------|
| App/route composition | Feature public APIs, design system, platform, route-local code | Feature private subpaths, server-only code from client graph |
| Product feature | Same-feature internals, design system, named platform APIs | Route/app composition, sibling feature internals |
| Design system | Tokens, primitive utilities, approved third-party UI | Product features, product data access, app stores |
| Platform capability | Low-level runtime/provider libraries and neutral contracts | Product routes and feature policy |
| Generated code | Its generator runtime only | Hand-written product imports |

Enforce the boundaries proportionately with restricted imports, public entrypoints, framework server/client guards, workspace tags, circular-dependency checks, and test fixtures that prove forbidden imports fail. A public API may be an explicit file or package subpath rather than one catch-all barrel. Avoid barrels that pull server modules into client bundles or erase code-splitting boundaries. Prefer route/app composition over feature-to-feature imports; when one feature truly depends on another, use a documented one-way public contract and reject the reverse edge.

## Monorepos, Design Systems, and Microfrontends

Group frontend packages by consuming app or product area before technical type. Create a real package when there are multiple consumers, independent ownership/release needs, a runtime/build boundary, or a dependency rule worth enforcing—not for every feature folder.

Keep a design system separate when it has a stable visual contract and multiple consumers. Keep product-specific composites in product packages even if they reuse the design system.

Use microfrontends only for an earned organizational/runtime boundary such as independent deployment, team autonomy, or technology isolation. They are not a remedy for a cluttered `components/` folder; start with modules and packages.

## Migration and Completion Checks

1. Inventory routes/screens, runtime markers, public imports, lazy chunks, state/data owners, and component consumers.
2. Characterize navigation, loading/error states, forms, accessibility behavior, and bundle boundaries before moves.
3. Move one route or feature with its tests, stories, styles, state, and data code.
4. Add a public API only where another owner imports the module; block new private cross-imports.
5. Separate server/client or generated/hand-written graphs before large physical movement.
6. Verify route discovery, code splitting, server/client builds, tests, stories, styles, and bundle contents after each slice.

The result is sound when a newcomer can find a user-visible flow quickly, route-only behavior remains local, reused interactions have clear owners, state and data are not centralized by accident, design-system code is product-feature-agnostic, runtime leaks fail automatically, and the tree is no deeper than those truths require.
