## 1. Height-aware layout helpers

- [x] 1.1 Add `estimateNodeHeight({ rows })` to `ontologyGraph.ts` returning a height from a base header plus row-count × row-height (capped for very tall nodes)
- [x] 1.2 Add a pure column packer (e.g. `layoutColumns(items)`) that places items across a fixed column pitch, stacking each column by running y-cursor + gutter using per-item estimated height
- [x] 1.3 Reimplement `gridPosition` / `datasetLanePosition` / `metricLanePosition` in terms of the packer, or add band-aware variants, so band offsets are derived from the concept/dataset band heights instead of the constant +420/+720
- [x] 1.4 Ensure the layout functions stay pure (no React Flow measurement) so they remain unit-testable

## 2. Wire layout into the graph layers

- [x] 2.1 In `GraphView.tsx` semantic-model reconciliation, compute initial positions via the new packer using each dataset's field count and each metric's fixed height, keeping the `positions.get(id) ?? <computed>` persistence pattern
- [x] 2.2 In ontology-layer reconciliation, position concept nodes (using attribute counts), mapped dataset nodes, and ghost concepts without overlap, keeping remembered positions
- [x] 2.3 In unified-layer reconciliation, place concept, dataset, and metric bands using the flexing band offsets so tall nodes in one band never overlap an adjacent band
- [x] 2.4 Confirm ghost/referenced concept and mapped-dataset nodes are placed clear of content nodes in every layer

## 3. Per-element color accents

- [x] 3.1 Add a cobalt accent (matching ontology-relationship edges) to `ConceptNode`, keeping the `selected` border/ring on top and the ghost variant's dashed neutral unchanged
- [x] 3.2 Add a slate/grey accent (matching join edges) to `DatasetNode`, keeping the `selected` border and the unified-view mapped-dataset outline intact
- [x] 3.3 Keep the metric amber accent and align it with the other accents (consistent left-border treatment); prefer existing Porsche/Tailwind tokens, falling back to the edge hex values only where no token matches
- [x] 3.4 Verify selection remains clearly visible over every type accent in both light and dark surfaces

## 4. Tests and verification

- [x] 4.1 Add/extend `semanticGraph.test.ts` to assert non-overlap invariants for the packer (no two bounding boxes intersect) and correct band ordering (concept band bottom ≤ dataset band top ≤ metric band top)
- [x] 4.2 Add a test that a remembered position is preserved and only new ids receive a computed position
- [ ] 4.3 Run the graph in the app with a model that has expanded, tall dataset and concept nodes and confirm no overlap and distinct per-type colors across all three layers
- [x] 4.4 Run typecheck, lint, and the graph tests

## 5. Refactor auto-arrange to be size-accurate + add manual Arrange (follow-up)

- [x] 5.1 Replace the fixed-column packer with a shelf-packer (`arrangeBoxes`) that lays boxes by real width AND height into wrapping rows and vertically stacked bands; remove the height cap that truncated tall nodes
- [x] 5.2 Add `estimateNodeWidth(texts)` and uncapped `estimateNodeHeight(rows)`; feed the reconciliation effects width via `texts` (label + field/attribute rows) so the initial estimate no longer under-sizes nodes
- [x] 5.3 Add an in-canvas `ArrangeControl` (React Flow `Panel` + `PButton`) that reads each node's `measured` size via `useReactFlow` and repacks with the same `arrangeBoxes`, then reframes with `fitView`
- [x] 5.4 Auto-run the measured arrange once per layer on first `useNodesInitialized`, tracked in a persistent `arrangedLayers` ref so layer switches never override user positions
- [x] 5.5 Wire `ArrangeControl` into all three flows with per-layer band classifiers (`semanticBandOf` / `ontologyBandOf` / `unifiedBandOf`) matching the initial estimate bands
- [x] 5.6 Update `semanticGraph.test.ts`: non-overlap for mixed width/height boxes (incl. the 51-field tall node), band ordering, over-wide-box wrap, width-estimate clamp, and estimated-band layout
- [ ] 5.7 Run the app on the `flights` model and visually confirm the auto-arrange and the "Arrange" button produce a non-overlapping layout in all three layers

## 6. Descriptions, domain regions, edge routing, review fixes (follow-up)

- [x] 6.1 Always render the description on `ConceptNode` and `DatasetNode` (independent of expand state); plumb `description` into node data in all three layers and into the size estimate
- [x] 6.2 Add pure `computeRegionRects` and a `BandRegions` component (`useStore` + `ViewportPortal`) drawing labelled, tinted "Ontology" (cobalt) and "Semantic model" (teal) boxes behind the nodes that track drags/arranges
- [x] 6.3 Retint dataset accent to teal (`#0d9488`) to match the semantic-model region; keep concept cobalt and metric amber
- [x] 6.4 Reduce node/edge-line overlap: larger band/row gutters and `defaultEdgeOptions` smoothstep routing on all flows
- [x] 6.5 Fix (review): reframe on layer switch by keying each `<ReactFlow>` so the fitView-on-init re-fires; positions survive via id-keyed parent state
- [x] 6.6 Fix (review): add `docLoadId` to the store and reset `arrangedLayers` on it so a newly loaded document auto-arranges while edits do not
- [x] 6.7 Tests: `computeRegionRects` (padded per-domain box, ignores unmeasured nodes); all graph tests, typecheck, lint, build green
- [ ] 6.8 Visually confirm in-app: descriptions shown, two labelled colour regions, edges not crossing nodes, layer-switch reframes, new-doc re-arranges
