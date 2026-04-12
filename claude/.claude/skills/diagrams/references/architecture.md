# Architecture Diagram Reference

Create layered architecture diagrams using HTML/CSS templates. Best for system layers, microservices, enterprise applications. NOT for simple flowcharts (use Mermaid) or data visualization (use Vega-Lite).

**Embedding:** Write as direct HTML in Markdown. **NEVER** use code blocks/fences.

## Critical Rules

1. **Direct HTML embedding** -- Write as raw HTML in Markdown, never in code fences
2. **No empty lines in HTML** -- Keep structure continuous to prevent parsing errors
3. **Incremental approach** -- Build in stages: framework > layers > components > styling
4. **Pick a layout first, then a style** -- Combine layout structure with style colors

## Workflow

1. Choose a **layout** that matches your architecture shape
2. Choose a **style** that matches your audience/context
3. Copy the layout template
4. Apply the style's color palette and CSS classes
5. Replace placeholder content with your architecture

---

## Layout Catalog

| Layout | Best For |
|--------|----------|
| Layer Layouts | Standard top-to-bottom layered architectures |
| Three Column | Services spanning three groups |
| Pipeline | Linear data/processing flows |
| Dashboard | Monitoring/observability views |
| Nested Containers | Grouped subsystems within layers |
| Hub-Spoke | Central service with satellite components |
| Grid Catalog | Component inventory/catalog views |
| Two Column Split | Left-right divided architectures |
| Left/Right Sidebar | Main content with sidebar navigation |
| Single Stack | Simple vertical stack |
| Banner Center | Centered hero with supporting layout |

## Style Catalog

| Style | Audience | Mood |
|-------|----------|------|
| Steel Blue | Consulting, enterprise | Professional, trustworthy |
| Neon Dark | Tech talks, demos | Modern, energetic |
| Sage Forest | Healthcare, sustainability | Calm, natural |
| Frost Clean | Documentation, technical | Clean, precise |
| Slate Dark | DevOps, infrastructure | Technical, focused |
| Dusk Glow | Creative, design | Warm, atmospheric |
| Ember Warm | Marketing, community | Friendly, inviting |
| Indigo Deep | Finance, security | Authoritative, deep |
| Ocean Teal | SaaS, platforms | Fresh, scalable |
| Pastel Mix | Education, workshops | Approachable, light |
| Rose Bloom | Health, lifestyle | Soft, caring |
| Stark Block | Minimalist, technical | Bold, direct |

---

## Semantic Layers

Standard layer hierarchy for architecture diagrams:

| Layer | Purpose | Typical Color |
|-------|---------|---------------|
| User | Interfaces, clients | Light/accent |
| Application | Business logic, API | Primary |
| AI/Logic | Processing, ML | Secondary |
| Data | Storage, databases | Tertiary |
| Infrastructure | DevOps, hosting | Dark |
| External | Third-party APIs | Muted |

---

## Core CSS Framework

All architecture diagrams share this base structure:

```html
<div style="width: 1200px; box-sizing: border-box; position: relative;">
  <style scoped>
    .arch-title { text-align: center; font-size: 20px; font-weight: 600; color: #333; margin-bottom: 16px; }
    .arch-main { width: 100%; }
    .arch-layer { margin: 10px 0; padding: 14px; border-radius: 4px; border: 1px solid #ccc; background: #fafafa; }
    .arch-layer-title { font-size: 12px; font-weight: 600; color: #555; margin-bottom: 10px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
    .arch-grid { display: grid; gap: 6px; }
    .arch-grid-2 { grid-template-columns: repeat(2, 1fr); }
    .arch-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .arch-grid-4 { grid-template-columns: repeat(4, 1fr); }
    .arch-box { border-radius: 3px; padding: 8px; text-align: center; font-size: 11px; font-weight: 500; line-height: 1.35; color: #333; background: #fff; border: 1px solid #ddd; }
    .arch-box.highlight { border: 2px solid #999; font-weight: 600; }
  </style>
  <div class="arch-main">
    <div class="arch-title">System Architecture</div>
    <!-- layers go here -->
  </div>
</div>
```

## Layer Template

```html
<div class="arch-layer" style="background: #layerColor;">
  <div class="arch-layer-title">Layer Name</div>
  <div class="arch-grid arch-grid-3">
    <div class="arch-box" style="background: #boxColor;">Component A</div>
    <div class="arch-box" style="background: #boxColor;">Component B</div>
    <div class="arch-box" style="background: #boxColor;">Component C</div>
  </div>
</div>
```

---

## Steel Blue Style (Example)

Professional consulting style with steel blue palette.

| Property | Value |
|----------|-------|
| Background | `#f0f4f8` |
| Layer bg | `#dce6f0`, `#c8d8e8`, `#b4cae0` |
| Box bg | `#e8eff5` |
| Text | `#2c3e50` |
| Accent | `#34618d` |

