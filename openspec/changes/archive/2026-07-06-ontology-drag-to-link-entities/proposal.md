## Why

Today a user can only link two ontology EntityTypes by dragging between whole
concept nodes, which produces an empty relationship they must fill in by hand in
the detail form. Modellers think in terms of the *fields* that join two entities
(e.g. a shared `vehicleIdentificationNumberVin`), so the graph should let them
express a relationship the same way they reason about it — by dragging from a
field on one entity to a field on another — and have the editor pre-fill the
relationship, its roles, and the join.

## What Changes

- Concept nodes expose a **connectable handle on each attribute/field row**, so a
  drag can start and end on a specific field rather than only on the node body.
- Dragging from a field on a source EntityType to a field on a target EntityType
  creates a new ontology Relationship that is **pre-populated**, not empty:
  - a role referencing the **target** concept,
  - a default `name` and a `verbalizes` template of the form
    `{Source} Source_Name_Target {Target}`,
  - a `multiplicity` default (`ManyToOne`),
  - a `derived_by` join expression built from the two dragged fields, e.g.
    `Source.<sourceField> == Target.<targetField>`.
- The newly created relationship is selected and opened in the detail form so the
  user can refine the generated name, verbalization, or join.
- Dragging between concept nodes (body-to-body, no field) continues to work and
  still creates a relationship; when no fields are involved, the `derived_by`
  join is left empty for the user to complete.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `ontology-graph`: The drag-to-connect requirement is extended so a relationship
  can be created by dragging between **attribute/field handles** on two Concept
  nodes, and the created relationship is **pre-populated** with the target role
  and a `derived_by` join derived from the dragged fields, rather than being
  created empty.

## Impact

- `apps/web/src/components/graph/ConceptNode.tsx`: add per-field connectable
  handles and field identifiers.
- `apps/web/src/components/graph/ontologyGraph.ts`: carry field/attribute
  identity needed to resolve a dragged connection to concrete fields.
- `apps/web/src/components/graph/GraphView.tsx`: `onOntConnect` resolves source
  and target concepts and fields and creates the pre-populated relationship.
- `apps/web/src/store/editorStore.ts`: extend the relationship-creation action to
  accept a target concept and an optional `derived_by` join / verbalization seed.
- `packages/osi-schema/src/factory.ts`: extend/point-at the relationship factory
  so seeded roles, verbalization, and `derived_by` are produced consistently.
- No changes to the OSI file schema or round-trip behavior — only how a
  relationship is authored via the graph.
