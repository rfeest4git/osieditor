## MODIFIED Requirements

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

## ADDED Requirements

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
