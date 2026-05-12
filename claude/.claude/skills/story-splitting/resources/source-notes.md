# Story Splitting Source Notes

This skill synthesizes Tim Ottinger's story-splitting resource list and the linked articles. Use these notes for provenance, teaching, or updating the skill. Do not load this resource during ordinary story splitting unless source traceability matters.

## Central Thesis

The shared idea across the sources: split by **thin, end-to-end product capability**, not by components, layers, roles, or phases. The team should be able to integrate early, test early, demonstrate running behavior, and learn what to do next.

## Source Map

| Source | Concepts used in the skill |
|--------|----------------------------|
| [Splitting Stories - A Resource Listicle](https://agileotter.blogspot.com/2022/03/splitting-stories-resource-list.html) | End-to-end slices, early integration, "N% of the system 100% done" framing, avoid top-down design followed by bottom-up component construction |
| [Making User Stories Work for You](https://www.industriallogic.com/blog/making-user-stories-work-for-you/) | User stories as small placeholders for conversation, small batch delivery, deferred detailed analysis, independently production-capable slices |
| [Writing Better User Stories?](https://www.industriallogic.com/blog/writing-better-user-stories/) | Shared documents are not shared understanding, stories are conversations rather than requirements, avoid order-taker dynamics |
| [Start Your Project With a Walking Skeleton](https://www.henricodolfing.com/2018/04/start-your-project-with-walking-skeleton.html) | Walking skeleton as tiny end-to-end production code that connects architectural components, validates deployment/build/CI and risk |
| [Evolutionary Design](https://www.industriallogic.com/blog/evolutionary-design/) | Primitive whole, saying no early, manage collaboration/integration risk, integrate early and often, discover user needs through early evolutions |
| [Whole Stories for Whole Teams](https://www.industriallogic.com/blog/whole-stories-for-whole-teams/) | Reject component stories, distinguish stories/tasks/process steps, organize around product capabilities and cross-functional teams |
| [Splitting user stories - the hamburger method](https://gojko.net/2012/01/23/splitting-user-stories-the-hamburger-method/) | Convert technical workflow thinking into vertical "bites" by selecting a minimum acceptable option across each technical layer |
| [The essence of story slicing in agile development](https://neilkillick.medium.com/the-essence-of-story-slicing-in-agile-development-fc16a1226941) | Ask for options to deliver customer value soon; slice problem/capability space before solution space |
| [Splitting User Stories](https://blog.gdinwiddie.com/2011/05/01/splitting-user-stories/) | Split by acceptance-test examples; example mapping can reveal natural child stories |
| [Bargain Hunting](https://www.industriallogic.com/blog/bargain-hunting/) | Search collaboratively for high-value, low-cost versions; treat stories as draft ideas and backtrack when a bargain is not real |
| [Scatter-Gather](https://www.industriallogic.com/blog/scatter-gather/) | Avoid splitting work into individual/component tickets that integrate late, obscure status, discourage collaboration, and multiply delivery risk |
| [Evolution, Cupcakes, and Skeletons](https://www.industriallogic.com/blog/evolution-cupcakes-and-skeletons/) | Vertical slices, slice-of-cake/stir-fry metaphors, tracer bullet, zero-feature release, steel thread, minimal spanning application |
| [Breaking Down Larger Stories](https://agileinaflash.blogspot.com/2009/02/breaking-down-larger-stories.html) | Deferral techniques: alternate paths, supporting fields, validation, side effects, dependencies, operations, cross-cutting concerns, performance, data variants |
| [SPIDR: Five Simple but Powerful Ways to Split User Stories](https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories) | SPIDR: Spikes, Paths, Interfaces, Data, Rules |
| [SPIDR - five simple techniques for a perfectly split user story](https://blogs.itemis.com/en/spidr-five-simple-techniques-for-a-perfectly-split-user-story) | SPIDR summary, compound stories, smallness under INVEST, rule and data examples |
| [Twenty Ways to Split Stories](https://xp123.com/twenty-ways-to-split-stories/) | Broad split catalog: research/action, manual/automated, batch/online, one/many, static/dynamic, low/high fidelity, small/large scale, main/alternate flows |
| [The Humanizing Work Guide to Splitting User Stories](https://www.humanizingwork.com/the-humanizing-work-guide-to-splitting-user-stories/) | Good stories as vertical slices, splitting flow, simple/complex, defer performance, spike last, meta-pattern of reducing variations |
| [Five Story-Splitting Mistakes and How to Stop Making Them](https://www.mountaingoatsoftware.com/blog/five-story-splitting-mistakes-and-how-to-stop-making-them) | Mistakes: PO-only splitting, technical boundaries, solution-specified stories, overusing spikes, enforcing all business rules first |
| [How Tracer Bullets Speed Up Software Development](https://builtin.com/software-engineering-perspectives/what-are-tracer-bullets) | Tracer bullets answer concrete technical questions quickly, are time-boxed, may be disposable, and can validate end-to-end feasibility |
| [What is Story Splitting?](https://agilealliance.org/glossary/story-splitting/) | Story splitting as an agile practice, lack of one universal method, INVEST further-reading thread |
| [How You'll Probably Learn to Split Features](https://blog.jbrains.ca/permalink/how-youll-probably-learn-to-split-features) | Learning progression from process splits, to architecture/layer splits, to procedure splits, to independent value slices; primary-objective framing |
| [How To Split User Stories](https://www.infoq.com/news/2011/04/how-to-split-user-stories/) | Summary of community guidance: stories should work, deliver value, and potentially generate feedback; persona, risk, testability, CRUD, data-entry, performance, and spike splits |

## Unavailable Linked Article

The linked TechBeacon article at `https://techbeacon.com/app-dev-testing/practical-guide-user-story-splitting-agile-teams` currently redirects to an OpenText DevOps archive page rather than the article text. Do not attribute specific guidance to that article unless it is re-fetched from an accessible archive.

The Agile Alliance page links to Richard Lawrence's older `richardlawrence.info` article URL. That direct URL was not accessible during this pass, but the same pattern set is now maintained in the Humanizing Work guide and summarized by InfoQ. Prefer those accessible sources unless the original becomes available again.

## Synthesis Decisions

- The main `SKILL.md` keeps workflow and validation guidance close at hand.
- `pattern-catalog.md` holds the detailed named pattern catalog so the skill can stay context-efficient.
- This `source-notes.md` file preserves source provenance without forcing every future story-splitting task to load a bibliography.
- The skill intentionally uses "story" broadly for backlog items, epics, features, and initiatives because the same splitting principles apply at different planning levels.
- The skill treats "not releasable yet" as acceptable only when the release constraint is explicit. This reconciles sources that encourage deferring rules/performance with sources that warn against calling unfinished work done.
