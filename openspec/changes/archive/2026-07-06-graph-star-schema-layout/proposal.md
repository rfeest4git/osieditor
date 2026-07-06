## Why

The current auto-arrange packs nodes into stacked horizontal bands (concepts, then
datasets, then metrics) using a shelf-pack that ignores how the nodes are actually
connected. Because placement is blind to the edges, related nodes land far apart and
their connection lines cross each other and cut across unrelated nodes — the tangled
result shown in the "today" screenshot. Users want a clean, radial star-schema layout
where each hub sits at the centre with its directly connected nodes fanned out around
it and no crossing lines.

## What Changes

- Replace the band/shelf-pack arrange with an **edge-aware star-schema layout**: pick
  the most-connected node(s) as hub(s), place each hub's directly connected neighbours
  radially around it, and position remaining nodes by their nearest connected hub.
- Order each hub's neighbours around the ring by their own connectivity so edges fan
  out without crossing, and separate multiple hubs far enough that their rings do not
  overlap or interleave edges.
- Apply the new layout to both the automatic first-time arrange and the manual
  "Arrange" control, in every layer (semantic-model, ontology, unified), using real
  measured node sizes so nodes never overlap.
- Keep isolated (edgeless) nodes tucked in a tidy off-to-the-side grid rather than
  mixed into the rings.
- Preserve existing behaviour that user-dragged positions are never overridden and the
  view reframes to fit after an arrange.

## Capabilities

### New Capabilities
<!-- None: this refines existing layout behaviour. -->

### Modified Capabilities
- `graph-visual-layout`: Replace the "nodes packed into shelf rows / separated bands"
  placement requirements with an edge-aware star-schema (hub-and-spoke) placement that
  minimizes edge crossings while still guaranteeing non-overlapping nodes.

## Impact

- `apps/web/src/components/graph/ontologyGraph.ts` — new star-schema layout function
  (hub selection, radial placement, crossing-aware neighbour ordering) replacing /
  augmenting `arrangeBoxes`; edge topology becomes a layout input.
- `apps/web/src/components/graph/GraphView.tsx` — `ArrangeControl` and the initial
  layout call the new layout with the layer's edges plus measured node sizes.
- `apps/web/src/components/graph/semanticGraph.test.ts` — layout tests updated for the
  star-schema arrangement and crossing/overlap guarantees.
- No API, schema, or persisted-model changes; purely client-side graph presentation.
