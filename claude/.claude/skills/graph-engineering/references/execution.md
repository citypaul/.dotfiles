# Execution — Running the Graph

Three runtimes, in order of preference. Detect what the session offers and say which one you're using.

## Runtime 1: The Workflow Tool (dynamic workflow)

Claude Code's native graph executor: a plain-JavaScript orchestration script with injected primitives. Prefer it whenever the tool is available — it gives deterministic control flow, schema-enforced agent outputs (with automatic retries on mismatch), phase-grouped progress, resumability, and budget awareness.

Skeleton for the default review/audit topology:

```js
export const meta = {
  name: 'skill-lens-graph',
  description: 'Fan skill-loaded nodes out over a scope, verify, synthesize',
  phases: [{ title: 'Lenses' }, { title: 'Verify' }],
}

const FINDINGS = { /* findings schema from node-design.md */ }
const VERDICT  = { /* verdict schema from node-design.md */ }

phase('Lenses')
// args = { scope, lenses: [{ name, skillRef, focus }] } — passed via Workflow's args input
const reports = (await parallel(args.lenses.map(l => () =>
  agent(nodeBrief(l, args.scope), { label: `lens:${l.name}`, phase: 'Lenses', schema: FINDINGS })
))).filter(Boolean)

// Barrier is deliberate here: dedup needs ALL lens reports before verification.
const unique = dedupeByFileLineClaim(reports.flatMap(r => r.findings))

phase('Verify')
const verified = (await parallel(unique.map(f => () =>
  agent(verifierBrief(f, args.scope), { label: `verify:${f.id}`, phase: 'Verify', schema: VERDICT })
    .then(v => ({ ...f, verdict: v }))
))).filter(Boolean)

return {
  confirmed:    verified.filter(f => f.verdict.verdict === 'confirmed'),
  refuted:      verified.filter(f => f.verdict.verdict === 'refuted'),
  unverifiable: verified.filter(f => f.verdict.verdict === 'unverifiable'),
  clean: reports.flatMap(r => r.clean.map(c => ({ lens: r.lens, area: c }))),
  not_assessable: reports.flatMap(r => r.not_assessable.map(n => ({ lens: r.lens, gap: n }))),
  nodeFailures: args.lenses.length - reports.length,
}
```

Rules that keep workflow scripts working:

- `meta` must be a pure literal (no variables/spreads); phase titles in `meta.phases` must match `phase()` calls exactly.
- Scripts are plain JavaScript — no TypeScript annotations. `Date.now()`, `Math.random()`, and argless `new Date()` throw (they'd break resume); stamp timestamps after the run returns or pass them via `args`.
- Pass data in through `args` as real JSON values (never a stringified blob); build node briefs inside the script from `args`.
- A thunk that fails resolves to `null` — always `.filter(Boolean)` and report the failure count. Empty results are possible; on surprises, read the run's `journal.jsonl` before diagnosing.
- Default `pipeline()` over `parallel()` barriers; the dedup barrier above is one of the few justified ones.
- Respect the session's workflow size guideline; scale rosters per `topologies.md`, and use `budget` when the user set a token target.
- To iterate, edit the persisted script file and re-invoke with `{scriptPath, resumeFromRunId}` — unchanged `agent()` calls replay from cache.
- The Workflow tool needs explicit user opt-in. A skill instructing you to call it (this one, or an instance like `panel-review` that the user invoked) is that opt-in; a task merely *benefiting* from a graph is not.

### What the runtime does not enforce

Three graph semantics have no Workflow-tool mechanism — the orchestrator owns them or nobody does:

- **Integration.** `agent()` returning is not a `needs` edge releasing. Only verified-and-integrated-into-the-base releases a dependency; an approval, a green check, or an open PR does not.
- **Exclusion.** Two `agent()` calls in one `parallel()` will happily write the same path. Serialize writers deliberately — a `for…of await` loop with a `log()` line so it doesn't read as a stall — unless all four concurrency conditions in `topologies.md` hold.
- **Approval.** A running script cannot pause for the user. Get approval before dispatch, and split long write graphs at checkpoints: **one workflow per checkpoint, not one per run.** Integrate, re-plan, and re-render inline between Workflow calls, so a bad cut costs one checkpoint rather than the whole graph. Expect the first pass at a checkpoint to fail — follow-up nodes are the normal output of verification, not a surprise.

For long runs, check usage headroom before each checkpoint. When near a limit: drain running nodes rather than killing them mid-write (accept partial handoffs), persist the ledger, and resume later with `resumeFromRunId` — re-deriving state from the repository, never from memory.

## Runtime 2: Agent-tool Fan-out

No Workflow tool, but an Agent/Task mechanism exists: launch all independent nodes **in a single message** so they run concurrently, each with a complete brief (skill preamble + scope + schema stated in prose). Collect results as they complete; run verification as a second fan-out over surviving findings.

Differences from Runtime 1 you must compensate for by hand:

- **No schema enforcement.** State the contract in the brief and instruct: "your final message must be only this JSON". Treat malformed output as a node failure to report — retry once, don't silently repair.
- **No phases/resume.** Track roster → findings → verdicts yourself; if the session dies, the run is gone.
- **Don't poll.** Background nodes notify on completion; never fabricate a pending node's result.

## Runtime 3: Sequential Degraded Mode

No sub-agent mechanism at all (some skills.sh host agents): run the graph as a **sequence in your own context** — load one skill, work the scope through that lens, write the lens's findings to a scratch file, then load the next. After all lenses, do a self-verification pass per finding (weakest link: same context that found it), then synthesize.

This loses parallelism and context isolation. Label the output accordingly ("sequential single-context run — lenses share one context; verification is not independent") so nobody mistakes it for a true graph run.

## Diagnosing Runs

- A node returning nothing ≠ a clean scope. Distinguish node failure (report it) from a genuine empty result (`clean` says what was inspected).
- With the Workflow tool, `journal.jsonl` in the transcript dir records every node's actual return — read it before assuming.
- If most of a roster fails the same way, the brief is broken (bad path, wrong skill name, oversized scope) — fix the brief and rerun the failed nodes, not the whole graph.
