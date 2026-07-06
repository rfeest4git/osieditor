# Tasks

## 1. Schema: merge helper

- [x] 1.1 Add `mergeDataAssetOntology(target, incoming)` in `packages/osi-schema/src/dataAsset.ts` that appends the incoming ontology's `OntologyComponent`s into the target ontology document and returns a new document.
- [x] 1.2 Implement concept-name collision handling: scan existing concept names, derive a unique `_N`-suffixed name for a colliding incoming concept (keeping the `^[A-Z][a-zA-Z0-9_-]*$` pattern), and rewrite that component's relationship `verbalizes` templates to the new name.
- [x] 1.3 Accumulate the `collibra-data-asset` `custom_extensions` metadata bag by combining the existing and incoming preserved metadata without overwriting earlier entries.
- [x] 1.4 Export the new helper from `packages/osi-schema/src/index.ts`.
- [x] 1.5 Add unit tests in `packages/osi-schema` covering: append of a second DataAsset, name-collision uniquification (with verbalizes rewrite), non-colliding names unchanged, and metadata accumulation from both DataAssets.

## 2. Editor store: merge action

- [x] 2.1 Add a `mergeOntologyComponents` action (and its type) to `apps/web/src/store/editorStore.ts` that merges incoming components/metadata into the active ontology `doc`, sets `dirty = true`, and does NOT bump `docLoadId` or reset `selection`/`activeMapIndex`.
- [x] 2.2 Guard the action so it only applies when the active document is an ontology document (`isOntologyDoc`).
- [x] 2.3 Add a store test verifying a merge preserves prior entities, adds new ones, keeps selection, marks dirty, and does not change `docLoadId`.

## 3. Import UI: replace vs add

- [x] 3.1 In `apps/web/src/components/io/ImportDataAssetButton.tsx`, when import succeeds and an ontology document is already loaded, present a replace-vs-add choice before applying.
- [x] 3.2 Wire the "add to session" choice to `mergeOntologyComponents` and keep the "replace" choice using `loadDocument`; preserve existing parse/unsupported/validation guards.
- [x] 3.3 Keep the no-document-loaded path unchanged (load as active model).

## 4. Verify

- [x] 4.1 Run `pnpm test` for `osi-schema` and `web` and fix failures.
- [x] 4.2 Run `openspec validate import-multiple-data-assets --strict` and resolve any issues.
