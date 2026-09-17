# Model Policy — Capability Tiers and Runtime Selection

The graph chooses a capability tier. The provider mapping below resolves that
tier to a model ID. Keep those concerns separate: a new model changes the
mapping, not the review policy.

## Capability tiers

| Tier | Use | Default effort | Gate |
|---|---|---:|---|
| `economical` | Mechanical work such as path resolution, deduplication, formatting, or schema cleanup | `low` | The node must not be making a substantive judgment |
| `balanced` | Ordinary lenses and ordinary finding verification | `medium` | Default for review work |
| `strong` | Genuinely difficult or high-impact verification | `high` | The caller names the difficult question or impact being checked |
| `top-tier` | An explicitly named unresolved high-stakes escalation | `max` | Requires `escalation: { findingId, name, reason }`; never inferred from `thorough` or roster size |

Selection rules:

1. Start every ordinary lens and verifier at `balanced`.
2. Use `economical` only for mechanical stages.
3. Promote a verifier to `strong` only for a named difficult or high-impact
   question. More votes do not promote the model tier.
4. Use `top-tier` only for the named unresolved high-stakes escalation. If the
   escalation is resolved or unnamed, stay at `balanced` or `strong`.
5. Never inherit the authoring session's current model or effort implicitly.

## Provider mappings

These are deployment mappings, not policy. Validate them against the host and
change only this table when a provider launches or retires a model.

| Projection | `economical` | `balanced` | `strong` | `top-tier` |
|---|---|---|---|---|
| Claude Code | `haiku` | `sonnet` | `opus` | `opus` |
| Codex | `gpt-5.6-luna` | `gpt-5.6-terra` | `gpt-5.6-sol` | `gpt-6-astra` |

The normalized effort values are `low`, `medium`, `high`, and `max`. The
Claude projection maps that field to its `effort` option; the Codex projection
maps it to the host's `thinking` option. `agents/openai.yaml` remains Codex
interface metadata, not a second model registry, and must not copy Claude
aliases into the Codex projection.

A provider may reuse one model ID for adjacent tiers when effort is the only
available capability difference; the tier gate still applies.

## Runtime contract

Resolve a tier before dispatch and pass the mapped model, effort, and the
smaller of the caller's per-node cap and the remaining run budget whenever the
runtime accepts those options:

```js
const request = {
  model: mapping[tier].model,
  effort: mapping[tier].effort,
  max_tokens: Math.min(budget.perNode, budget.remaining()),
}
```

For parallel fan-out, reserve each node's cap before dispatch when the runtime
offers reservation; `remaining()` alone is a per-call cap, not proof of an
aggregate budget. Record `budget: "best-effort"` when reservation is
unsupported.

The runtime adapter records a ledger entry for every node. `requested` is the
resolved request; `applied` and `usage` come from the runtime response and are
never copied from the request:

```json
{
  "runtime": "workflow",
  "provider": "claude",
  "node": "verify:finding-1",
  "tier": "balanced",
  "requested": { "model": "sonnet", "effort": "medium", "max_tokens": 4000 },
  "applied": { "model": "sonnet", "effort": "medium", "max_tokens": 4000 },
  "fallback": null,
  "usage": { "input_tokens": 0, "output_tokens": 0 }
}
```

If a field is not reported, record `unreported`; do not claim that the
requested model or budget was applied.

- **Workflow:** pass the mapped options to `agent()`. If the selected model is
  unavailable, fall back to the provider's mapped `balanced` entry, record the
  reason, and stop rather than falling through to the ambient session if that
  entry is also unavailable.
- **Agent-tool:** pass model, effort, and budget options when the tool accepts
  them. Otherwise use a fresh provider-default agent only for non-`top-tier`
  work; never fork or reuse the current authoring session. Record
  `fallback: "uncontrolled-default"` with unreported fields, and surface that
  limitation in the final report. Never use that fallback for a top-tier
  escalation.

The Claude and Codex projections may use different option names and runtime
fallbacks, but they share the tier rules and the execution ledger shape.
