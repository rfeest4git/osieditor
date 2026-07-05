## ADDED Requirements

### Requirement: Ontology document kind

The editor SHALL recognize the OSI ontology document as a distinct top-level document kind
(`{ version, name, ontology[], ontology_mappings? }`) separate from the semantic-model
document (`{ version, semantic_model[] }`). Import SHALL detect the kind from the top-level
keys. Each `ontology_mappings` entry nests a `semantic_model`; there is no top-level
`semantic_model` in an ontology document.

#### Scenario: Semantic-model document still opens

- **WHEN** a document with a top-level `semantic_model` array is imported
- **THEN** it is classified as a semantic-model document and behaves exactly as today

#### Scenario: Ontology document is recognized

- **WHEN** a document with a top-level `ontology` array is imported
- **THEN** it is classified as an ontology document and its concepts, ontology
  relationships, and ontology_mappings (including each map's nested `semantic_model`) are
  represented in the model

### Requirement: Concept representation

The model SHALL represent OSI Concepts with fields `name`, `type` (`EntityType` or
`ValueType`), and the optional fields `description`, `extends`, `derived_by`,
`identify_by`, and `requires`. A concept MUST have a `name` and a `type`.

#### Scenario: EntityType with an identifier

- **WHEN** an `EntityType` concept declares `identify_by`
- **THEN** the concept, its type, and its identifying fields are retained in the model

#### Scenario: Invalid concept type is rejected

- **WHEN** a concept declares a `type` other than `EntityType` or `ValueType`
- **THEN** validation reports a diagnostic identifying the offending concept

### Requirement: Ontology relationship representation

The model SHALL represent ontology Relationships with `name`, `multiplicity`
(`ManyToOne` or `OneToOne`), `roles` (each with a required `concept` and an optional role
`name`), and the optional fields `description`, `verbalizes`, `derived_by`, and
`requires`.

#### Scenario: Verbalized many-to-one relationship

- **WHEN** an ontology relationship with `multiplicity: ManyToOne`, two roles, and a
  `verbalizes` template is imported
- **THEN** the multiplicity, roles, and verbalization template are all retained

### Requirement: Ontology mappings representation

The model SHALL represent `ontology_mappings` as `concept_mappings`, each binding a
concept to physical data through nested `object_mappings` and `link_mappings`
(`referent_mappings` and `children` trees referencing relationships and expressions).

#### Scenario: Concept mapped to a dataset expression

- **WHEN** a concept mapping with `object_mappings` and `link_mappings` referencing
  dataset expressions is imported
- **THEN** the nested mapping structure is retained without loss

### Requirement: Ontology round-trip fidelity

Importing an ontology-bearing document and exporting it back to the same format SHALL
produce an equivalent document, preserving ontology fields including unknown/vendor keys.

#### Scenario: Round-trip of the reference example

- **WHEN** the reference `flights.yaml` (or an equivalent ontology-bearing document) is
  imported and then exported to YAML
- **THEN** the exported document is semantically equivalent to the input, with the
  ontology and ontology_mappings blocks intact
