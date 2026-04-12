# Infographic Reference

Create visual infographics using pre-designed templates. Best for KPI cards, timelines, roadmaps, step-by-step processes, A vs B comparisons, SWOT analysis, funnels, org trees, pie/bar charts. Optimized for 4-8 items.

**Code fence:** ` ```infographic `

## Critical Syntax Rules

1. First line must be `infographic <template-name>` (kebab-case, no underscores)
2. Use 2-space indentation consistently
3. `label` is required for every item
4. `value` must be numeric (no units)
5. Icons use Iconify format: `collection/name` (e.g., `mdi/star`)
6. Array items prefixed with hyphens

## Template Categories

| Category | Prefix | Best For |
|----------|--------|----------|
| List | `list-*` | Feature lists, KPI cards, checklists |
| Sequence | `sequence-*` | Timelines, processes, funnels, roadmaps |
| Compare | `compare-*` | A vs B, SWOT analysis |
| Hierarchy | `hierarchy-*` | Org charts, tree structures |
| Chart | `chart-*` | Pie, bar, column, word cloud |
| Quadrant | `quadrant-*` | 2x2 matrices, priority grids |
| Relation | `relation-*` | Central concepts, relationships |

## Data Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `label` | Yes | string | Item title |
| `desc` | No | string | Description text |
| `value` | No | number | Numeric data (charts) |
| `icon` | No | string | Iconify ref (`mdi/star`) |
| `illus` | No | string | unDraw illustration |
| `children` | No | array | Nested items |
| `done` | No | boolean | Checklist status |
| `time` | No | string | Time label |

## Template Constraints

- **Compare templates**: Exactly 2 root items with `children`
- **SWOT**: Exactly 4 items labeled `Strengths`, `Weaknesses`, `Opportunities`, `Threats` (English)
- **Quadrant**: Exactly 4 items
- **Hierarchy**: Max 3 nesting levels
- **Optimal items**: 4-8 (split if more than 8)

---

## Quick Selection Guide

| Use Case | Template |
|----------|----------|
| KPI dashboard | `list-grid-badge-card` |
| Feature list | `list-grid-candy-card-lite` |
| Task checklist | `list-column-done-list` |
| Company history | `sequence-timeline-simple` |
| Product roadmap | `sequence-roadmap-vertical-simple` |
| Sales funnel | `sequence-filter-mesh-simple` |
| Onboarding flow | `sequence-snake-steps-simple` |
| Career ladder | `sequence-stairs-front-compact-card` |
| Product comparison | `compare-binary-horizontal-underline-text-vs` |
| SWOT analysis | `compare-swot` |
| Organization chart | `hierarchy-tree-tech-style-capsule-item` |
| Revenue breakdown | `chart-pie-donut-plain-text` |
| Priority matrix | `quadrant-quarter-simple-card` |
| Trending topics | `chart-wordcloud` |

---

## All Templates

### List Templates
| Template | Description |
|----------|-------------|
| `list-grid-badge-card` | Grid cards with badges (KPI cards, metrics) |
| `list-grid-candy-card-lite` | Colorful grid cards (features, services) |
| `list-grid-ribbon-card` | Cards with ribbon decoration |
| `list-row-horizontal-icon-arrow` | Horizontal row with arrows (process steps) |
| `list-row-simple-illus` | Row with illustrations |
| `list-sector-plain-text` | Radial sector layout |
| `list-column-done-list` | Checklist with checkmarks |
| `list-column-vertical-icon-arrow` | Vertical with arrows |
| `list-zigzag-down-compact-card` | Zigzag down cards (journey steps) |
| `list-zigzag-up-compact-card` | Zigzag up cards (growth path) |

### Sequence Templates
| Template | Description |
|----------|-------------|
| `sequence-timeline-simple` | Simple timeline (history, milestones) |
| `sequence-timeline-rounded-rect-node` | Timeline with rounded nodes |
| `sequence-roadmap-vertical-simple` | Vertical roadmap |
| `sequence-filter-mesh-simple` | Funnel chart (sales funnel, conversion) |
| `sequence-funnel-simple` | Simple funnel |
| `sequence-snake-steps-simple` | Snake path steps (long processes) |
| `sequence-stairs-front-compact-card` | Front stairs cards (growth/levels) |
| `sequence-ascending-steps` | Ascending steps (progress) |
| `sequence-circular-simple` | Circular flow (cycles, loops) |
| `sequence-pyramid-simple` | Pyramid structure |

### Compare Templates
| Template | Description |
|----------|-------------|
| `compare-binary-horizontal-underline-text-vs` | A vs B comparison |
| `compare-binary-horizontal-badge-card-arrow` | Badge cards with arrows |
| `compare-hierarchy-left-right-circle-node-pill-badge` | Hierarchy comparison |
| `compare-swot` | SWOT analysis (4 quadrants) |

### Hierarchy Templates
| Template | Description |
|----------|-------------|
| `hierarchy-tree-tech-style-capsule-item` | Tech style tree (org charts) |
| `hierarchy-tree-curved-line-rounded-rect-node` | Curved tree |
| `hierarchy-structure` | Generic hierarchy (max 3 levels) |

### Chart Templates
| Template | Description |
|----------|-------------|
| `chart-pie-donut-plain-text` | Donut chart (distribution) |
| `chart-pie-plain-text` | Pie chart |
| `chart-bar-plain-text` | Horizontal bar chart |
| `chart-column-simple` | Vertical column chart |
| `chart-line-plain-text` | Line chart (trends) |
| `chart-wordcloud` | Word cloud (keywords, topics) |

### Quadrant Templates
| Template | Description |
|----------|-------------|
| `quadrant-quarter-simple-card` | Quadrant cards (priority matrix) |
| `quadrant-quarter-circular` | Circular quadrant |

---

## Examples

### KPI Cards
```infographic
infographic list-grid-badge-card
data
  title Key Metrics
  desc Annual performance overview
  items
    - label Total Revenue
      desc $12.8M | YoY +23.5%
      icon mdi/currency-usd
    - label New Customers
      desc 3,280 | YoY +45%
      icon mdi/account-plus
    - label Satisfaction
      desc 94.6% | Industry leading
      icon mdi/emoticon-happy
    - label Market Share
      desc 18.5% | Rank #2
      icon mdi/trophy
