## ADDED Requirements

### Requirement: Import OSI files from JSON and YAML
The system SHALL let a user import an existing OSI file by opening or uploading a `.json`, `.yaml`, or `.yml` file, parse it into the in-app model, and load it as the active model.

#### Scenario: Import a valid JSON model
- **WHEN** a user imports a well-formed `.json` OSI file
- **THEN** the file is parsed into the in-app model and becomes the active model in the editor

#### Scenario: Import a valid YAML model
- **WHEN** a user imports a well-formed `.yaml` or `.yml` OSI file
- **THEN** the file is parsed into the in-app model and becomes the active model in the editor

#### Scenario: Format detected from content or extension
- **WHEN** a user imports a file
- **THEN** the system determines JSON vs YAML from the file extension or content and parses accordingly

### Requirement: Import error reporting
The system SHALL report parse and validation errors on import without discarding the user's current session unexpectedly.

#### Scenario: Malformed file
- **WHEN** an imported file is not valid JSON or YAML
- **THEN** the system shows a parse error describing the problem and does not replace the active model

#### Scenario: Schema-invalid file
- **WHEN** an imported file parses but violates the OSI schema
- **THEN** the system reports the validation errors and lets the user choose to load it anyway for correction or cancel

### Requirement: Export model to JSON or YAML
The system SHALL let a user export the current model as OSI in a chosen format (JSON or YAML) and download the result.

#### Scenario: Export as JSON
- **WHEN** a user exports the current model choosing JSON
- **THEN** the system serializes the model to OSI-compliant JSON and downloads it

#### Scenario: Export as YAML
- **WHEN** a user exports the current model choosing YAML
- **THEN** the system serializes the model to OSI-compliant YAML and downloads it

### Requirement: Round-trip fidelity
The system SHALL preserve model content across an import/export round trip, including `custom_extensions` and `ai_context` values it does not otherwise edit.

#### Scenario: Import then export preserves content
- **WHEN** a user imports a model and immediately exports it in the same format without edits
- **THEN** the exported model is semantically equivalent to the imported one, retaining custom extensions and ai_context
