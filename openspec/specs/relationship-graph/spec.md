## Purpose
Render an ERD-style graph of datasets and relationships that stays in sync with the model and form editor, letting users create relationships by connecting nodes.

## Requirements

### Requirement: Visualize datasets and relationships as a graph
The system SHALL render an ERD-style graph in which each dataset is a node and each
relationship is a directed edge from its `from` dataset to its `to` dataset. The graph
SHALL render **every** relationship whose `from` and `to` datasets both exist as nodes, so
no connection between existing datasets is omitted.

#### Scenario: Render graph for a model
- **WHEN** a model with datasets and relationships is loaded
- **THEN** the graph shows one node per dataset and one edge per relationship connecting the correct datasets

#### Scenario: All connections shown
- **WHEN** a dataset participates in several relationships to other existing datasets
- **THEN** the graph renders an edge for every such relationship, with none omitted

#### Scenario: Empty model
- **WHEN** a model has no datasets
- **THEN** the graph view shows an empty state prompting the user to add a dataset

### Requirement: Create relationships by connecting nodes
The system SHALL let a user create a relationship by connecting one dataset node to another in the graph.

#### Scenario: Drag to connect
- **WHEN** a user connects a source dataset node to a target dataset node
- **THEN** a new relationship is created between them and the user is prompted to specify its key columns

### Requirement: Selection drives the detail form
The system SHALL keep the graph selection and the form editor in sync, so selecting a node or edge opens the corresponding entity's detail form.

#### Scenario: Select a node
- **WHEN** a user selects a dataset node in the graph
- **THEN** that dataset's detail form is shown

#### Scenario: Select an edge
- **WHEN** a user selects a relationship edge in the graph
- **THEN** that relationship's detail form is shown

### Requirement: Graph reflects model changes
The system SHALL keep the graph consistent with the model, so entities added, edited, or removed elsewhere are reflected in the graph.

#### Scenario: Deleted dataset removed from graph
- **WHEN** a dataset is deleted through the form editor
- **THEN** its node and any connected relationship edges are removed from the graph

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

### Requirement: View state persists across model changes and layer switches

The graph SHALL preserve view state that the user controls — node positions and, where a
node supports it, its expand/collapse state — across model reconciliation and switches
between the semantic-model and ontology layers, so the user does not lose their layout or
disclosure choices when the underlying model updates.

#### Scenario: Dragged positions persist after an edit

- **WHEN** a user drags nodes to arrange the graph and then edits the model elsewhere
- **THEN** the arranged node positions are preserved for nodes that still exist

#### Scenario: View state survives a layer switch

- **WHEN** a user switches from one graph layer to another and back
- **THEN** node positions and expand/collapse state from before the switch are restored
