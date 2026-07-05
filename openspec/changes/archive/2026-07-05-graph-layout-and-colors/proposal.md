## Why

In every graph layer, nodes are placed on a fixed index-based grid (`gridPosition`,
`datasetLanePosition`, `metricLanePosition`) that ignores each node's real height.
Because dataset and concept nodes default to *expanded* and grow with their field/attribute
lists, the fixed 160px row pitch and lane offsets are too small — nodes overlap and become
unreadable on first render. On top of that, concepts, datasets and metrics all share the same
neutral `bg-surface` styling (only metrics carry an amber accent), so the different element
kinds are hard to tell apart at a glance.

## What Changes

- Replace the fixed index-based grid placement with a height-aware initial layout so no two
  nodes overlap on first render, in the semantic-model, ontology, and unified layers.
- Preserve the existing behavior that user-dragged positions persist across model edits and
  layer switches — the new layout only supplies the *initial* position for nodes that have no
  remembered position.
- Give each element kind a distinct, consistent color accent (concept, dataset, metric, and
  the referenced/ghost concept), applied to the custom node components so the type is
  recognizable at a glance and consistent with the edge colors already used in the unified view.
- Keep the layout tidy in the unified view: concepts, datasets, and metrics stay in visually
  separated bands that flex with node height instead of colliding.

## Capabilities

### New Capabilities
- `graph-visual-layout`: Non-overlapping, height-aware initial node placement and per-element-type
  color coding across all graph layers (semantic-model, ontology, unified).

### Modified Capabilities
<!-- No requirement changes to existing capabilities; drag-persistence behavior in relationship-graph is preserved, not modified. -->

## Impact

- `apps/web/src/components/graph/ontologyGraph.ts` — layout helpers (`gridPosition`,
  `datasetLanePosition`, `metricLanePosition`) replaced/extended with height-aware placement.
- `apps/web/src/components/graph/GraphView.tsx` — node reconciliation for all three layers uses
  the new layout and passes per-type styling.
- `apps/web/src/components/graph/ConceptNode.tsx`, `DatasetNode.tsx`, `MetricNode.tsx` — per-type
  color accents.
- `apps/web/src/components/graph/semanticGraph.test.ts` — layout helper tests updated/added.
- No schema, file-IO, or store API changes; purely presentational.
