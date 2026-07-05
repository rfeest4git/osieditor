## 1. Vendor the ontology schema

- [x] 1.1 Vendor `ontology/ontology.json` from upstream `main` (resolved: it is the authoritative ontology schema; declares `version.const 0.2.0.dev0`, so no `OSI_SPEC_VERSION` bump). Save as `vendor/ontology-schema.json` (keep the existing `osi-schema.json` core-spec file too).
- [x] 1.2 Update `vendor/VENDOR.md` to document both vendored files (core-spec + ontology) with ref/date/provenance.
- [x] 1.3 Add the reference `flights.yaml` verbatim as a test fixture in `packages/osi-schema/test/fixtures`, confirming its top-level keys (`version, name, description, ontology, ontology_mappings` — no top-level `semantic_model`).

## 2. Model the ontology layer (Zod + types)

- [x] 2.1 Add `ConceptTypeSchema` (EntityType|ValueType), `MultiplicitySchema` (ManyToOne|OneToOne), and a plain-string `OntologyExpression` (ANSI SQL) — distinct from the multi-dialect `ExpressionSchema`.
- [x] 2.2 Add `OntologyConceptSchema` (name, type, description, extends[], derived_by[], identify_by[], requires[]), `RoleSchema` (concept, name?), `OntologyRelationshipSchema` (name, verbalizes[] required; roles[], multiplicity?, description?, derived_by[]), and `OntologyComponentSchema` (concept required, relationships[], description?) — all `.passthrough()`.
- [x] 2.3 Add `ReferentMappingSchema`, `ObjectMappingSchema`, `LinkMappingSchema` (recursive via `z.lazy`), `ConceptMappingSchema`, and `OntologyMapSchema` (name?, description?, `semantic_model` reusing `SemanticModelSchema`, `concept_mappings[]`).
- [x] 2.4 Add `OntologyDocumentSchema` (version, name, ontology[] required; description?, ai_context?, ontology_mappings[]) plus `DraftOntologyDocumentSchema`; add an `AnyOsiDocument` union; export all new types from `index.ts`.

## 3. Validation

- [x] 3.1 Add ontology integrity checks to `validation.ts`: concept `type` enum, relationship `multiplicity` enum, `roles[].concept` resolves to a known concept, `concept_mappings[].concept` resolves.
- [x] 3.2 Add mapping-reference checks where determinable (mapping expressions reference known datasets/fields) as diagnostics, not hard errors.
- [x] 3.3 Write `validation.test.ts` cases for each new diagnostic (valid ontology passes; missing concept/relationship references fail).

## 4. I/O round-trip

- [x] 4.1 Replace `detectUnsupported` with kind detection in `import.ts` (`ontology` ⇒ ontology doc, `semantic_model` ⇒ semantic-model doc); return the kind and coerce through the right draft schema.
- [x] 4.2 Add `roundtrip.test.ts` cases importing the `flights.yaml` ontology fixture and exporting to JSON and YAML with semantic equivalence, ontology + ontology_mappings intact.

## 5. Factory + store

- [x] 5.1 Add `createConcept`, `createOntologyRelationship`, `createConceptMapping` (and role/mapping-node helpers) to `factory.ts` with sensible defaults.
- [x] 5.2 Extend `apps/web/src/store/editorStore.ts` with ontology state slices, selection kinds (concept / ontology-relationship / concept-mapping), and add/edit/delete actions; cover in `editorStore.test.ts`.

## 6. API

- [x] 6.1 Verify `/api/import`, `/api/export`, `/api/validate` carry ontology data through; extend `apps/api/src/app.ts` if needed so validate returns ontology diagnostics.
- [x] 6.2 Add/extend `app.test.ts` for an ontology-bearing import→validate→export flow.

## 7. Editing UI

- [x] 7.1 Add a "Ontology" section to `Navigator.tsx` listing concepts, ontology relationships, and concept mappings with add buttons.
- [x] 7.2 Build `ConceptForm.tsx` (name, type, description, identify_by, extends, derived_by, requires) and route to it from `EditorPane.tsx`/`SelectionDetail.tsx`.
- [x] 7.3 Build `OntologyRelationshipForm.tsx` (multiplicity, roles limited to existing concepts, verbalizes template, derived_by, requires).
- [x] 7.4 Build `ConceptMappingForm.tsx` exposing the nested object_mappings/link_mappings tree with add/remove/edit of referent and child nodes.
- [x] 7.5 Wire live ontology diagnostics into the existing `DiagnosticsBanner`, and add delete-with-confirm when a concept is referenced.

## 8. Graph

- [x] 8.1 Extend `GraphView.tsx` with an ontology render mode: Concept nodes and ontology-relationship edges labeled by multiplicity/verbalization, plus a `GraphEmptyState` for no concepts.
- [x] 8.2 Add a semantic-model ↔ ontology layer toggle so the two layers don't visually collide.
- [x] 8.3 Implement drag-to-connect between concept nodes to create an ontology relationship that opens for editing.
- [x] 8.4 Convey concept→dataset mapping links in the graph (on demand).

## 9. Verify end-to-end

- [x] 9.1 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` (round-trip + validation) green.
- [x] 9.2 Manually import `flights.yaml` in the running app, confirm concepts/relationships/mappings render and edit, export, and verify round-trip; update `README.md` to note ontology-layer support.
