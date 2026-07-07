## Why

Importing an Output Port currently replaces the entire active model, so a user assembling a
data product's Output Ports (or adding Output Port tables to a model they are already editing)
has to overwrite their session on every import. Users need to add an imported Output Port to
the current model — "without clearing everything out" — so tables from several Output Ports can
be built up and viewed together in one editable semantic model.

## What Changes

- Add an **add-vs-replace** choice to the Output Port import flow: when a document is already
  loaded (a semantic model, or an ontology), the user can **replace** the current document
  (current behavior) or **add** the imported Output Port to the current model. When no document
  is loaded, import behaves exactly as today (replace/load only).
- "Add" merges the converted Output Port's datasets into the currently active semantic model —
  or, for an ontology document, into its active nested semantic model — instead of replacing it,
  so existing datasets and fields (and an ontology's concepts and mappings) remain.
- Dataset names that collide with datasets already in the model are made unique so nothing is
  silently overwritten.
- Preserved Output Port metadata (the `output-port` `custom_extensions` bags) is accumulated
  across merged imports rather than discarded.
- Merging into the current model leaves the document dirty (unsaved) and does not reset the
  document identity, so graph layout and selection for the existing datasets are preserved.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `output-port-import`: The import action gains the ability to merge an imported Output Port
  into the currently loaded document — the active semantic model, or an ontology document's
  nested semantic model — instead of only replacing it, including dataset-name collision
  handling and metadata accumulation.

## Impact

- `packages/osi-schema`: new merge helper that appends the datasets of a converted Output Port
  semantic-model document into an existing semantic-model document (dataset-name
  uniquification, `output-port` metadata accumulation); a shared append helper also feeds a
  variant that merges into an ontology document's nested semantic model; exported from the
  package index.
- `apps/web/src/store/editorStore.ts`: new action to merge Output Port datasets into the active
  semantic model (or an ontology's nested model) without resetting document identity, plus an
  `isSemanticModelDoc` guard.
- `apps/web/src/components/io/ImportOutputPortButton.tsx`: add the replace-vs-add choice when a
  semantic-model or ontology document is already loaded and wire the "add" choice to the merge
  action.
- No breaking changes: the existing replace/load path, the converter, the `/api/import-output-port`
  endpoint, and other import flows are unchanged. Builds on `add-output-port-import` (which
  introduces the base `output-port-import` capability).
