## Context

The graph view lives in [GraphView.tsx](../../../apps/web/src/components/graph/GraphView.tsx) with edge/node derivation helpers in [ontologyGraph.ts](../../../apps/web/src/components/graph/ontologyGraph.ts). It renders two layers with React Flow (`@xyflow/react`): a semantic-model ERD and an ontology layer. Nodes/edges are **derived** from the store on every change; user-dragged positions are preserved by keying a `Map` on node id across reconciliations.

Two limitations motivate this change:

1. `buildOntologyEdges` picks only the **first** role that resolves to a known concept (`roles.map(r => r.concept).find(known.has)`), emitting at most one edge per relationship and dropping relationships whose roles are value types/primitives (attributes such as `id: String`). Those relationships are invisible and unreachable from the graph.
2. Concept nodes are flat labels. There is no way to unfold a concept to inspect its attributes without switching to the detail form.

The ontology data model (from [model.ts](../../../packages/osi-schema/src/model.ts)): an `OntologyComponent` has one `concept` and a `relationships[]` list. Each `OntologyRelationship` has `name`, `multiplicity?`, `verbalizes[]`, and `roles[]` where each `Role` has a `concept` (name) and optional `name`. A role is "attribute-like" when its `concept` is **not** the name of a concept node in the document (e.g. a primitive/value type like `String`, `Float`). Selection state already supports `concept` and `ontology-relationship` kinds in [editorStore.ts](../../../apps/web/src/store/editorStore.ts).

## Goals / Non-Goals

**Goals:**
- Provide a **Unified** view (default for ontology docs) that shows concepts + datasets together and links them: ontology relationships, concept→dataset mappings, and dataset joins all rendered at once and visually distinct.
- Render every ontology relationship: concept-to-concept relationships as edges; attribute relationships as unfoldable inline sub-elements of the owning concept.
- Concept nodes show attributes inline (name → value type) with identity markers, unfoldable and default-expanded.
- Persist expand/collapse state and node positions across model reconciliation and view switches.
- Guarantee the semantic-model ERD renders every relationship between existing datasets.

**Non-Goals:**
- No changes to `@osi-editor/osi-schema` types or persisted document shape.
- No new relationship *creation* affordances beyond existing drag-to-connect.
- No auto-layout / graph algorithm work beyond the existing grid placement.
- Not visualizing attributes for the semantic-model (dataset column) layer — attributes here are an ontology concept.

## Decisions

### 0. Unified view as a third layer mode, sharing one React Flow canvas
Extend the existing `layer` toggle (`semantic-model | ontology`) with `unified`, defaulting ontology docs to `unified`. The unified canvas renders both node kinds and all edge kinds:
- **Nodes**: concept nodes (custom `ConceptNode`, top lane) keyed `concept:<name>`, and dataset nodes (default node, bottom lane) keyed `dataset:<name>`. Positions are seeded into two lanes via `gridPosition` for concepts and a `datasetLanePosition` (grid + vertical offset) for datasets, then preserved by id like today.
- **Edges**: (a) ontology relationships from `buildOntologyGraphModel().edges` (solid/animated); (b) concept→dataset mapping links from `buildMappingLinks` (dotted); (c) dataset→dataset joins from `buildSemanticEdges` (dashed). `buildSemanticEdges` gains an optional node-id mapper so join endpoints resolve to the `dataset:<name>` ids used on the unified canvas.

*Alternative considered:* a separate bespoke component/route for the unified diagram. Rejected — reusing the existing canvas, selection sync, and derivation helpers keeps one code path and avoids drift. Focused single-layer views stay as-is.

### 0b. Attribute vs. concept-reference classification (value types vs. ghost nodes)
A relationship role is classified by its target rather than by "is it a declared concept". A role whose target is a built-in **value type** (`PRIMITIVE_VALUE_TYPES`: `String`, `Float`, `Integer`, …) is an **attribute**; any other named target is a **relationship edge**. This matters because concepts can be *referenced but not declared* (e.g. `Example_Flight`): the earlier "declared-only → edge, else → attribute" rule wrongly turned those references into attributes. Referenced-but-undeclared targets become **ghost nodes** (dashed, non-selectable) so every relationship has a visible endpoint. Foreign-key attributes are detected by scanning each relationship's `derived_by` for `<Owner>.<attr>` tokens and marking the matching attribute.