```html
<div style="width: 1200px; box-sizing: border-box; position: relative;">
  <style scoped>
    .arch-title { text-align: center; font-size: 20px; font-weight: 600; color: #2c3e50; margin-bottom: 16px; }
    .arch-layer { margin: 10px 0; padding: 14px; border-radius: 4px; }
    .arch-layer-title { font-size: 12px; font-weight: 600; color: #34618d; margin-bottom: 10px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
    .arch-grid { display: grid; gap: 6px; }
    .arch-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .arch-box { border-radius: 3px; padding: 8px; text-align: center; font-size: 11px; font-weight: 500; background: #e8eff5; border: 1px solid #b4cae0; color: #2c3e50; }
  </style>
  <div>
    <div class="arch-title">Microservices Platform</div>
    <div class="arch-layer" style="background: #dce6f0; border: 1px solid #b4cae0;">
      <div class="arch-layer-title">Client Layer</div>
      <div class="arch-grid arch-grid-3">
        <div class="arch-box">Web App</div>
        <div class="arch-box">Mobile App</div>
        <div class="arch-box">Admin Portal</div>
      </div>
    </div>
    <div class="arch-layer" style="background: #c8d8e8; border: 1px solid #a0bcd4;">
      <div class="arch-layer-title">API Gateway</div>
      <div class="arch-grid arch-grid-3">
        <div class="arch-box">Auth</div>
        <div class="arch-box">Rate Limiting</div>
        <div class="arch-box">Routing</div>
      </div>
    </div>
    <div class="arch-layer" style="background: #b4cae0; border: 1px solid #8caec8;">
      <div class="arch-layer-title">Services</div>
      <div class="arch-grid arch-grid-3">
        <div class="arch-box">User Service</div>
        <div class="arch-box">Order Service</div>
        <div class="arch-box">Payment Service</div>
      </div>
    </div>
    <div class="arch-layer" style="background: #a0bcd4; border: 1px solid #78a0bc;">
      <div class="arch-layer-title">Data Layer</div>
      <div class="arch-grid arch-grid-3">
        <div class="arch-box">PostgreSQL</div>
        <div class="arch-box">Redis</div>
        <div class="arch-box">S3</div>
      </div>
    </div>
  </div>
</div>
```

---

## Neon Dark Style

Modern dark theme for tech presentations.

| Property | Value |
|----------|-------|
| Background | `#0d1117` |
| Layer bg | `#161b22` |
| Box bg | `#21262d` |
| Text | `#e6edf3` |
| Accent | `#58a6ff` |
| Glow | `box-shadow: 0 0 8px rgba(88,166,255,0.3)` |

---

## Sage Forest Style

Calm, natural palette for healthcare/sustainability.

| Property | Value |
|----------|-------|
| Background | `#f5f7f4` |
| Layer bg | `#e8ede5`, `#dce3d8` |
| Box bg | `#eef2eb` |
| Text | `#2d3b2d` |
| Accent | `#5a7a5a` |

---

## Frost Clean Style

Clean, precise for technical documentation.

| Property | Value |
|----------|-------|
| Background | `#fafbfc` |
| Layer bg | `#f0f2f5`, `#e6e9ed` |
| Box bg | `#ffffff` |
| Text | `#24292e` |
| Accent | `#6f7681` |
| Border | `1px solid #d1d5da` |

---

## Advanced Features

### Subgroups within layers
```html
<div class="arch-subgroup">
  <div class="arch-subgroup-box">
    <div class="arch-subgroup-title">Group A</div>
    <div class="arch-grid arch-grid-2">
      <div class="arch-box">Component 1</div>
      <div class="arch-box">Component 2</div>
    </div>
  </div>
  <div class="arch-subgroup-box">
    <div class="arch-subgroup-title">Group B</div>
    <div class="arch-grid arch-grid-2">
      <div class="arch-box">Component 3</div>
      <div class="arch-box">Component 4</div>
    </div>
  </div>
</div>
```

### KPI Row
```html
<div class="arch-kpi-row">
  <div class="arch-kpi"><span class="arch-kpi-value">99.9%</span><br><span class="arch-kpi-label">Uptime</span></div>
  <div class="arch-kpi"><span class="arch-kpi-value">&lt;50ms</span><br><span class="arch-kpi-label">Latency</span></div>
  <div class="arch-kpi"><span class="arch-kpi-value">10K</span><br><span class="arch-kpi-label">RPS</span></div>
</div>
```

### User Type Tags
```html
<div class="arch-box">Dashboard<br><span class="arch-user-tag">Admin</span></div>
```

For the complete catalog of all 13 layouts and 12 styles with full HTML templates, see the source repository: https://github.com/markdown-viewer/skills
