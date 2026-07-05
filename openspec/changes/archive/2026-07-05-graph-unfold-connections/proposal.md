## Why

The relationship graph only conveys a fraction of a document's structure. In the ontology layer, each concept renders as a node but the graph draws just **one** edge per relationship — to the first role whose target is itself a concept node — and silently drops every relationship whose roles point at value types or primitives (e.g. `id: String`, `price: Float`). Those dropped relationships are exactly a concept's *attributes*, so users can neither see nor reach them from the graph. There is also no way to expand a concept to inspect its sub-elements without leaving the graph for the detail form. Users want a graph that shows **all** connections and lets them unfold sub-elements (like attributes) on demand.

- Add a **Unified** graph view (the new default for ontology documents) that shows the ontology **linked to** the semantics in one picture: concept nodes (top) with their attributes, dataset nodes (bottom), and **all three connection kinds at once** — concept→concept ontology relationships, concept→dataset `concept_mappings` links, and dataset→dataset shared-key joins. The existing Semantic-only and Ontology-only views remain as focused toggles.
- Render **every** ontology relationship, not just the first concept-to-concept one. Relationships whose roles resolve to concept nodes connect those nodes; relationships to value types/primitives (attributes) become unfoldable sub-elements of their owning concept.
- Concept nodes list their **attributes inline** (name → value type), ERD-style, marking identity attributes (from `identify_by`). Attributes are **unfoldable** — each concept can be collapsed/expanded, default expanded — and selecting an attribute opens its underlying relationship in the detail form.
- Distinguish the three edge kinds visually (ontology relationship / mapping link / shared-key join) and let node positions and expand/collapse state persist across model reconciliation and view switches.
- Guarantee "show all connections": no relationship between existing datasets is omitted from the ERD, and no concept relationship is dropped.
- Keep drag-to-connect and selection sync intact across the views.

## Capabilities

### New Capabilities
<!-- None; this extends existing graph capabilities. -->

### Modified Capabilities
- `ontology-graph`: Adds a Unified view that renders concepts and datasets together with all three connection kinds (ontology relationships, concept→dataset mappings, dataset joins); renders all of a concept's relationships (not only the first concept-to-concept role); and lets users unfold a concept's inline attributes, selecting them to edit the underlying relationship.
- `relationship-graph`: The graph must render every relationship between existing datasets, and node positions / expand state persist across model changes and view switches.

## Impact

- `apps/web/src/components/graph/ontologyGraph.ts` — edge derivation emits all ontology edges, classifies attributes (with identity marking), and provides a combined unified edge/lane layout helper; `buildSemanticEdges` gains a node-id mapper for the unified canvas.
- `apps/web/src/components/graph/GraphView.tsx` — new Unified view mode (default for ontology docs), combined nodes/edges, expand/collapse state, and selection wiring across concepts, attributes, datasets, and all edge kinds.
- `apps/web/src/components/graph/ConceptNode.tsx` — inline attribute list (default expanded) with identity markers.
- Selection model in `apps/web/src/store/editorStore.ts` is reused (concept / ontology-relationship / dataset / relationship selections); no schema changes to `@osi-editor/osi-schema`.
