## ADDED Requirements

### Requirement: Resizable navigator panel
The system SHALL allow the user to adjust the width of the left navigator panel by dragging a resize handle on its inner edge, constrained between a minimum and maximum width so the panel remains usable and the central content is not crowded out.

#### Scenario: Widening the navigator by dragging
- **WHEN** the navigator is expanded and the user drags its resize handle toward the center
- **THEN** the navigator width increases to follow the pointer up to the maximum allowed width
- **AND** the central content pane narrows to occupy the remaining space

#### Scenario: Narrowing the navigator by dragging
- **WHEN** the navigator is expanded and the user drags its resize handle toward the edge
- **THEN** the navigator width decreases to follow the pointer down to the minimum allowed width
- **AND** the central content pane widens to occupy the freed space

#### Scenario: Width is clamped to limits
- **WHEN** the user drags the navigator resize handle beyond the allowed minimum or maximum width
- **THEN** the navigator width stops at the corresponding limit and does not exceed it

### Requirement: Resizable source preview panel
The system SHALL allow the user to adjust the width of the right source preview panel by dragging a resize handle on its inner edge, constrained between a minimum and maximum width.

#### Scenario: Resizing the source preview by dragging
- **WHEN** the source preview is expanded and the user drags its resize handle
- **THEN** the source preview width follows the pointer within the allowed minimum and maximum
- **AND** the central content pane adjusts to occupy the remaining space

### Requirement: Resizable selection-detail inspector
The system SHALL allow the user to adjust the width of the relationship graph's selection-detail inspector by dragging a resize handle on its inner edge, constrained between a minimum and maximum width.

#### Scenario: Resizing the inspector by dragging
- **WHEN** the graph inspector is expanded and the user drags its resize handle
- **THEN** the inspector width follows the pointer within the allowed minimum and maximum
- **AND** the graph canvas adjusts to occupy the remaining space

### Requirement: Session-persistent panel widths
The system SHALL preserve each resizable panel's width across view changes and interactions for the duration of the session, so a user-adjusted width does not reset unexpectedly.

#### Scenario: Width survives switching center views
- **WHEN** the user resizes a panel and then switches the central view between the form editor and the relationship graph
- **THEN** the panel retains its adjusted width

#### Scenario: Width restored after collapse and expand
- **WHEN** the user resizes a panel, collapses it, and then expands it again
- **THEN** the panel is restored to its most recently adjusted width

### Requirement: Full-screen region mode
The system SHALL allow the user to expand a single region — any of the foldable side regions or the central editor/graph pane — to fill the entire workspace via a full-screen (maximize) control, hiding the other regions, and SHALL allow the user to exit full-screen mode to restore the previous layout.

#### Scenario: Entering full-screen for a region
- **WHEN** the user activates the full-screen control of a region
- **THEN** that region expands to fill the entire workspace area
- **AND** the other regions are hidden from view
- **AND** an affordance to exit full-screen remains visible

#### Scenario: Maximizing the central pane
- **WHEN** the user activates the full-screen control of the central editor/graph pane
- **THEN** the central pane expands to fill the entire workspace area
- **AND** the navigator and source preview regions are hidden from view
- **AND** an affordance to exit full-screen remains visible

#### Scenario: Exiting full-screen restores the layout
- **WHEN** a region is in full-screen mode and the user activates the exit-full-screen affordance
- **THEN** the region returns to its prior size and position
- **AND** the previously hidden regions are restored to their prior state

#### Scenario: Only one region full-screen at a time
- **WHEN** one region is in full-screen mode and the user activates the full-screen control of a different region
- **THEN** the first region exits full-screen
- **AND** the second region becomes the full-screen region
