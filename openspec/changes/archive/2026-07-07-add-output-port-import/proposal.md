## Why

Data product Output Port files (for example `samples/data_product/outputports/datasphere.yml`)
describe the physical tables and columns a product exposes — exactly the information an OSI
semantic model captures as datasets and fields. Today there is no way to bring an Output Port
into the editor, so users must re-enter every table and field by hand. A dedicated import turns
an Output Port file directly into an editable OSI semantic model.

## What Changes

- Add a new **Import Outputport** action to the editor toolbar, distinct from the existing
  OSI Import and Import Data Asset actions.
- Recognize an Output Port file by its top-level shape (an `outputPorts` array plus a
  `schemaVersion`) and reject files that are not Output Ports without altering the active model.
- Convert an Output Port file one-way into an OSI **semantic-model** document:
  - each `outputPort` becomes a semantic model,
  - each `table` becomes a dataset (name from the table, source from `database.schema.table`),
  - each `field` becomes a field on that dataset.
- Preserve Output Port metadata that has no native OSI field (identifiers, `platform`,
  `database`/`schema`, table `type`, field `type`, `entityAttribute`, `filterRuleReference`)
  so nothing is silently lost during conversion.
- Guard the import behind the standard flow: unsaved-changes confirmation, parse-error and
  not-an-Output-Port messaging, and a "load anyway / cancel" choice on validation issues.

## Capabilities

### New Capabilities
- `output-port-import`: A dedicated, one-way import that converts a data product Output Port
  file into an OSI semantic-model document (output ports → semantic models, tables → datasets,
  fields → fields) and loads it as the active model, preserving non-mappable metadata.

### Modified Capabilities
<!-- none: the existing OSI import and Data Asset import flows are unchanged -->

## Impact

- `packages/osi-schema`: new minimal `OutputPort` input schema + `detectOutputPort`, a
  `outputPortToSemanticModel` converter, and an `importOutputPortText` entry point; exported
  from the package index.
- `apps/api`: new `/api/import-output-port` endpoint mirroring `/api/import-data-asset`
  (conversion runs server-side for parity).
- `apps/web`: new `importOutputPort` API helper and an `ImportOutputPortButton` reusing the
  existing confirm-dialog flow, wired into the shell toolbar next to Import Data Asset.
- No breaking changes to existing OSI import/export, Data Asset import, or document kinds.
