# Story Splitting Pattern Catalog

Use this catalog when the main workflow is not enough. Do not apply every pattern mechanically. Try several and choose the split that creates the most optionality: a child story can deliver value or learning even if siblings never happen.

## Pattern Selection Heuristic

1. **Start with capability options** if the parent is broad or solution-shaped.
2. **Use examples/tests** if the behavior is known but too large.
3. **Use SPIDR or Humanizing Work patterns** if you need a fast checklist.
4. **Use Hamburger** if the team is stuck thinking in technical layers.
5. **Use walking skeleton/tracer/spike** if integration, architecture, or uncertainty is the main blocker.
6. **Reject component splits** unless they are tasks inside a whole story.

## Learning Progression Anti-Pattern

Teams often learn splitting in stages. Recognize the stage, then move one step closer to self-contained value:

| Stage | What it looks like | Why it is not enough | Better move |
|-------|--------------------|----------------------|-------------|
| Process split | design, code, test, document, deploy | no item delivers value alone | keep as a task checklist inside one story |
| Architecture split | UI, business logic, database, API | late integration and no independent user value | make one thin path through the layers |
| Procedure split | collect info, integrate provider, send email | closer, but may still delay the business outcome | ask which subset can satisfy the primary objective |
| Value split | register with one field and pay now | independently useful, negotiable, testable | intensify with later value slices |

The progression is not a maturity ladder to shame the team. It is a diagnostic: name where the current split lives, then choose a smaller story that can stand alone.

## Capability Slicing

Capability slicing keeps the team in the customer problem space. Ask:

```text
What are the options for delivering some value to this actor as soon as possible?
```

Useful capability dimensions:

- actor or customer segment
- persona or role
- job-to-be-done
- workflow stage
- market, geography, plan tier, or channel
- payment method, notification type, document type, report type, or import/export type
- one useful outcome instead of a platform, portal, or program

Good capability children are more precise ways to satisfy the parent capability. They are not steps in building a predetermined solution.

## SPIDR

Use SPIDR as a quick split checklist:

| Letter | Pattern | Prompt |
|--------|---------|--------|
| S | Spike | What specific question must be answered before implementation is responsible? |
| P | Path | Which happy path, alternate path, error path, or user route can stand alone? |
| I | Interface | Which UI/channel/API/device/browser/integration can be supported first? |
| D | Data | Which data subset, type, size, field set, or file format can be supported first? |
| R | Rules | Which business, validation, permission, or policy rules can be scoped safely? |

Use spike last, not first. A spike should produce knowledge with acceptance criteria phrased as answered questions.

## Humanizing Work Patterns

Use these when SPIDR is too coarse:

| Pattern | Prompt |
|---------|--------|
| Workflow steps | Which step in a larger workflow can deliver value or learning first? |
| Business rule variations | Which one rule variation can we support now? |
| Major effort | Which expensive part can be separated from the rest? |
| Simple/complex | What is the core version without variants? |
| Data variations | Which entity, field, file, input, or volume case can come first? |
| Interface variations | Which surface or interaction model can come first? |
| Defer performance/quality | Can we make it work first, then make it fast/scalable/resilient/secure? |
| Spike | Is the problem implementation uncertainty rather than story size? |

Meta-pattern: find the core complexity, identify what has many variations, reduce all variations to one, then build that one complete path.

## Feedback-Oriented Splits

When several splits are plausible, prefer the one that can produce feedback fastest:

- Which child can a real user try?
- Which child can support decide with?
- Which child can a stakeholder accept or reject in a demo?
- Which child proves the riskiest assumption?
- Which child makes the next product decision easier?

If no child can generate feedback, the parent may be framed as internal construction rather than a product capability.

## Bill Wake's Split Families

Use these as prompts for "easier first, harder later" children.

**Big picture:**

- research before action
- spike before implementation
- manual before automated
- buy before build, or build before buy when the product fit is the risk

**User experience:**

