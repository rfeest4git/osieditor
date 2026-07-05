## Context

The semantic-model graph in [GraphView.tsx](apps/web/src/components/graph/GraphView.tsx) renders datasets as plain React Flow nodes carrying only `data: { label: dataset.name }`, in two layers: the `nodes` state (semantic-model layer) and `unifiedNodes` state (unified layer). Metrics are never drawn; they exist only in `model.metrics` and are reachable via the toolbar/detail form.

The ontology layer already solves the "rich, expandable node" problem: [ConceptNode.tsx](apps/web/src/components/graph/ConceptNode.tsx) is a custom node type that shows a label plus a count affordance, and expands to a list of selectable attribute rows. Its expand/collapse state lives in `GraphView`'s `collapsed: Set<string>` keyed by stable node id, and its data is derived by [ontologyGraph.ts](apps/web/src/components/graph/ontologyGraph.ts) (`buildOntologyGraphModel` → `attributesByConceptId`). We reuse this pattern rather than inventing a new one.

Relevant facts already verified in the code:
- `Dataset.fields?: Field[]` and `Field` (`name`, `label?`, `description?`, `dimension?`) exist in [model.ts](packages/osi-schema/src/model.ts).
- `SemanticModel.metrics?: Metric[]` with `Metric` (`name`, `description?`, `expression`) exists.
- The store's `Selection` union already has `{ kind: 'field'; datasetIndex; fieldIndex }` and `{ kind: 'metric'; metricIndex }` ([editorStore.ts:34-35](apps/web/src/store/editorStore.ts)). No store change is required for selection.

## Goals / Non-Goals

**Goals:**
- Dataset nodes show a field count and expand to a selectable list of fields, in both the semantic-model and unified layers.
- Metrics are drawn as nodes showing name + description, selectable to open the metric form.
- Field/metric node data derivation is centralized in `ontologyGraph.ts` and unit-testable, matching the existing `buildOntologyGraphModel` style.
- Expand/collapse of dataset nodes persists across model reconciliation and layer switches, reusing the existing id-keyed `collapsed` set.

**Non-Goals:**
- No schema or file-IO changes; `fields` and `metrics` already round-trip.
- No edges to/from metric nodes (metrics are not relationship endpoints).
- No change to the ontology concept node or to drag-to-connect relationship creation.
- Not adding field-level or metric-level graph editing beyond opening the existing detail form.

## Decisions

### Decision: Introduce a `DatasetNode` custom node type mirroring `ConceptNode`

Add a `DatasetNode` React Flow node type that takes `{ label, fields, expanded, onToggleExpand, onSelectField }`, rendering a header with a field count and an expandable list of field rows. Field rows show the field name and, when present, a secondary label/type detail (`field.label`, or the dimension flag). This is registered in the node-types maps used by the semantic-model and unified flows.

- **Alternative considered:** Generalize `ConceptNode` to serve both concepts and datasets. Rejected — the two carry different sub-element semantics (attributes with ID/FK badges vs. plain fields) and coupling them would complicate both. A sibling component keeps each simple and matches the existing one-node-type-per-concern layout.

### Decision: Derive node data in `ontologyGraph.ts` via a `datasetFields` helper

Add a pure helper (e.g. `datasetFieldsById(model)` returning `Map<datasetNodeId, FieldRow[]>`, and a `FieldRow` shape) so `GraphView` only wires callbacks, exactly as it does for `attributesByConceptId`. Keeps derivation testable in isolation and free of React Flow types.

### Decision: Render metrics as a separate `MetricNode` type in a dedicated lane

Add a `MetricNode` showing the metric name and its description (description shown muted; omitted gracefully when absent). Metric nodes are laid out in their own lane (a new `metricLanePosition(index)` analogous to `datasetLanePosition`) so they don't overlap dataset/concept lanes. Metric ids are prefixed `metric:<name>` to avoid collision with `dataset:`/`concept:` ids and to persist positions by id.

- **Alternative considered:** Attach metrics as sub-rows of a dataset. Rejected — a metric's expression can reference multiple datasets (or none directly), so there is no single owning dataset; a standalone node is the honest representation.

### Decision: Persist dataset expand state with the existing `collapsed` set

Reuse `GraphView`'s `collapsed: Set<string>` (currently only concept ids). Because dataset node ids are already distinct (`dataset:<name>` in the unified layer; raw `name` in the semantic-model layer), keying the same set by dataset id needs no new state. For the semantic-model layer where dataset ids are the raw name, we key expand state by the same id used for the node so it survives reconciliation like dragged positions do.

## Risks / Trade-offs

- [Larger nodes crowd the canvas] → Datasets default to collapsed (only a count shown) so the initial layout stays compact; users opt into detail. This matches how a busy ERD should read.
- [Semantic-model layer uses raw dataset name as node id while unified uses `dataset:` prefix] → Expand-state keying must use whatever id the node actually has in that layer; the helper takes the id-builder as a parameter (as `buildSemanticEdges` already does) to stay consistent.
- [Metric node with a long description overflows] → Constrain node width and clamp/scroll the description text, consistent with existing node styling; full text remains in the detail form.
- [Duplicate dataset/metric names produce colliding ids] → Pre-existing constraint (names are the identity used across the graph and validation); no new risk introduced here.

## Migration Plan

Pure additive UI change behind the existing graph view; no data migration, no persisted state format change. Ships in one step. Rollback is reverting the component/helper changes — model data is untouched.

## Open Questions

- Should field rows surface primary-key / unique-key membership (badges) like concept attributes show ID/FK? Deferred; can be added later without a spec change since it's presentation detail within an existing requirement.
