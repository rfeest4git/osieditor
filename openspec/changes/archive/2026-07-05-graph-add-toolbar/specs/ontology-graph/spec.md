## ADDED Requirements

### Requirement: Add-toolbar actions are contextual to the active layer
In the ontology and unified layers, the graph's add toolbar SHALL additionally expose adding a concept, and SHALL expose the nested semantic model's add actions (dataset, metric), so the user can grow either layer without leaving the graph. The toolbar SHALL show the actions relevant to the layer currently displayed.

#### Scenario: Add a concept from the ontology layer
- **WHEN** the ontology or unified layer is active and the user activates "Add concept"
- **THEN** a new concept is created, appears as a concept node, and is selected with its detail form open

#### Scenario: Layer-specific actions
- **WHEN** the user switches between the semantic-model, ontology, and unified layers
- **THEN** the toolbar shows the add actions relevant to that layer (concept actions in the ontology/unified layers; dataset/metric/relationship actions where a semantic model is present)

#### Scenario: Toolbar available on a non-empty ontology graph
- **WHEN** the ontology graph already contains at least one concept
- **THEN** the add toolbar remains visible so further concepts can be added without returning to the Navigator
