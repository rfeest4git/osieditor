## Purpose
Visualize the OSI ontology as a graph of concepts and relationships, distinct from the dataset ERD, with support for drag-to-connect relationships and viewing concept-to-dataset mapping links.
## Requirements
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

### Requirement: Distinguish ontology and semantic-model views

The graph SHALL let the user view the ontology layer separately from the existing dataset
ERD, so the two layers do not visually collide.

#### Scenario: Toggle between layers

- **WHEN** the user switches the graph between the semantic-model view and the ontology
  view
- **THEN** the graph shows the selected layer's nodes and edges

### Requirement: Drag-to-connect ontology relationships

The graph SHALL support creating an ontology Relationship by dragging a connection
between two Concept nodes, consistent with the existing dataset drag-to-connect
behavior. A Concept node SHALL expose a connectable handle on each of its
attribute/field rows in addition to a node-level handle, so a drag may start and
end on a specific field. When a connection is completed, the created relationship
SHALL be **pre-populated** rather than empty:

- a role referencing the **target** Concept SHALL be added,
- a default `name` and a `verbalizes` template of the form
  `{Source} <Name> {Target}` SHALL be seeded,
- `multiplicity` SHALL default to `ManyToOne`,
- when the drag started and ended on specific fields, a `derived_by` join
  expression of the form `Source.<sourceField> == Target.<targetField>` SHALL be
  seeded from the two dragged fields.

When the drag is between concept node bodies (no fields involved), the
relationship SHALL still be created with the target role and verbalization seed,
and the `derived_by` join SHALL be left empty for the user to complete. In all
cases the new relationship SHALL be selected and opened for editing so the user
can refine the generated values.

#### Scenario: Create a relationship by dragging between fields

- **WHEN** the user drags a connection from a field on a source Concept node to a
  field on a target Concept node
- **THEN** a new ontology relationship is created with a role referencing the
  target concept, a seeded verbalization, and a `derived_by` join built from the
  two dragged fields, and it opens for editing

#### Scenario: Create a relationship by dragging between concept nodes

- **WHEN** the user drags a connection from one concept node body to another
  without selecting specific fields
- **THEN** a new ontology relationship is created between those concepts with the
  target role and verbalization seeded and an empty `derived_by`, and it opens for
  editing

#### Scenario: Generated relationship round-trips

- **WHEN** a relationship created by dragging between fields is exported
- **THEN** the exported document contains the relationship with its role,
  verbalization, multiplicity, and `derived_by` join expression

### Requirement: Show mapping links to datasets

The graph SHALL make it possible to see which semantic_model datasets a concept is mapped
to via its concept mappings.

#### Scenario: Concept mapped to a dataset

- **WHEN** a concept has a mapping bound to a dataset
- **THEN** the graph conveys the link between the concept and that dataset

### Requirement: Add-toolbar actions are contextual to the active layer
In the ontology and unified layers, the graph's add toolbar SHALL additionally expose adding a concept, and SHALL expose the nested semantic model's add actions (dataset, metric), so the user can grow either layer without leaving the graph. The toolbar SHALL show the actions relevant to the layer currently displayed.

#### Scenario: Add a concept from the ontology layer
- **WHEN** the ontology or unified layer is active and the user activates "Add concept"
- **THEN** a new concept is created, appears as a concept node, and is selected with its detail form open

#### Scenario: Layer-specific actions
- **WHEN** the user switches between the semantic-model, ontology, and unified layers
- **THEN** the toolbar shows the add actions relevant to that layer (concept actions in the ontology/unified layers; dataset/metric/relationship actions where a semantic model is present)

#### Scenario: Toolbar available on a non-empty ontology graph
- **WHEN** the ontology graph already contains at least one concept
- **THEN** the add toolbar remains visible so further concepts can be added without returning to the Navigator

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