```

### Timeline
```infographic
infographic sequence-timeline-simple
data
  title Company History
  items
    - label 2020
      desc Company founded in Silicon Valley
    - label 2021
      desc Series A funding $5M
    - label 2022
      desc Expanded to 50 employees
    - label 2023
      desc Launched flagship product
    - label 2024
      desc IPO and global expansion
```

### Sales Funnel
```infographic
infographic sequence-filter-mesh-simple
data
  title Sales Funnel
  items
    - label Website Visitors
      value 100000
      desc Total traffic
    - label Leads
      value 25000
      desc 25% conversion
    - label Qualified
      value 5000
      desc 20% qualified
    - label Proposals
      value 1500
      desc 30% engaged
    - label Customers
      value 500
      desc 33% closed
```

### A vs B Comparison
```infographic
infographic compare-binary-horizontal-underline-text-vs
data
  title Cloud vs On-Premise
  items
    - label Cloud Solution
      children
        - label Scalability
          desc Scale on demand
        - label Cost
          desc Pay as you go
        - label Maintenance
          desc Provider managed
    - label On-Premise
      children
        - label Control
          desc Full data ownership
        - label Cost
          desc One-time investment
        - label Maintenance
          desc Internal IT team
```

### SWOT Analysis
```infographic
infographic compare-swot
data
  title Strategic Analysis
  items
    - label Strengths
      children
        - label Strong R&D team
        - label Patent portfolio
        - label Brand recognition
    - label Weaknesses
      children
        - label Limited budget
        - label Small sales team
    - label Opportunities
      children
        - label AI market growth
        - label New markets
    - label Threats
      children
        - label Competition
        - label Regulation
```

### Org Chart
```infographic
infographic hierarchy-tree-tech-style-capsule-item
data
  title Organization Structure
  items
    - label CEO
      children
        - label CTO
          children
            - label Engineering
            - label DevOps
        - label CFO
          children
            - label Finance
            - label Accounting
```

### Donut Chart
```infographic
infographic chart-pie-donut-plain-text
data
  title Revenue by Region
  items
    - label North America
      value 42
    - label Europe
      value 28
    - label Asia Pacific
      value 18
    - label Other
      value 12
```

### Priority Matrix
```infographic
infographic quadrant-quarter-simple-card
data
  title Priority Matrix
  items
    - label Do First
      desc Urgent & Important
      children
        - label Critical bugs
        - label Client deadlines
    - label Schedule
      desc Not Urgent & Important
      children
        - label Planning
        - label Training
    - label Delegate
      desc Urgent & Not Important
      children
        - label Meetings
        - label Some emails
    - label Eliminate
      desc Not Urgent & Not Important
      children
        - label Time wasters
        - label Busy work
```

### Dark Theme
```infographic
infographic list-row-horizontal-icon-arrow
theme dark
  palette
    - #61DDAA
    - #F6BD16
    - #F08BB4
data
  title Process Steps
  items
    - label Start
      desc Begin here
      icon mdi/play
    - label Process
      desc Work in progress
      icon mdi/cog
    - label Complete
      desc Finish
      icon mdi/check
```

## Theme Options

- `theme dark` -- Dark background
- `theme` with `stylize rough` -- Hand-drawn style
- Custom palette via hex colors under `theme` > `palette`
