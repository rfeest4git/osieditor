## Purpose
Define the canonical typed representation of an OSI semantic model and the schema, referential-integrity, and uniqueness validation rules applied to it.

## Requirements

### Requirement: Canonical OSI model representation
The system SHALL represent an OSI semantic model in memory using typed schemas that mirror the OSI core spec: a root Semantic Model containing `datasets`, optional `metrics`, optional `relationships`, and optional `custom_extensions`; each dataset containing optional `fields`; and fields/metrics carrying multi-dialect `expression` objects.

#### Scenario: Model exposes spec entities
- **WHEN** a Semantic Model is constructed in the app
- **THEN** it exposes datasets, metrics, and relationships as typed collections, and each dataset exposes its fields

#### Scenario: Multi-dialect expression
- **WHEN** a field or metric defines an expression
- **THEN** the expression holds an array of `{ dialect, expression }` entries where `dialect` is one of the OSI-supported dialects (e.g. ANSI_SQL, SNOWFLAKE, MDX, TABLEAU, DATABRICKS, MAQL)

### Requirement: Schema validation of required fields
The system SHALL validate a model against the OSI schema and report every violation of required-field constraints, identifying the offending entity.

#### Scenario: Missing required dataset field
- **WHEN** a dataset is missing its required `name` or `source`
- **THEN** validation fails and returns an error naming the dataset and the missing field

#### Scenario: Valid model passes
- **WHEN** a model satisfies all required-field constraints
- **THEN** validation reports no errors

### Requirement: Referential integrity validation
The system SHALL validate that relationships reference existing datasets and that key column arrays are consistent.

#### Scenario: Dangling relationship reference
- **WHEN** a relationship's `from` or `to` names a dataset that does not exist in the model
- **THEN** validation fails with an error identifying the relationship and the missing dataset

#### Scenario: Mismatched key arity
- **WHEN** a relationship's `from_columns` and `to_columns` arrays have different lengths
- **THEN** validation fails with an error identifying the relationship

### Requirement: Uniqueness validation
The system SHALL enforce that entity names are unique within their scope.

#### Scenario: Duplicate dataset name
- **WHEN** two datasets share the same `name`
- **THEN** validation fails with a duplicate-name error

#### Scenario: Duplicate field name within a dataset
- **WHEN** two fields in the same dataset share the same `name`
- **THEN** validation fails with a duplicate-name error naming the dataset
