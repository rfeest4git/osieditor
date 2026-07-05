## 1. Store selectors for picker options

- [x] 1.1 In `apps/web/src/store/editorStore.ts`, add a selector returning the active map's dataset names (from `getActiveModel(...).datasets[].name`) — implemented as `getMapDatasetFields` (names + fields together)
- [x] 1.2 Add a selector returning fields for a given dataset name (`datasets[].fields[].name`), returning `[]` when the dataset is absent — covered by `getMapDatasetFields`
- [x] 1.3 Add a selector returning ontology relationships relevant to a concept name (`getConceptRelationshipNames` in `editorStore.ts`); the mapping's current value is re-added by the picker so nothing is dropped
- [x] 1.4 Add `composeMappingExpression`/`parseMappingExpression` in `apps/web/src/lib/mapping.ts` (compose `dataset.field`; parse returns null when it does not resolve to a known dataset/field)

## 2. Wire options through SelectionDetail

- [x] 2.1 In `apps/web/src/components/editor/SelectionDetail.tsx`, compute dataset/field option sources and the mapped concept's relationship options for the selected map
- [x] 2.2 Pass the new option sources into `ConceptMappingForm` alongside the existing `conceptOptions`

## 3. Guided expression pickers in ConceptMappingForm

- [x] 3.1 In `apps/web/src/components/editor/ConceptMappingForm.tsx`, add an `ExpressionField` component with a raw/guided toggle: guided mode shows a Dataset `SelectField` + Field `SelectField`; raw mode shows the current free-text `TextField`
- [x] 3.2 On mount, choose guided vs. raw per `parseMappingExpression` (guided when the expression resolves to a known dataset/field or is empty with datasets present, raw otherwise); changing the dataset resets the field selection
- [x] 3.3 Replace the `expression` `TextField` in `ObjectMappingEditor` with `ExpressionField`, composing the bound string and preserving raw text verbatim in raw mode
- [x] 3.4 Replace the `expression` `TextField` in `ReferentMappingEditor` with `ExpressionField`

## 4. Guided relationship pickers

- [x] 4.1 Replace the `relationship` `TextField` in `ReferentMappingEditor` with a `SelectField` sourced from the concept's relationship options (prepending the current value if not in the list)
- [x] 4.2 Replace the `relationship` `TextField` in `LinkMappingEditor` with the same relationship `SelectField`

## 5. Reference validation and diagnostics

- [x] 5.1 Extend `validateOntologySemantics` in `packages/osi-schema/src/validation.ts` to warn when a mapping expression is a bare `dataset.field` reference that does not resolve in the active map's semantic model (raw SQL expressions are skipped)
- [x] 5.2 ~~Emit a diagnostic when a `referent_mapping`/`link_mapping` references a relationship not defined for the mapped concept~~ — **dropped by design**: OSI permits a mapping relationship name to diverge from the declared relationship name (the reference `flights` model and `roundtrip.test.ts` rely on this), so a diagnostic would be a false positive. The guided relationship picker provides the steering instead.
- [x] 5.3 Thread each recursive editor's diagnostic path prefix (`ontology_mappings/<mapIndex>/concept_mappings/<i>/...`) so `fieldErrors(diagnostics, path)` resolves nested nodes, and pass `error={...}` into the new `ExpressionField`

## 6. Verification

- [x] 6.1 Guided binding logic (compose/parse, dataset→field reset) covered by unit tests; live `SourcePreview` reflects `updateConceptMapping` writes as before (browser walkthrough pending user check)
- [x] 6.2 `roundtrip.test.ts` imports `flights.yaml`, validates it clean, and round-trips it — passes; resolvable expressions parse into guided mode, others fall back to raw
- [x] 6.3 Added `validation.test.ts` cases: a bare unresolved `dataset.field` warns at the exact expression path; a resolving reference and a raw SQL expression do not
- [x] 6.4 Ran workspace `typecheck`, `lint`, and `test` — all green (82 tests)
