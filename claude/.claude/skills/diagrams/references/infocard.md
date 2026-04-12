# Infocard Reference

Create editorial-quality information cards in Markdown using embedded HTML/CSS. Best for knowledge summaries, data highlights, content cards, and reports. NOT for architecture diagrams (use architecture), flowcharts (use mermaid), or data visualization (use vega).

**Embedding:** Write as direct HTML in Markdown. **NEVER** use code blocks/fences.

## Critical Rules

1. **Direct HTML embedding** -- Write as raw HTML, never in code fences
2. **No empty lines in HTML** -- Keep structure continuous to prevent parsing errors
3. **Content analysis first** -- Assess density, structure, and mood before picking layout/style
4. **Anti-AI checklist** -- Avoid centered hero titles, equal-width 3-column layouts, pure black text, oversized-only hierarchy, neon gradients, filler statistics

## Workflow

1. **Analyze content**: Density (low/medium/high word volume), Structure (layout geometry), Mood (visual tone)
2. **Pick a layout** matching your content structure
3. **Pick a style** matching your content mood
4. Combine layout HTML with style CSS
5. Replace placeholder content

---

## Content Analysis

### Density Assessment
- **Low density** (few words): Generous whitespace, large type
- **Medium density**: Balanced grid, mixed-weight cells
- **High density** (many words): Asymmetric grids, compact panels

### Structure Signals
| Signal | Layout Pattern |
|--------|---------------|
| Single key message | Hero Card |
| Main + supporting detail | Split Panel |
| Multiple equal topics | Bento Grid |
| Sequential steps | Timeline Flow |
| A vs B | Comparison |
| Numbers-first | Data Highlight |

### Mood to Style Mapping
| Content Mood | Recommended Style |
|-------------|------------------|
| Philosophical, literary | Editorial Warm |
| Product launch, tech | Clean Modern |
| Data-heavy, KPIs | Bold Contrast |
| Project notes, docs | Notion Minimal, Paper Minimal |
| Technical specs | Tech Blueprint |
| Academic, formal | Navy Formal |
| Creative, vintage | Retro Vintage |

---

## Layout Catalog

| Layout | Best For |
|--------|----------|
| Hero Card | Single topic with title + summary + one panel |
| Split Panel | Main content + sidebar, analytical spread |
| Bento Grid | Multi-topic overviews, feature showcases |
| Timeline Flow | Processes, step-by-step guides, chronology |
| Comparison | A vs B, before/after, pros/cons |
| Data Highlight | KPI cards, metric-driven announcements |
| Metric Board | Dense metrics overview |
| Quote Card | Pull quotes, testimonials |
| Radial Hub | Central concept with surrounding elements |
| Badge Grid | Categorized items with labels |
| Stacked Modules | Vertically stacked distinct sections |
| Funnel Stack | Conversion funnels, progressive filtering |
| Versus Split | Head-to-head comparison |

## Style Catalog

| Style | Mood | Key Feature |
|-------|------|-------------|
| Editorial Warm | Literary, essays | Serif titles, paper texture, noise overlay |
| Clean Modern | Product, tech | Blue accents, rounded corners, crisp |
| Bold Contrast | Data, KPIs | Dark bg, amber accents, oversized numbers |
| Notion Minimal | Notes, docs | Ultra-clean white, muted blue accent |
| Tech Blueprint | Specs, engineering | Blueprint grid bg, cyan accents, monospace |
| Paper Minimal | Briefs, checklists | Clean white, subtle blue accent |
| Deep Night | Premium, luxury | Near-black, emerald accents |
| Navy Formal | Corporate, academic | Navy blue, gold accents |
| Slate Chalk | Education, training | Chalkboard aesthetic |
| Retro Vintage | Creative, editorial | Warm browns, vintage feel |
| Lab Journal | Research, science | Graph paper grid, clinical |
| Soft Neutral | General purpose | Warm gray, understated |
| Chalkboard | Teaching, workshops | Dark green, chalk-like text |
| Wash Pastel | Light, friendly | Soft pastel palette |

---

## Base Card Structure

All infocards share this foundation:

```html
<div style="max-width: 800px; box-sizing: border-box; position: relative;">
  <style scoped>
    .card { position: relative; background: #fafafa; padding: 40px; font-family: sans-serif; color: #111; line-height: 1.6; }
    .card-meta { margin: 0 0 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #888; }
    .card-title { margin: 0 0 16px; font-size: 36px; font-weight: 700; line-height: 1.15; color: #111; }
    .card-bar { width: 80px; height: 6px; margin: 0 0 20px; background: #111; }
    .card-subtitle { margin: 0 0 20px; font-size: 17px; line-height: 1.55; color: #444; }
    .card-body { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #333; }
    .card-panel { padding: 16px 18px; background: rgba(0,0,0,0.03); border-top: 6px solid #111; }
    .card-panel-title { margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #888; }
    .card-panel-text { margin: 0; font-size: 14px; line-height: 1.55; color: #444; }
    .card-footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 11px; color: #999; }
  </style>
  <div class="card">
    <p class="card-meta">Category · Date</p>
    <h1 class="card-title">Card Title</h1>
    <div class="card-bar"></div>
    <!-- content goes here -->
    <div class="card-footer">Source · Attribution</div>
  </div>
</div>
```

---

