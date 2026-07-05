## Context

The mapping layer (`ontology_mappings` → `concept_mappings`) binds ontology concepts to
the physical/logical semantic model. The in-memory model and round-trip I/O already support
this fully (`packages/osi-schema/src/model.ts`: `ConceptMappingSchema`, `ObjectMappingSchema`,
`LinkMappingSchema`, `ReferentMappingSchema`; `OntologyMapSchema` nests a `semantic_model`).

A UI also already exists end-to-end:
- `Navigator.tsx` shows a "Concept mappings" group with Add, one row per mapping.
- `SelectionDetail.tsx` (`case 'concept-mapping'`) renders `ConceptMappingForm.tsx`.
- `editorStore.ts` has full CRUD (`addConceptMapping`, `updateConceptMapping`,
  `deleteConceptMapping`) via `mutateConceptMappings`.

The problem is UX, not plumbing: every expression and relationship in
`ConceptMappingForm.tsx` is a free-text `TextField` (e.g. `object_mapping.expression`
placeholder `"dataset.column"`, hand-typed `relationship` names). Because the datasets,
fields, and ontology relationships are never surfaced, authoring a correct binding by hand
is impractical — which is why it reads as "not supported via UI." The active map's semantic
model is already reachable through `getActiveModel(doc, activeModelIndex, activeMapIndex)`,
and ontology relationships through `getOntologyComponents(doc)`, so the data needed to guide
the user is one selector away.

Constraints: React 19, Zustand + immer store, Porsche Design System v4 with local `ui/`
wrappers (`SelectField`, `TextField`). Ontology-layer expressions are plain ANSI-SQL strings
(`OntologyExpressionSchema = z.string()`), not the multi-dialect semantic-model `Expression`.
`.passthrough()` schemas mean unknown keys and hand-authored expressions must survive edits.

## Goals / Non-Goals

**Goals:**
- Turn the free-text expression inputs into a Dataset picker + Field picker sourced from the
  active map's `semantic_model.datasets[].fields[]`, producing the bound `expression` string.
- Turn the free-text relationship inputs into a dropdown of ontology relationships relevant to
  the mapped concept.
- Keep a raw-expression fallback so custom expressions no field produces are never blocked.
- Surface live diagnostics for broken dataset/field/relationship references at the offending
  field.
- Preserve round-trip fidelity; no document schema or API change.

**Non-Goals:**
- No change to the document schema, factory defaults, or Hono API endpoints.
- No editing of the nested `semantic_model` from within the mapping form (datasets/fields are
  still authored in their own forms).
- No auto-generation/inference of complete mappings from concept structure.
- No SQL parsing/validation of raw expressions beyond reference existence.

## Decisions

### Derive picker options from the active map, not new state
Add read selectors (co-located with the existing `getActiveModel`/`getOntologyComponents` in
`editorStore.ts`) that return, for the active map: dataset names, fields per dataset, and the
ontology relationships whose roles involve the mapped concept. `SelectionDetail.tsx` already
computes `conceptOptions` and passes it in; extend the same seam to pass
`datasetOptions`/`fieldOptions` and `relationshipOptions` to `ConceptMappingForm`. This keeps
the form a pure presentation of derived data and avoids duplicating model state.
- *Alternative considered:* subscribe to the store inside the leaf editors
  (`ObjectMappingEditor`, etc.). Rejected — it scatters store coupling through recursive
  nodes; passing options down as props matches the existing `conceptOptions` pattern.

### Dataset → Field two-step, expression is derived text
The bound `expression` string is composed from the selected dataset+field (the existing
`"dataset.column"` convention). Store the resulting string in `expression` exactly as today so
the model shape is unchanged. On load, best-effort parse the existing `expression` back into a
dataset/field selection to pre-populate the pickers; if it does not resolve to a known
dataset/field, fall back to raw mode showing the literal string.
- *Alternative considered:* add structured fields to the schema. Rejected — breaks round-trip
  and the OSI schema; the expression string is the source of truth.

### Raw-expression escape hatch via a per-node toggle
Each expression input gets a "Raw expression" toggle. Guided mode shows the two pickers;
raw mode shows the current free-text `TextField`. Default to guided when the expression
resolves to a known field, raw otherwise. This guarantees no existing document becomes
un-editable.

### Reference validation reuses the diagnostics surface
Extend validation (`packages/osi-schema/src/validation.ts`) and/or a UI-side check feeding
`lib/diagnostics.ts` so a mapping node referencing a missing dataset/field/relationship emits
a `Diagnostic` whose path targets that node's field. `fieldErrors(diagnostics, path)` is
already used in the form; the recursive editors need to thread their path prefix so
`errorAt(...)` can resolve nested nodes (currently only the root `concept` field is wired).
- *Alternative considered:* validate only on export. Rejected — the spec requires live,
  in-place diagnostics consistent with the rest of the ontology editor.

## Risks / Trade-offs

- **Expression parsing is heuristic** (splitting `dataset.field`) and may not round-trip an
  exotic expression back into pickers → always fall back to raw mode when parsing is
  ambiguous; never rewrite an expression the user did not touch.
- **Empty/absent semantic model** (map has no datasets yet) → pickers render empty with a hint
  and the raw fallback stays available, so binding is never blocked on ordering of work.
- **Relationship relevance filtering** could hide a legitimately-referenced relationship if the
  concept association is computed too strictly → include any relationship already referenced by
  the node (even if filtered out) so existing data is never dropped, mirroring how
  `conceptChoices` already prepends the current value.
- **Threading diagnostic paths through recursive editors** adds prop plumbing → contained to
  `ConceptMappingForm.tsx`; no cross-module change.

## Migration Plan

Pure additive UI/validation change; no data migration. Existing documents open unchanged —
resolvable expressions show in guided mode, everything else in raw mode. Rollback is reverting
the touched files (`ConceptMappingForm.tsx`, `editorStore.ts` selectors, `SelectionDetail.tsx`,
diagnostics/validation), with no persisted-state impact.

## Open Questions

- Convention for composing the `expression` string from dataset+field — confirm `dataset.field`
  matches the reference fixtures (`packages/osi-schema/test/fixtures/flights.yaml`) vs. a
  qualified/quoted form.
- Whether relationship options should be scoped strictly to the mapped concept's roles or offer
  all ontology relationships with the concept-relevant ones ranked first.
