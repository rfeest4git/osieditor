## MODIFIED Requirements

### Requirement: Import an Output Port file

The system SHALL provide a dedicated import action, distinct from the OSI file import and the
Data Asset import, that lets a user open or upload a data product Output Port `.yaml`, `.yml`,
or `.json` file, convert it into an OSI semantic-model document, and either load the result as
the active model or, when a document is already loaded, add the converted datasets to the
current model (the active semantic model, or an ontology document's nested semantic model).

#### Scenario: Import a valid Output Port YAML

- **WHEN** a user imports a well-formed Output Port `.yaml` file through the Output Port import action and no document is loaded
- **THEN** the file is converted into an OSI semantic-model document and becomes the active model in the editor

#### Scenario: Import a valid Output Port JSON

- **WHEN** a user imports a well-formed Output Port `.json` file through the Output Port import action and no document is loaded
- **THEN** the file is converted into an OSI semantic-model document and becomes the active model in the editor

#### Scenario: Dedicated action separate from other imports

- **WHEN** a user views the import controls
- **THEN** the Output Port import action is presented separately from the OSI file import and the Data Asset import so the flows are not conflated

#### Scenario: Choose to add or replace when a document is loaded

- **WHEN** a user imports an Output Port while a document (a semantic model, or an ontology) is already loaded
- **THEN** the system offers a choice to replace the current document or to add the converted Output Port's datasets to the current model, and honors the user's choice

## ADDED Requirements

### Requirement: Merge an Output Port into the current model

The system SHALL support adding an imported Output Port to the currently loaded document
without starting a new session, by appending the converted datasets of every output port in the
imported file to the datasets of the active semantic model — or, when an ontology document is
loaded, to the datasets of the ontology's active nested semantic model — rather than replacing
it. Merging SHALL preserve the existing model content (including an ontology's concepts,
relationships, and mappings), keep the document's session identity, and mark the document as
having unsaved changes.

#### Scenario: Added Output Port keeps existing datasets

- **WHEN** a user has a semantic model loaded and imports an Output Port choosing to add it to the current model
- **THEN** the model retains its existing datasets and gains a dataset for each table of the imported Output Port, all within the same active model

#### Scenario: All output ports in the file are added

- **WHEN** an imported Output Port file that defines more than one output port is added to the current model
- **THEN** the datasets from every output port in the file are appended to the active model

#### Scenario: Session identity is preserved on merge

- **WHEN** an Output Port is added to the current model
- **THEN** the active document is not reset to a new session (existing selection and graph layout for the prior datasets are preserved) and the document is marked as having unsaved changes

#### Scenario: Merge is offered for a semantic model or an ontology document

- **WHEN** the currently loaded document is an OSI semantic-model document or an ontology document
- **THEN** the add-to-model option is available; when no document is loaded the import loads (replaces) the converted Output Port directly

#### Scenario: Adding to an ontology preserves its concepts and mappings

- **WHEN** a user has an ontology document loaded and imports an Output Port choosing to add it to the current model
- **THEN** the Output Port's datasets are appended to the ontology's active nested semantic model and the ontology's concepts, relationships, and concept mappings are preserved

### Requirement: Resolve dataset-name collisions on merge

The system SHALL ensure that adding an Output Port does not silently overwrite an existing
dataset: when a converted dataset's name collides with a dataset already present in the active
model, or with another dataset added in the same merge, the system SHALL derive a unique name
for the incoming dataset so both datasets are retained.

#### Scenario: Colliding dataset name is uniquified

- **WHEN** an added Output Port produces a dataset whose name matches a dataset already in the active model
- **THEN** the incoming dataset is added under a unique name, leaving the existing dataset unchanged

#### Scenario: Non-colliding dataset names are unchanged

- **WHEN** an added Output Port produces datasets whose names do not collide with existing datasets
- **THEN** those datasets are added using their original names

### Requirement: Accumulate preserved metadata across merged imports

The system SHALL accumulate the preserved Output Port metadata (the `output-port`
`custom_extensions` bags) across merged imports so metadata from an earlier import is not
discarded when a later Output Port is added to the same model.

#### Scenario: Dataset metadata moves with the added dataset

- **WHEN** an Output Port whose tables carry preserved metadata is added to the current model
- **THEN** each added dataset retains its `output-port` metadata bag

#### Scenario: Port-level metadata from both imports is retained

- **WHEN** an Output Port carrying port-level metadata is added to a model that already has preserved Output Port metadata
- **THEN** the resulting model preserves the port-level metadata from both imports rather than replacing the earlier metadata
