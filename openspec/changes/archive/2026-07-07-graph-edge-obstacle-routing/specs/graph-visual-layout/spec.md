## MODIFIED Requirements

### Requirement: Connection lines avoid crossing nodes

The graph SHALL route every connection edge orthogonally (horizontal/vertical
segments, not diagonal curves) AND so that no edge is drawn over or through any
node box that is not one of that edge's two endpoints. When the direct orthogonal
channel between an edge's two endpoints is blocked by an intervening node box, the
edge SHALL be re-routed — bent around the obstacle through free space — rather than
drawn across the box. The router SHALL account for the current bounding box of
every node (using the layer's real node positions and sizes) when computing each
edge's path. Band gutters remain the preferred routing space, but a box SHALL
never be visually covered by a connection line.

#### Scenario: Cross-band edges route in the gap

- **WHEN** an edge connects a node in one band to a node in another band
- **THEN** the edge routes through the gutter between the bands rather than
  diagonally across intervening nodes

#### Scenario: An edge bends around an obstructing box

- **WHEN** a node box sits between an edge's two endpoints such that the direct
  orthogonal channel would pass through that box
- **THEN** the edge is re-routed around the box through free space so the box is
  not overlapped by the connection line

#### Scenario: No connection line is drawn over a non-endpoint box

- **WHEN** any layer (semantic-model, ontology, or unified) is rendered with its
  nodes positioned
- **THEN** no edge's path passes through the bounding box of a node that is not
  one of that edge's endpoints

## ADDED Requirements

### Requirement: Edges re-route when nodes move

The obstacle-aware edge routing SHALL recompute edge paths when node positions
change — after a node is dragged or after the "Arrange" control re-lays out the
graph — so that edges continue to avoid crossing non-endpoint boxes at the new
positions.

#### Scenario: Dragging a node reroutes its edges around obstacles

- **WHEN** the user drags a node so that one of its edges would now pass through
  another box
- **THEN** that edge re-routes around the intervening box for the node's new
  position

#### Scenario: Re-arrange produces obstacle-free edges

- **WHEN** the user triggers "Arrange"
- **THEN** after the nodes are repositioned, every edge is routed so it does not
  pass through any non-endpoint node box
