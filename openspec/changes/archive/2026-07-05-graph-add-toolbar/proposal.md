## Why

The Relationship-graph view offers **no way to add entities once the canvas is non-empty**. The only in-graph "add" affordance is the empty-state button (`Add dataset` / `Add concept`), which disappears the moment the first node exists. After that, the graph supports only drag-to-connect between existing nodes, so users cannot create a second dataset/concept, and can never create a **metric** (metrics are not graph nodes and have no add control). Users working in the graph are forced back to the Navigator sidebar to add anything, which reads as "I can't add items once one exists" and "I can't add metrics."

## What Changes

- Add a **persistent add toolbar** overlaid on the graph canvas that stays visible whether or not the graph already has nodes, exposing the same create actions the Navigator offers.
- The toolbar's actions are **contextual to the active layer**:
  - Semantic-model layer / semantic-model documents: **Add dataset**, **Add metric**, **Add relationship**.
  - Ontology and Unified layers: **Add concept**, plus dataset/metric/relationship actions for the nested semantic model.
- Each add action reuses the existing store creators (`addDataset`, `addMetric`, `addRelationship`, `addConcept`) and **selects the new entity**, so its detail form opens in the graph's side panel for immediate editing — including metrics, which have no node representation.
- **Add relationship** is enabled only when there are at least two datasets to connect (otherwise disabled with a hint), keeping it consistent with drag-to-connect.
- Keep the existing empty-state add buttons and drag-to-connect behavior unchanged; the toolbar is additive.

## Capabilities

### New Capabilities
<!-- None; this extends existing graph capabilities. -->

### Modified Capabilities
- `relationship-graph`: The graph view must expose a persistent toolbar to add datasets, metrics, and relationships that remains available after the graph is non-empty, with each new entity selected for editing; adding a relationship requires two or more datasets.
- `ontology-graph`: The graph toolbar in the ontology and unified layers must additionally expose adding a concept, and the nested semantic-model add actions, without leaving the graph.

## Impact

- `apps/web/src/components/graph/GraphView.tsx` — render a persistent add toolbar (alongside the existing layer toggle) whose actions are contextual to the active layer and call the store creators; both the non-ontology ERD and the ontology/unified canvases get the toolbar.
- `apps/web/src/components/graph/GraphToolbar.tsx` (new) — the toolbar component with contextual add buttons and the relationship-enablement rule.
- No changes to `@osi-editor/osi-schema` or `apps/web/src/store/editorStore.ts` — all required creators (`addDataset`, `addMetric`, `addRelationship`, `addConcept`) already exist and select the new entity.
