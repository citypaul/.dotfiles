---
name: evaluate-existing-solutions
description: "Research and compare established libraries, open-source tools and applications, managed services, and standard, framework, or platform primitives against an explicit bespoke baseline before committing to a material generic mechanism. Use for library/tool recommendations, build-versus-adopt questions, custom-mechanism replacement, consequential unresolved dependencies, or due diligence on a named but newly introduced material dependency. Produces an evidence-backed adopt, adapt, combine, build, defer, or do-nothing proposal. For repository-wide opportunity discovery use improve-codebase-architecture first and evaluate only the selected job. Not for agent-skill discovery, constraints still needing specification, trivial logic/glue, routine use of an adopted tool, or ordinary fixes."
---

# Evaluate Existing Solutions

Reuse before invention is a **decision discipline**, not a rule that every problem needs a dependency. Compare existing capabilities and a bespoke baseline on total lifecycle ownership. Prefer an established solution when it fits and lowers overall risk and mechanism; prefer bespoke when evidence shows it is the smaller, safer, more controllable, or more differentiating choice.

This skill researches and decides. It does not install packages, run untrusted code, create accounts, start procurement, accept licenses, send data to a service, or implement the choice without separate authority.

Read [`references/evidence-and-currentness.md`](references/evidence-and-currentness.md) before external research. Read [`references/evaluation-dimensions.md`](references/evaluation-dimensions.md) before comparing finalists. Use [`assets/solution-decision-template.md`](assets/solution-decision-template.md) as the decision-artifact skeleton.

## Activation Boundary and Depth

Use three proportionate depths:

1. **Lightweight preflight** — before proposing material bespoke generic machinery, inspect existing repository capabilities and standard/framework/platform primitives. Continue only when a credible alternative or material ownership decision exists.
2. **Due diligence only** — when the user has prescribed a named but not-yet-adopted material dependency, verify the exact version/tier, compatibility, maintenance, security, license, provenance, lifecycle/execution risk, and local fit without reopening the market comparison. Surface a failed hard gate; otherwise honor the prescribed choice.
3. **Full comparison** — for a consequential unresolved choice, compare credible existing options with a genuine bespoke baseline and produce the decision proposal.

Use the full comparison for cases such as:

- a durable direct dependency or framework;
- a generic cross-cutting capability such as auth, queues, scheduling, validation, search, observability, storage, migrations, or feature flags;
- an open-source application, developer tool, build system, database, runtime, managed service, or platform capability;
- replacing selected custom machinery with an established primitive;
- a build, buy, adopt, adapt, combine, defer, or do-nothing decision with meaningful lifecycle cost.

Do not impose it on domain-specific policy, a small transparent helper, one-off glue, a routine fix or refactor with no new mechanism, or routine use of a tool the project already owns. `find-skills` discovers installable **agent skills**; it does not evaluate software libraries, tools, applications, or services.

## Operating Contract

- Establish the job and hard constraints before shopping. If behavior is still ambiguous, return to `specification` or `grill-me`.
- Inspect the repository and its existing capabilities before searching externally.
- Treat current versions, maintenance, security, support, pricing, and licenses as volatile. Verify live candidates; never rely only on model memory.
- Use primary technical evidence for claims. Popularity and marketing can identify candidates but cannot select them.
- Keep a bespoke baseline in the comparison. Adoption is not automatically superior.
- Compare total ownership, including integration glue, wrappers, upgrades, migration, security response, testing, operations, support, and exit—not initial implementation effort alone.
- Calibrate research to impact and reversibility. Stop once hard gates or sufficient evidence make further search unlikely to change the decision.
- Record uncertainty, confidence, evidence dates, and what would change the recommendation.

## Workflow

### 1. Frame the decision

State:

- the job to be done, users and operators, and observable outcomes;
- must-have constraints, preferences, and non-goals;
- expected lifetime, scale, criticality, reversibility, decision owner, delivery deadline, and urgency;
- runtime, language, framework, deployment, data, security, privacy, accessibility, compliance, and budget constraints;
- the research depth proportionate to blast radius.

Separate solution-neutral needs from an attractive product's vocabulary. Do not let one candidate redefine the requirements after discovery begins.

### 2. Inspect local and built-in options first

Read governing instructions, architecture decisions, active plans, manifests, lockfiles, workspace configuration, and nearby code. Identify:

1. an existing repository capability that can be reused or extended;
2. a language standard library or open standard;
3. an existing runtime, framework, cloud, browser, database, or operating-system primitive;
4. dependencies and tools the team already owns and supports.

Check version compatibility, current usage, transitive dependencies, operational conventions, license/security policy, and whether reuse would create an incoherent second path. Local reuse still needs fit evidence; old code does not win merely because it is present.

### 3. Define candidate classes

Include only classes credible for this decision:

- do nothing or reuse an existing local capability;
- standard, framework, or platform primitive;
- maintained library;
- open-source tool or application;
- managed or commercial service;
- adapt, wrap, or combine a small number of existing options;
- bespoke implementation.

Avoid false breadth. Two or three representative finalists plus the bespoke baseline are often enough. Do not produce a long popularity list.

### 4. Gather current external evidence

Browse for every live external candidate. Prefer, as applicable:

- official documentation, standards, source repositories, and canonical package registries;
- exact release, changelog, support-window, compatibility, EOL, and migration pages;
- the repository's exact `LICENSE`, `SECURITY`, governance, ownership, and contribution files;
- vendor SLA, pricing, DPA, data-residency, portability, backup, and deletion terms;
- official or ecosystem advisories such as OSV, GHSA, vendor advisories, and relevant national guidance;
- reproducible benchmarks over vendor claims when performance is decision-critical.

