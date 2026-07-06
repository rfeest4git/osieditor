## 1. Schema / factory seed

- [x] 1.1 Extend `createOntologyRelationship` (or add a sibling helper) in `packages/osi-schema/src/factory.ts` to accept an optional target concept, verbalization name, and `derived_by` join, producing `roles: [{ concept: target }]`, a `{Source} <name> {Target}` verbalization, `multiplicity: 'ManyToOne'`, and an optional `derived_by` entry
- [x] 1.2 Add/adjust unit tests in `packages/osi-schema` covering the seeded relationship shape (with and without a `derived_by` join)

## 2. Store action

- [x] 2.1 Extend `addOntologyRelationship` in `apps/web/src/store/editorStore.ts` to accept an optional target concept name and optional source/target field names, seeding the relationship via the factory and keeping the existing empty-seed behavior when no extra args are given
- [x] 2.2 Preserve current selection/dirty behavior (select the new relationship, mark ontology dirty) and update the store test in `apps/web/src/store/editorStore.test.ts`

## 3. Field-level handles

- [x] 3.1 In `apps/web/src/components/graph/ontologyGraph.ts`, ensure each `ConceptAttribute` carries the identity needed to build a stable field handle id and to resolve back to a field name
- [x] 3.2 In `apps/web/src/components/graph/ConceptNode.tsx`, render a `source` and `target` `Handle` on each attribute/field row with a namespaced `field:` handle id, keeping the existing node-level handles for body-to-body drags

## 4. Connect orchestration

- [x] 4.1 Update `onOntConnect` in `apps/web/src/components/graph/GraphView.tsx` to resolve the target concept from `connection.target` (in addition to source) and ignore self-links / non-concept endpoints
- [x] 4.2 Recover source and target field names from `connection.sourceHandle` / `connection.targetHandle` when present, and call the extended store action with the target concept and dragged fields
- [x] 4.3 Ensure body-to-body drags (no handle ids) still create a seeded relationship with an empty `derived_by`

## 5. Validation

- [x] 5.1 Manually verify in the running app: dragging field→field between two EntityTypes creates a relationship matching the example (role to target, verbalization, `derived_by` join) and opens it for editing
- [x] 5.2 Verify the generated relationship round-trips on export and that `pnpm lint` and the affected package/web tests pass
