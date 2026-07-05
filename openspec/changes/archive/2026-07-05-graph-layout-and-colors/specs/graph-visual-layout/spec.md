## ADDED Requirements

### Requirement: Nodes do not overlap on first render

The graph SHALL place nodes at initial positions that account for each node's estimated
rendered width AND height, so that no two nodes overlap when a model is first shown in any
layer (semantic-model, ontology, or unified). This applies to variable-size nodes (dataset and
concept nodes rendered expanded with their field/attribute rows, whose height is NOT capped —
a 50-field node is placed as the tall node it is) as well as fixed-size nodes (metrics, ghost
concepts). Nodes are packed left-to-right into shelf rows that wrap, and each row clears the
tallest node of the row above it.

#### Scenario: Expanded nodes are spaced by their width and height

- **WHEN** a model with multiple datasets or concepts is first rendered and the nodes are
  shown expanded with their field/attribute lists, including one node far taller than the rest
- **THEN** each node is positioned so its bounding box does not intersect any other node's
  bounding box, horizontally or vertically

#### Scenario: Metrics and ghost concepts do not collide with content nodes

- **WHEN** a model containing datasets/concepts plus metrics and/or referenced-but-undeclared
  (ghost) concepts is first rendered
- **THEN** every metric and ghost node is placed clear of the dataset and concept nodes

### Requirement: Manual arrange using measured node sizes

The graph SHALL provide an on-canvas "Arrange" control in every layer that repositions all
nodes into a non-overlapping layout computed from each node's REAL measured size (not an
estimate). The same measured arrange SHALL also run automatically once per layer, the first
time that layer's nodes have been measured, so the initial view is clean without user action.
After that automatic pass the layout SHALL NOT be recomputed on its own — re-running it is the
user's explicit choice via the control.

#### Scenario: User triggers a re-arrange

- **WHEN** the user clicks the "Arrange" control after nodes have been added, expanded, or
  dragged into an overlapping mess
- **THEN** every node is repositioned so no two nodes overlap, using their current rendered
  sizes, and the view reframes to fit them

#### Scenario: Automatic first-time arrange does not fight the user

- **WHEN** the user has already arranged or dragged nodes in a layer and then switches away and
  back to that layer
- **THEN** the automatic arrange does not run again and the user's positions are preserved

### Requirement: Initial layout does not override user-arranged positions

The height-aware layout SHALL only supply the initial position for a node that has no
remembered position. A node whose position the user has dragged, or which already had a
position before a model change or layer switch, SHALL keep that position.

#### Scenario: Dragged position survives a re-layout

- **WHEN** the user drags a node to a new position and then the model changes or the user
  switches layers and back
- **THEN** the node stays at the user-chosen position and only newly appearing nodes receive a
  computed initial position

### Requirement: Unified view keeps element kinds in separated bands

In the unified layer the graph SHALL keep concepts, datasets, and metrics in visually
separated horizontal bands, and the band boundaries SHALL flex with node height so that a tall
node in one band does not overlap nodes in an adjacent band.

#### Scenario: Bands stay clear when a band contains tall nodes

- **WHEN** the unified view renders concepts with many attributes above datasets with many
  fields above metrics
- **THEN** the concept band, dataset band, and metric band do not overlap each other

### Requirement: Element kinds are color-coded

Each graph element kind — concept, dataset, metric, and referenced/ghost concept — SHALL carry
a distinct, consistent color accent on its node so the kind is recognizable at a glance. The
node accents SHALL be consistent with the edge colors already used for ontology relationships,
concept→dataset mappings, and dataset joins in the unified view.

#### Scenario: A user distinguishes element kinds by color

- **WHEN** a graph containing more than one element kind is rendered
- **THEN** concepts, datasets, and metrics are each shown with their own color accent, and two
  nodes of different kinds are visually distinguishable by color

#### Scenario: Selection remains visible over the type color

- **WHEN** a node of any kind is selected
- **THEN** the selection indicator remains clearly visible and is not masked by the node's
  type color accent

### Requirement: Dataset and concept descriptions are always shown

A dataset node and a concept node SHALL always display their description text (when the model
provides one), independent of whether the node's field/attribute list is expanded or collapsed.

#### Scenario: Description is visible on a collapsed node

- **WHEN** a dataset or concept that has a description is rendered with its field/attribute list
  collapsed
- **THEN** its description text is still shown on the node

### Requirement: Domain regions are drawn behind the graph

The graph SHALL draw a labelled, tinted background region behind each domain present in the
current layer — an "Ontology" region enclosing the concept nodes and a "Semantic model" region
enclosing the dataset and metric nodes — coloured to match the concept (cobalt) and dataset
(teal) accents. The regions SHALL pan and zoom with the canvas, sit behind the nodes and edges,
and follow the nodes as they are arranged or dragged.

#### Scenario: Both ranges are boxed in the unified view

- **WHEN** the unified view renders concepts above datasets and metrics
- **THEN** a labelled "Ontology" box encloses the concepts and a labelled "Semantic model" box
  encloses the datasets and metrics, each behind its nodes

#### Scenario: A region follows its nodes

- **WHEN** the user arranges or drags the nodes of a domain
- **THEN** that domain's region box moves and resizes to keep enclosing them

### Requirement: Connection lines avoid crossing nodes

The layout SHALL leave enough vertical space between bands, and route connection edges
orthogonally (not as diagonal curves), so that connection lines do not cut across unrelated
nodes on first render.

#### Scenario: Cross-band edges route in the gap

- **WHEN** an edge connects a node in one band to a node in another band
- **THEN** the edge routes through the gutter between the bands rather than diagonally across
  intervening nodes

### Requirement: Returning to a layer reframes the view

Switching back to a previously visited layer SHALL reframe the viewport to fit that layer's
nodes, rather than leaving the pan/zoom of the layer viewed just before.

#### Scenario: Switching back fits the layer

- **WHEN** the user views one layer, switches to another, then switches back
- **THEN** the returned-to layer's nodes are framed in view

### Requirement: A newly loaded document is auto-arranged

Loading or creating a new document SHALL re-enable the one-shot measured auto-arrange for its
nodes, even if a document was already shown in the same session; ordinary edits to the current
document SHALL NOT trigger a re-arrange.

#### Scenario: Replacing the document re-arranges

- **WHEN** a document is already shown and the user loads a different document
- **THEN** the new document's nodes are auto-arranged into a non-overlapping layout without the
  user pressing "Arrange"

#### Scenario: Editing does not re-arrange

- **WHEN** the user edits the current document (e.g. renames a field)
- **THEN** the nodes are not re-arranged and any positions the user set are preserved
