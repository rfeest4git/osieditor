## MODIFIED Requirements

### Requirement: Import a Collibra DataAsset file

The system SHALL provide a dedicated import action, distinct from the OSI file import, that
lets a user open or upload a Collibra DataAsset `.yaml`, `.yml`, or `.json` file, convert it
into an OSI ontology document, and either load the result as the active model or, when a
document is already loaded, merge the converted entities into the current session.

#### Scenario: Import a valid DataAsset YAML

- **WHEN** a user imports a well-formed DataAsset `.yaml` file through the DataAsset import action and no document is loaded
- **THEN** the file is converted into an OSI ontology document and becomes the active model in the editor

#### Scenario: Import a valid DataAsset JSON

- **WHEN** a user imports a well-formed DataAsset `.json` file through the DataAsset import action and no document is loaded
- **THEN** the file is converted into an OSI ontology document and becomes the active model in the editor

#### Scenario: Dedicated action separate from OSI import

- **WHEN** a user views the import controls
- **THEN** the DataAsset import action is presented separately from the existing OSI file import so the two flows are not conflated

#### Scenario: Choose to add or replace when a document is loaded

- **WHEN** a user imports a DataAsset while an ontology document is already loaded
- **THEN** the system offers a choice to replace the active model or to add the DataAsset's entities to the current session, and honors the user's choice

## ADDED Requirements

### Requirement: Merge multiple DataAssets into one session

The system SHALL support importing more than one Collibra DataAsset into the same session
without creating a new session, by appending each additional DataAsset's converted
`EntityType` concepts and their attribute relationships to the ontology components of the
currently loaded ontology document rather than replacing it.

#### Scenario: Second DataAsset adds to the first

- **WHEN** a user has imported one DataAsset and imports a second DataAsset choosing to add it to the current session
- **THEN** the ontology retains the entities from the first DataAsset and gains the entities from the second DataAsset, all within the same active document

#### Scenario: Session identity is preserved on merge

- **WHEN** a DataAsset is merged into the current session
- **THEN** the active document is not reset to a new session (existing selection and graph content for the prior entities are preserved) and the document is marked as having unsaved changes

#### Scenario: Merge is only offered for a compatible active document

- **WHEN** the currently loaded document is an OSI ontology document
- **THEN** the add-to-session option is available; otherwise only replace is offered

### Requirement: Resolve concept-name collisions on merge

The system SHALL ensure that merging a DataAsset does not silently overwrite an existing
concept: when a converted entity's concept name collides with a concept already present in
the ontology, the system SHALL derive a unique concept name for the incoming entity and
update its relationship `verbalizes` templates to reference the uniquified name.

#### Scenario: Colliding entity name is uniquified

- **WHEN** a merged DataAsset produces an `EntityType` concept whose name matches a concept already in the ontology
- **THEN** the incoming concept is added under a unique name and its relationships reference that unique name, leaving the existing concept unchanged

#### Scenario: Non-colliding entity names are unchanged

- **WHEN** a merged DataAsset produces concepts whose names do not collide with existing concepts
- **THEN** those concepts are added using their original derived names

### Requirement: Accumulate preserved metadata across merged imports

The system SHALL accumulate the preserved DataAsset metadata (the `collibra-data-asset`
`custom_extensions` bag) across merged imports so metadata from an earlier import is not
discarded when a later DataAsset is added to the same session.

#### Scenario: Metadata from both DataAssets is retained

- **WHEN** a second DataAsset carrying non-mappable metadata is merged into a session that already has preserved metadata from a first DataAsset
- **THEN** the resulting document preserves the non-mappable metadata from both DataAssets rather than replacing the earlier metadata
