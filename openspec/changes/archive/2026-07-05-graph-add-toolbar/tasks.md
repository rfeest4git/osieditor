## 1. GraphToolbar component

- [x] 1.1 Create `apps/web/src/components/graph/GraphToolbar.tsx` accepting the active `layer` ('unified' | 'semantic-model' | 'ontology') and whether a semantic model is present, and rendering contextual `Add` buttons (Porsche DS `PButton`, `icon="add"`, compact).
- [x] 1.2 Wire each button to the existing store creators via `useEditorStore` (`addDataset`, `addMetric`, `addRelationship`, `addConcept`); rely on the creators to select the new entity.
- [x] 1.3 Show semantic actions (Add dataset, Add metric, Add relationship) for the `semantic-model` layer and the non-ontology ERD; show `Add concept` for the `ontology` layer; show concept + semantic actions for the `unified` layer.
- [x] 1.4 Disable "Add relationship" unless the active model has ≥2 datasets, with an accessible hint (e.g. title/aria) explaining two datasets are required.
- [x] 1.5 Guard semantic actions on `getActiveModel(...)` being defined so nested-model adds don't silently no-op when the active map has no semantic model.

## 2. Integrate into GraphView

- [x] 2.1 Render `GraphToolbar` as an absolute overlay in the ontology/unified/semantic canvas container in `GraphView.tsx`, positioned to not collide with the layer-toggle row or React Flow `Controls`.
- [x] 2.2 Render `GraphToolbar` in the non-ontology ERD branch (the early-return `!isOnt` path) so plain semantic-model documents get the toolbar too.
- [x] 2.3 Pass the current `layer` and model-presence into the toolbar and confirm it re-renders correctly on layer switches.

## 3. Verify behavior

- [x] 3.1 Semantic-model doc: with ≥1 dataset present, add a second dataset, a metric, and (with ≥2 datasets) a relationship from the graph; confirm each new entity is selected and its detail form opens.
- [x] 3.2 Ontology doc: from the ontology/unified layers, add a concept from the graph on a non-empty canvas; confirm the node appears and is selected.
- [x] 3.3 Confirm the empty-state add buttons and drag-to-connect still work unchanged.
- [x] 3.4 Add `apps/web/src/components/graph/GraphToolbar.test.tsx` covering: relationship button disabled with <2 datasets and enabled with ≥2; layer-specific button visibility; a click invokes the matching store creator.
- [x] 3.5 Run `pnpm lint` and `pnpm test` for `apps/web` and fix any failures.
