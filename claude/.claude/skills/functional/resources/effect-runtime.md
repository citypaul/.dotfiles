# Effect Runtime Composition

Use this reference only in a project that already uses Effect. It governs composition and execution; it does not prescribe adopting Effect or changing the project's architecture.

## Verify the installed version

Before writing version-specific code, inspect the lockfile's exact Effect version and matching source, declarations, and tests, including framework integrations. Use v4 for new examples in this guidance; verify any example against the target project's pinned v4 release before treating it as implementation. A v3 project requires its own verified API or a separately authorized upgrade, not a pasted v4 example.

For v4 service and function design, inspect `Context.Service` and `Effect.fn` in that release. Do not carry over v3 `Effect.Service`, generated default Layers, or `catchAll` spelling by memory. Stable composition principles transfer across versions; API names and lifetime semantics need verification. The official [service migration guide](https://github.com/Effect-TS/effect/blob/main/migration/services.md) is orientation, not a substitute for the installed source. Compile and run consequential examples before presenting them as working code; label uncompiled sketches explicitly.

## Compose programs; own execution at the edge

Services declare capability requirements and return composable programs. The executable runtime owner selects implementations and composes Layers with the intended resource lifetime. Reuse that runtime for requests; request-local context is not a reason to rebuild the shared service graph per request.

Call `runPromise` or another runner only where a genuine external runtime contract requires execution. Within Effect, compose or yield programs. Trace adapters and nested collaborators before claiming a bridge is gone: a service that returns Promise while internally calling `runPromise` still crosses the runtime boundary twice. Convert an owned contract together with its adapters and consumers, or retain a clearly located bridge when the external Promise API remains necessary.

Choose consistent boundaries per entry kind:

| Entry | Boundary owns |
|-------|---------------|
| HTTP | Framework integration, response completion, request interruption, and outer failure reporting |
| CLI | Process runtime, exit status, signals, and shutdown |
| Worker | Job lifetime, acknowledgement, retry policy, and shutdown |
| Stream | Subscription scope, disconnect, backpressure, child fibers, and cleanup |

Reuse shared policy within each kind. A universal wrapper with switches for unrelated entry lifetimes hides their different contracts.

## Outcomes and failure

Follow the `functional` skill's outcome-value rule. Model recoverable technical failures explicitly at the owner that understands them. Catch only to recover or translate into a meaningful caller contract; let unexpected failures reach the owning outer boundary for safe translation and one report. Preserve interruption as interruption, including through broad cause handling; it is not an ordinary refusal or a reason to emit a duplicate error.

For telemetry content, native logging, and sink containment, use [observability](../../observability/SKILL.md#effect-logging).

## Lifetime is observable behavior

Before changing cancellation, inspect the actual operation beneath the signature. Returning an Effect does not make an underlying Promise or database driver cancellable. Preserve existing uninterruptible protection until evidence shows how cancellation is acknowledged and resources remain valid through completion; do not remove it for a cleaner-looking program. Keep protection no broader than the proven critical region requires.

For a write followed by notification, identify the commit point, when the store may be released, and what post-commit work must complete despite caller disconnect. Preserve that order and the existing recovery/backstop contract. An uninterruptible region is not an atomic transaction across storage and publication.

Every spawned fiber has an owning scope or explicitly justified runtime lifetime. Establish who stops and awaits it, how finalizers release resources, and how backpressure and shutdown behave. Detached work is not a substitute for lifecycle ownership.

Use preservation evidence at the layer that owns each guarantee: refusal and conflict behavior, disconnect during an in-flight write, store release after completion, post-commit notification, and child cleanup where applicable. Fakes can establish ordering; claims about a real driver's cancellation or commit behavior require matching integration/source evidence. Keep tests for newly introduced mechanisms distinct from these preservation checks.
