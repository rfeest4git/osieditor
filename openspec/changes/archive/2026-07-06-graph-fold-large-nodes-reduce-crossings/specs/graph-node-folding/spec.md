## ADDED Requirements

### Requirement: Large nodes fold by default

A concept or dataset node SHALL render collapsed by default when its field/attribute count
exceeds a configured threshold (default 8) — showing its header and field count but none of its
field rows — so oversized boxes take minimal space on the canvas. A node whose field count is at
or below the threshold SHALL render expanded by default. The threshold SHALL apply uniformly to
concept nodes and dataset nodes in every layer (semantic-model, ontology, and unified).

#### Scenario: Large node is folded on first render

- **WHEN** a model is first rendered that contains a node with more field/attribute rows than
  the threshold
- **THEN** that node shows only its header and its field count, not its field rows, so it
  occupies a compact header-only footprint

#### Scenario: Small node stays expanded on first render

- **WHEN** a model is first rendered that contains a node whose field count is at or below the
  threshold
- **THEN** that node shows its field rows by default

### Requirement: User fold choice overrides the default and persists

The graph SHALL let the user expand or collapse any node that has fields via a per-node control.
The user's explicit choice SHALL override the size-based default for that node and SHALL persist
across model edits, node reconciliation, and switching graph layers, so the graph never
silently re-folds a node the user chose to open (or re-opens one the user chose to fold).

#### Scenario: Expanding a default-folded large node sticks

- **WHEN** the user expands a node that was folded by default and then edits the model or
  switches layers and back
- **THEN** the node stays expanded and shows its field rows

#### Scenario: Collapsing a default-expanded small node sticks

- **WHEN** the user collapses a node that was expanded by default and then edits the model or
  switches layers and back
- **THEN** the node stays collapsed showing only its header and field count

### Requirement: Collapse-all and expand-all control

The graph SHALL provide a control, available in every layer, that in a single action either
collapses every node in the current view to its header (hiding all field rows) or expands every
node that has fields to show its field rows. Using the control SHALL change only fold state and
SHALL NOT move nodes from their current positions.

#### Scenario: Collapse all folds every node without moving them

- **WHEN** the user activates "Collapse all"
- **THEN** every node in the current view folds to its header plus field count, and each node
  stays at its current position

#### Scenario: Expand all unfolds every node without moving them

- **WHEN** the user activates "Expand all"
- **THEN** every node that has fields shows its field rows, and each node stays at its current
  position
