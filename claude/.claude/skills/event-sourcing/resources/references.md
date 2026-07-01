# Source Notes

Load this when checking the rationale and primary sources behind the event-sourcing guidance. The fuller cross-skill reference lives in `claude/.claude/skills/REFERENCES.md` in the source repo (https://github.com/citypaul/.dotfiles) — not bundled when this skill is installed standalone.

## Foundations and Definitions

- Martin Fowler, "Event Sourcing" (2005): https://martinfowler.com/eaaDev/EventSourcing.html
  - *"Capture all changes to an application state as a sequence of events."* — the canonical definition.
  - Rebuild by replay: *"We can discard the application state completely and rebuild it by re-running the events."*
  - Caveats we take seriously: replay vs external systems (*"those external systems don't know the difference between real processing and replays"*), and *"don't go down this path unless you really need to."*
- Martin Fowler, "CQRS" (2011): https://martinfowler.com/bliki/CQRS.html — CQRS and ES are independent; *"beware that for most systems CQRS adds risky complexity."*
- Martin Fowler, "What do you mean by Event-Driven?" (2017): https://martinfowler.com/articles/201701-event-driven.html — the four patterns (event notification, event-carried state transfer, event sourcing, CQRS) hiding under "event-driven".
- Greg Young, "CQRS Documents" (2010): https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf — past-tense event naming; the ledger/delta model; append-only; optimistic concurrency (expected version); no-delete/reversal transactions; ES+CQRS symbiosis; and the point that event sourcing has high ROI in an area of competitive advantage but may have negative ROI elsewhere (paraphrased)
- Greg Young, "Functional Domain Models and Event Sourcing" (2012): https://gregfyoung.wordpress.com/2012/10/01/functional-domain-models-and-event-sourcing/ — *"Current State is a Left Fold of previous behaviours"*; *"a snapshot is just a memoization of the foldLeft operation at a given point."*
- Greg Young, "CQRS is not an Architecture" (2012): https://gregfyoung.wordpress.com/2012/09/09/cqrs-is-not-an-architecture/ — ES/CQRS are component-level patterns applied per bounded context; *"The largest failure I see from people using event sourcing is that they try to use it everywhere."*
- Chris Richardson, "Event Sourcing pattern": https://microservices.io/patterns/data/event-sourcing.html — minimal two-operation store; benefits (free audit log) and drawbacks (query difficulty, learning curve, eventual consistency).

## Functional Event Sourcing (the Decider)

- Jérémie Chassaing, "Functional Event Sourcing Decider" (2021): https://thinkbeforecoding.com/post/2021/12/17/functional-event-sourcing-decider
  - The Decider — `decide: command → state → event[]`, `evolve: state → event → state`, `initialState`, `isTerminal`.
  - Rehydration as a fold: *"Computing a new state after events … is simply `List.fold evolve state events`."*
- Jérémie Chassaing, "Aggregate Composition" (DDD Europe 2023): https://codeberg.org/thinkbeforecoding/dddeu-2023-deciders — `compose`, `adapt`, `many`; Deciders form a category.
- Scott Wlaschin, *Domain Modeling Made Functional* (2018) + https://fsharpforfunandprofit.com — workflow = `Command → Result<Event list, Error>` (errors as values); make illegal states unrepresentable (State as a discriminated union of lifecycle phases).
- Oskar Dudycz, Emmett docs: https://event-driven-io.github.io/emmett/ — TS `Decider<State, Command, Event>` (the dominant TS generic order we adopt), `CommandHandler`, `DeciderSpecification`. Note: pre-1.0; licence unresolved.
- Oskar Dudycz, "Testing business logic in Event Sourcing" (2023): https://event-driven.io/en/testing_event_sourcing/ — the decide-fold-assert test shape the literature calls given-when-then. We translate it to behaviour-driven tests (see `testing-event-sourced-systems.md`), we do **not** adopt the DSL.

## Modelling and EventStorming

- Alberto Brandolini, EventStorming: https://www.eventstorming.com/ + *Introducing EventStorming* (Leanpub) — the workshop, three levels, colour grammar, pivotal events.
- DDD Crew, EventStorming glossary cheat sheet: https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet — the precise colour→concept grammar and the command→aggregate→event→policy loop.
- Mathias Verraes, "Patterns for Decoupling in Distributed Systems" (2019): https://verraes.net/ — Fat Event, Summary Event, Segregated Event Layers (internal vs external).
- Oskar Dudycz, event-driven.io — "Internal and external events" (event-driven API); "State Obsession", "Clickbait event", "Passive-Aggressive Events" (the anti-patterns and command-vs-event distinction: *"commands can be rejected … Events can only be ignored."*).

## Versioning

- Greg Young, *Versioning in an Event Sourced System* (2017): https://leanpub.com/esversioning — the definitive text. Immutability (*"The moment you allow a single edit, everything becomes suspect"*); *"A new version of an event must be convertible from the old version … If not, it is … a new event"*; weak schema; upcasting; copy-and-replace / copy-transform; no renames; no semantic changes; snapshot/process-manager versioning.
- Marten, "Events Versioning": https://martendb.io/events/versioning — working upcaster API and event-type name mapping; the "no I/O in an upcaster" warning.
- Oskar Dudycz, "How to (not) do the events versioning?": https://event-driven.io/en/how_to_do_event_versioning/ — *"The best option … is to prevent conditions in which versioning is needed."*

## Storage and Tooling

- Kasey Speakman, "Event Storage in Postgres" (2018): https://dev.to/kspeakman/event-storage-in-postgres-4dk2 — the canonical `event` table and `UNIQUE (stream_id, version)` as the optimistic-concurrency mechanism.
- Eventide, message-db: https://github.com/message-db/message-db — Postgres `messages` schema and `write_message` with `expected_version`.
- Kurrent (EventStoreDB): https://www.kurrent.io/ — event-store capability list; catch-up vs persistent subscriptions; Node client rebrand `@eventstore/db-client` → `@kurrent/kurrentdb-client`.
- Robert Pankowecki (Arkency), quoting Greg Young, "Correlation id and causation id in evented systems" (2018): https://blog.arkency.com/correlation-id-and-causation-id-in-evented-systems/ — *"copy its correlation id as your correlation id, its message id is your causation id."*
- AWS Prescriptive Guidance, "Event sourcing pattern": https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-sourcing.html — DynamoDB conditional-write concurrency; event versioning during replay.

## Production Concerns

- Oskar Dudycz, "Snapshots in Event Sourcing" (2021): https://www.kurrent.io/blog/snapshots-in-event-sourcing — snapshot-every-N; *"The need to use snapshots may hint to the model's design flaw."*
- Marten, "Projections" + "Rebuilding Projections": https://martendb.io/events/projections/ — inline/live/async lifecycles; rebuild; blue/green projection versioning.
- Ben Smith, "Dealing with eventual consistency in a CQRS/ES application" (2017): https://10consulting.com/2017/10/06/dealing-with-eventual-consistency/ — the read-your-writes / POST-redirect-GET-404 problem and four mitigations.
- Oskar Dudycz, "Outbox, Inbox patterns and delivery guarantees explained" (2020): https://event-driven.io/en/outbox_inbox_patterns_and_delivery_guarantees_explained/ — the three delivery semantics; dedup via unique constraint.
- Tyler Treat, "You Cannot Have Exactly-Once Delivery" (2015): https://bravenewgeek.com/you-cannot-have-exactly-once-delivery/ — *"you cannot have exactly-once message delivery … we achieve it in practice by faking it."*
- Mathias Verraes, "Eventsourcing Patterns: Crypto-Shredding" (2019): https://verraes.net/2019/05/eventsourcing-patterns-throw-away-the-key/ — crypto-shredding + the *"encrypted personal data is still personal data"* legal caveat.
- Michiel Rook, "Forget me please? Event sourcing and the GDPR" (2017): https://www.michielrook.nl/2017/11/forget-me-please-event-sourcing-gdpr/ — and Oskar Dudycz, "How to deal with privacy and GDPR in Event-Driven systems" (2023): https://event-driven.io/en/gdpr_in_event_driven_architecture/ — crypto-shredding, forgettable payload, segregation, retention.
- Savvas Kleanthous, "Event immutability and dealing with change" (2021): https://www.kurrent.io/blog/event-immutability-and-dealing-with-change — compensating/reversal events; *"Deleting events, even wrong ones, is also something I would advise you to avoid."*
- Vaughn Vernon, "Effective Aggregate Design" (2011): https://www.dddcommunity.org/library/vernon_2011/ — *"Use Eventual Consistency Outside the Boundary"*; cross-aggregate work is a saga.
- Oliver Libutzki, "Why Event Sourcing is a microservice communication anti-pattern" (2019): https://dev.to/olibutzki/why-event-sourcing-is-a-microservice-anti-pattern-3mcj — *"Your persistence becomes your public API."*
