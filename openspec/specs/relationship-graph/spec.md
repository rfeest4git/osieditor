## Purpose
Render an ERD-style graph of datasets and relationships that stays in sync with the model and form editor, letting users create relationships by connecting nodes.

## Requirements

### Requirement: Visualize datasets and relationships as a graph
The system SHALL render an ERD-style graph in which each dataset is a node and each relationship is a directed edge from its `from` dataset to its `to` dataset.

#### Scenario: Render graph for a model
- **WHEN** a model with datasets and relationships is loaded
- **THEN** the graph shows one node per dataset and one edge per relationship connecting the correct datasets

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
