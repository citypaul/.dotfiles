# Enforcement and Migration

Use this reference when a proposed tree must survive future edits or when moving an existing codebase. A folder migration is an architecture change when it alters dependency boundaries, package discovery, public exports, or the meaning of inside versus outside.

## Contents

1. Enforcement ladder
2. Dependency matrix
3. Package and path rules
4. Deep workspace discovery
5. Safe migration sequence
6. Validation

## Enforcement Ladder

Use the least machinery that can protect the claimed boundary:

| Scale | Minimum useful enforcement |
|-------|----------------------------|
| Small flat package | Explicit exports, colocated tests, review |
| Feature-first app | Public feature entrypoints and restricted cross-feature imports |
| Single-package hexagon | Path-based restricted imports plus architecture tests |
| Monorepo hexagon | Separate package manifests, project references, exports, dependency validation |
| Large/deep workspace | Recursive package discovery and generated rules from path roles or a declarative registry |

Do not equate a provider denylist with architecture. A denylist catches known libraries; role-based dependency direction catches the category of violation. Use both when useful.

## Dependency Matrix

| Source role | May import | Must not import |
|-------------|------------|-----------------|
| Domain policy | Same/allowed inner domain packages and provider-free libraries | Application orchestration, adapters, testing, composition, frameworks, providers |
| Application policy | Domain, other allowed inner packages, owned ports | Concrete adapters, testing, composition, framework entrypoints, environment access |
| Driving adapter | Inside public API, transport/framework support | Inside internals, driven-adapter internals, business policy in another route |
| Driven adapter | Driven port/public inside types, provider SDK | Inside internals unrelated to its port, other adapter internals |
| App-local workflow | Its public dependencies and provider-free app modules | Endpoint transport details and concrete providers unless it is deliberately an adapter |
| Testing | Inside public APIs and test tools | Production composition as a shortcut to hidden internals |
| Composition root | All required production roles | Business decisions and reusable domain policy |

Additionally:

- Production runtime source and runtime dependencies must not import testing packages. Colocated test files may import reusable test-interactor packages through explicit dev dependencies; that outside-to-inside test direction is intentional.
- Production entrypoints must not import development-only modules.
- Cross-context imports must use explicit public contracts, events, or anti-corruption layers.
- Provider types must not cross into inside public APIs.
- Sibling features and adapters must not import private subpaths.

## Package and Path Rules

For each package, declare or derive a role such as:

```text
inside-domain
inside-application
driving-adapter
driven-adapter
test-interactor
executable-host
product-client
operational-workflow
```

Validate both source imports and `package.json` dependencies. A source rule alone misses an unused or dynamically loaded provider dependency; a manifest rule alone misses relative path escapes.

Prefer one small package-role registry when path alone is ambiguous. Validate that registry roles agree with physical locations so human and machine maps cannot drift.

Protect public boundaries with explicit exports. Reject internal subpath imports even when the package manager can resolve them.

Inside packages need not have zero dependencies. Permit stable provider-free libraries deliberately. Reject frameworks, runtime globals, infrastructure clients, and concrete technology selected outside the boundary.

## Deep Workspace Discovery

Before proposing or moving to deeper paths, inspect:

- Workspace globs and package-manager discovery.
- Custom package-boundary scripts and their recursion depth.
- TypeScript project references and path aliases.
- ESLint or architecture-test file matching.
- Build, test, coverage, mutation, documentation, and release tooling.
- Docker/build contexts and package-copy assumptions.

Test the deepest target path synthetically before relying on it. Include fixtures for:

- Valid inside and adapter packages at the maximum depth.
- Forbidden inward-to-outward and production-to-testing edges.
- Package name, export, and path-alias resolution.
- Workspace discovery and build/test inclusion.
- Development-only import direction.

Testing only against the current shallow tree does not prove recursive discovery.

## Safe Migration Sequence

Separate semantic work from mechanical movement:

1. **Record the decision.** Define the architecture vocabulary, selected shapes, exceptions, and package roles in the project's normal decision mechanism.
2. **Map current behavior.** Identify public APIs, consumers, runtime paths, provider leaks, and files that change together.
3. **Protect behavior.** Add characterization or use-case tests before modifying code that lacks a trustworthy safety net.
4. **Prepare enforcement.** Make discovery recursive and make the intended dependency rules pass against the current tree plus synthetic target-depth fixtures.
5. **Decompose god files.** Split by cohesive behavior under stable exports. Treat this as production refactoring with the project's normal TDD, coverage, and mutation requirements.
6. **Invert leaked dependencies.** Replace provider types/construction with application-owned contracts and boundary translation. This is behavioral architecture work, not a rename.
7. **Reparent existing packages.** Move one capability or role at a time while preserving package names, exports, and consumer imports where possible.
8. **Restructure executable hosts.** Separate endpoints, shared workflows, and composition without changing external routes or protocols.
9. **Remove legacy paths.** Delete compatibility exports and empty directories only after the final consumer moves.
10. **Update the map.** Refresh package indexes, architecture decisions, glossary, diagrams, and onboarding documentation.

The exact order of steps 5–7 may vary, but never label provider-dependent code as inside before dependency inversion makes the claim true. Keep mass moves out of unrelated feature work.

## Validation

After every migration slice, check:

- Formatting, linting, typechecking, unit/integration/E2E tests, coverage, and mutation tests required by the project.
- Package manifests and generated lockfile/workspace state.
- Public exports and consumer compilation.
- Import/package boundary validation.
- Production versus development import graphs.
- Runtime startup, resource shutdown, and framework route discovery.
- Documentation links and package indexes.

Use a dependency graph or architecture report to confirm direction; do not rely on a visually convincing tree alone.

For a proposal-only task, report these gates without editing or moving files.
