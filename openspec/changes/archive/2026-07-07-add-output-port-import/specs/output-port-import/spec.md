## ADDED Requirements

### Requirement: Import an Output Port file

The system SHALL provide a dedicated import action, distinct from the OSI file import and the
Data Asset import, that lets a user open or upload a data product Output Port `.yaml`, `.yml`,
or `.json` file, convert it into an OSI semantic-model document, and load the result as the
active model.

#### Scenario: Import a valid Output Port YAML

- **WHEN** a user imports a well-formed Output Port `.yaml` file through the Output Port import action and no document is loaded
- **THEN** the file is converted into an OSI semantic-model document and becomes the active model in the editor

#### Scenario: Import a valid Output Port JSON

- **WHEN** a user imports a well-formed Output Port `.json` file through the Output Port import action and no document is loaded
- **THEN** the file is converted into an OSI semantic-model document and becomes the active model in the editor

#### Scenario: Dedicated action separate from other imports

- **WHEN** a user views the import controls
- **THEN** the Output Port import action is presented separately from the OSI file import and the Data Asset import so the flows are not conflated

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
