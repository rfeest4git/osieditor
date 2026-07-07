## Context

The OSI editor holds two document kinds — semantic-model and ontology — parsed and validated
in `packages/osi-schema` (`model.ts`, `io.ts`, `import.ts`, `validation.ts`) and loaded into
the editor store via `loadDocument`. Two import flows already exist:

- OSI import: `ImportButton` → `/api/import` → `importText`, classifying a root as
  `semantic-model` / `ontology`.
- Data Asset import: `ImportDataAssetButton` → `/api/import-data-asset` → `importDataAssetText`
  → `dataAssetToOntology`, converting a Collibra DataAsset into an OSI **ontology** document.

Data product Output Port files (see `samples/data_product/outputports/datasphere.yml`) are a
**different** shape: `{ version, schemaVersion, outputPorts[] }`, where each output port is
`{ name, identifier, description?, platform?, tables[] }`, each table is
`{ description?, database?, schema?, table, identifier?, type?, fields[]? }`, and each field is
`{ name, entityAttribute?, type?, filterRuleReference? }`. Unlike a DataAsset (which maps to the
ontology layer), an Output Port describes physical tables and columns — a natural fit for the
OSI **semantic-model** layer (`SemanticModel` → `Dataset` → `Field`).

## Goals / Non-Goals

**Goals:**
- A dedicated **Import Outputport** action that converts an Output Port file one-way into an
  OSI semantic-model document and loads it as the active model.
- Reuse the established import UX (parse-error, unsupported, unsaved-confirm, validation-confirm)
  and the server-side conversion pattern for parity with the Data Asset import.
- Preserve Output Port metadata that has no native OSI home so nothing is lost.

**Non-Goals:**
- Merging/adding an Output Port into an already-loaded model (replace/load only for now; a
  merge flow can follow, mirroring how `import-multiple-data-assets` followed the initial
  Data Asset import).
- Wiring a field's `entityAttribute` into ontology `concept_mappings` (the value is preserved
  for a future change, not yet interpreted).
- Round-tripping an OSI model back out to Output Port format (import is one-way).

## Decisions

### 1. Where conversion runs — server-side, mirroring `/api/import-data-asset`

Add a new `/api/import-output-port` endpoint that mirrors the existing DataAsset endpoint and
returns the same response contract (`{ format, document, diagnostics, kind?, unsupported?,
parseError? }`). This keeps parsing/conversion in one place and matches the existing pattern,
so the web client stays thin.

_Alternative considered:_ client-side conversion. Rejected for consistency — both existing
imports parse/convert server-side, and the shared response contract already drives the dialogs.

### 2. Detection — top-level `outputPorts` array + `schemaVersion`

Add `detectOutputPort(raw)` alongside `detectDocumentKind` / `detectDataAsset`. An Output Port
root is a non-array object with an `outputPorts` array and a `schemaVersion` string. This is
distinct from OSI documents (`semantic_model` / `ontology` arrays) and DataAssets (`entities`
map), so misclassification is unlikely. `importOutputPortText` returns `unsupported` when the
root is not an Output Port, leaving the active model unchanged.

### 3. Conversion mapping — output port → model, table → dataset, field → field

`outputPortToSemanticModel` (new `packages/osi-schema/src/outputPort.ts`) produces an
`OsiDocument`:

- Each `outputPort` → one `SemanticModel` (`name`/`description` seeded from the port). Multiple
  ports produce multiple models; the first is active.
- Each `table` → one `Dataset`: `name` from the table name, `source` composed from the
  available `database` / `schema` / `table` parts joined with `.`, `description` preserved.
  Dataset names are uniquified within a model to avoid silent overwrite.
- Each `field` → one `Field`: `name` from the source field.

### 4. Field expression default + temporal dimension

`Field.expression` is required by the OSI schema, but Output Port fields carry only a physical
column name, not a transformation. Seed an identity single-dialect expression from the column
name (`createExpression(fieldName)`), which is valid and editable. When a field's `type` is
`date` or `timestamp`, set `dimension.is_time = true` — a meaningful, low-cost mapping onto the
one native OSI field concept that fits.

### 5. Metadata preservation via per-element `custom_extensions`

`Field`, `Dataset`, and `SemanticModel` all support `custom_extensions` (a `{ vendor_name,
data }` bag where `data` is a JSON string). Preserve non-mappable values locally on the element
they belong to under a single `output-port` vendor name:

- Field: `{ type, entityAttribute, filterRuleReference }`
- Dataset: `{ identifier, database, schema, type }`
- SemanticModel: `{ identifier, platform }`

This keeps metadata close to the object it describes and survives an export round trip.

### 6. Input schema — minimal Zod mirror

Add a minimal `OutputPortDocumentSchema` (Zod, `.passthrough()`) in `model.ts` covering only
the conversion-relevant fields (`schemaVersion`, `outputPorts[]` with `name` + `tables[]`, each
table's `table` name + optional `fields[]`, each field's `name`). `.passthrough()` keeps every
other key so preservation into `custom_extensions` stays lossless. A Zod check drives
`required_field` diagnostics, matching the DataAsset "load anyway / cancel" UX.

### 7. UI — new `ImportOutputPortButton`

Clone the `ImportDataAssetButton` flow (file picker restricted to `.yaml`/`.yml`/`.json`;
confirm dialogs for parse-error / unsupported / unsaved / validation) into an
`ImportOutputPortButton` that calls a new `importOutputPort(text, fileName)` API helper and
loads the returned semantic-model document via `loadDocument`. Placed in the shell toolbar next
to Import Data Asset. Because the initial scope is replace/load only, the button does not need
the DataAsset button's three-way "add to session" dialog.

## Risks / Trade-offs

- **Multiple output ports → multiple semantic models, but model-switching UI is limited** →
  Load the first model as active; all models are preserved in the document and round-trip on
  export, so no data is lost even if the navigator does not yet surface a model switcher.
- **Identity field expressions may not be valid for every dialect/source** → They are a
  best-effort default for a one-way import; the user can edit any expression afterward.
- **Dataset-name collisions within a port** → Uniquify names on conversion so no dataset is
  silently overwritten (mirrors the DataAsset concept-name uniquification precedent).
- **`entityAttribute` is preserved but not yet interpreted** → Stored in `custom_extensions`
  so a later change can wire it into ontology concept mappings without a re-import.

## Migration Plan

Additive only: new schema symbols, a new converter, a new endpoint, and a new button. No
changes to existing OSI import/export, Data Asset import, document kinds, or stored data. No
rollback concerns beyond removing the new, self-contained additions.

## Open Questions

- Should a future iteration offer "add to current model" (append datasets/models) like the
  Data Asset merge flow? Deferred as a Non-Goal for this change.
- Should `entityAttribute` eventually seed ontology `concept_mappings` automatically? Deferred;
  the value is preserved to enable it later.
