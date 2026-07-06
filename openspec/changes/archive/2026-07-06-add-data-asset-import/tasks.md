## 1. DataAsset schema & detection (osi-schema)

- [x] 1.1 Add a minimal `DataAssetSchema` (Zod, `.passthrough()`) in `packages/osi-schema/src/model.ts` mirroring the conversion-relevant fields of `data_asset_schema_3.0.1.json` (`name`, `description`, `schemaVersion`, `entities` with entity `displayName` required and attribute `displayName` required); export the inferred `DataAsset` type
- [x] 1.2 Add `detectDataAsset(raw): boolean` that returns true when the root is a non-array object with an `entities` object and a `schemaVersion` string
- [x] 1.3 Vendor `data_asset_schema_3.0.1.json` under `packages/osi-schema/vendor/` and note it in `VENDOR.md`

## 2. Converter (osi-schema)

- [x] 2.1 Add `toConceptName(key)` and attribute-concept naming helpers (namespaced by entity key) producing names matching `^[A-Z][a-zA-Z0-9_-]*$`
- [x] 2.2 Implement `dataAssetToOntology(dataAsset): OntologyDocument` — map each entity to an `EntityType` `OntologyComponent`, combining `displayName` + `description` into the concept description
- [x] 2.3 For each attribute, add a `ManyToOne` `OntologyRelationship` to the owning entity component whose single role targets a predefined value type (`String` by default, or the attribute's declared type) with a generated `verbalizes` template (attributes are not separate concepts)
- [x] 2.4 Seed document `name`/`description` from the DataAsset and preserve non-mappable metadata (`identifier`, `schemaVersion`, `dataOwner`, `originApplication`, `responsibilities`, `tags`, entity `classification`/`tags`, attribute `example`/`additionalInformation`/`predefinedValues`) via a `collibra-data-asset` `custom_extensions` bag
- [x] 2.5 Add `importDataAssetText(text, filename?, format?)` in `packages/osi-schema/src/import.ts` that parses (reusing `detectFormat`/`parse`), rejects non-DataAsset roots (`unsupported`), converts, validates the ontology, and returns an `ImportResult`-shaped object
- [x] 2.6 Export the new schema, detector, converter, and import function from `packages/osi-schema/src/index.ts`

## 3. Converter tests (osi-schema)

- [x] 3.1 Add a fixture DataAsset YAML under `packages/osi-schema/test/fixtures/` (based on the provided sample)
- [x] 3.2 Unit-test `dataAssetToOntology`: entities → EntityType concepts, attributes → ManyToOne relationships to a predefined `String` value type, and metadata preserved in `custom_extensions`
- [x] 3.3 Test `importDataAssetText`: valid conversion, parse error, non-DataAsset `unsupported`, and validation diagnostics for missing required fields

## 4. API endpoint (apps/api)

- [x] 4.1 Add `POST /api/import-data-asset` mirroring `/api/import`, delegating to `importDataAssetText` and returning the same response contract
- [x] 4.2 Add an app test in `apps/api/src/app.test.ts` covering success, parse error, and non-DataAsset rejection

## 5. Web UI (apps/web)

- [x] 5.1 Add `importDataAsset(text, fileName)` to `apps/web/src/lib/api.ts` calling the new endpoint
- [x] 5.2 Add `ImportDataAssetButton` in `apps/web/src/components/io/` reusing the confirm-dialog flow (parse-error, unsupported, unsaved-confirm, validation-confirm) and calling `loadDocument` with the converted ontology
- [x] 5.3 Wire `ImportDataAssetButton` into the shell toolbar next to the existing OSI Import

## 6. Verification

- [x] 6.1 Run the provided sample DataAsset through the UI end-to-end and confirm the ontology loads with expected concepts/relationships in the graph
- [x] 6.2 Run `pnpm -r test`, `pnpm -r typecheck`, and lint; fix any failures
- [x] 6.3 Run `openspec validate add-data-asset-import` and resolve any issues
