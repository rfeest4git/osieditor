# output-port-import Specification

## Purpose
TBD - created by archiving change add-output-port-import. Update Purpose after archive.
## Requirements
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

### Requirement: Detect Output Port documents

The system SHALL recognize a data product Output Port document by its top-level shape (an
object with an `outputPorts` array and a `schemaVersion`) and reject inputs that are not
Output Port documents without altering the active model.

#### Scenario: Recognized Output Port shape

- **WHEN** an imported file has a top-level `outputPorts` array and a `schemaVersion`
- **THEN** the system classifies it as an Output Port and proceeds with conversion

#### Scenario: Non-Output-Port file rejected

- **WHEN** an imported file lacks the Output Port shape (for example an OSI semantic-model or ontology document, a Collibra DataAsset, or arbitrary JSON)
- **THEN** the system reports that the file is not an Output Port and leaves the active model unchanged

### Requirement: Convert output ports to semantic models

The system SHALL convert each `outputPort` entry into an OSI semantic model, seeding the
model's `name` from the output port `name` and its `description` from the output port
`description`.

#### Scenario: Output port becomes a semantic model

- **WHEN** an Output Port file defines an output port with a `name` and `description`
- **THEN** the resulting document contains a semantic model whose `name` and `description` derive from that output port

#### Scenario: Multiple output ports become multiple semantic models

- **WHEN** an Output Port file defines more than one output port
- **THEN** the resulting document contains one semantic model per output port, and the first output port's model is the active model

### Requirement: Convert tables to datasets

The system SHALL convert each `table` of an output port into an OSI dataset on the owning
output port's semantic model, deriving the dataset `name` from the table name, composing the
dataset `source` from the table's `database`, `schema`, and `table` values, and preserving the
table `description`. Dataset names that collide within one model SHALL be made unique.

#### Scenario: Table becomes a dataset

- **WHEN** an output port declares a table with a `description`
- **THEN** the owning semantic model gains a dataset whose `name` derives from the table and whose `description` carries the table description

#### Scenario: Dataset source composed from qualified table name

- **WHEN** a table declares `database`, `schema`, and `table`
- **THEN** the dataset `source` is the qualified name composed from those parts (for example `dev.VEH_PVH_VEH_DATA_AS.DP_PVH_CONSOLIDATED_MASTER`)

#### Scenario: Table without fields yields a dataset with no fields

- **WHEN** an output port declares a table that has no `fields`
- **THEN** the conversion still produces a dataset for that table, with an empty field list

#### Scenario: Colliding dataset names are uniquified

- **WHEN** two tables in the same output port derive the same dataset name
- **THEN** each becomes its own dataset under a unique name so neither overwrites the other

### Requirement: Convert fields to dataset fields

The system SHALL convert each `field` of a table into an OSI field on the corresponding
dataset, deriving the field `name` from the source field, and seeding a default single-dialect
`expression` from the field name so the converted model satisfies the OSI schema. A field whose
declared `type` is a date or timestamp SHALL be marked as a time dimension.

#### Scenario: Field becomes a dataset field

- **WHEN** a table declares a field with a `name`
- **THEN** the owning dataset gains a field with that name

#### Scenario: Field expression defaults to the column name

- **WHEN** a field is converted and declares no expression of its own
- **THEN** the resulting field carries a single-dialect expression referencing the column name so the model is valid

#### Scenario: Temporal field marked as time dimension

- **WHEN** a field declares a `type` of `date` or `timestamp`
- **THEN** the resulting field is marked as a time dimension

### Requirement: Preserve Output Port metadata

The system SHALL preserve Output Port information that has no native OSI field so it is not
silently lost during conversion, including the output port `identifier` and `platform`, each
table's `identifier`, `database`, `schema`, and `type`, and each field's `type`,
`entityAttribute`, and `filterRuleReference`.

#### Scenario: Non-mappable table and port metadata preserved

- **WHEN** an Output Port carries fields with no native OSI equivalent (for example the output port `platform`, or a table `identifier`, `database`, `schema`, and `type`)
- **THEN** those values are preserved on the converted model (for example via `custom_extensions`) rather than discarded

#### Scenario: Field entityAttribute retained

- **WHEN** a field declares an `entityAttribute` linking it to an ontology entity attribute
- **THEN** the converted field preserves the `entityAttribute` value (along with the field `type` and any `filterRuleReference`) rather than discarding it

### Requirement: Output Port import error reporting

The system SHALL report conversion problems — a file that cannot be parsed, or an Output Port
that is missing required fields — without discarding the user's current session unexpectedly,
and SHALL guard against replacing unsaved work.

#### Scenario: Malformed file

- **WHEN** an imported Output Port file is not valid JSON or YAML
- **THEN** the system shows a parse error describing the problem and does not replace the active model

#### Scenario: Output Port missing required fields

- **WHEN** a parsed Output Port is missing required fields (for example `outputPorts` or a table's name)
- **THEN** the system reports the validation problems and lets the user choose to load the partial conversion or cancel

#### Scenario: Unsaved work is guarded

- **WHEN** the user triggers an Output Port import while the current model has unsaved changes
- **THEN** the system asks the user to confirm before replacing the active model

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

