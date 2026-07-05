## Why

OSIEditor today only understands the OSI **semantic_model** layer (datasets, fields,
FK relationships, metrics). Real OSI documents such as the reference `flights.yaml`
also carry the standard's **semantic layer** — an `ontology` block (Concepts and
ontology Relationships) and an `ontology_mappings` block that binds those concepts to
the physical model. Importing such a file today silently ignores or drops that half of
the standard, so the editor cannot faithfully represent, validate, or author a complete
OSI model. Supporting the ontology layer is what makes the tool a true OSI editor rather
than a semantic-model-only editor.

## What Changes

- Extend the OSI document model to represent the ontology layer:
  - **Concepts** — `EntityType` and `ValueType`, with `name`, `type`, `description`,
    `extends`, `derived_by`, `identify_by`, and `requires`.
  - **Ontology Relationships** — `name`, `description`, `multiplicity`
    (`ManyToOne` / `OneToOne`), `roles` (concept + optional role name), `verbalizes`
    (natural-language templates), `derived_by`, `requires`.
  - **Ontology Mappings** — `concept_mappings` with nested `object_mappings` and
    `link_mappings` (`referent_mappings` / `children` trees) that bind concepts and
    ontology relationships to semantic_model fields and expressions.
- Refresh the vendored OSI schema to a version that defines the ontology layer, and mirror
  it in the Zod model so ontology-bearing files **import, validate, and export with
  round-trip fidelity** (unknown fields still preserved via passthrough).
- Add authoring UI: form/tree editors for Concepts, ontology Relationships (multiplicity,
  roles, verbalizations), and concept mappings, integrated into the existing Navigator and
  EditorPane.
- Extend the relationship graph to render the ontology — Concept nodes, ontology
  relationship edges (verbalized), and drag-to-connect — alongside (or toggled with) the
  existing dataset ERD.
- Extend `/api/validate` diagnostics to cover ontology-level integrity (e.g. mapping
  references a concept/relationship/dataset that exists).

No breaking changes to existing semantic_model editing; the ontology layer is additive and
optional (documents without it behave exactly as today).

## Capabilities

### New Capabilities

- `ontology-model`: The ontology data model and its I/O — Zod schemas and types for
  Concepts, ontology Relationships, and ontology_mappings; parse/serialize/validate with
  round-trip fidelity; refreshed vendored schema.
- `ontology-editing`: Form/tree authoring of the ontology — create, edit, and delete
  Concepts, ontology Relationships (multiplicity, roles, verbalizations), and concept
  mappings, with live validation.
- `ontology-graph`: Visual representation of the ontology — Concept nodes and relationship
  edges in the graph, mapping links to datasets, and drag-to-connect editing.

### Modified Capabilities

<!-- None — openspec/specs/ is empty; this is the first set of specs. Existing
     semantic_model behavior is unchanged. -->

## Impact

- **`packages/osi-schema`**: `model.ts` (new ontology schemas + extended
  `OsiDocumentSchema`), `factory.ts` (constructors for concepts/relationships/mappings),
  `validation.ts` (ontology integrity checks), `vendor/osi-schema.json` + `VENDOR.md`
  (schema refresh), plus round-trip/validation tests.
- **`apps/api`**: `/api/validate` diagnostics extended for ontology references; import/export
  already pass documents through unchanged but must round-trip the new fields.
- **`apps/web`**: new editor components for concepts/ontology relationships/mappings, Navigator
  entries, EditorPane routing, and GraphView extension; editor store gains ontology state.
- **Dependencies**: none new expected (reuse Zod, React Flow). Risk: reconciling the
  vendored schema version — the current vendored `osi-schema.json` (v0.2.0.dev0) has no
  ontology definitions, so the authoritative ontology schema must be sourced from the OSI
  repo; version/shape reconciliation is called out in design.md.
