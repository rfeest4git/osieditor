## Context

The OSI editor holds two document kinds — semantic-model and ontology — parsed and
validated in `packages/osi-schema` (`model.ts`, `io.ts`, `import.ts`, `validation.ts`) and
loaded into the editor store via `loadDocument`. Import today flows through the OSI
`ImportButton` → `/api/import` → `importText`, which classifies a root as
`semantic-model`/`ontology` and returns `{ document, diagnostics, parseError?, unsupported? }`.

Collibra DataAsset files (per `data_asset_schema_3.0.1.json`) are a **different** shape:
`{ version, schemaVersion, identifier, name, dataOwner, description, responsibilities,
tags?, entities }`, where `entities` maps entity keys to `{ displayName, description?,
classification?, tags?, attributes? }` and each attribute is `{ displayName, description?,
example?, additionalInformation?, predefinedValues? }`.

Per the clarified requirements: a **dedicated** import action (not the OSI importer),
attributes become **ontology relationships to a predefined value type (`String` by
default)** on the entity concept, and the conversion is **one-way** (no DataAsset export).
A sample file and its schema are provided.

## Goals / Non-Goals

**Goals:**
- Convert a DataAsset document into a valid, editable OSI ontology document.
- Reuse the existing parse/format-detection, confirm-dialog, and `loadDocument` machinery.
- Preserve DataAsset information that has no native OSI field so nothing is silently lost.
- Report parse/validation problems and guard unsaved work, matching OSI import UX.

**Non-Goals:**
- Exporting back to DataAsset YAML (one-way conversion only).
- Round-trip fidelity of the DataAsset document itself.
- Automatically generating `ontology_mappings` to physical datasets (attributes carry
  `example`/metadata, not table/column bindings) — mappings remain a manual editor step.
- Full validation of every DataAsset schema constraint (enums, email formats, UUID
  patterns); only fields needed for conversion are enforced.

## Decisions

### 1. Where conversion runs — server-side, mirroring `/api/import`

Add `dataAssetToOntology(raw)` in `packages/osi-schema` and expose it through a new
`/api/import-data-asset` endpoint that parses (reusing `detectFormat`/`parse`), converts,
validates the resulting ontology, and returns an `ImportResult`-shaped payload. Rationale:
keeps the web app thin and mirrors the existing import path so the UI reuses the same
response contract and dialogs. Alternative (client-only converter) was rejected to avoid
duplicating the parse/response-shape logic already centralized behind the API.

### 2. Detection — top-level `entities` map + `schemaVersion`

A DataAsset is recognized when the parsed root is a non-array object with an `entities`
object and a `schemaVersion` string. This is distinct from OSI documents (which have
`semantic_model`/`ontology` arrays), so misclassification is unlikely. Add
`detectDataAsset(raw)` alongside `detectDocumentKind`.

### 3. Conversion mapping

- **Document**: `name` ← DataAsset `name`; `description` ← DataAsset `description`;
  `version` ← `OSI_SPEC_VERSION`. `ontology` is built from the entities. `ontology_mappings`
  is seeded with a single empty map (as `createEmptyOntologyDocument` does) so the ontology
  is immediately editable.
- **Entity → EntityType concept**: concept `name` derived from the entity key via a
  `toConceptName` normalizer (PascalCase, schema `^[A-Z][a-zA-Z0-9_-]*$` is already
  entity-key-compatible). `description` combines `displayName` + `description`.
- **Attribute → relationship to a value type**: each attribute becomes a `ManyToOne`
  `OntologyRelationship` on the owning entity's component, with a single role targeting a
  predefined value type (`String` by default, or the attribute's declared type) and a
  generated `verbalizes` template (mirrors the reference flights ontology, where entity
  attributes are relationships to `String`/`Float`/etc.). Attributes do NOT become their own
  concepts; the attribute `description` is retained on the relationship.
- **Metadata preservation**: DataAsset fields without an OSI home (`identifier`,
  `schemaVersion`, `dataOwner`, `originApplication`, `responsibilities`, top-level `tags`,
  and entity `classification`/`tags`, attribute `example`/`additionalInformation`/
  `predefinedValues`) are stored under `custom_extensions` (vendor bag: `vendor_name:
  "collibra-data-asset"`, `data`: JSON string) on the document and/or encoded in concept
  `ai_context`. This satisfies "preserve non-mappable metadata" without inventing OSI fields.

### 4. DataAsset input schema — minimal Zod mirror

Add a `DataAssetSchema` in `osi-schema` mirroring only what conversion needs (`name`,
`description`, `schemaVersion`, `entities` with `displayName` required, attribute
`displayName` required), using `.passthrough()` so unknown DataAsset keys survive to the
custom-extension bag. Full enum/format validation from `data_asset_schema_3.0.1.json` is out
of scope.

### 5. UI — new `ImportDataAssetButton`

Clone the `ImportButton` flow (file picker restricted to `.yaml`/`.yml`/`.json`, confirm
dialogs for parse-error / unsupported / unsaved / validation) into an
`ImportDataAssetButton` that calls a new `importDataAsset(text, fileName)` API helper and
loads the returned ontology via `loadDocument`. Placed in the shell toolbar next to the OSI
Import. Shared dialog wiring may be factored out if duplication is large; otherwise kept
separate for clarity.

## Risks / Trade-offs

- **Attribute explosion → large ontologies**: entities with many attributes generate many
  relationships on the entity concept. → Acceptable for a first-draft ontology the user
  refines; graph layout already handles many nodes. Revisit if performance suffers.
- **Concept-name collisions across entities**: two entities with same-named attributes. →
  Namespace attribute concept names by entity key; keep verbalize templates readable.
- **Metadata stuffed into `custom_extensions`**: not first-class/editable in the UI. →
  Preserves data losslessly now; a future change can surface it natively.
- **Detection false positives**: a non-DataAsset object that happens to have `entities` +
  `schemaVersion`. → Low risk given OSI documents use different top-level keys; reject and
  report if entity conversion fails.

## Migration Plan

Additive only. New converter + schema in `osi-schema`, new API endpoint, new UI button. No
changes to existing OSI import/export, document kinds, or store behavior. No data migration.
Rollback = remove the new endpoint/button; existing flows unaffected.

## Open Questions

- Should the generated ontology also seed a placeholder `ontology_mappings` entry per entity
  to speed later physical mapping, or leave a single empty map? (Leaning: single empty map.)
- Preferred encoding for preserved metadata — `custom_extensions` bag vs. per-concept
  `ai_context`. (Leaning: document-level `custom_extensions` for lossless preservation.)