Record the observed version or service tier, evidence date, URL, and finding. Search snippets, stars, download/install counts, blog rankings, generated comparison sites, and one aggregate security score are discovery signals only.

If live research is unavailable, use local caches, lockfiles, vendored documentation, and source only. Mark external status unverified and the decision provisional; require revalidation before implementation.

### 5. Apply hard gates, then compare trade-offs

Use [`references/evaluation-dimensions.md`](references/evaluation-dimensions.md).

Eliminate a candidate or name a credible mitigation when it fails a hard constraint. Then compare survivors qualitatively—do not disguise judgment as a weighted numeric score.

Evaluate the **whole adopted system**, including transitive dependencies, integration code, hosted control planes, operator workflows, migration bridges, fallback behavior, and the bespoke glue still required. A small package can create large ownership; a focused bespoke module can be cheaper than integrating a broad framework.

Compare time to value and opportunity cost as well as lifecycle ownership. A bespoke option with attractive steady-state ownership may still lose when delivery delay, learning risk, or diverted effort overwhelms the benefit; an existing option may still lose when its integration and migration delay exceeds a focused build. Treat bespoke capability as strategic differentiation only when the job genuinely merits owning it.

Classify the resulting decision as:

- **Adopt** — use an existing solution substantially as designed.
- **Adapt** — configure, extend, fork, or wrap one solution with clearly owned deltas.
- **Combine** — compose a small set of complementary capabilities with an explicit integration owner.
- **Build** — implement the bespoke baseline because its total trade-off is better.
- **Defer** — evidence or timing is insufficient; preserve optionality and name the next trigger.
- **Do nothing** — the current state satisfies the job and change would add more ownership than value.

### 6. Resolve uncertainty safely

For a material unknown, propose the smallest proof-of-fit that can change the decision: a temporary spike, contract test, compatibility build, representative benchmark, operational exercise, license/security review, or migration rehearsal.

- Define the question, success/failure boundary, representative workload, timebox, and disposable outputs first.
- Use a disposable, least-privilege execution sandbox—not merely a temporary directory. Deny home and repository mounts, network, credentials, and host services by default; mount only disposable inputs and grant each exception explicitly.
- Do not install or execute untrusted packages, post-install scripts, containers, binaries, or remote installers without authority and inspection.
- Disable lifecycle/install scripts where the ecosystem allows it, verify the exact artifact and available checksum/signature/provenance before execution, and record every authorized network, mount, credential, or permission exception.
- Never send secrets, personal data, proprietary code, or production payloads to a candidate service without explicit authorization and an approved data path.
- Test the actual version and supported usage, not only a toy API.

Proof-of-fit evidence reduces uncertainty; it does not erase ongoing maintenance, security, or operational obligations.

### 7. Decide and route ownership

Write the decision using [`assets/solution-decision-template.md`](assets/solution-decision-template.md). Every agent-produced result starts as **proposed**; only the named decision owner can accept it, with accepter and date recorded. Use an existing story, design, or active plan convention. If none exists, write a fresh timestamped temporary file rather than inventing a permanent documentation path. Move an explicitly accepted durable decision through `expectations` into the project's existing ADR convention. Use `technical-writing` for a consequential proposal.

If adopting or adapting:

- name the exact supported version/range or service tier and update policy;
- state who owns upgrades, advisories, incidents, renewals, and removal;
- define the narrowest useful dependency boundary, without wrapping by reflex;
- keep domain policy in local language rather than leaking a vendor model through the codebase;
- record an exit path, data export path, and re-evaluation triggers.

If building:

- state why established options lost on explicit constraints or total ownership;
- distinguish domain advantage from generic plumbing;
- bound the mechanism, maintenance promise, security work, and operational surface now owned;
- identify any standards or small primitives still reused inside the bespoke design.

Route the selected implementation:

- module responsibility and dependency-hiding contract: `codebase-design`;
- public protocol or cross-team compatibility: `api-design`;
- source/package placement and enforcement: `structure-codebase`;
- replacing selected custom machinery with net subtraction: `reduce-system-complexity`;
- delivery sequencing: `planning`;
- new or changed behavior: `tdd`, `testing`, `mutation-testing`, and `refactoring`;
- final high-stakes decision review: `double-check`.

## Re-evaluation Triggers

Every durable decision should say when to revisit it, for example:

- major release, deprecation, EOL, maintenance slowdown, or compatibility break;
- security advisory, ownership/governance change, or license change;
- pricing, SLA, data-residency, procurement, or platform-policy change;
- repeated integration pain, missing observability, reliability incidents, or upgrade burden;
- new scale, latency, portability, accessibility, or compliance requirement;
- a platform primitive now satisfies the job with materially less ownership.

## Completion Check

- Were the job and hard constraints known before candidate research?
- Were repository, standard-library, framework, and platform capabilities checked first?
- Is every external finalist supported by current primary evidence with version/tier and date?
- Is the bespoke baseline genuine rather than a straw candidate?
- Were hard gates applied before qualitative trade-offs?
- Does the comparison include transitive, operational, security, migration, and exit costs?
- Are popularity and aggregate scores treated only as signals?
- Is the recommendation calibrated, reversible where possible, and explicit about what would change it?
- Is implementation still separately authorized and routed through the right specialist skills?
- Is the artifact still proposed unless the named owner explicitly accepted it, and does every rejected alternative have a reason?

## Method Sources

The workflow synthesizes the local reuse-before-invention principle with dependency-management, lifecycle, security, and technology-selection guidance. See [`references/evidence-and-currentness.md`](references/evidence-and-currentness.md) for the source map and retained limits.
