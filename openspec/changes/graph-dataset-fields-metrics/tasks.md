## 1. Derive node data (ontologyGraph.ts)

- [x] 1.1 Add a `FieldRow` type and a `datasetFieldsById(model, nodeId?)` helper that returns a `Map<nodeId, FieldRow[]>`, each row carrying field name, an optional detail (label or dimension flag), and `{ datasetIndex, fieldIndex }` for selection. Default `nodeId` to the raw dataset name (semantic-model layer) so callers can override with `datasetNodeId` (unified layer), mirroring `buildSemanticEdges`.
- [x] 1.2 Add a `MetricRow` type and a `buildMetricNodesData(model)` helper returning name, description, and `metricIndex` per metric.
- [x] 1.3 Add `metricLanePosition(index)` (below/beside the dataset lane) analogous to `datasetLanePosition`.
- [x] 1.4 Extend `apps/web/src/components/graph/ontologyGraph.test.ts` (or `semanticGraph.test.ts`) covering: field rows derived per dataset, a dataset with no fields yields an empty row list, and metric rows include description and preserve `metricIndex`.

## 2. Node components

- [x] 2.1 Create `apps/web/src/components/graph/DatasetNode.tsx` modeled on `ConceptNode.tsx`: header with dataset name + field count and expand toggle; expanded list of selectable field rows (name + detail); no expand affordance when there are no fields; `onSelectField` and `onToggleExpand` callbacks.
- [x] 2.2 Create `apps/web/src/components/graph/MetricNode.tsx`: shows metric name and (muted) description, gracefully omitting the description when absent; whole node selectable.

## 3. Wire into GraphView — semantic-model layer

- [x] 3.1 Register `dataset` and `metric` node types in the node-types map used by `semanticFlow`.
- [x] 3.2 In the `nodes` reconciliation effect, build dataset nodes with `type: 'dataset'`, field rows from `datasetFieldsById`, `expanded` from the `collapsed` set (keyed by node id), and wire `onToggleExpand`/`onSelectField` (→ `select({ kind: 'field', datasetIndex, fieldIndex })`).
- [x] 3.3 Append metric nodes (`type: 'metric'`, `metricLanePosition`, id `metric:<name>`) to the semantic-model `nodes`, wiring click → `select({ kind: 'metric', metricIndex })`.
- [x] 3.4 Update `onNodeClick`/node-click handling so selecting a metric node opens the metric form and selecting a dataset node still opens the dataset form.

## 4. Wire into GraphView — unified layer

- [x] 4.1 Use `type: 'dataset'` for unified dataset nodes with field rows (via `datasetFieldsById(model, datasetNodeId)`) and expand state from `collapsed`, preserving the existing mapped/unmapped border styling.
- [x] 4.2 Append metric nodes to `unifiedNodes` using `metricLanePosition`, keyed `metric:<name>`.
- [x] 4.3 Extend `onUnifiedNodeClick` to handle `metric:` ids → `select({ kind: 'metric', metricIndex })`.

## 5. Expand-state persistence

- [x] 5.1 Confirm dataset expand/collapse uses the shared `collapsed` set keyed by the node's id in each layer, so it survives model reconciliation and layer switches (same mechanism as concept nodes and dragged positions).

## 6. Verify

- [x] 6.1 Run the web app's unit tests (`pnpm --filter web test` or repo equivalent) and ensure new/updated graph tests pass.
- [ ] 6.2 Manually load a semantic-model document: confirm dataset nodes show field counts, expand to selectable field rows that open the field form, and metric nodes show descriptions and open the metric form; repeat on the unified layer for an ontology document. _(Not done in-session — production build + typecheck + unit tests pass; browser walkthrough still recommended.)_
- [x] 6.3 Validate the change: `openspec validate graph-dataset-fields-metrics --strict` (or `openspec status --change graph-dataset-fields-metrics`).
