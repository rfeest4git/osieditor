## Why

Teams author data definitions as Collibra **DataAsset** YAML files (entities + attributes,
per `data_asset_schema_3.0.1.json`), but the OSI editor can only open OSI semantic-model or
ontology documents. Users have no way to bootstrap an OSI ontology from an existing
DataAsset, forcing them to re-model entities and attributes by hand. Converting a DataAsset
into a first-draft ontology removes that manual step and lets the existing ontology editor,
graph, and export take over.

## What Changes

- Add a dedicated **Import Data Asset** action (separate from the existing OSI Import) that
  accepts a Collibra DataAsset `.yaml`/`.yml`/`.json` file.
- Recognize the DataAsset shape (top-level `entities` map with `schemaVersion`) and convert
  it **one-way** into an OSI ontology document:
  - Each DataAsset **entity** becomes an `EntityType` concept (carrying `displayName` →
    description context, tags, classification notes).
  - Each **attribute** becomes a `ManyToOne` ontology relationship on its owning
    entity concept, whose single role targets a predefined value type (`String`
    unless the attribute declares another type), with a generated `verbalizes`
    template. Attributes do not become their own concepts.
  - Top-level DataAsset metadata (`name`, `description`, `dataOwner`, `identifier`, tags)
    seeds the ontology document `name`/`description` and is preserved via
    `custom_extensions`/`ai_context` where no native OSI field exists.
- Report conversion problems (not a DataAsset, missing required fields) with the same
  parse/validation confirmation UX as the OSI importer, without discarding current work.
- The converted ontology loads as the active document and is thereafter edited/exported as
  a normal OSI ontology (no DataAsset export).

## Capabilities

### New Capabilities
- `data-asset-import`: Detect and convert a Collibra DataAsset YAML/JSON document into an
  OSI ontology document (entities → EntityType concepts, attributes → ManyToOne
  ManyToOne relationships), including error reporting and loading the result as the active
  model.

### Modified Capabilities
<!-- No existing spec requirements change; import is additive via a new action and a new converter. -->

## Impact

- **`packages/osi-schema`**: new DataAsset input schema (mirroring
  `data_asset_schema_3.0.1.json`) and a `dataAssetToOntology` converter; exported from the
  package index. Reuses existing `parse`/`detectFormat` and ontology model types.
- **`apps/web`**: new `ImportDataAssetButton` component reusing the confirm-dialog flow and
  the editor store `loadDocument`; wired into the shell toolbar alongside the OSI Import.
- **`apps/api`**: optional new `/api/import-data-asset` endpoint mirroring `/api/import`
  (converter runs server-side for parity with existing import), or the converter runs
  client-side — decided in design.
- No breaking changes to existing OSI import/export or document kinds.
