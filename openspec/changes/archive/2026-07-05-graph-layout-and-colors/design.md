## Context

The graph (`GraphView.tsx`) renders three layers — semantic-model, ontology, and unified — with
React Flow. Node reconciliation in each layer computes an initial position for every node from a
fixed, index-based grid:

- `gridPosition(i)` — 4 columns, 240px column pitch, **160px row pitch**.
- `datasetLanePosition(i)` — `gridPosition(i)` shifted **+420px** down.
- `metricLanePosition(i)` — `gridPosition(i)` shifted **+720px** down.

These offsets are constants that assume a fixed node height. But `DatasetNode` and `ConceptNode`
default to *expanded* and grow one row (~28px) per field/attribute, so a node with more than
~4 rows is taller than the 160px pitch and overlaps the node in the row below. In the unified
view the fixed +420/+720 band offsets are similarly too small when a band holds tall nodes.

Positions are reconciled by id: existing (possibly user-dragged) positions are reused, and only
ids without a remembered position fall back to the grid helpers. That persistence behavior is a
requirement of `relationship-graph` and must be kept.

Colors: `MetricNode` already has an amber left border; `ConceptNode` and `DatasetNode` are
neutral (`bg-surface` + `border-border`). The unified view's edges are already color-coded
(cobalt `#2b56d4` ontology, violet `#6d3ad6` mapping, grey `#8a97a8` join). Node accents should
line up with that vocabulary.

## Goals / Non-Goals

**Goals:**
- Compute initial node positions from actual node height so nothing overlaps on first render.
- Preserve user-dragged / remembered positions exactly as today.
- Give each element kind a distinct, consistent color accent that matches the edge palette.
- Keep the change presentational — no schema, store, or file-IO changes.

**Non-Goals:**
- A full force-directed / graph auto-layout engine (e.g. dagre/elk). Overkill for the node
  counts here and would fight the drag-to-persist model.
- Auto-relayout on every expand/collapse or on edge routing. Initial placement only.
- Changing selection, connection, or edge-derivation logic.

## Decisions

**Decision: Height-aware vertical flow instead of a fixed row pitch.**
Estimate each node's height from its content (base header height + row height × field/attribute
count, capped for very tall nodes) and stack nodes in each column/band using a running y-cursor
plus a gutter, rather than `row * 160`. Columns keep the existing ~240px pitch. This is O(n),
deterministic, and needs no measurement pass — it runs during the same reconciliation that
already builds the nodes.
- *Alternative — measure real DOM heights and re-layout:* accurate but requires a post-render
  measurement pass and a second state update (flicker), and complicates the pure-function
  layout helpers. Rejected; an estimate keyed off row count is sufficient to prevent overlap.
- *Alternative — dagre/elk auto-layout:* heavier dependency, non-deterministic-looking results,
  and conflicts with persisted manual positions. Rejected as a non-goal.

**Decision: A shared `estimateNodeHeight` + a column/band packer in `ontologyGraph.ts`.**
Add pure helpers (e.g. `layoutColumns(items)` / a band-aware variant) that take the per-node row
counts and return positions. `gridPosition`/`datasetLanePosition`/`metricLanePosition` are
replaced or reimplemented in terms of these so all three layers share one packing routine and
the unit tests target pure functions (as `semanticGraph.test.ts` already does).

**Decision: Layout only fills gaps; reconciliation still wins.**
The `positions.get(id) ?? <computed>` pattern in every layer is kept. The computed value is the
only thing that changes. This satisfies "initial layout does not override user-arranged
positions" for free.

**Decision: Bands in the unified view flex with content.**
Compute the concept band's total packed height first, start the dataset band below it plus a
fixed inter-band gutter, then the metric band below the dataset band. Band offsets become
data-derived instead of the constant +420/+720.

**Decision: Per-type color accents via a left border + subtle tint, keyed to the edge palette.**
- Concept → cobalt (`#2b56d4`) accent, matching ontology-relationship edges.
- Dataset → grey/slate accent, matching join edges.
- Metric → keep amber (already present).
- Ghost concept → dashed neutral (already present), unchanged.
Applied as a left accent border on the node components so the existing `selected` border still
reads on top (selection uses the full border / ring), keeping the selection scenario satisfied.
Prefer existing Tailwind/Porsche tokens; only fall back to the hex values already used for edges
where no token matches.

## Risks / Trade-offs

- **Height estimate drifts from real rendered height** (custom fonts, long labels wrapping) →
  Mitigation: bias the estimate slightly high and add a fixed gutter so small drift never causes
  overlap; nodes are draggable if a user wants tighter packing.
- **Color accents reduce contrast in dark surfaces / clash with `selected`** → Mitigation: use
  low-opacity tints plus a left accent border, and keep selection on the outer border/ring so it
  always wins visually (covered by the selection scenario).
- **Test coupling to exact pixel values** → Mitigation: assert non-overlap / ordering invariants
  (e.g. band A bottom ≤ band B top) rather than hard-coded coordinates where practical.
