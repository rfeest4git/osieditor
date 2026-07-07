## 1. Routing core

- [x] 1.1 Add a routing module (e.g. `apps/web/src/components/graph/edgeRouting.ts`) with geometry helpers: rectangle intersection, segment-vs-rectangle test, and rectangle inflation (padding).
- [x] 1.2 Implement a direct orthogonal path builder (L/Z path from source to target handle) mirroring current `smoothstep` behavior, returning the path plus its segment list.
- [x] 1.3 Implement obstacle-aware orthogonal routing: build a coordinate grid from obstacle edge lines (+padding) and endpoints, run shortest-path with a bend penalty over segments that cross no obstacle rectangle.
- [x] 1.4 Add a fallback detour (route via nearest free gutter) when no path is found.
- [x] 1.5 Unit-test `edgeRouting`: direct path when clear; detour that avoids a box placed between endpoints; assert the returned path intersects no non-endpoint rectangle.

## 2. Custom edge component

- [x] 2.1 Create `ObstacleEdge` React Flow edge component that reads node boxes from the store, excludes the edge's two endpoints, computes the route via `edgeRouting`, and renders it with `<BaseEdge>` and the existing edge label.
- [x] 2.2 Memoize the obstacle set and recompute an edge's path only when its endpoints or a relevant box moves.

## 3. Wire into graph

- [x] 3.1 Register `edgeTypes` with `ObstacleEdge` and replace `defaultEdgeOptions` (`smoothstep`) so all edges use the new type across semantic-model, ontology, and unified layers in `GraphView.tsx`.
- [x] 3.2 Verify edges recompute on node drag and after "Arrange" (reactivity via store subscription).

## 4. Validation

- [x] 4.1 Manually verify in the running app (all three layers) that no connection line is drawn over a non-endpoint box, before and after dragging/arranging.
- [x] 4.2 Run `pnpm -C apps/web lint` and the web/schema test suites; fix any failures.
- [x] 4.3 Run `openspec validate graph-edge-obstacle-routing --strict` and resolve any issues.
