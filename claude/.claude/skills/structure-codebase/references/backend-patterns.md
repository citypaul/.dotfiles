# Backend Structure Patterns

Use these patterns after classifying the project. They are starting grammars, not templates to reproduce blindly. Create only directories that own real code.

When a system's public interface has a shape — an HTTP URL tree, a CLI command tree — that shape is the primary navigation axis: every entry leaf lives under it (`endpoints/`, `commands/`), whatever internal capability fulfils the request.

## Contents

1. Feature-first service
2. Endpoint-first BFF
3. Framework-constrained backend
4. DDD without hexagonal architecture
5. Operational and CLI code
6. Small packages
7. Monorepo grouping

## Feature-First Service

Use this as the default for a backend that has not adopted ports and adapters:

```text
src/
├── employees/
│   ├── create-employee/
│   │   ├── create-employee.ts
│   │   ├── create-employee.schema.ts
│   │   └── create-employee.test.ts
│   ├── update-employee/
│   ├── employee-routes.ts
│   └── index.ts
├── office-locations/
│   └── ...
├── api-keys/
│   └── ...
├── config/
├── router.ts
└── main.ts
```

Colocate route, validation, persistence, and behavior when they are owned by one feature. This is not a hexagonal architecture violation because the project did not claim that boundary. Extract a purpose-named integration or platform module only when reuse is real.

Avoid recreating `controllers/`, `services/`, `models/`, `repositories/`, and `validators/` at the root. Those folders optimize for file type while scattering one behavior across the tree.

## Endpoint-First BFF

A BFF is a product-specific driving host. Engineers commonly navigate it from an HTTP method and URL, so mirror that public shape first:

```text
src/
├── endpoints/
│   ├── router.ts                           # explicit production route catalog
│   ├── router.dev.ts                       # dev imports production one way
│   ├── health/
│   │   └── get.ts
│   └── api/
│       ├── build/
│       │   └── get.ts
│       ├── orders/
│       │   └── by-order-id/
│       │       ├── router.ts
│       │       ├── commands/
│       │       │   ├── post.ts
│       │       │   ├── authenticate.ts
│       │       │   └── to-command.ts
│       │       ├── events/
│       │       │   ├── get.sse.ts
│       │       │   ├── delete.dev.ts
│       │       │   └── sse/
│       │       │       ├── connection.ts
│       │       │       ├── connection-queue.ts
│       │       │       └── cursor.ts
│       │       ├── ingest/
│       │       │   └── post.dev.ts
│       │       └── live/
│       │           └── upgrade.websocket.ts
│       └── sessions/
│           └── by-room-id/
│               └── init/
│                   └── post.ts
├── workflows/
│   └── live-event-stream/
│       ├── subscriptions.ts
│       ├── fan-out.ts
│       ├── project-resync.ts
│       ├── observe-stream.ts
│       └── replay-buffer.ts
├── composition/
│   ├── create-routing.ts
│   ├── event-stream.ts
│   ├── database.ts
│   ├── collaboration.ts
│   ├── video.ts
│   └── config/
├── openapi/
├── runtime.ts
├── main.ts
└── main.dev.ts
```

Apply these rules:

- Keep `router.ts` explicit, but delegate route branches so it remains a catalog rather than a god file.
- Use plain names such as `by-order-id`; do not imitate `[orderId]` file-router syntax unless the framework requires it.
- Keep endpoint leaves transport-thin: parse, authenticate, translate, call, and respond.
- Keep connection-local SSE writer, cursor, and back-pressure state with the endpoint.
- Keep per-stream replay, fan-out, subscriptions, and resynchronization in a route-independent workflow because multiple transports share them.
- Keep concrete stores, provider clients, registries, configuration, resource ownership, and shutdown in composition.
- Let a routing factory return both the HTTP app and a raw upgrade handler when WebSocket upgrade bypasses normal routing.
- Make development routing a one-way extension. Production entrypoints must have no import path to `.dev` modules.
- Keep OpenAPI generation aligned with the explicit route catalog.

