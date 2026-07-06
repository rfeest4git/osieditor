## MODIFIED Requirements

### Requirement: Drag-to-connect ontology relationships

The graph SHALL support creating an ontology Relationship by dragging a connection
between two Concept nodes, consistent with the existing dataset drag-to-connect
behavior. A Concept node SHALL expose a connectable handle on each of its
attribute/field rows in addition to a node-level handle, so a drag may start and
end on a specific field. When a connection is completed, the created relationship
SHALL be **pre-populated** rather than empty:

- a role referencing the **target** Concept SHALL be added,
- a default `name` and a `verbalizes` template of the form
  `{Source} <Name> {Target}` SHALL be seeded,
- `multiplicity` SHALL default to `ManyToOne`,
- when the drag started and ended on specific fields, a `derived_by` join
  expression of the form `Source.<sourceField> == Target.<targetField>` SHALL be
  seeded from the two dragged fields.

When the drag is between concept node bodies (no fields involved), the
relationship SHALL still be created with the target role and verbalization seed,
and the `derived_by` join SHALL be left empty for the user to complete. In all
cases the new relationship SHALL be selected and opened for editing so the user
can refine the generated values.

#### Scenario: Create a relationship by dragging between fields

- **WHEN** the user drags a connection from a field on a source Concept node to a
  field on a target Concept node
- **THEN** a new ontology relationship is created with a role referencing the
  target concept, a seeded verbalization, and a `derived_by` join built from the
  two dragged fields, and it opens for editing

#### Scenario: Create a relationship by dragging between concept nodes

- **WHEN** the user drags a connection from one concept node body to another
  without selecting specific fields
- **THEN** a new ontology relationship is created between those concepts with the
  target role and verbalization seeded and an empty `derived_by`, and it opens for
  editing

#### Scenario: Generated relationship round-trips

- **WHEN** a relationship created by dragging between fields is exported
- **THEN** the exported document contains the relationship with its role,
  verbalization, multiplicity, and `derived_by` join expression
