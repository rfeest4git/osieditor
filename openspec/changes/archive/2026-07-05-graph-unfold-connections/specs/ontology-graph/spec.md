## MODIFIED Requirements

### Requirement: Render the ontology in the graph

The graph SHALL render ontology Concepts as nodes and ontology Relationships as edges.
The graph SHALL render **all** of a concept's relationships, not only the first role that
resolves to another concept. A relationship whose roles resolve to one or more Concept
nodes SHALL render as an edge between those concepts. A relationship whose roles resolve
only to value types or primitives (i.e. an attribute) SHALL be represented as an
unfoldable sub-element of its owning concept rather than being dropped. Relationship edges
SHALL indicate their multiplicity and, when present, display or expose their verbalization.

#### Scenario: Concepts and relationships appear as a graph

- **WHEN** a document with concepts and ontology relationships is loaded
- **THEN** each concept renders as a node and each relationship whose roles resolve to
  concepts renders as an edge between those concepts

#### Scenario: Every relationship is represented

- **WHEN** a concept declares multiple relationships, some to other concepts and some to
  value types or primitives
- **THEN** the graph represents every one of them — concept-to-concept relationships as
  edges and attribute relationships as unfoldable sub-elements — with none omitted

#### Scenario: Empty ontology

- **WHEN** a document has no concepts
- **THEN** the ontology graph shows an empty state rather than an error

## ADDED Requirements

### Requirement: Unified view links ontology to semantics

The graph SHALL provide a Unified view that renders the ontology and the semantic model
together in one picture, and this SHALL be the default view for ontology documents. The
Unified view SHALL render Concept nodes and dataset nodes simultaneously and SHALL show all
three connection kinds at once: concept-to-concept ontology relationships, concept-to-dataset
mapping links (from `concept_mappings`), and dataset-to-dataset shared-key joins. The three
connection kinds SHALL be visually distinguishable. The existing Semantic-model-only and
Ontology-only views SHALL remain available as focused alternatives.

#### Scenario: One picture of both layers

- **WHEN** an ontology document with concepts, datasets, mappings, and relationships is loaded
- **THEN** the Unified view is shown by default with concept nodes and dataset nodes visible
  together

#### Scenario: All three connection kinds are shown

- **WHEN** the Unified view is displayed
- **THEN** ontology relationships between concepts, concept-to-dataset mapping links, and
  dataset-to-dataset joins are all rendered at the same time and are visually distinguishable

#### Scenario: Focused views remain available

- **WHEN** the user switches to the Ontology-only or Semantic-model-only view
- **THEN** the graph shows just that layer, and the user can switch back to the Unified view

### Requirement: Concept nodes list their attributes inline

A Concept node SHALL display its attributes inline (attribute name and value type), marking
attributes that identify the concept (per `identify_by`) and attributes that act as foreign
keys (per a relationship's `derived_by` join expression). The inline attribute list SHALL be
unfoldable — a concept can be collapsed to hide it and expanded to show it, defaulting to
expanded.

#### Scenario: Attributes shown inline by default

- **WHEN** a concept with attributes is rendered
- **THEN** its attributes appear inline as name → value type, with identity attributes marked

#### Scenario: Identity attribute marked

- **WHEN** a concept declares an identifying attribute via `identify_by`
- **THEN** that attribute is marked as the identity attribute in the concept node

#### Scenario: Foreign-key attribute marked

- **WHEN** an attribute appears on the owner side of a relationship's `derived_by` join
  expression
- **THEN** that attribute is marked as a foreign key in the concept node

### Requirement: Distinguish attributes from concept references

The graph SHALL classify a relationship role by its target: a role pointing at a built-in
value type (e.g. `String`, `Float`) is an attribute of the owning concept, while a role
pointing at any other named concept is a relationship edge — even when that concept is only
referenced and not declared in the document. A referenced-but-undeclared concept SHALL still
appear as a node (rendered distinctly) so the relationship has a visible endpoint.

#### Scenario: Value-typed role is an attribute

- **WHEN** a relationship's role targets a built-in value type
- **THEN** it is shown as an attribute of the concept, not as an edge

#### Scenario: Referenced concept role is an edge to a ghost node

- **WHEN** a relationship's role targets a concept that is referenced but not declared
- **THEN** the graph renders an edge to a distinctly-styled node for that referenced concept
  rather than collapsing the relationship into an attribute

### Requirement: Unfold a concept's attribute sub-elements

The graph SHALL let the user unfold (expand) a Concept node to reveal its attribute
sub-elements — the relationships whose roles resolve to value types or primitives — and
fold (collapse) it again. A collapsed concept SHALL still convey that it has attributes
(e.g. a count or affordance) so hidden sub-elements are discoverable. The expand/collapse
state of each concept SHALL persist across model reconciliation and layer toggles, the same
way user-dragged node positions persist.

#### Scenario: Expand a concept to see its attributes

- **WHEN** a user unfolds a concept that has attribute relationships
- **THEN** the graph reveals a sub-element for each attribute, showing its name and target
  value type

#### Scenario: Collapse a concept

- **WHEN** a user folds an expanded concept
- **THEN** its attribute sub-elements are hidden and the concept still indicates it has
  attributes

#### Scenario: Expansion state persists

- **WHEN** the model changes or the user switches graph layers and returns
- **THEN** each concept's expanded or collapsed state is preserved

### Requirement: Select an attribute sub-element

The graph SHALL keep attribute sub-elements in sync with the detail form, so selecting an
unfolded attribute opens the underlying ontology relationship for editing, consistent with
selecting a relationship edge.

#### Scenario: Select an unfolded attribute

- **WHEN** a user selects an attribute sub-element of an expanded concept
- **THEN** the detail form shows that attribute's underlying ontology relationship for
  editing
