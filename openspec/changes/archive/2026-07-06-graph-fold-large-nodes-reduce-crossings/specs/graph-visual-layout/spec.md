## ADDED Requirements

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
