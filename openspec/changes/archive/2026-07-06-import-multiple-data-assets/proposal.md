## Why

Today, importing a Collibra DataAsset replaces the entire active model, so a user who
wants to work with several DataAssets together must repeatedly overwrite their session.
Users need to assemble multiple DataAssets into one ontology so entities from different
assets can be viewed, related, and mapped side by side without losing prior imports.

## What Changes

- Add a "merge" mode to the DataAsset import flow so a subsequent DataAsset can be
  appended to the current ontology document instead of replacing it.
- When a document is already loaded, the DataAsset import control offers the user a
  choice to **replace** the active model (current behavior) or **add to** the current
  session (new behavior). When no document is loaded, import behaves as today.
- Merging appends each DataAsset entity's `EntityType` concept (and its attribute
  relationships) into the existing ontology components, de-duplicating/uniquifying
  concept names that collide with concepts already present.
- Preserved DataAsset metadata (the `collibra-data-asset` `custom_extensions` bag) is
  accumulated across merged imports rather than overwritten.
- Merging into a session leaves the document dirty (unsaved) and does not reset the
  document identity, so graph layout and selection are preserved for the existing
  content.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `data-asset-import`: The import action gains the ability to merge an additional
  DataAsset into the currently loaded ontology instead of only replacing the active
  model, including concept-name collision handling and metadata accumulation.

## Impact

- `packages/osi-schema`: new merge helper to combine a converted DataAsset ontology
  into an existing ontology document (concept/relationship append, name
  uniquification, metadata bag accumulation).
- `apps/web/src/store/editorStore.ts`: new action to merge ontology components into the
  active document without resetting document identity.
- `apps/web/src/components/io/ImportDataAssetButton.tsx`: add the replace-vs-add choice
  in the import flow and wire it to the merge action.
