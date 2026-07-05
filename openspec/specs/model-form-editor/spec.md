## Purpose
Provide a form-based editor for OSI models, letting users create, navigate, edit, and validate datasets, fields, metrics, and relationships with a live source preview and unsaved-change tracking.

## Requirements

### Requirement: Create a new empty model
The system SHALL let a user start a new, empty OSI model without importing a file.

#### Scenario: Start from scratch
- **WHEN** a user chooses to create a new model
- **THEN** the editor opens with an empty but valid model skeleton (named model with no datasets) ready for editing

### Requirement: Navigate model entities
The system SHALL provide a navigator (tree/sidebar) listing the model's datasets (with their fields), metrics, and relationships, and allow selecting any entity to edit it.

#### Scenario: Browse entities
- **WHEN** a model is loaded
- **THEN** the navigator lists all datasets, their fields, all metrics, and all relationships

#### Scenario: Select entity to edit
- **WHEN** a user selects an entity in the navigator
- **THEN** the detail form for that entity is shown

### Requirement: Create, edit, and delete entities via forms
The system SHALL let a user create, edit, and delete datasets, fields, metrics, and relationships through structured forms.

#### Scenario: Add a dataset
- **WHEN** a user adds a dataset and fills in its required fields
- **THEN** the dataset is added to the model and appears in the navigator

#### Scenario: Edit a field
- **WHEN** a user edits a field's properties, including its multi-dialect expressions
- **THEN** the changes are applied to the model

#### Scenario: Delete a metric
- **WHEN** a user deletes a metric
- **THEN** the metric is removed from the model and the navigator

### Requirement: Inline validation in forms
The system SHALL validate form input against the OSI schema and show inline errors, and SHALL surface model-level validation issues (e.g. dangling references, duplicate names).

#### Scenario: Required field missing
- **WHEN** a required field in a form is left empty
- **THEN** the form shows an inline validation error and blocks saving that entity

#### Scenario: Model-level issue surfaced
- **WHEN** an edit produces a model-level violation (such as a duplicate name or dangling relationship reference)
- **THEN** the editor surfaces the issue to the user

### Requirement: Live source preview
The system SHALL display a live source preview of the current model in JSON or YAML that reflects edits.

#### Scenario: Preview updates on edit
- **WHEN** a user changes the model through a form
- **THEN** the source preview updates to reflect the current serialized model

### Requirement: Unsaved-change tracking
The system SHALL track whether the active model has unsaved changes and warn before actions that would discard them.

#### Scenario: Warn on discard
- **WHEN** a user with unsaved changes tries to import a new file or create a new model
- **THEN** the system warns that unsaved changes will be lost and requires confirmation
