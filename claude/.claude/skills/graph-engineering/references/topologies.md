# Topologies — Stage Patterns for Agent Graphs

The default shape for review/audit graphs is:

```
scout (inline) → fan-out (one node per skill) → dedup (barrier)
              → verify (one node per finding) → synthesize (inline or one node)
```

Compose the patterns below to vary it. Every pattern lists when it earns its cost.

## Fan-out / Fan-in (scatter-gather)

Independent nodes work disjoint responsibilities concurrently; results are gathered for a later stage. The workhorse pattern — use it whenever nodes don't need each other's output. Boundaries must be explicit and disjoint (per node: "you own X; siblings own Y, Z") or nodes duplicate work and the dedup stage silently hides the waste.

## Pipeline vs Barrier

**Pipeline** moves each item through all stages independently — item A can be in verification while item B is still being reviewed. It is the default for multi-stage work because wall-clock equals the slowest single chain, not the sum of slowest-per-stage.

**Barrier** (wait for ALL results, then continue) is correct only when the next stage genuinely needs the full prior result set:

- **Dedup across nodes** before spending verification tokens on duplicates.
- **Early exit** — zero findings means skip verification entirely.
- **Cross-referencing** — a stage whose prompt says "compare against the other findings".

"The stages are conceptually separate" does not justify a barrier; that's what a pipeline models. When in doubt, pipeline.

## Adversarial Verify

One independent node per surviving finding, mandated to refute it (brief in `node-design.md`). This is the single highest-value stage in any review graph — it is what separates a trustworthy report from a plausible-sounding one. Findings that fail verification are dropped; findings that cannot be checked are reported as `unverifiable`, which is information, not noise. Scale votes to stakes: one verifier for a quick check, 3–5 with distinct angles and majority rule for "thorough audit".

## Dedup and Conflict Surfacing

After fan-in, merge findings that name the same file/line/claim, keeping the strongest evidence and noting which lenses converged (multi-lens agreement is itself signal). When two lenses **disagree** — one lens's fix is another's violation — do not resolve it silently. Emit a conflict item carrying both positions and route it to either a judge node or the user. Silent merges are how graphs launder disagreement into false confidence.

## Judge Panel

Generate N independent attempts or opinions from distinct angles, then score them with parallel judge nodes and synthesize from the winner (grafting the best of the runners-up). Use when the solution space is wide — design options, competing diagnoses — not for routine findings triage. Judges get the candidates and the criteria, never the generators' reasoning.

## Loop-until-dry

For unknown-size discovery (bugs, edge cases, affected call sites): keep launching finder rounds until K consecutive rounds surface nothing new, deduping each round against **everything already seen** (including judged-and-rejected items, or the loop never converges). Fixed counts (`while found < N`) miss the tail; loop-until-dry finds it. Bound the loop with an explicit budget or round cap and report the stopping reason.

## Completeness Critic

A final node asks: "What's missing — a lens not run, a claim unverified, a scope not inspected?" Its findings become either the next round of work or an honest "not covered" section in the deliverable. Cheap, and it catches the orchestrator's own blind spot: believing the roster it chose was the whole job.

## Dependent-Write Graphs (needs / informs / excludes)

The patterns above are read-mostly: nodes analyze and report. When nodes *write* — implementation slices, migrations, generated artifacts — a fan-out is not a graph: launching N writers at one scope is scatter-gather, and a graph exists only when some units depend on others. Then the ordering **is** the work. Type every edge and record the reason:

- **`needs`** — B cannot start until A's output is verified **and integrated** into B's base. An approval, a green check, or an open PR does not satisfy `needs`; merged-into-the-base does.
- **`informs`** — B is better with A's output but correct without it. Never blocks scheduling.
- **`excludes`** — no data dependency, but A and B cannot run concurrently: overlapping owned paths, a shared undecided architectural question, a single-writer resource.

Schedule by **frontier**: dispatch only nodes whose `needs` are all integrated and which exclude no running node. **Writes are serial by default; reads parallel freely.** Run two writers concurrently only when all four conditions hold: disjoint owned paths (including lockfiles, generated files, and migrations), no shared open decision, independently verifiable outputs, and workspace isolation (worktrees). Absence of a data dependency is not independence — check `excludes` before parallelizing.

Write nodes close with the structured handoff in `node-design.md`, and a failed verification feeds the repair loop there — back to the worker that holds the context, not to a fresh node.

## Choosing Scale

| User's words | Roster | Verification |
|---|---|---|
| "quick check", "sanity check" | 2–3 nodes | 1 verifier per finding |
| default (no qualifier) | 3–6 nodes | 1 verifier per finding |
| "thorough", "audit", "comprehensive" | 6+ nodes, conditional lenses included | 3+ verifiers, distinct angles, majority |
| explicit roster from the user | exactly what they named | match the stakes |

Whatever the scale: report roster caps and anything dropped. No silent truncation.
