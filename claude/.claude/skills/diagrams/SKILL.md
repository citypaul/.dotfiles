---
name: diagrams
description: Create diagrams and visualizations in Markdown using Mermaid, Graphviz, Vega-Lite, PlantUML, infographics, JSON Canvas, architecture diagrams, and info cards. Use when asked to create any diagram, chart, visualization, or visual documentation.
metadata:
  author: Diagram skills adapted from markdown-viewer/skills (MIT license). Powered by Markdown Viewer - https://docu.md
---

# Diagram & Visualization Skill

Create professional diagrams and visualizations in Markdown documents. Choose the right tool for the job, then read the detailed reference for that tool.

## Decision Guide

**What are you trying to create?**

| Need | Tool | Code Fence | Reference |
|------|------|-----------|-----------|
| Flowchart, sequence diagram, state machine, class diagram, mindmap | **Mermaid** | ` ```mermaid ` | [mermaid.md](references/mermaid.md) |
| Dependency tree, call graph, module relationships, complex directed graphs | **Graphviz** | ` ```dot ` | [graphviz.md](references/graphviz.md) |
| Bar chart, line chart, scatter plot, heatmap, data-driven visualization | **Vega-Lite** | ` ```vega-lite ` | [vega.md](references/vega.md) |
| UML diagrams with icons (9,500+ stencils) | **PlantUML** | ` ```plantuml ` | [plantuml.md](references/plantuml.md) |
| Cloud architecture (AWS/Azure/GCP/K8s) | **PlantUML** | ` ```plantuml ` | [plantuml.md](references/plantuml.md) |
| Network topology, security architecture | **PlantUML** | ` ```plantuml ` | [plantuml.md](references/plantuml.md) |
| KPI cards, timelines, roadmaps, funnels, SWOT, org charts, pie/bar charts | **Infographic** | ` ```infographic ` | [infographic.md](references/infographic.md) |
| Mind map, knowledge graph, spatial planning board | **JSON Canvas** | ` ```canvas ` | [canvas.md](references/canvas.md) |
| Layered system architecture, microservices, enterprise diagrams | **Architecture** | Raw HTML | [architecture.md](references/architecture.md) |
| Editorial info cards, data highlights, knowledge summaries | **Infocard** | Raw HTML | [infocard.md](references/infocard.md) |

## Quick Selection Rules

1. **Simple process flow?** Use Mermaid
2. **Data with numbers?** Use Vega-Lite (charts) or Infographic (visual templates)
3. **Software modeling with icons?** Use PlantUML
4. **Cloud/network/security architecture?** Use PlantUML with provider stencils
5. **Complex graph with custom layout?** Use Graphviz
6. **Styled system architecture?** Use Architecture (HTML)
7. **Magazine-quality content card?** Use Infocard (HTML)
8. **Quick visual summary (KPI, timeline, funnel)?** Use Infographic
9. **Spatial/freeform layout?** Use JSON Canvas

## Workflow

1. Identify the diagram type from the decision guide above
2. Read the appropriate reference file for detailed syntax and rules
3. Follow the critical syntax rules exactly to avoid rendering failures
4. For Architecture and Infocard: pick a layout first, then apply a style

## Important Notes

- **Architecture and Infocard use raw HTML** embedded directly in Markdown (no code fences)
- **PlantUML diagrams** always start with `@startuml` and end with `@enduml`
- **Never use ` ```text `** for any diagram type - it won't render
- When unsure between tools, prefer Mermaid for simplicity or PlantUML for icon-rich diagrams