- batch before online
- single-user before multi-user
- API/script/character UI before GUI when useful
- generic UI before custom UI

**Qualities:**

- static before dynamic
- minimal error recovery before rich recovery
- transient before persistent
- low fidelity before high fidelity
- small scale before large scale
- less reliability/performance/security scope before more, only when safe

**Features and logic:**

- few features before many
- main flow before alternate flows
- zero/one/many as separate cases
- one level before all levels
- base case before general case
- split compound conditions at "and", "or", "then", and sequencing words

## Agile In A Flash Deferrals

These are useful when the parent is an "iceberg" story: small visible change, large hidden complexity.

- Defer alternate paths or edge cases.
- Defer supporting fields.
- Defer validation rules that are not required for safe learning.
- Defer side effects such as downstream feeds.
- Stub or fake dependencies if the slice is honest about release constraints.
- Split by operational boundary such as create, update, delete, view, search.
- Defer cross-cutting concerns such as logging only when acceptance criteria for adding them later are clear.
- Defer performance or non-functional constraints when slow/simple behavior still teaches something useful.
- Inject dummy data when data availability blocks the slice.
- Ask the customer what narrow outcome would still be useful.

Do not turn deferrals into hidden debt. Every deferral needs a follow-up story, a release constraint, or a conscious decision to discard it.

## Hamburger Method

Use when the team can only see technical tasks.

1. List the implementation steps as layers.
2. For each layer, list options from simplest acceptable to richer.
3. Remove low-quality options that cost about the same as better options.
4. Remove high-quality options that do not matter yet.
5. Choose the first bite: the minimum acceptable option in every layer.
6. Turn later bites into stories that improve one or more layers while keeping each child end-to-end.

Example shape:

| Layer | First bite | Later bites |
|-------|------------|-------------|
| Selection | One saved segment | dynamic filters, rule builder |
| Message | plain text | templating, personalization |
| Sending | manual send | scheduled send, provider integration |
| Feedback | visible confirmation | delivery report, bounce handling |

The first bite crosses all layers. "Build provider integration" by itself is a task.

## Splitting By Testable Requirements

Acceptance examples often reveal natural splits:

1. Generate concrete examples with the product owner, developers, and testers.
2. Group examples that share a coherent user value.
3. Make each group a candidate child story.
4. Keep examples as acceptance criteria.

If examples reveal only technical steps, return to actor, trigger, and observable outcome.

## First-Version Patterns

Use these when starting a new product, major capability, or risky architecture.

| Pattern | Use when... | Output |
|---------|-------------|--------|
| Walking skeleton | You need a production-quality base that connects the main components | Minimal end-to-end behavior through the real path |
| Tracer bullet | You need to answer whether a technical route works | Narrow code path that may be kept or discarded |
| Zero-feature release | Deployment is the unknown | Production deployment with almost no user feature |
| Steel thread/core sample | Layered architecture tempts horizontal delivery | Full-quality narrow path through layers |
| Minimal spanning application | Many components must exist before real features | Bare path that touches major nodes |

## Mistakes To Watch For

- Product owner splits alone and leaves most work in one child.
- Developers split by technical layer and lose user value.
- The story specifies the solution so tightly that no bargain can emerge.
- Every story gets a spike because estimates feel scary.
- All business rules are forced into the first slice without discussing value or safety.
- Teams optimize for busyness with many partially complete component stories.
- Every child depends on every other child before testing can start.

## Safety Rules

- Never defer a legal, safety, privacy, contractual, or security requirement without a clear non-release constraint.
- A "make it work before make it fast" split still needs tests and maintainable code.
- A non-releasable slice must say why it is non-releasable and what would make it releasable.
- A spike must be time-boxed and stop when its questions are answered.
- A technical task belongs under the first story that proves it matters.
- Keep the path back to the full capability visible: splitting helps sequence delivery, but later slices still need to reassemble into the coherent product experience users expect.
