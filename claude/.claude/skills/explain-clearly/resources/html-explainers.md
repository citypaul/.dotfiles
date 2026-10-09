# HTML explainers and designed reading surfaces

## Compose around the explanation

Follow the reader's question and the project's visual identity. For a new
surface, choose a coherent editorial direction through typography, composition,
colour, and illustration. Make the subject recognisable in the visual choices.
Implement the design fully; a generic sequence of interchangeable cards rarely
expresses a mechanism or builds a sustained argument.

Open with an informative title and the useful idea. Establish hierarchy between
the main account, examples, supporting detail, and sources. Let a figure span
more width when it needs it while keeping prose comfortable to read. Put labels
beside the relevant marks and relate the figure to the surrounding explanation.
Use whitespace, alignment, and a consistent spacing scale to reveal grouping.

These are starting preferences, not standards or conformance criteria:

- Running prose around 60–75 characters wide, with body type around 18–20 CSS
  pixels and line height around 1.5–1.7; adjust for the font, reader, and medium.
- A restrained type palette, with deliberate roles for body, headings, and code.
  Use available or appropriately licensed fonts with reliable fallbacks.
- Strong size and spacing hierarchy, well-aligned baselines, and consistent
  margins. Use colour to guide attention and distinguish concepts consistently.
- Use borders, shadows, textures, and motion purposefully. Expressive design
  is welcome when it supports the topic and leaves the account easy to follow.

## Make visual explanations earn their place

Choose a diagram, comparison, timeline, plot, or worked example for the
relationship it reveals. Carry one example across text and visual states.
Make scale, units, ordering, assumptions, and exceptions explicit where relevant.
Keep conceptual diagrams visibly distinct from measured charts.
For a quantitative visual, derive tick labels, regions, and moving markers from
the same numerical scale. Check their rendered alignment at the boundaries;
evenly spaced labels misrepresent uneven numeric intervals.
Anchor endpoint labels inward so the text stays inside the figure at narrow widths.

Apply Mayer's principles in context: highlight essential structure, remove
irrelevant distractions, place corresponding words and pictures together,
and let readers control complex sequences. Keep captions and text alternatives;
research about redundant narration is not a reason to remove accessible text
from a page. Beauty and comprehension require judgment, not a decoration quota.

Use interaction when it lets a reader compare states, manipulate a meaningful
input, predict an outcome, or inspect a sequence. State what changes and why.
Make the initial state understandable and supply reset where exploration needs
it. Avoid hiding prerequisite explanations behind optional controls. A simple
static example is sufficient when interaction adds no understanding.

Label simulations and illustrative data. Reflect every displayed control in the
underlying explanation or calculation; decorative sliders teach false causality.
Never present an illustrative result as a measured product claim.

## Build for access and portability

Use the existing project stack when embedding in an application. For a standalone
HTML deliverable, prefer semantic HTML, CSS, and only the JavaScript the
explanation needs. Keep it usable without network dependencies when portability
is part of the request; do not add a framework or remote font solely for polish.
Use native disclosure, buttons, inputs, and links where they fit.

- Set the page language and an informative title. Keep the DOM reading order
  meaningful, with landmarks, logical headings, and descriptive link text.
- Give images and diagrams appropriate text alternatives. Put complex visual
  information in nearby prose or an accessible table; mark decorative images
  appropriately. Meaning must survive without colour or hovering.
- Use visible input labels, keyboard-operable controls, clear focus indicators,
  and understandable state feedback. Prefer native controls over simulated ones.
- Meet applicable WCAG 2.2 AA requirements. In particular, normal text needs
  at least 4.5:1 contrast and qualifying large text 3:1; relevant control and
  graphical boundaries need 3:1 under the non-text contrast criterion.
- Keep content usable at narrow widths and enlarged text. At the 320 CSS-pixel
  reflow test width, the page should not require two-dimensional scrolling;
  genuinely two-dimensional figures or tables can use bounded overflow.
- Respect reduced-motion preferences. Let readers pause or control explanatory
  animation and retain a readable static account.
- Keep essential prose and initial visual meaning available if enhancement
  fails. For a standalone document, make printing readable, including essential
  explanations otherwise revealed through interaction.

An AA target requires all applicable criteria, not just this short list. COGA
adds useful comprehension guidance beyond WCAG conformance.

## Inspect the artifact

Use the available browser or rendering tool. Inspect desktop and narrow layouts
together, then fix discovered problems in one batch and confirm the affected
views. Check typography, whitespace, clipping, overlaps, diagram labels, long
headings, code, tables, and source links. Use actual screenshots for visual
judgment; DOM checks alone cannot establish that the design is beautiful.
Use an existing browser/runtime; keep toolchain setup proportionate to a
standalone document. If none is available, report the rendering gap and deliver
the source-checked artifact instead of repeatedly attempting unavailable tools.

Exercise meaningful states with mouse and keyboard: initial, changed, reset,
and relevant boundary inputs. Check focus, labels, overflow, reduced motion,
and print layout when applicable. Run available accessibility checks alongside
manual inspection. If rendering is unavailable, inspect source and report that
visual quality and interaction remain unverified.
Apply the source-to-draft meaning check to every reachable state, including
conditional messages and failure branches. A careful static explanation cannot
repair an unsupported promise that appears after changing a control.

Report what was checked without claiming universal accessibility or measured
learning gains. Deliver the file or preview through the host's supported
artifact mechanism.
