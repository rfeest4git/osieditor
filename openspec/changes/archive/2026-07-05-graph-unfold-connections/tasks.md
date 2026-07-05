## 1. Ontology graph model (data derivation)

- [x] 1.1 In `ontologyGraph.ts`, add a graph-model builder that iterates every component's relationships and classifies each role: emit a concept edge for every role whose `concept` is a known concept node, and collect attribute entries `{ name, valueType, componentIndex, relationshipIndex }` for relationships with no concept-resolving role.
- [x] 1.2 Emit an edge per resolving role (not just the first), with stable ids `orel-<ci>-<ri>-<roleIndex>` that resolve back to a single `relationshipIndex` for selection.
- [x] 1.3 Return per-concept attribute lists keyed by concept node id so `GraphView` can attach them to nodes.
- [x] 1.4 Add/adjust unit tests in a graph helper test covering: multi-role relationships produce multiple edges, attribute relationships are collected (not dropped), and no relationship is omitted.

## 2. Expandable concept node

- [x] 2.1 Create a custom React Flow `ConceptNode` component under `apps/web/src/components/graph/` that shows the concept name/type, an attribute count affordance when collapsed, and a disclosure toggle.
- [x] 2.2 When expanded, render the attribute list inline (name → value type), each row selectable.
- [x] 2.3 Style the node with Porsche design-system tokens/components consistent with the rest of `GraphView`.

## 3. GraphView integration

- [x] 3.1 Register `nodeTypes` with the new `ConceptNode` and switch ontology nodes to it, passing `expanded`, `attributes`, and callbacks via node `data`.
- [x] 3.2 Add `expanded: Set<string>` state keyed by concept node id; wire the disclosure toggle to add/remove ids.
- [x] 3.3 Preserve `expanded` across model reconciliation and layer switches (same lifetime as the position `Map`).
- [x] 3.4 Wire attribute-row selection to `select({ kind: 'ontology-relationship', componentIndex, relationshipIndex })` so the detail form opens the underlying relationship.
- [x] 3.5 Keep concept-node click (concept selection), edge click (relationship selection), drag-to-connect, and mapping overlay working with the new node type.

## 4. Semantic-model "all connections"

- [x] 4.1 Confirm the ERD `edges` memo renders every relationship whose `from`/`to` datasets both exist; add a regression test asserting no such relationship is omitted.
- [x] 4.2 Add a test asserting dragged node positions persist across a model reconciliation.

## 5. Unified view (ontology linked to semantics)

- [x] 5.1 Attributes: mark identity attributes on `ConceptAttribute` (from `concept.identify_by`); render attributes inline in `ConceptNode`, default-expanded, with an identity marker; switch node state to a `collapsed` set so default is open.
- [x] 5.2 Helpers: add `datasetLanePosition` (bottom-lane layout) and give `buildSemanticEdges` an optional node-id mapper so join endpoints use `dataset:<name>` ids; unit-test the mapper and lane layout.
- [x] 5.3 Add a `unified` layer mode to `GraphView`, default it for ontology docs, and add a "Unified" toggle button.
- [x] 5.4 Build unified nodes: concept nodes (top lane) + all dataset nodes (bottom lane), positions preserved by id across reconciliation/switches.
- [x] 5.5 Build unified edges: ontology relationships (solid), concept→dataset mappings (dotted), dataset→dataset joins (dashed), visually distinct.
- [x] 5.6 Wire unified selection: concept, attribute→ontology-relationship, dataset, ontology edge→ontology-relationship, join edge→relationship; keep drag-to-connect working for both concepts and datasets.

## 6. Attribute vs. concept-reference classification

- [x] 6.1 Add `PRIMITIVE_VALUE_TYPES` and classify roles by value-type vs. concept reference so relationships to referenced (undeclared) concepts become edges, not attributes; return `referencedConcepts` from `buildOntologyGraphModel`.
- [x] 6.2 Render referenced concepts as dashed, non-selectable ghost nodes in the ontology and unified views.
- [x] 6.3 Detect foreign-key attributes from relationship `derived_by` and mark them (FK) alongside identity (ID) markers in `ConceptNode`.
- [x] 6.4 Unit-test referenced-concept edges and FK detection.

## 7. Verify

- [x] 7.1 Run `pnpm` lint/typecheck and the web app tests; fix failures.
- [ ] 7.2 Manually verify in the running app: an ontology document opens in the Unified view showing concepts + datasets; all ontology relationships (incl. to referenced/ghost concepts) render as edges; attributes show inline with ID/FK markers and unfold/collapse; selecting an attribute/dataset/edge opens the right detail form; positions and collapse state survive a view switch.
