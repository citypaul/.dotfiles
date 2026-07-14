# Evaluation Dimensions

Apply hard constraints before comparing trade-offs. Tailor the rows to the decision; mark non-applicable dimensions rather than manufacturing evidence.

## Hard gates

A hard gate is a condition the candidate must satisfy or mitigate credibly. Typical gates include:

- required behavior, protocol, data model, and integration compatibility;
- supported runtime, platform, architecture, and version window;
- security posture, privacy, data handling, residency, and regulatory constraints;
- exact license, intellectual-property, procurement, and acceptable-use constraints;
- reliability, recovery, availability, support, and operational-control requirements;
- accessibility or interoperability standards;
- hard cost, latency, throughput, resource, or deployment limits;
- immovable delivery deadline or time-to-value constraint;
- credible migration and exit feasibility.

Record `pass`, `fail`, `unknown`, or `pass with mitigation`, plus evidence. A candidate with a material unknown does not silently pass.

## Qualitative comparison

| Dimension | Questions |
|---|---|
| Functional fit | Does it solve the actual job, including failure, edge, and operator paths, without bending the product around the tool? |
| Architecture fit | Does it respect local boundaries, language, runtime, deployment, and data ownership? How much adapter or translation mechanism remains? |
| Maturity and maintenance | Is the exact supported version maintained, released predictably, governed credibly, and compatible with the intended horizon? |
| Security and privacy | What supply-chain, vulnerability-response, permissions, isolation, provenance, secrets, data, and incident obligations arise? |
| License and governance | Are use, distribution, modification, attribution, procurement, roadmap, and ownership acceptable? |
| Reliability and recovery | What failure modes, guarantees, backups, consistency, rollout, rollback/forward recovery, and disaster-recovery work exist? |
| Operations and observability | Who deploys, monitors, upgrades, pages, supports, renews, and removes it? Are useful signals and runbooks available? |
| Performance and resource cost | Is evidence representative of the intended workload, scale, latency, bundle, memory, storage, and network constraints? |
| Testability and developer experience | Can important behavior be exercised locally and in CI with faithful contracts, diagnostics, documentation, and tooling? |
| Total ownership | What must be built and maintained around it: glue, wrappers, migrations, tests, training, upgrades, incidents, contracts, and support? |
| Time to value and strategic focus | What are lead time, learning risk, integration delay, opportunity cost, and diverted team capacity? Is owning bespoke capability genuinely differentiating? |
| Team and ecosystem fit | Does the team have or want the capability? Is support available without depending on one fragile expert or vendor? |
| Lock-in and exit | How portable are contracts, data, skills, and operations? What is the tested replacement/export path and switching cost? |
| Whole-system mechanism | Does this remove decisions, state, dependencies, layers, and operational moving parts, or merely relocate them? |

## Comparison rules

- Use plain-language evidence and explicit trade-offs, not a weighted aggregate score.
- Distinguish candidate facts from local inference.
- Compare the exact version/tier and supported configuration, not the project's brand reputation.
- Count bespoke glue and wrapper ownership on the adoption side.
- Count security, documentation, compatibility, operations, and long-term support on the bespoke side.
- Treat a proof-of-fit as evidence for named uncertainties only.
- Prefer the least irreversible choice when credible options otherwise tie.
- State the strongest reason **against** the recommendation.
