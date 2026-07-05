## Context

The workspace (`routes/index.tsx`) has two views: a Form editor and a Relationship graph. Adding entities is fully served in the Form editor via the always-present Navigator sidebar (`components/shell/Navigator.tsx`), whose `GroupHeader` renders unconditional `Add` buttons for datasets, metrics, relationships, concepts, and mappings, each wired to a store creator that also selects the new entity.

The graph view (`components/graph/GraphView.tsx`) has no such controls. Its only create affordances are:
- `GraphEmptyState` — an "Add dataset"/"Add concept" button shown **only** when the canvas has zero nodes.
- Drag-to-connect — creates a *relationship* (or ontology relationship) between two existing nodes, so it presupposes nodes already exist and cannot create a first/second node.

Consequently, once one node exists the empty state (and its add button) is gone, and there is no way to add a dataset, concept, or **metric** from within the graph. Metrics are never graph nodes, so drag-to-connect can never create them. The store already exposes every creator we need (`addDataset`, `addMetric`, `addRelationship`, `addConcept`, `addOntologyRelationship`), and each selects the created entity, which the graph's side `SelectionDetail` panel already renders.

## Goals / Non-Goals

**Goals:**
- Provide a persistent, always-visible add toolbar inside the graph view.
- Make the toolbar's actions contextual to the active layer (semantic-model ERD vs. ontology vs. unified).
- Reuse existing store creators and selection behavior — no schema or store changes.
- Keep drag-to-connect and the empty-state buttons working unchanged.

**Non-Goals:**
- Representing metrics as graph nodes (they remain edit-in-panel only).
- New layout, routing, or a redesign of the Navigator.
- Changing what entities can be created or their creation semantics.

## Decisions

### 1. A dedicated `GraphToolbar` overlay, not per-canvas ad-hoc buttons
Add a `components/graph/GraphToolbar.tsx` that renders the contextual `Add` buttons and is positioned as an absolute overlay on the canvas, matching the existing layer-toggle overlay in `GraphView` (`absolute left-2 top-2 z-10`). GraphView already renders three separate `ReactFlow` canvases (semantic, ontology, unified) plus a bare ERD branch for non-ontology docs; a single shared toolbar component keeps the add logic in one place and avoids duplicating buttons across those branches.

*Alternative considered:* Extend `GraphEmptyState` to always show. Rejected — the empty state is a centered call-to-action, wrong placement for a persistent tool, and it does not cover metrics or relationships.

### 2. Toolbar contents driven by the active layer + presence of a semantic model
The toolbar takes the current `layer` and document shape and shows:
- **semantic-model layer** (and the non-ontology ERD): Add dataset, Add metric, Add relationship.
- **ontology layer**: Add concept.
- **unified layer**: Add concept, plus Add dataset / Add metric / Add relationship for the nested semantic model.

The non-ontology ERD branch of `GraphView` (which currently returns early before the layer-toggle UI) also renders the toolbar so plain semantic-model documents get it.

*Alternative considered:* One flat toolbar with every action always shown. Rejected — showing concept actions on a semantic-model document (which has no ontology) would create dead controls.

### 3. Relationship enablement mirrors drag-to-connect
"Add relationship" is enabled only when `model.datasets.length >= 2`; otherwise it is disabled with a hint ("Add two datasets to connect them"). This matches the reality that a relationship needs a distinct `from` and `to`, and avoids creating a degenerate self-relationship. `addRelationship()` with no args already defaults `from`/`to` to the first two datasets.

*Alternative considered:* Keep the Navigator's `>= 1` guard. Rejected — with a single dataset the default `to` collapses onto `from` (self-loop), which is not a meaningful ERD edge.

### 4. Actions call existing store creators; selection opens the panel
Each button calls the corresponding creator (`addMetric()`, `addDataset()`, `addRelationship()`, `addConcept()`). Those already set `state.selection` to the new entity, and the graph's `SelectionDetail` side panel renders its form — so "Add metric" naturally surfaces an editable metric even without a node. No new wiring beyond invoking the creators.

## Risks / Trade-offs

- **Metric has no node, so "Add metric" gives no canvas feedback** → The side detail panel opens the new metric's form immediately, which is the same feedback the Navigator flow gives; acceptable and expected.
- **Toolbar overlaps the layer toggle / React Flow controls** → Position the toolbar to share the existing top-left overlay row (or place adds on the top-right) and keep it clear of React Flow's bottom-left `Controls`.
- **Unified/nested-model actions when the active map lacks a semantic model** → Guard the dataset/metric/relationship actions on `getActiveModel(...)` being defined so they are hidden/disabled rather than silently no-op.

## Open Questions

- Placement: extend the existing top-left toggle row vs. a separate top-right add cluster. Leaning top-right to avoid crowding the layer toggle. Final call at implementation time based on spacing.
