## MODIFIED Requirements

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
