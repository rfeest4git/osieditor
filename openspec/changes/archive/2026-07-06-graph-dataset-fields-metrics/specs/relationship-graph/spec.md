## ADDED Requirements

### Requirement: Dataset nodes expose their fields

Each dataset node in the graph SHALL present the dataset's fields as an expandable, selectable list. Collapsed, the node SHALL show the dataset name and a count of its fields; expanded, it SHALL list each field with its name and, when present, its label or type detail. A dataset with no fields SHALL render without an expand affordance. Selecting a field row SHALL open that field's detail form.

#### Scenario: Field count shown when collapsed

- **WHEN** a dataset node with one or more fields is rendered collapsed
- **THEN** the node shows the dataset name and the number of its fields

#### Scenario: Fields listed when expanded

- **WHEN** the user expands a dataset node
- **THEN** the node lists every field of that dataset as a row showing the field name

#### Scenario: Select a field from the node

- **WHEN** the user selects a field row inside an expanded dataset node
- **THEN** that field's detail form is shown

#### Scenario: Dataset with no fields

- **WHEN** a dataset has no fields
- **THEN** its node renders the dataset name with no expand affordance

### Requirement: Metrics are rendered as graph nodes

The graph SHALL draw each metric of the active model as a node that displays the metric name and its description. Selecting a metric node SHALL open that metric's detail form. Because a metric is not tied to a single dataset, metric nodes SHALL be placed distinctly from dataset nodes and SHALL NOT be required to connect to any edge.

#### Scenario: Metric node shows description

- **WHEN** a model with metrics is loaded
- **THEN** the graph draws one node per metric showing the metric name and its description

#### Scenario: Metric without a description

- **WHEN** a metric has no description
- **THEN** its node still renders showing the metric name

#### Scenario: Select a metric node

- **WHEN** the user selects a metric node in the graph
- **THEN** that metric's detail form is shown

## MODIFIED Requirements

### Requirement: Persistent add toolbar in the graph
The graph view SHALL present a persistent toolbar that lets the user add a dataset, a metric, or a relationship, and this toolbar SHALL remain available regardless of whether the graph already contains nodes. Each add action SHALL select the newly created entity so its detail form opens for editing.

#### Scenario: Add a dataset when the graph is non-empty
- **WHEN** the graph already shows at least one dataset node and the user activates "Add dataset"
- **THEN** a new dataset is created, appears as a node, and is selected with its detail form open

#### Scenario: Add a metric from the graph
- **WHEN** the user activates "Add metric" from the graph toolbar
- **THEN** a new metric is created, appears as a metric node, and is selected with its detail form open

#### Scenario: Toolbar stays available after the empty state
- **WHEN** the first dataset is added and the empty state is replaced by the canvas
- **THEN** the add toolbar remains visible so further entities can be added without leaving the graph

### Requirement: View state persists across model changes and layer switches

The graph SHALL preserve view state that the user controls — node positions and, where a
node supports it, its expand/collapse state — across model reconciliation and switches
between the semantic-model and ontology layers, so the user does not lose their layout or
disclosure choices when the underlying model updates. This SHALL include the expand/collapse
state of dataset nodes.

#### Scenario: Dragged positions persist after an edit

- **WHEN** a user drags nodes to arrange the graph and then edits the model elsewhere
- **THEN** the arranged node positions are preserved for nodes that still exist

#### Scenario: View state survives a layer switch

- **WHEN** a user switches from one graph layer to another and back
- **THEN** node positions and expand/collapse state from before the switch are restored

#### Scenario: Dataset expand state persists after an edit

- **WHEN** a user expands a dataset node and then edits the model elsewhere
- **THEN** the dataset node remains expanded after the graph reconciles
