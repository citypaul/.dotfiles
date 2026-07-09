# Research Notes

Load this reference when source-backed rationale or comparison with named approaches matters. The operational rules live in `../SKILL.md`.

## Sources

- Alistair Cockburn, [“Hexagonal Architecture”](https://alistair.cockburn.us/hexagonal-architecture) and Cockburn with Juan Manuel Garrido de Paz, [*Hexagonal Architecture Explained*](https://alistaircockburn.com/hexarch%20v1.1b%20DIFFS%2020250420-1012%20paper%2Bepub.docx.pdf)
  - The essential asymmetry is inside versus outside.
  - The pattern requires two zones and does not prescribe the inside's folder layers.
  - Ports are purposeful conversations shaped by the application; multiple adapters can meet one port.
  - Tests and test substitutes are outside interactors that make a port boundary real.

- Robert C. Martin, [“Screaming Architecture”](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)
  - High-level organization should reveal use cases and product purpose rather than frameworks.
  - Use this as a fitness test. It does not require hiding useful boundary vocabulary below the capability level.

- Simon Brown, [“Modular monolith and package by component”](https://simonbrown.je/modular-monolith/)
  - Both global package-by-layer and naive package-by-feature structures can expose too much and weaken encapsulation.
  - Coarse-grained business components with explicit public interfaces combine recognizable purpose with mechanical boundaries.

- Jimmy Bogard, [“Vertical Slice Architecture”](https://www.jimmybogard.com/vertical-slice-architecture/)
  - Couple along the axis of change: maximize cohesion inside a slice and minimize coupling between slices.
  - Do not make every request pass through identical layers or abstractions when its complexity does not require them.

- Mark Seemann, [“Composition Root”](https://blog.ploeh.dk/2011/07/28/CompositionRoot/)
  - Compose the object graph in a preferably unique location near the application's entry point.
  - Composition roots belong to executable applications, not reusable libraries.

- Sam Newman, [“Backends For Frontends”](https://samnewman.io/patterns/architectural/bff/)
  - A BFF is a server-side component tightly focused on one user experience.
  - Its product-edge role supports endpoint-first navigation and cautions against turning it into a general-purpose backend.

- Eric Evans, [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
  - Bounded contexts delimit a model and ubiquitous language.
  - Context boundaries follow language and model authority, not technical layers or one folder per entity.

- Nx, [“Decisions about folder structure”](https://nx.dev/docs/concepts/decisions/folder-structure)
  - Group projects by scope and by work that changes together; promote shared code only when reuse is real.

- Angular, [“Style Guide”](https://angular.dev/style-guide)
  - Organize application code by feature areas rather than global technical-type directories.
  - Keep tests beside the code they exercise instead of collecting unrelated tests centrally.

- Next.js, [“Project Structure and Organization”](https://nextjs.org/docs/app/getting-started/project-structure) and [“Server and Client Components”](https://nextjs.org/docs/app/getting-started/server-and-client-components)
  - File-system routing is a real discovery constraint, while route groups, private folders, and safe colocation allow several valid internal organizations.
  - Server/client module graphs are security and bundle boundaries that need framework-native enforcement, not naming alone.

- React Router, [“File Route Conventions”](https://reactrouter.com/how-to/file-route-conventions) and [“.server modules”](https://reactrouter.com/api/framework-conventions/server-modules)
  - Route folders can colocate non-route implementation files without duplicating the route catalog.
  - Runtime-specific filename/directory conventions can make client imports of server code fail at build time.

- Redux, [“Code Structure”](https://redux.js.org/faq/code-structure/)
  - Feature folders keep state logic with the feature that understands its shape instead of separating actions, reducers, and selectors globally.

- Feature-Sliced Design, [“Layers”](https://feature-sliced.design/docs/reference/layers) and [“Slices and segments”](https://feature-sliced.design/docs/reference/slices-segments)
  - Its named layers, slice isolation, public APIs, and downward import rule form one complete optional architecture.
  - Do not borrow only its folder names without the dependency semantics, and do not require every layer.

## Synthesis

The combined rule is:

1. Put product meaning at the capability root.
2. Put architectural vocabulary at a real, valuable seam.
3. Put behavior that changes together close inside each zone.
4. Use packages and import rules to enforce claims that matter.
5. Keep framework and provider details at entrypoints and outside edges, including frontend runtime graphs.
6. Let routes own route-local UI and let repeated product interactions earn feature owners.
7. Preserve shallow structures where additional architecture would communicate fiction rather than meaning.

This is why an explicitly hexagonal backend should show `hexagon/` beside `adapters/`, a feature-rich frontend may show route composition beside product features and named foundations, and a small app should contain neither ceremony. The visible structure follows the selected architecture; it does not select the architecture on the project's behalf.
