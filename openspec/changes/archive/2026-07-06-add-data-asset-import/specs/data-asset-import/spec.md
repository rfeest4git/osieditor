## ADDED Requirements

### Requirement: Import a Collibra DataAsset file

The system SHALL provide a dedicated import action, distinct from the OSI file import, that
lets a user open or upload a Collibra DataAsset `.yaml`, `.yml`, or `.json` file, convert it
into an OSI ontology document, and load the result as the active model.

#### Scenario: Import a valid DataAsset YAML

- **WHEN** a user imports a well-formed DataAsset `.yaml` file through the DataAsset import action
- **THEN** the file is converted into an OSI ontology document and becomes the active model in the editor

#### Scenario: Import a valid DataAsset JSON

- **WHEN** a user imports a well-formed DataAsset `.json` file through the DataAsset import action
- **THEN** the file is converted into an OSI ontology document and becomes the active model in the editor

#### Scenario: Dedicated action separate from OSI import

- **WHEN** a user views the import controls
- **THEN** the DataAsset import action is presented separately from the existing OSI file import so the two flows are not conflated

### Requirement: Detect DataAsset documents

The system SHALL recognize a Collibra DataAsset document by its top-level shape (an object
with an `entities` map and a `schemaVersion`) and reject inputs that are not DataAsset
documents without altering the active model.

#### Scenario: Recognized DataAsset shape

- **WHEN** an imported file has a top-level `entities` map and a `schemaVersion`
- **THEN** the system classifies it as a DataAsset and proceeds with conversion

#### Scenario: Non-DataAsset file rejected

- **WHEN** an imported file lacks the DataAsset shape (for example an OSI semantic-model or ontology document, or arbitrary JSON)
- **THEN** the system reports that the file is not a DataAsset and leaves the active model unchanged

### Requirement: Convert entities to EntityType concepts

The system SHALL convert each DataAsset entity into an OSI `EntityType` concept, preserving
the entity's display name and description and deriving a valid concept name from the entity
key.

#### Scenario: Entity becomes an EntityType concept

- **WHEN** a DataAsset defines an entity with a `displayName` and `description`
- **THEN** the resulting ontology contains an `EntityType` concept whose name derives from the entity key and whose description carries the entity's display name and description

#### Scenario: Multiple entities become multiple concepts

- **WHEN** a DataAsset defines more than one entity
- **THEN** the ontology contains one `EntityType` concept per entity, each as its own ontology component

### Requirement: Convert attributes to relationships on the entity concept

The system SHALL convert each attribute of a DataAsset entity into a `ManyToOne`
ontology relationship on the owning entity concept, whose single role targets a
predefined value type — `String` when the attribute declares no explicit type —
and SHALL generate a `verbalizes` template for the relationship. Attributes SHALL
NOT become their own concepts.

#### Scenario: Attribute becomes a relationship to a value type

- **WHEN** a DataAsset entity declares an attribute with a `displayName`
- **THEN** the owning entity concept gains a `ManyToOne` ontology relationship whose single role references a value type (`String` by default) and whose `verbalizes` template describes the link, and no separate concept is created for the attribute

#### Scenario: Declared attribute type is used when present

- **WHEN** an attribute declares an explicit type
- **THEN** the generated relationship's role targets that value type; otherwise it targets the predefined `String` value type

#### Scenario: Attribute description and example are retained

- **WHEN** an attribute declares a `description` and `example`
- **THEN** the attribute's relationship retains the description, and the example value is preserved in the converted model

### Requirement: Preserve DataAsset metadata

The system SHALL seed the ontology document `name` and `description` from the DataAsset's
`name` and `description`, and SHALL preserve DataAsset metadata that has no native OSI field
(such as `identifier`, `dataOwner`, `originApplication`, `tags`, and entity `classification`)
so it is not silently lost during conversion.

#### Scenario: Document name and description seeded

- **WHEN** a DataAsset with a `name` and `description` is converted
- **THEN** the resulting ontology document's `name` and `description` are derived from those DataAsset values

#### Scenario: Non-mappable metadata preserved

- **WHEN** a DataAsset carries fields with no native OSI equivalent (for example `identifier`, `dataOwner`, or entity `classification`)
- **THEN** those values are preserved on the converted document (for example via `custom_extensions` or `ai_context`) rather than discarded

### Requirement: DataAsset import error reporting

The system SHALL report conversion problems — a file that cannot be parsed, or a DataAsset
that is missing required fields — without discarding the user's current session
unexpectedly, and SHALL guard against replacing unsaved work.

#### Scenario: Malformed file

- **WHEN** an imported DataAsset file is not valid JSON or YAML
- **THEN** the system shows a parse error describing the problem and does not replace the active model

#### Scenario: DataAsset missing required fields

- **WHEN** a parsed DataAsset is missing required fields (for example `entities` or an entity's `displayName`)
- **THEN** the system reports the validation problems and lets the user choose to load the partial conversion or cancel

#### Scenario: Unsaved work is guarded

- **WHEN** the user triggers a DataAsset import while the current model has unsaved changes
- **THEN** the system asks the user to confirm before replacing the active model
