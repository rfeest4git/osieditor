## Purpose
Enable authoring of OSI ontology content in the editor, letting users create and edit concepts, ontology relationships, and concept mappings with live validation.

## Requirements

### Requirement: Author concepts

The editor SHALL let the user create, edit, and delete ontology Concepts. The concept
form SHALL expose `name`, `type` (`EntityType` / `ValueType`), `description`,
`identify_by`, `extends`, `derived_by`, and `requires`. Concepts SHALL be reachable from
the Navigator alongside datasets.

#### Scenario: Create a concept

- **WHEN** the user adds a new concept and sets its name and type
- **THEN** the concept appears in the Navigator and in the exported document's `ontology`
  block

#### Scenario: Delete a concept

- **WHEN** the user deletes a concept
- **THEN** the concept is removed from the model and the deletion is confirmed if the
  concept is referenced by a relationship or mapping

### Requirement: Author ontology relationships

The editor SHALL let the user create, edit, and delete ontology Relationships. The form
SHALL expose `name`, `multiplicity` (`ManyToOne` / `OneToOne`), `roles` (each selecting a
`concept` and an optional role name), `verbalizes` templates, `derived_by`, and
`requires`.

#### Scenario: Define a verbalized relationship

- **WHEN** the user creates a relationship, selects its multiplicity, adds two roles
  referencing existing concepts, and enters a verbalization template
- **THEN** the relationship is saved with its multiplicity, roles, and verbalization

#### Scenario: Role must reference a known concept

- **WHEN** the user selects a role concept
- **THEN** the choices are limited to concepts that exist in the model

### Requirement: Author concept mappings

The editor SHALL let the user create and edit `concept_mappings` that bind a concept and
its relationships to semantic_model expressions, exposing the nested `object_mappings` and
`link_mappings` structure.

#### Scenario: Bind a concept to a dataset expression

- **WHEN** the user maps a concept's identifier to a dataset field expression
- **THEN** the mapping is saved under `ontology_mappings` and round-trips on export

### Requirement: Live validation of ontology edits

The editor SHALL surface ontology diagnostics live while editing, using the same
diagnostics surface as the semantic_model editor.

#### Scenario: Mapping references a missing concept

- **WHEN** a concept mapping references a concept that no longer exists
- **THEN** a diagnostic is shown identifying the broken reference
