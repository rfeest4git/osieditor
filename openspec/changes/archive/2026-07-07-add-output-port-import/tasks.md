## 1. Output Port schema & detection (packages/osi-schema)

- [x] 1.1 Add a minimal `OutputPortDocumentSchema` (Zod, `.passthrough()`) in `packages/osi-schema/src/model.ts` mirroring the conversion-relevant fields (`schemaVersion`, `outputPorts[]` with `name` + `tables[]`, each table's `table` name + optional `fields[]`, each field's `name`); export the inferred `OutputPortDocument`, `OutputPortTable`, and `OutputPortField` types.
- [x] 1.2 Add `detectOutputPort(raw)` in `model.ts` that recognizes a non-array object carrying an `outputPorts` array and a `schemaVersion` string.

## 2. Converter (packages/osi-schema)

- [x] 2.1 Create `packages/osi-schema/src/outputPort.ts` with `outputPortToSemanticModel(doc)` that returns an `OsiDocument` — one `SemanticModel` per output port (name/description seeded), reusing `createEmptyModel`/`createDataset`/`createField`/`createExpression` from `factory.ts`.
- [x] 2.2 Map each table to a `Dataset`: `name` from the table name, `source` composed from available `database`/`schema`/`table` parts joined with `.`, `description` preserved; uniquify colliding dataset names within a model.
- [x] 2.3 Map each field to a `Field`: `name` from the source field, a default identity `expression` seeded from the column name, and `dimension.is_time = true` when the field `type` is `date` or `timestamp`.
- [x] 2.4 Preserve non-mappable metadata in `output-port` `custom_extensions` bags: field (`type`, `entityAttribute`, `filterRuleReference`), dataset (`identifier`, `database`, `schema`, `type`), and model (`identifier`, `platform`); export a `OUTPUT_PORT_VENDOR` constant.

## 3. Import entry point (packages/osi-schema)

- [x] 3.1 Add `importOutputPortText(text, filename?, format?)` in `packages/osi-schema/src/import.ts`, mirroring `importDataAssetText`: return `parseError` on unparseable input, `unsupported` when `detectOutputPort` is false, otherwise the converted semantic-model document (`kind: 'semantic-model'`) with `OutputPortDocumentSchema` + `validate` diagnostics.
- [x] 3.2 Export the new schema, types, `detectOutputPort`, `outputPortToSemanticModel`, and `importOutputPortText` from `packages/osi-schema/src/index.ts`.

## 4. API endpoint (apps/api)

- [x] 4.1 Add a `POST /api/import-output-port` route in `apps/api/src/app.ts` mirroring `/api/import-data-asset`, calling `importOutputPortText` and returning the shared response contract (`format`, `document`, `diagnostics`, `kind?`, `unsupported?`, `parseError?`).

## 5. Web UI (apps/web)

- [x] 5.1 Add `importOutputPort(text, fileName)` to `apps/web/src/lib/api.ts` calling the new endpoint and returning the existing `ImportResponse` shape.
- [x] 5.2 Add `ImportOutputPortButton` in `apps/web/src/components/io/` (labelled "Import Outputport") reusing the confirm-dialog flow (parse-error, unsupported, unsaved-confirm, validation-confirm) and calling `loadDocument` with the converted semantic-model document.
- [x] 5.3 Wire `ImportOutputPortButton` into the shell toolbar in `apps/web/src/components/shell/Header.tsx` next to `ImportDataAssetButton`.

## 6. Tests

- [x] 6.1 Add `packages/osi-schema/src/outputPort.test.ts` covering the sample mapping: output ports → models, tables → datasets with composed `source`, fields → fields with seeded expressions, temporal `is_time`, dataset-name uniquification, and preserved metadata; plus `detectOutputPort` positive/negative cases and `importOutputPortText` parse-error/unsupported paths.
- [x] 6.2 Add an `/api/import-output-port` case to `apps/api/src/app.test.ts` (valid Output Port converts; non-Output-Port returns `unsupported`; malformed returns `parseError`).

## 7. Verification

- [x] 7.1 Run the provided `samples/data_product/outputports/datasphere.yml` through the UI end-to-end and confirm the semantic model loads with the expected datasets and fields in the graph.
- [x] 7.2 Run `pnpm -r test`, `pnpm -r typecheck`, and lint; fix any failures.
- [x] 7.3 Run `openspec validate add-output-port-import --strict` and resolve any issues.
