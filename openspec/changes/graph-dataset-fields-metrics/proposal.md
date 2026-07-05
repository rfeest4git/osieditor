## Why

The relationship graph currently draws each dataset as a bare label node and does not draw metrics at all, so a reader cannot see a dataset's fields or the model's metrics without switching to the form editor. The ontology layer already proves the value of richer nodes (concepts expand to list their attributes); the semantic-model graph should offer the same at-a-glance detail for datasets and finally surface metrics.

## What Changes

- Dataset nodes gain an expandable field list, mirroring the concept node: collapsed they show the dataset name plus a field count, expanded they list each field (name, and label/type detail when present) as selectable rows that open the field's detail form.
- Metrics are now drawn as graph nodes (previously they were only reachable via the toolbar and detail form). Each metric node shows the metric name and its description, and selecting it opens the metric's detail form.
- Field and metric disclosure/expand state persists across model changes and layer switches, consistent with existing dataset positions and concept expand state.
- Field and metric nodes are added to the semantic-model layer and the unified layer where dataset nodes already appear.

## Capabilities

### New Capabilities
<!-- None: this extends the existing relationship-graph capability. -->

### Modified Capabilities
- `relationship-graph`: dataset nodes SHALL expose their fields as an expandable, selectable list; metrics SHALL be rendered as selectable graph nodes that display their description; field/metric disclosure state SHALL persist alongside existing view state.

## Impact

- `apps/web/src/components/graph/GraphView.tsx` — build field/metric data into dataset and metric nodes for the semantic-model and unified layers; wire selection.
- `apps/web/src/components/graph/ConceptNode.tsx` — pattern to reuse; new `DatasetNode` and `MetricNode` components alongside it.
- `apps/web/src/components/graph/ontologyGraph.ts` — helpers to derive a dataset's fields and the model's metrics into node data.
- `apps/web/src/store/editorStore.ts` — reuse existing `field` and `metric` selection kinds (verify they exist / extend if needed).
- No schema or file-IO change: `Dataset.fields` and `SemanticModel.metrics` already exist in `packages/osi-schema`.
