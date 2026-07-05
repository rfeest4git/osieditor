## ADDED Requirements

### Requirement: Render the ontology in the graph

The graph SHALL render ontology Concepts as nodes and ontology Relationships as edges.
Relationship edges SHALL indicate their multiplicity and, when present, display or expose
their verbalization.

#### Scenario: Concepts and relationships appear as a graph

- **WHEN** a document with concepts and ontology relationships is loaded
- **THEN** each concept renders as a node and each relationship renders as an edge between
  the concepts named by its roles

#### Scenario: Empty ontology

- **WHEN** a document has no concepts
- **THEN** the ontology graph shows an empty state rather than an error

### Requirement: Distinguish ontology and semantic-model views

The graph SHALL let the user view the ontology layer separately from the existing dataset
ERD, so the two layers do not visually collide.

#### Scenario: Toggle between layers

- **WHEN** the user switches the graph between the semantic-model view and the ontology
  view
- **THEN** the graph shows the selected layer's nodes and edges

### Requirement: Drag-to-connect ontology relationships

The graph SHALL support creating an ontology Relationship by dragging a connection between
two Concept nodes, consistent with the existing dataset drag-to-connect behavior.

#### Scenario: Create a relationship by dragging

- **WHEN** the user drags a connection from one concept node to another
- **THEN** a new ontology relationship is created between those concepts and opens for
  editing

### Requirement: Show mapping links to datasets

The graph SHALL make it possible to see which semantic_model datasets a concept is mapped
to via its concept mappings.

#### Scenario: Concept mapped to a dataset

- **WHEN** a concept has a mapping bound to a dataset
- **THEN** the graph conveys the link between the concept and that dataset