*Alternative considered:* infer value-ness from a declared `ValueType` concept list. Rejected — value types like `String`/`Float` are not declared as concepts in the documents, so a built-in primitive set is the reliable signal.

### 1. Classify relationships instead of taking the first role
Rewrite `buildOntologyEdges` (or add a sibling `buildOntologyGraphModel`) to iterate all of a component's relationships and split each into:
- **concept edges**: for every role whose `concept` is in the `known` concept-name set, emit an edge owner→role concept (a relationship with multiple concept roles thus yields multiple edges, all keyed by a stable `orel-<ci>-<ri>-<roleIndex>` id so selection maps back to the relationship).
- **attributes**: relationships with no concept-resolving role are attributes of the owner concept, carried in a per-concept `attributes[]` list with `{ name, valueType, componentIndex, relationshipIndex }`.

*Alternative considered:* keep first-role-only and add a separate attribute pass. Rejected — the "all connections" requirement needs every role edge, so a single classification pass is simpler and avoids double-scanning.

### 2. Custom React Flow node for expandable concepts
Introduce a custom node type (e.g. `ConceptNode`) registered via React Flow `nodeTypes`. Collapsed: shows concept name/type plus an attribute count badge and a disclosure toggle. Expanded: shows the attribute list inline. Clicking an attribute row fires selection of its `ontology-relationship`.

*Alternative considered:* render each attribute as its own React Flow child node + edge (like mapped-dataset nodes). Rejected as the default because a concept with many attributes explodes node/edge count and hurts readability; an inline expandable list keeps the canvas clean. (Could be offered later as an alternate style.) Inline is chosen; edges to attribute sub-nodes are not needed since containment is visual.

### 3. Collapse state lives in component state, keyed by concept id (default expanded)
Hold `collapsed: Set<string>` (concept node ids) in `GraphView`, toggled by the node's disclosure control. Tracking *collapsed* (rather than expanded) makes the default open with no seeding: a concept is expanded unless its id is in the set. Because ids are stable (`concept:<name>`), the set survives reconciliation and view switches exactly like the position `Map`. React Flow node `data` carries `expanded` (derived), `attributes`, and callbacks so the custom node stays presentational.

### 4. Selection wiring reuses existing kinds
Attribute selection reuses `{ kind: 'ontology-relationship', componentIndex, relationshipIndex }` — no store change. Node/edge click handlers already resolve these; attribute-row clicks call `select` directly with the carried indices.

### 5. Semantic-model "all connections"
The ERD `edges` memo already maps every relationship and filters to those whose `from`/`to` both exist. This already satisfies "render every relationship between existing datasets"; the spec formalizes it and we add a regression test rather than new logic. Position persistence is already implemented; the spec formalizes it.

## Risks / Trade-offs

- [Value-type name collision] A role `concept` could coincidentally match a real concept name and be misclassified as an edge instead of an attribute. → Acceptable: it *is* a concept reference by name; classification by "is it a known concept node" is the correct, data-driven rule.
- [Node height variance when expanded] Expanded concepts change size and may overlap neighbors. → Mitigation: expansion only affects the node's own footprint; users can drag to rearrange and positions persist. No auto-relayout in scope.
- [Selection ambiguity for multi-role edges] One relationship may now produce several edges. → Mitigation: all such edges select the same relationship; edge ids encode role index but resolve to one `relationshipIndex`.
- [Custom node styling with Porsche DS] The disclosure control must fit the existing design system. → Mitigation: reuse Porsche components/tokens already used in `GraphView`.

## Migration Plan

Pure additive UI change, no data migration. Ships behind no flag; the ontology layer simply gains disclosure toggles and more edges. Rollback is reverting the graph component changes — persisted documents are untouched.

## Open Questions

- Should collapsed concepts show the attribute count as a badge or a "▸ N attributes" row? (Leaning badge; finalize during implementation against the DS.)
- Should attribute sub-elements be searchable/selectable from the detail form side as well, or graph-only for now? (Graph-only in this change.)
