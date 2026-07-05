## ADDED Requirements

### Requirement: Persistent add toolbar in the graph
The graph view SHALL present a persistent toolbar that lets the user add a dataset, a metric, or a relationship, and this toolbar SHALL remain available regardless of whether the graph already contains nodes. Each add action SHALL select the newly created entity so its detail form opens for editing.

#### Scenario: Add a dataset when the graph is non-empty
- **WHEN** the graph already shows at least one dataset node and the user activates "Add dataset"
- **THEN** a new dataset is created, appears as a node, and is selected with its detail form open

#### Scenario: Add a metric from the graph
- **WHEN** the user activates "Add metric" from the graph toolbar
- **THEN** a new metric is created and selected with its detail form open, even though the metric is not drawn as a graph node

#### Scenario: Toolbar stays available after the empty state
- **WHEN** the first dataset is added and the empty state is replaced by the canvas
- **THEN** the add toolbar remains visible so further entities can be added without leaving the graph

### Requirement: Add relationship requires two datasets
The graph toolbar's "Add relationship" action SHALL be enabled only when the model has at least two datasets, and SHALL be disabled with an explanatory hint otherwise, consistent with drag-to-connect requiring a source and a target.

#### Scenario: Fewer than two datasets
- **WHEN** the model has zero or one dataset
- **THEN** the "Add relationship" action is disabled and indicates that two datasets are required

#### Scenario: Two or more datasets
- **WHEN** the model has at least two datasets and the user activates "Add relationship"
- **THEN** a new relationship is created and selected with its detail form open for specifying key columns
