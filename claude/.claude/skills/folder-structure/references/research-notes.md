# Folder Structure Research Notes

Load this only when source-backed rationale matters. The working rules live in `../SKILL.md`.

## Source Principles

- Robert C. Martin's "Screaming Architecture" argues that the highest-level package and directory structure should reveal the system's use cases, not its framework. It also emphasizes deferring framework, database, and web-server decisions so use cases remain testable without those tools.
  Source: https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html

- Martin's "Clean Architecture" frames related architectures around separation of concerns: business rules should be independent of frameworks, UI, databases, and external agencies.
  Source: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

- React's legacy file-structure guidance lists feature/route grouping as a common approach, recommends colocating CSS, JS, and tests, warns against deep nesting, and says files that change together should stay close together.
  Source: https://legacy.reactjs.org/docs/faq-structure.html

- Angular's current style guide recommends organizing projects by feature areas and grouping closely related files, including tests, in the same directory.
  Source: https://angular.dev/style-guide

- Nx recommends planning monorepo folder structure around scope: the app or larger application section a project belongs to. It also recommends grouping projects that are usually updated together and moving shared work into explicit shared areas when reuse is real.
  Source: https://nx.dev/docs/concepts/decisions/folder-structure

- Microsoft's feature-slices article explains the cost of type-first MVC folders and recommends feature folders for vertical-slice work so controllers, views, and view models for one capability stay together.
  Source: https://learn.microsoft.com/en-us/archive/msdn-magazine/2016/september/asp-net-core-feature-slices-for-asp-net-core-mvc

- Feature-Sliced Design provides a frontend vocabulary of layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`), slice independence, downward-only imports, and explicit public APIs.
  Sources:
  - https://fsd.how/docs/reference/layers/
  - https://fsd.how/docs/reference/slices-segments/
  - https://fsd.how/docs/reference/public-api/

- Bulletproof React is a pragmatic reference implementation for production React apps. Its project-structure guide organizes most code under feature modules, allows feature-local `api`, `components`, `hooks`, `stores`, `types`, and `utils`, and recommends unidirectional flow from shared code to features to app.
  Source: https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md

## Synthesis

The strongest common pattern is:

1. Put business meaning at the first meaningful level.
2. Keep files that change together close.
3. Hide framework and infrastructure details behind thin entrypoints or adapters.
4. Treat "shared" as earned by real reuse, not as a default destination.
5. Enforce boundaries with public APIs and import rules after the first successful slice proves the shape.
