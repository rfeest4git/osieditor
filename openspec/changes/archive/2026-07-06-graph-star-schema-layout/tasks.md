## 1. Layout core (ontologyGraph.ts)

- [x] 1.1 Add an edge input type (source/target node ids) and a `LayoutEdge[]` param, and a graph helper to compute per-node degree and connected components from boxes + edges.
- [x] 1.2 Implement hub selection: pick the highest-degree node per connected component, and detect additional local-maxima hubs for multi-hub (multi-fact) graphs.
- [x] 1.3 Implement `starLayout(boxes, edges, options)`: place each hub, distribute its neighbours on a size-derived ring around it (radius grows with neighbour count/size so ring boxes never overlap), and hang second-degree nodes off their parent neighbour in the same angular wedge.
- [x] 1.4 Add crossing-aware neighbour ordering around each ring (group neighbours that also connect to each other / to a shared second hub adjacently; break ties by stable node id for determinism).
- [x] 1.5 Pack disconnected components apart (reuse shelf-pack at component-bounding-box level) and lay edgeless nodes into a compact grid clear of the clusters.
- [x] 1.6 Add a domain-aware wrapper so the unified layer lays out each domain's star cluster and offsets clusters so their bounding boxes (and region boxes) do not overlap.

## 2. Wire into the graph view (GraphView.tsx)

- [x] 2.1 Pass each layer's edges (semantic relationships, ontology relationships, mapping links) into the estimated initial layout call, replacing `layoutEstimatedBands` banding with the star layout.
- [x] 2.2 Update `ArrangeControl` to build `LayoutEdge[]` from the current React Flow edges and call `starLayout` with measured node sizes; keep the fit-view-after-arrange behaviour.
- [x] 2.3 Preserve existing invariants: only position nodes without a remembered/dragged position on initial layout; keep once-per-layer auto-arrange gating unchanged.
- [x] 2.4 Remove or repurpose the now-unused band classifiers/`arrangeBoxes` banding paths that the star layout replaces (keep helpers still needed by domain grouping).

## 3. Tests

- [x] 3.1 Update `semanticGraph.test.ts`: assert non-overlap for star layout across mixed node sizes (including one very tall node).
- [x] 3.2 Add a test that a hub's neighbours are distributed around it and their straight-line edges do not cross (angular ordering assertion).
- [x] 3.3 Add a test that multiple components / edgeless nodes are packed without overlapping the connected clusters.
- [x] 3.4 Add a unified-view test that the ontology cluster and semantic cluster bounding boxes do not overlap.

## 4. Verify

- [x] 4.1 Run `pnpm test` (web package) and `pnpm lint`; fix failures.
- [x] 4.2 Manually load the sample model and confirm the star-schema layout renders without crossing lines in the semantic-model, ontology, and unified layers; confirm "Arrange" and drag-preservation still work.
- [x] 4.3 Run `openspec validate graph-star-schema-layout` and resolve any issues.