## Layout: Hero Card

Title-dominant card with hero area and one supporting panel.

```html
<div style="max-width: 800px; box-sizing: border-box; position: relative;">
  <style scoped>
    .card { position: relative; background: #fafafa; padding: 40px; font-family: sans-serif; color: #111; line-height: 1.6; }
    .card-meta { margin: 0 0 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #888; }
    .card-title { margin: 0 0 16px; font-size: 36px; font-weight: 700; line-height: 1.15; color: #111; }
    .card-bar { width: 80px; height: 6px; margin: 0 0 20px; background: #111; }
    .card-subtitle { margin: 0 0 20px; font-size: 17px; line-height: 1.55; color: #444; }
    .card-panel { padding: 16px 18px; background: rgba(0,0,0,0.03); border-top: 6px solid #111; }
    .card-panel-title { margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #888; }
    .card-panel-text { margin: 0; font-size: 14px; line-height: 1.55; color: #444; }
    .card-footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 11px; color: #999; }
  </style>
  <div class="card">
    <p class="card-meta">Category · Date</p>
    <h1 class="card-title">Hero Headline That<br>Anchors the Entire Card</h1>
    <div class="card-bar"></div>
    <p class="card-subtitle">A clear summary paragraph that gives readers the core message in 2-3 sentences.</p>
    <div class="card-panel">
      <p class="card-panel-title">Key Takeaway</p>
      <p class="card-panel-text">Supporting context that adds depth to the hero message.</p>
    </div>
    <div class="card-footer">Source · Attribution</div>
  </div>
</div>
```

---

## Layout: Split Panel

Two-column asymmetric layout with main content and sidebar.

Add to base styles:
```css
.card-split { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; }
```

---

## Layout: Bento Grid

Asymmetric multi-size grid with mixed-weight cells.

Add to base styles:
```css
.card-bento { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: auto auto; gap: 12px; }
.card-bento-cell { padding: 18px; background: rgba(0,0,0,0.03); border-top: 4px solid #111; }
.card-bento-cell.span-col { grid-column: span 2; }
.card-bento-cell.span-row { grid-row: span 2; }
.card-bento-stat { font-size: 36px; font-weight: 700; line-height: 1; color: #111; }
```

---

## Layout: Timeline Flow

Vertical sequential flow with connected steps.

Add to base styles:
```css
.card-timeline { position: relative; padding-left: 32px; }
.card-timeline::before { content: ''; position: absolute; left: 8px; top: 4px; bottom: 4px; width: 2px; background: rgba(0,0,0,0.12); }
.card-step { position: relative; margin-bottom: 24px; }
.card-step-dot { position: absolute; left: -32px; top: 2px; width: 18px; height: 18px; border-radius: 50%; background: #111; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #fafafa; }
.card-step-title { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #111; }
.card-step-text { margin: 0; font-size: 13px; line-height: 1.55; color: #555; }
```

---

## Layout: Comparison

Side-by-side contrast with visual division.

Add to base styles:
```css
.card-vs { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; }
.card-vs-side { padding: 20px; }
.card-vs-side.left { background: rgba(0,0,0,0.03); border-top: 4px solid #111; }
.card-vs-side.right { background: rgba(0,0,0,0.06); border-top: 4px solid #666; }
.card-vs-divider { display: flex; align-items: center; justify-content: center; width: 40px; font-size: 14px; font-weight: 700; color: #999; }
```

---

## Layout: Data Highlight

Numbers-first card with oversized metrics.

Add to base styles:
```css
.card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.card-stat { font-size: 48px; font-weight: 700; line-height: 1; color: #111; }
.card-stat-label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.1em; }
```

---

## Style: Editorial Warm

Warm paper background, serif titles, noise texture, magazine typography.

Key CSS changes from base:
```css
.card { background: #f5f3ed; }
.card::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.04; background-image: radial-gradient(circle at 20% 20%, rgba(0,0,0,0.8) 0.5px, transparent 0.8px); background-size: 8px 8px; }
.card-title { font-family: 'Noto Serif SC', serif; font-weight: 900; }
.card-body.dropcap::first-letter { font: 900 72px/0.82 'Noto Serif SC', Georgia, serif; float: left; margin: 4px 12px 0 -2px; }
```

## Style: Clean Modern

White background, blue accents, contemporary feel.

Key values: Background `#f8fafc`, Accent `#2563eb`, Border `#e2e8f0`, Rounded `8px`

## Style: Bold Contrast

Dark background, amber accents, high-contrast.

Key values: Background `#0f172a`, Text `#f8fafc`, Accent `#f59e0b`

## Style: Tech Blueprint

Blueprint grid, monospace accents, engineering schematic.

Key values: Background `#0a1628`, Accent `#00d4ff`, Grid overlay at 8% opacity, Monospace meta

## Style: Notion Minimal

Ultra-clean white, muted blue accent, digital notebook.

Key values: Background `#ffffff`, Accent `#4a7cbe`, Border `#e5e7eb`

## Style: Paper Minimal

Clean white, subtle blue accent, project briefs.

Key values: Background `#ffffff`, Accent `#4a7cbe`, Border `#e5e7eb` (similar to Notion but without interactive feel)

---

For the complete catalog of all 13 layouts and 14 styles with full HTML templates, see the source repository: https://github.com/markdown-viewer/skills
