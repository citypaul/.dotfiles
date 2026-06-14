# HTML Lessons

How to generate self-contained HTML lesson files — the durable, beautiful artifacts a learner returns to for review after interactive sessions.

---

## Role in the Learning System

The interactive session is the teaching; the lesson is the record. Each lesson captures one session's material in a form designed for re-reading, review before spaced repetition, and printing. Lessons complement the cheat sheet: the cheat sheet is for fast lookup across the whole topic, a lesson is the narrative of one tightly-scoped concept.

**When to generate:**
- At the end of each session — offer, don't impose
- On request, for any topic already covered
- **Up front, in capture mode** — when the learner is short on time or asks to record the material for later reading, generate the lesson at the point where teaching would normally happen instead of running the full interactive flow
- Not as a silent substitute for interactive teaching — a lesson the learner reads passively is the information-dumping anti-pattern. End-of-session lessons capture thinking the learner already did; capture-mode lessons are an explicit deferral, with the thinking owed at the next session.

**Capture mode rules:**
- Generating up front spoils retrieval: the lesson contains the answers the session would have made the learner work for. Say so when offering it.
- The lesson's recap quiz is the learner's asynchronous practice — point them at it.
- Log the lesson as **captured, not taught** in the session log. Coverage is not learning: nothing from a captured lesson earns a learning record, a glossary entry, or graduation from review until the learner demonstrates it live.
- Start the next session's REVIEW from the captured lesson's quiz topics — that retrieval is where the deferred learning actually happens.

**File naming:** `learning/[topic-slug]/lessons/NNNN-[dash-case-slug].html`, where `NNNN` starts at `0001` and increments. Scan the directory for the highest existing number. Create the `lessons/` directory lazily.

**After writing:** open the file for the learner — `open <path>` on macOS, `xdg-open <path>` on Linux.

---

## Design Principles

A lesson should be beautiful enough that the learner *wants* to return to it. Think Tufte: typography does the work, decoration does not.

- **Self-contained** — one file, inline CSS, no CDN links, no external fonts, no framework. It must render perfectly offline and survive being emailed or moved.
- **Readable measure** — body text constrained to ~65-70 characters per line (`max-width: 38rem` or similar), generous line height (1.6+), real margins.
- **Quiet palette** — near-black text on off-white, one restrained accent color for links and highlights. No gradients, no hero banners.
- **System fonts** — a serif stack for body (`Georgia, 'Times New Roman', serif`) or a clean system sans; monospace for code.
- **Print-friendly** — include an `@media print` block: hide interactive controls, reveal quiz answers, avoid page-breaking inside examples.
- **Vanilla JS only, and only where it earns its place** — quiz answer reveal, nothing else. The lesson must be fully readable with JS disabled.
- **Semantic HTML** — headings in order, `<figure>` for diagrams, `<blockquote>` for sources, `<code>`/`<pre>` for code.

For diagrams, prefer inline SVG (crisp, prints well) or a styled `<pre>` ASCII diagram. Never reference external images.

---

## Required Elements

Every lesson contains, in order:

1. **Header** — lesson number, title, date, topic. One line tying the lesson to the mission: *"Part of your mission to [mission]"*.
2. **Objective** — "After this lesson you'll be able to [observable verb] [specific thing]."
3. **Body** — the session's teaching, mirrored: concrete examples first (at least two), abstract principle extracted second, diagram where it adds clarity. Use glossary terminology exactly.
4. **Citations** — claims backed by links to sources from `resources.md`, inline where the claim is made.
5. **Recap quiz** — 3-5 questions spanning Bloom's levels, answers hidden behind reveal controls. Follow the answer-option hygiene rules in `assessment-patterns.md` (equal-length options, no formatting clues).
6. **Reading list attempt** — try to add a compact list of world-class resources for the lesson: articles, blog posts, videos/talks, papers, or books. Include only excellent, directly relevant resources; if none meet the bar, omit the section.
7. **Connections** — links to the previous and next lesson (relative paths), and to `../cheat-sheet.md` and `../glossary.md`.
8. **Footer reminder** — the tutor is available: *"Questions? Run `/teach-me [topic]` — your tutor remembers where you left off."*

---

## Template

