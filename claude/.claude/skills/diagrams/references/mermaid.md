# Mermaid Diagram Reference

Create flowcharts, sequence diagrams, state machines, class diagrams, Gantt charts, and mindmaps using text-based syntax.

**Code fence:** ` ```mermaid `

## Critical Syntax Rules

### Rule 1: List Syntax Conflicts
```
[1.Item]      -- Remove space after period
[① Item]      -- Use circled numbers ①②③④⑤⑥⑦⑧⑨⑩
[(1) Item]    -- Use parentheses
```
Never use `[1. Item]` (space after period) -- causes "Unsupported markdown: list" error.

### Rule 2: Subgraph Naming
```
subgraph agent["AI Agent Core"]  -- ID with display name
subgraph agent                   -- Simple ID only
```
Never use `subgraph AI Agent Core` (space without quotes).

### Rule 3: Node References in Subgraphs
Reference subgraph **ID**, not display name:
```
Title --> agent    -- correct (uses ID)
```

### Rule 4: Special Characters in Node Text
```
["Text with spaces"]       -- Quotes for spaces
Use #quot; instead of "    -- Avoid quotation marks
Use #lpar;#rpar; for ()    -- Avoid parentheses
```

### Rule 5: Use flowchart over graph
```
flowchart TD  -- correct (supports subgraph directions, more features)
```

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Diagram won't render | Check unmatched brackets, quotes |
| List syntax error | `[1.Item]` not `[1. Item]` |
| Subgraph reference fails | Use ID not display name |
| Too crowded | Split into multiple diagrams |
| Crossing connections | Use different layout direction or invisible edges `~~~` |

---

## Sequence Diagram Syntax

### Messages
```
->>   Solid line with arrow
-->>  Dashed line with arrow
-)    Solid line with open arrow
--)   Dashed line with open arrow
```

### Activation & Notes
```mermaid
sequenceDiagram
    participant A
    participant B
    A->>+B: Request (activates B)
    Note right of B: Processing
    B-->>-A: Response (deactivates B)
    Note over A,B: Both involved
```

### Loops & Conditions
```mermaid
sequenceDiagram
    loop Every minute
        A->>B: Heartbeat
    end
    alt Success
        B-->>A: OK
    else Failure
        B-->>A: Error
    end
    opt Optional
        A->>B: Extra call
    end
```

---

## Class Diagram Syntax

### Relationships
```
<|--  Inheritance
*--   Composition
o--   Aggregation
-->   Association
--    Link (solid)
..>   Dependency
..|>  Realization
```

### Class Definition
```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
        -privateMethod() int
        #protectedMethod()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

---

## ER Diagram Syntax

### Cardinality
```
||--||  One to one
||--o{  One to many
}o--o{  Many to many
||--o|  One to zero or one
```

### Example
```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT }|--o{ LINE_ITEM : "ordered in"
```

---

---

## User Journey Syntax

```mermaid
journey
    title User Shopping Experience
    section Browse
        Visit website: 5: User
        Search product: 4: User
    section Purchase
        Add to cart: 5: User
        Checkout: 3: User
        Payment: 4: User
```

Score: 1 (bad) to 5 (great)

---

## XY Chart Syntax

```mermaid
xychart
    title "Monthly Sales"
    x-axis [Jan, Feb, Mar, Apr]
    y-axis "Revenue" 0 --> 150
    bar [65, 78, 52, 91]
    line [65, 78, 52, 91]
```

---

## Kanban Syntax

```mermaid
kanban
  Todo
    [Design System]
  InProgress
    [Implement Feature]
  Done
    [Setup CI/CD]
```

---

## Layout & Styling

### Directions
- `TB` / `TD` -- Top to Bottom (default)
- `LR` -- Left to Right
- `RL` -- Right to Left
- `BT` -- Bottom to Top

### Node Styling
```mermaid
flowchart TD
    A[Node A]
    B[Node B]
    style A fill:#90EE90,stroke:#333,stroke-width:2px
    style B fill:#ff6b6b,color:white
```

### Class Definitions
```mermaid
flowchart TD
    A:::success --> B:::warning
    classDef success fill:#2ECC71,color:white
    classDef warning fill:#F39C12,color:white
```

### Subgraph Nesting & Direction
```mermaid
flowchart LR
    subgraph sub["Vertical Inside"]
        direction TB
        A --> B --> C
    end
    D --> sub
```
