# Vega / Vega-Lite Visualization Reference

Create data-driven charts using Vega-Lite (simpler, 90% of use cases) or Vega (advanced). Best for bar, line, scatter, heatmap, area charts, and multi-series analytics.

**Code fence:** ` ```vega-lite ` (simpler) or ` ```vega ` (advanced)

## Critical Syntax Rules

1. **Always include the schema**: `"$schema": "https://vega.github.io/schema/vega-lite/v5.json"`
2. **Valid JSON only**: Double quotes, no trailing commas
3. **Field names are case-sensitive**: Must match your data exactly
4. **Valid type declarations**: `quantitative`, `nominal`, `ordinal`, or `temporal`

## When to Use Each

- **Vega-Lite**: ~90% of charts. Simpler, declarative, handles layout automatically
- **Vega**: Radar charts, word clouds, custom interactions, fine-grained control

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Chart won't render | Validate JSON, check for missing schema |
| Data not visible | Field names must match data exactly (case-sensitive) |
| Wrong chart type | Verify mark type matches data structure |
| Colors too similar | Use named color schemes with sufficient contrast |

---

## Basic Bar Chart

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple bar chart",
  "data": {
    "values": [
      {"category": "A", "value": 28},
      {"category": "B", "value": 55},
      {"category": "C", "value": 43}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}
```

## Line Chart

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"month": "Jan", "value": 30},
      {"month": "Feb", "value": 45},
      {"month": "Mar", "value": 60},
      {"month": "Apr", "value": 52}
    ]
  },
  "mark": "line",
  "encoding": {
    "x": {"field": "month", "type": "ordinal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}
```

## Scatter Plot

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"x": 1, "y": 2, "group": "A"},
      {"x": 3, "y": 5, "group": "A"},
      {"x": 2, "y": 8, "group": "B"},
      {"x": 4, "y": 3, "group": "B"}
    ]
  },
  "mark": "point",
  "encoding": {
    "x": {"field": "x", "type": "quantitative"},
    "y": {"field": "y", "type": "quantitative"},
    "color": {"field": "group", "type": "nominal"}
  }
}
```

## Heatmap

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"day": "Mon", "hour": "9am", "value": 5},
      {"day": "Mon", "hour": "10am", "value": 8},
      {"day": "Tue", "hour": "9am", "value": 3},
      {"day": "Tue", "hour": "10am", "value": 9}
    ]
  },
  "mark": "rect",
  "encoding": {
    "x": {"field": "hour", "type": "ordinal"},
    "y": {"field": "day", "type": "ordinal"},
    "color": {"field": "value", "type": "quantitative"}
  }
}
```

## Multi-Series Line Chart

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"month": "Jan", "value": 30, "series": "Revenue"},
      {"month": "Feb", "value": 45, "series": "Revenue"},
      {"month": "Jan", "value": 20, "series": "Cost"},
      {"month": "Feb", "value": 25, "series": "Cost"}
    ]
  },
  "mark": "line",
  "encoding": {
    "x": {"field": "month", "type": "ordinal"},
    "y": {"field": "value", "type": "quantitative"},
    "color": {"field": "series", "type": "nominal"}
  }
}
```

## Stacked Bar Chart

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"quarter": "Q1", "region": "North", "sales": 120},
      {"quarter": "Q1", "region": "South", "sales": 80},
      {"quarter": "Q2", "region": "North", "sales": 150},
      {"quarter": "Q2", "region": "South", "sales": 90}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "quarter", "type": "nominal"},
    "y": {"field": "sales", "type": "quantitative"},
    "color": {"field": "region", "type": "nominal"}
  }
}
```

## Area Chart

```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"date": "2024-01", "value": 100},
      {"date": "2024-02", "value": 130},
      {"date": "2024-03", "value": 115},
      {"date": "2024-04", "value": 160}
    ]
  },
  "mark": "area",
  "encoding": {
    "x": {"field": "date", "type": "temporal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}
```

## Mark Types

| Mark | Usage |
|------|-------|
| `bar` | Bar/column charts |
| `line` | Line charts, trends |
| `point` | Scatter plots |
| `area` | Area charts |
| `rect` | Heatmaps, matrices |
| `circle` | Bubble charts |
| `tick` | Strip plots |
| `text` | Label overlays |
| `arc` | Pie/donut charts |

## Encoding Channels

| Channel | Usage |
|---------|-------|
| `x`, `y` | Position |
| `color` | Hue differentiation |
| `size` | Area scaling |
| `shape` | Point shape |
| `opacity` | Transparency |
| `text` | Text labels |
| `tooltip` | Hover info |

## Data Types

| Type | Usage |
|------|-------|
| `quantitative` | Numbers (continuous) |
| `nominal` | Categories (unordered) |
| `ordinal` | Categories (ordered) |
| `temporal` | Dates/times |
