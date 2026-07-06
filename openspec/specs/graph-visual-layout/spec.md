# graph-visual-layout Specification

## Purpose
TBD - created by archiving change graph-layout-and-colors. Update Purpose after archive.
## Requirements
### Requirement: Nodes are placed in an edge-aware star-schema layout on first render

The graph SHALL place nodes at initial positions computed from the graph's edges so that
connected nodes are drawn near each other and connection lines avoid crossing. The layout
SHALL select the most-connected node(s) as hub(s) and position each hub's directly connected
neighbours radially around it (a star / hub-and-spoke arrangement), placing remaining nodes
near the hub they connect to. Placement SHALL account for each node's estimated rendered width
AND height (uncapped — a 50-field node is placed as the tall node it is) so that no two nodes
overlap when a model is first shown in any layer (semantic-model, ontology, or unified). Nodes
with no edges SHALL be placed in a tidy grid clear of the connected clusters rather than mixed
into the rings.

#### Scenario: Connected nodes are placed around their hub without overlap

- **WHEN** a model whose nodes are connected by relationships/mappings is first rendered,
  including one node far taller than the rest
- **THEN** each hub's directly connected neighbours are arranged around it, and every node is
  positioned so its bounding box does not intersect any other node's bounding box

#### Scenario: Connection lines do not cross when a hub fans out to its neighbours

- **WHEN** a hub node is connected to several neighbour nodes and the graph is first rendered
- **THEN** the neighbours are distributed around the hub so their connection lines radiate
  outward without crossing one another or cutting through other nodes

#### Scenario: Metrics and ghost concepts do not collide with content nodes

- **WHEN** a model containing datasets/concepts plus metrics and/or referenced-but-undeclared
  (ghost) concepts is first rendered
- **THEN** every metric and ghost node is placed clear of the dataset and concept nodes

### Requirement: Manual arrange using measured node sizes

The graph SHALL provide an on-canvas "Arrange" control in every layer that repositions all
nodes into the edge-aware star-schema layout computed from each node's REAL measured size (not
an estimate) and the layer's edges, minimizing edge crossings while keeping nodes
non-overlapping. The same measured arrange SHALL also run automatically once per layer, the
first time that layer's nodes have been measured, so the initial view is clean without user
action. After that automatic pass the layout SHALL NOT be recomputed on its own — re-running it
is the user's explicit choice via the control.

#### Scenario: User triggers a re-arrange

- **WHEN** the user clicks the "Arrange" control after nodes have been added, expanded, or
  dragged into an overlapping mess
- **THEN** every node is repositioned into the star-schema layout so no two nodes overlap,
  using their current rendered sizes, and the view reframes to fit them

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

### Requirement: Unified view keeps domains spatially grouped

In the unified layer the graph SHALL keep each domain's nodes clustered so that concepts remain
spatially grouped apart from datasets and metrics, and the domain clusters SHALL NOT overlap —
so the "Ontology" and "Semantic model" background region boxes drawn behind them do not
intersect — even while nodes within a domain are arranged in the star-schema layout and even
when a domain contains tall nodes.

#### Scenario: Domain clusters stay clear of each other

- **WHEN** the unified view renders concepts together with datasets and metrics, including
  nodes with many attributes or fields
- **THEN** the concept cluster does not overlap the dataset/metric cluster, and their domain
  region boxes remain visually separated

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

### Requirement: Layout minimizes edge crossings across the whole graph

The edge-aware layout SHALL order nodes to minimize connection-line crossings across the entire
graph, not only within a single hub's fan-out. Sibling clusters/connected components SHALL be
ordered so edges between them do not cut across unrelated clusters, and in the unified view the
nodes of each stacked domain band SHALL be ordered to align horizontally with their connected
partners in the other band so cross-band edges (relationships and concept→dataset mapping links)
cross as little as possible.

#### Scenario: Crossings are reduced between clusters

- **WHEN** a graph containing multiple connected clusters is arranged
- **THEN** the clusters are ordered so that edges running between them do not cross unrelated
  clusters

#### Scenario: Crossings are reduced across unified domain bands

- **WHEN** the unified view arranges the ontology band above the semantic-model band with
  cross-band mapping and relationship edges between them
- **THEN** each band's nodes are ordered to align with their connected partners in the other
  band, so the cross-band edges cross one another as little as possible

### Requirement: Folded nodes pack tighter in the layout

The layout SHALL size each node from its CURRENT fold state, so a folded node is placed at its
compact header-only footprint and its connected neighbours are drawn closer together. Re-running
the "Arrange" control after a node's fold state changes SHALL reposition nodes using the node's
new size.

#### Scenario: A default-folded node is placed at its compact size

- **WHEN** the initial layout runs with a large node folded by default
- **THEN** that node is placed at its header-only footprint and the surrounding nodes pack
  closer than they would if the node were expanded

#### Scenario: Arrange reflects a changed fold state

- **WHEN** the user folds a previously expanded node and then activates "Arrange"
- **THEN** the node is repositioned using its smaller folded size, tightening the layout around
  it