Use this skeleton as the starting point; adapt the content structure to the material, not the other way round.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lesson NNNN — [Title]</title>
<style>
  :root {
    --ink: #1a1a1a;
    --paper: #fdfdf8;
    --accent: #8b2500;
    --muted: #6b6b6b;
  }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: var(--ink);
    background: var(--paper);
    max-width: 38rem;
    margin: 0 auto;
    padding: 3rem 1.5rem 5rem;
    line-height: 1.65;
    font-size: 1.05rem;
  }
  h1 { font-size: 1.9rem; line-height: 1.2; margin-bottom: 0.25rem; }
  h2 { font-size: 1.3rem; margin-top: 2.5rem; }
  a { color: var(--accent); }
  .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 2.5rem; }
  .mission { font-style: italic; color: var(--muted); }
  .objective {
    border-left: 3px solid var(--accent);
    padding: 0.5rem 1rem;
    margin: 2rem 0;
  }
  code, pre {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 0.85em;
  }
  pre {
    background: #f4f4ec;
    padding: 1rem;
    overflow-x: auto;
    line-height: 1.45;
  }
  figure { margin: 2rem 0; }
  figcaption { color: var(--muted); font-size: 0.85rem; margin-top: 0.5rem; }
  .quiz li { margin-bottom: 1.25rem; }
  details summary { cursor: pointer; color: var(--accent); }
  .reading-list {
    background: #f4f4ec;
    padding: 1rem 1.25rem;
    margin: 2rem 0;
  }
  .reading-list h2 {
    margin-top: 0;
  }
  .reading-list li {
    margin-bottom: 0.75rem;
  }
  .resource-kind {
    color: var(--muted);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  footer {
    margin-top: 3.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #ddd;
    color: var(--muted);
    font-size: 0.9rem;
  }
  nav.lessons { display: flex; justify-content: space-between; font-size: 0.9rem; }
  @media print {
    details { display: block; }
    details summary { display: none; }
    details[open], details { page-break-inside: avoid; }
    nav.lessons, .follow-up { display: none; }
    body { max-width: none; padding: 0; }
  }
</style>
</head>
<body>

<header>
  <h1>[Title]</h1>
  <p class="meta">Lesson NNNN · [Topic] · [Date]</p>
  <p class="mission">Part of your mission to [mission, verbatim from plan.md].</p>
</header>

<div class="objective">
  <strong>After this lesson you'll be able to</strong> [observable verb] [specific thing].
</div>

<h2>[First concrete example heading]</h2>
<p>[Concrete example one — cite sources inline: <a href="[url]">[source]</a>]</p>

<h2>[Second concrete example heading]</h2>
<p>[Concrete example two, from a different context]</p>

<h2>The principle</h2>
<p>[Abstract principle extracted from the examples, in glossary terms]</p>

<figure>
  <!-- inline SVG or <pre> ASCII diagram -->
  <figcaption>[What the diagram shows]</figcaption>
</figure>

<h2>Check yourself</h2>
<ol class="quiz">
  <li>
    [Question at Remember/Understand level]
    <details><summary>Answer</summary><p>[Answer with one-line why]</p></details>
  </li>
  <li>
    [Question at Apply level]
    <details><summary>Answer</summary><p>[Answer]</p></details>
  </li>
  <li>
    [Question at Analyze/Evaluate level]
    <details><summary>Answer</summary><p>[Answer]</p></details>
  </li>
</ol>

<section class="reading-list" aria-labelledby="reading-list">
  <h2 id="reading-list">Reading list</h2>
  <ul>
    <li>
      <span class="resource-kind">[Article / Blog post / Video / Book / Paper]</span><br>
      <a href="[url]">[Resource title]</a> — [one sentence on why this is excellent and when to use it].
    </li>
    <li>
      <span class="resource-kind">[Article / Blog post / Video / Book / Paper]</span><br>
      <a href="[url]">[Resource title]</a> — [one sentence on why this is excellent and when to use it].
    </li>
  </ul>
</section>

<nav class="lessons">
  <a href="./NNNN-previous-slug.html">← Previous lesson</a>
  <a href="./NNNN-next-slug.html">Next lesson →</a>
</nav>
<p><a href="../cheat-sheet.md">Cheat sheet</a> · <a href="../glossary.md">Glossary</a></p>

<footer class="follow-up">
  Questions? Run <code>/teach-me [topic]</code> — your tutor remembers where you left off.
</footer>

</body>
</html>
```

Omit the previous-lesson link in lesson `0001`; omit the next-lesson link until the next lesson exists (add it when generating the following lesson).

Omit the whole reading-list section when no excellent, directly relevant resources can be found.

---

## HTML Indexes

If you create an HTML index for a topic, lesson set, or course, treat it as a durable learning artifact rather than a directory listing. Include the lesson map, mission, current progress, and a topic-level reading list when excellent resources exist.

**Index reading-list rules:**
- Use the same quality bar as lessons: canonical, recognised expert, peer-reviewed, widely cited, or exceptionally clear and practical.
- Prefer breadth across media when it helps: one article or blog post, one video or talk, and one book or paper is better than three similar links.
- Draw from `resources.md` first; if the index reveals a gap, do online research for a better source and add it to `resources.md` before linking it.
- Keep the list short: 3-7 resources for a full topic index, fewer for a narrow lesson index.
- If the topic lacks excellent resources, omit the reading list; do not add a placeholder or apology inside the HTML.

---

## Content Rules

- **One thing per lesson.** A lesson covering two concepts is two lessons. Scope to what fits in working memory.
- **Mirror the session, don't transcribe it.** Use the same examples the learner worked through — familiarity aids review — but compress the dialogue into clean exposition.
- **Keep difficulty out of the prose.** The body is for knowledge re-acquisition, so it should be the clearest possible telling. The quiz is where desirable difficulty lives.
- **Cite or cut.** A factual claim with no source from `resources.md` either gets a source found and added, or gets reframed as reasoning the learner can verify themselves.
- **Quality-gate reading lists.** A lesson or index reading list is not "more links"; it is a curated path to the best material. Include only resources you would confidently assign to a serious learner: primary documentation, seminal papers/books, recognised expert articles, exceptional blog posts, or high-signal talks/videos. Prefer sources that are current for fast-moving topics. Do online research when `resources.md` is thin, update `resources.md` with any selected resource, and omit the section entirely when the research does not turn up excellent material.
- **Glossary discipline.** Use glossary terms exactly as defined. If the lesson needs a term the glossary lacks and the learner has demonstrated understanding of it, add it to the glossary in the same step.
- **Quiz answers are part of spaced repetition.** Pull at least one quiz question from a *previous* lesson's material (interleaving), and feed quiz topics into the session log's spaced-review schedule.
