## Why

Connector lines still run underneath and across node boxes: an edge between two
nodes frequently passes straight through an unrelated box that sits between them.
The current approach only relies on band gutters plus React Flow's `smoothstep`
router, which is geometry-only and treats no node as an obstacle, so lines cut
across boxes whenever the straight channel between two endpoints is occupied.
Users read the graph by following the lines, and a line hidden behind a box makes
the relationship unreadable.

## What Changes

- Route connection edges so they never pass through any node box that is not one
  of their two endpoints. Edges must go around intervening boxes.
- When a straight/orthogonal channel between two endpoints is blocked by a box,
  the edge SHALL be re-routed (bent around the obstacle) instead of drawn over
  the box, choosing a detour that keeps the graph readable.
- Introduce obstacle-aware orthogonal edge routing (a custom React Flow edge /
  path builder) that takes the current node bounding boxes into account, rather
  than the obstacle-blind `smoothstep` default.
- Keep edges orthogonal (horizontal/vertical segments) and continue to prefer the
  band gutters, but add explicit avoidance so a box is never covered by a line.
- Re-routing SHALL react to node movement: when nodes are dragged or re-arranged,
  edges recompute their detours so crossings/overlaps are removed for the new
  positions.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `graph-visual-layout`: Strengthen the "Connection lines avoid crossing nodes"
  requirement from "leave gutters + orthogonal routing" to a hard guarantee that
  no edge is drawn over/through a non-endpoint node box, with edges re-routed
  around obstacles when the direct channel is blocked, including after nodes are
  dragged or re-arranged.

## Impact

- `apps/web/src/components/graph/GraphView.tsx`: replace the `smoothstep`
  `defaultEdgeOptions` with an obstacle-aware custom edge type; pass current node
  boxes to the router.
- `apps/web/src/components/graph/ontologyGraph.ts` (or a new routing module):
  add the orthogonal obstacle-avoidance path computation and supporting geometry.
- Affects all three layers (semantic-model, ontology, unified) since they share
  the same edge configuration.
- No data-model or schema changes; purely visual/rendering behavior.
