## Context

Ontology Concepts render as React Flow nodes (`ConceptNode`) with node-level
handles (`target` left, `source` right). Attribute/field rows are already listed
inside an expanded concept node but are not connectable. `onOntConnect` in
`GraphView.tsx` currently reads only `connection.source`, resolves the owning
concept, and calls `addOntologyRelationship(componentIndex)`, which creates an
*empty* relationship via `createOntologyRelationship` (single default `String`
role, no target concept, no `derived_by`).

The OSI ontology relationship shape (see `packages/osi-schema/src/model.ts`) is:
`{ name, roles: Role[], multiplicity, verbalizes: string[], derived_by?: string[] }`.
The target behavior mirrors the user's example — a relationship with a role to the
target concept, a verbalization template, and a `derived_by` equality join between
the two fields.

## Goals / Non-Goals

**Goals:**
- Make each concept attribute/field row a connectable React Flow handle.
- Resolve a completed connection to a source concept+field and a target
  concept+field.
- Create a pre-populated relationship (target role, verbalization, multiplicity,
  and a `derived_by` join from the dragged fields) and open it for editing.
- Preserve the existing node-body drag as a fallback that seeds everything except
  the `derived_by` join.

**Non-Goals:**
- No change to the OSI file schema, import/export, or round-trip logic.
- No new relationship *editing* UI beyond what the detail form already provides.
- No inference of multiplicity from field cardinality (always default
  `ManyToOne`).
- No auto-matching of "best" join fields — the join uses exactly the dragged
  fields.

## Decisions

### Field-level handles via composite handle ids
Each attribute row in `ConceptNode` renders a `source` and `target` `Handle`
whose `id` encodes the field, e.g. `field:<relationshipIndex>` (or the attribute
name). React Flow surfaces `connection.sourceHandle` / `connection.targetHandle`,
letting `onOntConnect` recover exactly which fields were dragged. The node-level
handles remain (with no id) so body-to-body drags still work.

*Alternative considered:* a separate connect affordance/button per row — rejected
as heavier and inconsistent with the existing React Flow handle model.

### Resolve fields through the existing `ConceptAttribute` model
`ontologyGraph.ts` already computes `ConceptAttribute { name, componentIndex,
relationshipIndex, valueType, ... }` per row. Handle ids reference the attribute
so `onOntConnect` can map a handle id back to the concrete field/attribute name
used in the `derived_by` expression, without inventing a parallel identity scheme.

### Extend the store action, keep the factory the seed point
`addOntologyRelationship` gains optional parameters: the target concept name, the
source/target field names, and derived seed strings. It builds the relationship
through an extended/complementary `createOntologyRelationship` so the seed
(`roles: [{ concept: target }]`, `verbalizes: ['{Source} <name> {Target}']`,
`multiplicity: 'ManyToOne'`, `derived_by: ['Source.f == Target.g']`) is produced
in one place. Existing callers (toolbar "add relationship") pass no extra args and
keep today's empty-seed behavior.

*Alternative considered:* a brand-new `linkConcepts` action — rejected to avoid
duplicating selection/dirty-flag logic; extending the existing action is smaller.

### `onOntConnect` orchestrates resolution
`onOntConnect` resolves source concept (from `connection.source`) and target
concept (from `connection.target`), and — when handle ids are present — the source
and target field names, then calls the extended store action. Guards: ignore
self-links and non-concept endpoints; when target is missing, no-op (today's
behavior).

## Risks / Trade-offs

- [Field row must be expanded to be draggable] → The row handles only exist when a
  concept is expanded; body-to-body drag remains available when collapsed, and it
  still seeds the relationship (minus the join). Acceptable.
- [Generated `derived_by` may not be a valid join for every pair] → It is a seed
  the user can edit in the detail form; the relationship opens for editing
  immediately, and diagnostics already flag broken expressions.
- [Handle id collisions with existing edges] → Use a namespaced id prefix
  (`field:`) distinct from node ids (`concept:`) to avoid clashes.
- [React Flow `smoothstep` edge routing from row handles] → Existing edge builder
  already targets concept nodes; edges continue to attach at the node, only the
  drag origin changes. Low risk.

## Open Questions

- Should the seeded relationship `name` derive from the two field names (e.g.
  `Source_has_Target`) or a generic counter? Default to a readable
  `<Source>_<Target>` seed, user-editable.
