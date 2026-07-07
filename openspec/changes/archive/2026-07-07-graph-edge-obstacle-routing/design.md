## Context

All three graph layers (semantic-model, ontology, unified) use React Flow
(`@xyflow/react`) with `defaultEdgeOptions = { type: 'smoothstep' }`. Node
placement is handled by the star-schema layout in
`apps/web/src/components/graph/ontologyGraph.ts` and is already overlap-free.
The gap is edge routing: `smoothstep` is purely geometric and obstacle-blind, so
a straight orthogonal channel between two endpoints is drawn even when it passes
through an unrelated node box. Band gutters and crossing-minimization reduce but
do not eliminate this — especially after the user drags nodes.

React Flow lets us register a custom edge type that receives the source/target
coordinates and renders an arbitrary SVG path. Custom edges can read the current
nodes (via `useStore`/`useNodes`) to treat other boxes as obstacles.

## Goals / Non-Goals

**Goals:**
- No connection line is ever drawn over/through a node box that is not one of the
  edge's two endpoints.
- Edges stay orthogonal and bend around obstructing boxes when the direct channel
  is blocked.
- Routing recomputes when nodes are dragged or re-arranged.
- Applies uniformly across all three layers with one edge implementation.

**Non-Goals:**
- Globally optimal (minimum-length or minimum-bend) routing; a good-enough,
  readable detour is sufficient.
- Guaranteeing zero edge-edge crossings (only edge-vs-box overlap is in scope).
- Changing node placement / the star-schema layout algorithm.
- Animated re-routing transitions.

## Decisions

### Decision: Custom obstacle-aware orthogonal edge type

Replace the `smoothstep` default with a custom React Flow edge (e.g.
`ObstacleEdge`) registered via `edgeTypes`. The edge component reads all node
boxes from the React Flow store, treats every non-endpoint box (inflated by a
small padding) as a rectangular obstacle, and computes an orthogonal polyline
from source handle to target handle that avoids those rectangles, then renders it
with `<BaseEdge>` and the existing label.

**Why over alternatives:**
- *Keep `smoothstep`, only widen gutters* — already the status quo; does not fix
  drag-time overlaps and still cuts through boxes in dense topologies.
- *Switch to a full graph library with routing (elk.js orthogonal edge routing)* —
  heavier dependency and a larger rewrite of the layout pipeline; elk routing runs
  at layout time, not reactively on drag. Rejected for scope.
- *Custom reactive edge* — localizes the change to the edge layer, reuses the
  existing layout, and recomputes naturally as node positions change. Chosen.

### Decision: Routing algorithm

Use a lightweight rectilinear routing approach sufficient for the graph's scale
(tens of nodes):
1. Try the direct orthogonal path (the current `smoothstep`-style L/Z path). If it
   intersects no obstacle rectangle, use it.
2. Otherwise, build a visibility/grid graph from the "interesting" coordinates —
   the x/y lines of obstacle edges (plus padding) and the endpoints — and run a
   shortest-path (A*/Dijkstra with a bend penalty) over orthogonal segments that
   do not cross any obstacle rectangle.
3. Fall back to a simple over/under detour (route via the nearest free gutter) if
   no path is found.

A bend penalty keeps paths simple and readable. Obstacle rectangles are padded so
lines do not visually touch box borders.

### Decision: Reactivity

The custom edge subscribes to node position/size via the React Flow store, so edge
paths recompute automatically on drag and on "Arrange". To bound cost, memoize the
obstacle set per render and only recompute an edge's path when a relevant box or
its own endpoints move.

## Risks / Trade-offs

- [Routing cost with many edges/nodes] → Keep the coordinate grid small (only
  obstacle-derived lines), memoize the obstacle set, and short-circuit with the
  direct-path test before running search.
- [Detours can look busy in very dense graphs] → Bend penalty favors simple paths;
  padding tuned so most edges still take the direct channel.
- [Edge-edge overlap not addressed] → Out of scope; existing crossing minimization
  in the layout still applies. Can be a follow-up.
- [React Flow store API coupling] → Isolate store access in the edge component so a
  future React Flow upgrade touches one file.

## Migration Plan

- Purely additive/visual: register the new edge type and swap
  `defaultEdgeOptions`. No data or schema migration.
- Rollback: revert `defaultEdgeOptions` to `smoothstep` and unregister the edge
  type.
