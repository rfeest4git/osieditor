## ADDED Requirements

### Requirement: Collapsible navigator panel
The system SHALL allow the user to collapse and expand the left navigator panel so that the central editor/graph content reclaims the freed horizontal space when the navigator is collapsed.

#### Scenario: Collapsing the navigator
- **WHEN** the navigator is expanded and the user activates its collapse control
- **THEN** the navigator panel is hidden (reduced to a thin rail or removed from the layout)
- **AND** the central content pane widens to occupy the reclaimed space
- **AND** a control to re-expand the navigator remains visible

#### Scenario: Expanding a collapsed navigator
- **WHEN** the navigator is collapsed and the user activates the expand control
- **THEN** the navigator panel is restored to its previous width
- **AND** the central content pane returns to its prior width

### Requirement: Collapsible source preview panel
The system SHALL allow the user to collapse and expand the right source preview panel so that the central editor/graph content reclaims the freed horizontal space when the source preview is collapsed.

#### Scenario: Collapsing the source preview
- **WHEN** the source preview is expanded and the user activates its collapse control
- **THEN** the source preview panel is hidden
- **AND** the central content pane widens to occupy the reclaimed space
- **AND** a control to re-expand the source preview remains visible

#### Scenario: Expanding a collapsed source preview
- **WHEN** the source preview is collapsed and the user activates the expand control
- **THEN** the source preview panel is restored and shows the live source
- **AND** the central content pane returns to its prior width

### Requirement: Collapsible selection-detail inspector
The system SHALL allow the user to collapse and expand the relationship graph's right-hand selection-detail inspector so that the graph canvas reclaims the freed horizontal space when the inspector is collapsed.

#### Scenario: Collapsing the inspector
- **WHEN** the graph inspector is expanded and the user activates its collapse control
- **THEN** the inspector panel is hidden (reduced to a thin rail)
- **AND** the graph canvas widens to occupy the reclaimed space
- **AND** a control to re-expand the inspector remains visible

#### Scenario: Expanding a collapsed inspector
- **WHEN** the graph inspector is collapsed and the user activates the expand control
- **THEN** the inspector panel is restored and shows the current selection's detail form
- **AND** the graph canvas returns to its prior width

### Requirement: Discoverable collapse affordances
The system SHALL present a clear, icon-based toggle affordance for each collapsible panel whose visual state communicates whether the panel is currently collapsed or expanded.

#### Scenario: Toggle reflects panel state
- **WHEN** a panel is expanded
- **THEN** its toggle indicates that activating it will collapse the panel

#### Scenario: Toggle reflects collapsed state
- **WHEN** a panel is collapsed
- **THEN** an affordance indicates that activating it will expand the panel

### Requirement: Session-persistent panel state
The system SHALL preserve each panel's collapsed or expanded state across view changes and interactions for the duration of the session, so the layout does not reset unexpectedly.

#### Scenario: State survives switching center views
- **WHEN** the user collapses a panel and then switches the central view between the form editor and the relationship graph
- **THEN** the panel remains in its collapsed state

#### Scenario: Independent panel state
- **WHEN** the user collapses one panel
- **THEN** the other panel's collapsed/expanded state is unchanged
