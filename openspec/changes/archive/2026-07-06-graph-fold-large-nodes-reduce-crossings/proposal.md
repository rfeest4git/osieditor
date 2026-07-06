## Why

Large concept/dataset boxes (e.g. an entity with 23 fields) dominate the canvas, push
neighbouring nodes off-screen, and force connection lines to travel far and cross over
unrelated boxes — making the relationship graph hard to read (see screenshot). Folding
oversized boxes by default and tightening the layout's crossing minimization keeps the graph
compact and legible.

## What Changes

- Concept and dataset nodes whose field/attribute count exceeds a threshold (default 8) render
  **collapsed by default** — header plus field count only, no field rows — so large boxes take
  minimal space until the user expands them. Smaller nodes stay expanded as today.
- A user's explicit expand/collapse of a node **overrides** the size-based default and persists
  across model edits and layer switches (an expanded large node stays expanded; a manually
  collapsed small node stays collapsed).
- Add a **"Collapse all / Expand all"** control to the graph (available in every layer) to fold
  or unfold every node at once for quick space management, without moving any node.
- Strengthen the star-schema layout to **minimize edge crossings across the whole graph** —
  between sibling clusters and across the stacked domain bands in the unified view — not only
  within a single hub's fan-out.
- The initial (estimated) and measured "Arrange" layouts account for each node's **folded
  size**, so folded boxes pack tighter and connected nodes sit closer together.

## Capabilities

### New Capabilities
- `graph-node-folding`: Size-based default fold state for large nodes, persistence of a user's
  explicit per-node expand/collapse, and a graph-wide collapse-all / expand-all control.

### Modified Capabilities
- `graph-visual-layout`: Add a requirement that the layout globally minimizes edge crossings
  (between clusters and across unified domain bands), and that a node's fold state feeds the
  size-aware placement so folded boxes pack tighter.

## Impact

- Web graph components: `GraphView.tsx` (size-based default fold, collapse-all/expand-all, feed
  folded sizes to the layout estimates), `GraphToolbar.tsx` (new collapse/expand control),
  `ConceptNode.tsx` / `DatasetNode.tsx` (folded count affordance — already present),
  `ontologyGraph.ts` (cluster/band ordering + crossing-reduction pass).
- Tests: `ontologyGraph.test.ts`, `GraphToolbar.test.tsx`, plus new unit tests for the fold
  defaults and crossing reduction.
- No schema, file I/O, or API changes — purely graph presentation and layout.
