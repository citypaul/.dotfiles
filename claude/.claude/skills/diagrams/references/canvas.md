# JSON Canvas Reference

Create spatial, node-based diagrams using JSON Canvas format. Best for mind maps, knowledge graphs, concept maps, and planning boards.

**Code fence:** ` ```canvas `

## Critical Syntax Rules

1. Valid JSON with proper quotes, commas, brackets
2. Every node needs: `id`, `type`, `x`, `y`, `width`, `height`
3. Node IDs: alphanumeric, hyphens, underscores only (no spaces or special chars)
4. Coordinate origin is top-left; X increases right, Y increases down
5. No negative coordinates

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Nodes overlapping | Increase spacing to 100+ pixels |
| Edges not visible | Check node IDs match `fromNode`/`toNode` |
| JSON syntax error | Validate quotes, commas, brackets |
| Layout looks messy | Use groups, increase canvas size |

---

## Node Types

### Text Node
```json
{
  "id": "node1",
  "type": "text",
  "text": "Your text content here",
  "x": 100, "y": 100,
  "width": 200, "height": 100
}
```

### File Node
```json
{
  "id": "file1",
  "type": "file",
  "file": "path/to/document.md",
  "x": 100, "y": 100,
  "width": 160, "height": 60
}
```

### Link Node
```json
{
  "id": "link1",
  "type": "link",
  "url": "https://example.com",
  "x": 100, "y": 100,
  "width": 160, "height": 60
}
```

### Group Node (Visual Container)
```json
{
  "id": "group1",
  "type": "group",
  "label": "Group Title",
  "x": 0, "y": 0,
  "width": 600, "height": 400,
  "color": "5"
}
```

---

## Edge Attributes

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `id` | Yes | - | Unique identifier |
| `fromNode` | Yes | - | Source node ID |
| `toNode` | Yes | - | Target node ID |
| `fromSide` | No | - | `top`, `right`, `bottom`, `left` |
| `toSide` | No | - | `top`, `right`, `bottom`, `left` |
| `fromEnd` | No | `none` | `none` or `arrow` |
| `toEnd` | No | `arrow` | `none` or `arrow` |
| `label` | No | - | Edge label text |
| `color` | No | - | Color preset `"1"`-`"6"` or hex |

---

## Color Presets

| Value | Color | Usage |
|-------|-------|-------|
| `"1"` | Red | Warnings, blockers, critical |
| `"2"` | Orange | Actions, processes, important |
| `"3"` | Yellow | Questions, notes, considerations |
| `"4"` | Green | Success, completed, positive |
| `"5"` | Cyan | Information, details, neutral |
| `"6"` | Purple | Concepts, ideas, abstract |

---

## Layout Patterns

### Horizontal Flow
```canvas
{
  "nodes": [
    {"id": "n1", "type": "text", "text": "Input", "x": 50, "y": 100, "width": 100, "height": 50},
    {"id": "n2", "type": "text", "text": "Process", "x": 200, "y": 100, "width": 100, "height": 50},
    {"id": "n3", "type": "text", "text": "Output", "x": 350, "y": 100, "width": 100, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "n1", "toNode": "n2", "fromSide": "right", "toSide": "left"},
    {"id": "e2", "fromNode": "n2", "toNode": "n3", "fromSide": "right", "toSide": "left"}
  ]
}
```

### Tree Structure
```canvas
{
  "nodes": [
    {"id": "root", "type": "text", "text": "Root", "x": 200, "y": 20, "width": 100, "height": 50},
    {"id": "c1", "type": "text", "text": "Child 1", "x": 50, "y": 120, "width": 100, "height": 50},
    {"id": "c2", "type": "text", "text": "Child 2", "x": 200, "y": 120, "width": 100, "height": 50},
    {"id": "c3", "type": "text", "text": "Child 3", "x": 350, "y": 120, "width": 100, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "root", "fromSide": "bottom", "toNode": "c1", "toSide": "top"},
    {"id": "e2", "fromNode": "root", "fromSide": "bottom", "toNode": "c2", "toSide": "top"},
    {"id": "e3", "fromNode": "root", "fromSide": "bottom", "toNode": "c3", "toSide": "top"}
  ]
}
```

### Radial Mind Map
```canvas
{
  "nodes": [
    {"id": "center", "type": "text", "text": "Central Topic", "x": 200, "y": 200, "width": 140, "height": 60, "color": "4"},
    {"id": "n1", "type": "text", "text": "North", "x": 220, "y": 50, "width": 100, "height": 50},
    {"id": "n2", "type": "text", "text": "East", "x": 380, "y": 210, "width": 100, "height": 50},
    {"id": "n3", "type": "text", "text": "South", "x": 220, "y": 350, "width": 100, "height": 50},
    {"id": "n4", "type": "text", "text": "West", "x": 50, "y": 210, "width": 100, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "center", "toNode": "n1", "fromSide": "top", "toSide": "bottom"},
    {"id": "e2", "fromNode": "center", "toNode": "n2", "fromSide": "right", "toSide": "left"},
    {"id": "e3", "fromNode": "center", "toNode": "n3", "fromSide": "bottom", "toSide": "top"},
    {"id": "e4", "fromNode": "center", "toNode": "n4", "fromSide": "left", "toSide": "right"}
  ]
}
```
