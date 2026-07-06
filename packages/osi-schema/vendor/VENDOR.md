# Vendored OSI schemas

This directory holds **verbatim copies** of the Open Semantic Interchange (OSI)
JSON Schemas. Do not hand-edit them — re-vendor from upstream when bumping the
target version. OSI defines two top-level document kinds and one schema for each:

| File                   | Upstream path                | Document kind             |
| ---------------------- | ---------------------------- | ------------------------- |
| `osi-schema.json`      | `core-spec/osi-schema.json`  | Semantic-model document   |
| `ontology-schema.json` | `ontology/ontology.json`     | Ontology document         |

A third schema is vendored for **import only** (it is not an OSI document kind):

| File                             | Source                       | Document kind             |
| -------------------------------- | ---------------------------- | ------------------------- |
| `data_asset_schema_3.0.1.json`   | Collibra DataAsset schema    | DataAsset (import source) |

`data_asset_schema_3.0.1.json` describes the Collibra **DataAsset** shape
(`schemaVersion` + `entities` map of entities/attributes). The editor converts a
DataAsset **one-way** into an OSI ontology document (`dataAssetToOntology` in
`src/dataAsset.ts`); it is never exported. The Zod mirror in
`src/model.ts` (`DataAssetSchema`) is minimal — it covers only the fields the
conversion needs and uses `.passthrough()` so unmapped keys survive into a
`custom_extensions` bag. Full enum/format validation from the DataAsset schema is
out of scope.

Both are vendored from the same ref/version:

| Field         | Value                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Source repo   | https://github.com/open-semantic-interchange/OSI                      |
| Spec version  | `0.2.0.dev0` (see `version.const` in each schema)                     |
| Vendored ref  | `main` @ `056b5aadc555c0af123af26720324e940a7ee92d`                   |
| Vendored on   | 2026-07-05                                                            |
| License       | Apache-2.0                                                            |

The ontology schema `$ref`s the core-spec schema for `AIContext` and
`SemanticModel` (an ontology document nests a `semantic_model` inside each entry
of `ontology_mappings`), so the two files are kept in lockstep.

## Re-vendoring

```sh
curl -sSL https://raw.githubusercontent.com/open-semantic-interchange/OSI/main/core-spec/osi-schema.json \
  -o packages/osi-schema/vendor/osi-schema.json
curl -sSL https://raw.githubusercontent.com/open-semantic-interchange/OSI/main/ontology/ontology.json \
  -o packages/osi-schema/vendor/ontology-schema.json
```

Then update the ref/version/date above and re-run the round-trip tests. The Zod
schemas in `src/model.ts` are hand-maintained to mirror these files; when a
vendored schema changes, review `src/model.ts` for drift.

## Fixtures

`test/fixtures/` holds verbatim example documents from the same ref, used for the
import→export→diff round-trip tests:

- `tpcds_semantic_model.yaml` — from `examples/tpcds_semantic_model.yaml` (semantic-model kind).
- `flights.yaml` — from `examples/flights.yaml` (ontology kind, with nested `semantic_model` and `concept_mappings`).
