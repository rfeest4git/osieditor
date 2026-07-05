## MODIFIED Requirements

### Requirement: Author concept mappings

The editor SHALL let the user create and edit `concept_mappings` that bind a concept and
its relationships to the active map's semantic_model through **guided pickers**, exposing
the nested `object_mappings` and `link_mappings` structure. Where a mapping targets a
dataset expression, the editor SHALL let the user select a **Dataset** from the active
map's semantic model and then select a **Field** within that dataset, rather than typing a
raw `dataset.column` string. Where a mapping references a relationship (in
`referent_mappings` and `link_mappings`), the editor SHALL offer a dropdown of the ontology
relationships defined for the concept being mapped. The editor SHALL provide a
raw-expression fallback so a user can still enter a custom expression that no
dataset/field pair produces, and all edits SHALL round-trip on export without loss.

#### Scenario: Bind a concept to a dataset field via pickers

- **WHEN** the user maps a concept's identifier and selects a dataset and then a field from
  that dataset's fields
- **THEN** the corresponding `expression` is set from the chosen field, the mapping is saved
  under `ontology_mappings`, and it round-trips on export

#### Scenario: Field choices follow the selected dataset

- **WHEN** the user selects a dataset for an object or referent mapping
- **THEN** the field picker offers only the fields belonging to that dataset, and changing
  the dataset resets the field selection

#### Scenario: Relationship picker limited to the concept's relationships

- **WHEN** the user edits a `referent_mapping` or `link_mapping` relationship reference
- **THEN** the choices are limited to ontology relationships that involve the concept being
  mapped

#### Scenario: Raw-expression fallback

- **WHEN** the target expression cannot be expressed as a single dataset/field selection
- **THEN** the user can switch that mapping to a raw expression input and the entered text is
  preserved verbatim

## ADDED Requirements

### Requirement: Mapping expression reference validation

The editor SHALL surface live diagnostics for concept-mapping expressions that look like a bare
`dataset.field` reference but do not resolve against the active map's semantic model,
identifying the specific mapping node whose expression is broken. These diagnostics SHALL use
the same diagnostics surface as other ontology edits and SHALL appear at the offending field
rather than only at the mapping root. Hand-written SQL expressions (containing operators or
whitespace) SHALL NOT be flagged. A mapping's `relationship` reference SHALL NOT be validated
against the concept's declared relationships — OSI permits a mapping relationship name to
diverge from the declared relationship name, so the guided relationship picker steers authoring
without raising a diagnostic.

#### Scenario: Broken dataset or field reference

- **WHEN** a concept mapping expression is a bare `dataset.field` reference to a dataset or
  field that does not exist in the active map's semantic model
- **THEN** a warning diagnostic is shown at that mapping's expression input identifying the
  broken reference

#### Scenario: Raw SQL expression is not flagged

- **WHEN** a concept mapping expression is a hand-written SQL expression (e.g. `CAST(id AS
  VARCHAR)`) rather than a bare `dataset.field` reference
- **THEN** no reference diagnostic is raised for that expression