Do not give the BFF a hexagon merely because it calls hexagonal packages. Extract a provider-free inside package only when the BFF itself owns substantial, durable application policy.

When the BFF does earn an internal capability hexagon, that hexagon owns the use-case, its ports, and the driven adapters — never the inbound HTTP translation. The endpoint's transport-thin leaf still lives at `endpoints/<url>/<method>.ts` and delegates into the capability's use-case, exactly like a leaf that calls an external hexagonal package. Every route must be discoverable by its URL under `endpoints/`, whatever internal capability fulfils it — in the tree above, `sessions/by-room-id/init/post.ts` stays in `endpoints/` even when an in-BFF capability behind `composition/video.ts` fulfils it. A route file inside a capability folder's `inbound-adapters/` is a structure smell: move the leaf to `endpoints/`, keep the use-case and driven adapters in the hexagon.

## Framework-Constrained Backend

Preserve required framework locations and keep them thin:

```text
src/
├── app/
│   └── api/
│       ├── catalog/
│       │   └── route.ts                    # thin framework entrypoint
│       ├── reservations/
│       │   └── route.ts
│       └── checkout/
│           └── route.ts
├── server/
│   ├── catalog/
│   │   └── ...
│   ├── reservations/
│   │   └── ...
│   ├── checkout/
│   │   └── ...
│   └── startup.ts                          # enough when wiring is small
└── ...                                     # established frontend unchanged
```

Do not fight, duplicate, or conceal the framework route tree. Keep required files discoverable and delegate substantive behavior into feature-oriented modules. Use a `composition/` directory only when `startup.ts` can no longer own the graph clearly.

## DDD Without Hexagonal Architecture

DDD does not require ports and adapters. Organize language authority first while keeping the chosen technical architecture honest:

```text
src/
└── contexts/
    ├── ordering/
    │   ├── glossary.md
    │   ├── orders/
    │   ├── credit-approval/
    │   ├── application/
    │   └── public.ts
    └── fulfilment/
        ├── glossary.md
        ├── allocation/
        ├── shipment/
        ├── application/
        └── public.ts
```

This example does not claim a protected hexagon. Enforce cross-context public APIs and language boundaries without manufacturing adapters or port interfaces. Load `domain-driven-design` for context discovery and modeling rules.

## Operational and CLI Code

Technical systems still have meaningful workflows. Organize by the operation a human or automated trigger performs:

```text
src/
├── database-bootstrap/
├── credential-rotation/
├── restore-verification/
├── go-live-verification/
├── runtime/                                 # shared execution/lifecycle only if real
└── main.ts
```

For a command-line application, command names are often the most useful navigation axis — the same public-shape rule as `endpoints/` in a BFF: a command's entry leaf lives under `commands/` whatever internal capability implements it:

```text
src/
├── commands/
│   ├── import-orders/
│   ├── reconcile-payments/
│   └── verify-inventory/
├── output/
├── runtime.ts
└── main.ts
```

Do not force a full hexagonal skeleton around I/O-heavy operational automation. Extract pure policy or a port only when substitution, independent tests, or technology ownership makes the boundary valuable.

## Small Packages

Keep a small cohesive library flat:

```text
src/
├── parse-etag.ts
├── parse-etag.test.ts
├── format-etag.ts
├── format-etag.test.ts
├── compare-etag.ts
├── compare-etag.test.ts
└── index.ts
```

Add a folder only when a named cluster has multiple files that change together and navigation improves. Do not add `domain`, `application`, `ports`, `adapters`, `services`, or `utils` to a package with one public API and no external actors.

## Monorepo Grouping

Start with product/capability scope, then use packages to enforce real ownership:

```text
apps/
├── ordering-api/
└── ordering-admin/
packages/
├── ordering/
│   └── ...
├── fulfilment/
│   └── ...
├── developer-tools/
│   └── ...
└── platform/
    ├── observability/
    └── configuration/
```

Do not make `packages/domain`, `packages/application`, and `packages/adapters` span the whole product. Do not let workspace globs or a package-discovery depth limit dictate the architecture. Change and test the tooling before relying on a deeper target tree.
