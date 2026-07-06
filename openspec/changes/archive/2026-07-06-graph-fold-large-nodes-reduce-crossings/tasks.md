## 1. Fold-state model and default rule

- [x] 1.1 In [ontologyGraph.ts](apps/web/src/components/graph/ontologyGraph.ts) add exported `FOLD_THRESHOLD = 8` and a pure `defaultExpanded(fieldCount: number): boolean` (`fieldCount <= FOLD_THRESHOLD`).
- [x] 1.2 Add unit tests in [ontologyGraph.test.ts](apps/web/src/components/graph/ontologyGraph.test.ts) for `defaultExpanded` at, below, and above the threshold.

## 2. Size-based default fold in GraphView

- [x] 2.1 In [GraphView.tsx](apps/web/src/components/graph/GraphView.tsx) replace `collapsed: Set<string>` with `foldOverride: Map<string, boolean>`; add `isExpanded(id, fieldCount)` (`foldOverride.get(id) ?? defaultExpanded(fieldCount)`) and change `toggleExpand(id, fieldCount)` to write the negated effective state.
- [x] 2.2 Update the semantic-model dataset node builder to compute `expanded` via `isExpanded(datasetNodeId(name), fields.length)` and pass `onToggleExpand: () => toggleExpand(id, fields.length)`.
- [x] 2.3 Update the unified-layer concept and dataset node builders the same way (using attribute / field counts).
- [x] 2.4 Update the three estimated-size builders (`layoutEstimatedStar` / `layoutEstimatedStarGrouped` inputs) to derive `rows`/`texts` from `isExpanded(id, count)` instead of `!collapsed.has(id)`.
- [x] 2.5 Prune `foldOverride` entries whose ids are no longer present when nodes are reconciled, to bound map growth.

## 3. Collapse-all / Expand-all control

- [x] 3.1 In [GraphView.tsx](apps/web/src/components/graph/GraphView.tsx) add `onCollapseAll` / `onExpandAll` handlers that set an explicit override (`false` / `true`) for every id in the supplied node id list.
- [x] 3.2 Extend `ArrangeControl` to render "Collapse all" and "Expand all" buttons in its existing `<Panel position="top-right">`, invoking the handlers with `getNodes().map(n => n.id)`.
- [x] 3.3 Pass `onCollapseAll` / `onExpandAll` into `ArrangeControl` from every layer (semantic-model, ontology, unified) so the control is available in each.

## 4. Barycenter crossing reduction (ontologyGraph.ts)

- [x] 4.1 Add a deterministic barycenter ordering helper (order ids by mean x of their connected partners; ties break by id).
- [x] 4.2 In `starLayoutGrouped`, run a small fixed number of alternating barycenter sweeps between the two domain bands (order band B by band-A partners, then band A by band-B partners) to align cross-band mapping/relationship edges, replacing the single-hint alignment.
- [x] 4.3 Order packed clusters/connected components left-to-right by the barycenter of their inter-cluster edges instead of sorted-id order, so linked clusters sit adjacently.
- [x] 4.4 Add a pure `countEdgeCrossings(positions, edges)` test helper and tests in [ontologyGraph.test.ts](apps/web/src/components/graph/ontologyGraph.test.ts) asserting the sweep reduces crossings on a grouped-band fixture and a multi-cluster fixture.

## 5. Verification

- [x] 5.1 Update affected existing tests as needed ([ontologyGraph.test.ts](apps/web/src/components/graph/ontologyGraph.test.ts), [GraphToolbar.test.tsx](apps/web/src/components/graph/GraphToolbar.test.tsx)).
- [x] 5.2 Run the repo lint, typecheck, and unit test suite (turbo / vitest) and fix any failures.
- [x] 5.3 Manual check in the web app with a large sample: a >8-field entity (e.g. `VehicleWarrantiesContracts`) folds by default; expanding it sticks across a layer switch; "Collapse all" / "Expand all" work; and edge crossings on the sample are visibly reduced.
