# Tasks

## 1. Schema: merge helper

- [x] 1.1 Add `mergeOutputPortModel(target, incoming)` in `packages/osi-schema/src/outputPort.ts` that appends every dataset of the incoming converted document's semantic models into the target document's first (active) semantic model and returns a new document (no mutation of `target`).
- [x] 1.2 Reuse the existing `uniqueDatasetName` helper so an incoming dataset whose name collides with a dataset already in the target model — or with another dataset added in the same merge — is uniquified with a `_N` suffix rather than overwriting.
- [x] 1.3 Accumulate preserved metadata: keep each incoming dataset's `output-port` `custom_extensions` bag with the dataset, and append each incoming model-level `output-port` bag onto the target active model's `custom_extensions` so port-level metadata from every merged import is retained.
- [x] 1.4 Export `mergeOutputPortModel` from `packages/osi-schema/src/index.ts`.
- [x] 1.5 Add unit tests in `packages/osi-schema/src/outputPort.test.ts` covering: datasets appended to the active model, existing datasets retained, all ports in a multi-port file added, dataset-name collision uniquification, non-colliding names unchanged, and model-level + dataset-level metadata accumulation.

## 2. Editor store: merge action

- [x] 2.1 Add an `isSemanticModelDoc(doc)` helper (exported) in `apps/web/src/store/editorStore.ts` that is true for a non-null document that is not an ontology document and carries a `semantic_model` array.
- [x] 2.2 Add a `mergeSemanticModelDatasets(incoming)` action (and its type) that reads the current `doc`, guards with `isSemanticModelDoc`, computes `mergeOutputPortModel(current, incoming)` against a plain snapshot, replaces `state.doc`, sets `dirty = true`, and does NOT bump `docLoadId` or reset `selection`/`activeModelIndex`.
- [x] 2.3 Add a store test verifying a merge preserves prior datasets, appends the new ones, keeps selection, marks dirty, and does not change `docLoadId`.

## 3. Import UI: replace vs add

- [x] 3.1 In `apps/web/src/components/io/ImportOutputPortButton.tsx`, add a `ChooseModeDialog` (replace vs add) — mirroring `ImportDataAssetButton` — shown when import succeeds and a semantic-model document is already loaded.
- [x] 3.2 Wire the "add" choice to `mergeSemanticModelDatasets` and keep the "replace" choice using `loadDocument`, routing replace through the existing unsaved-changes confirm.
- [x] 3.3 Keep the no-document-loaded path unchanged (replace/load only), and preserve the existing parse-error, unsupported, and validation-confirm guards for both paths.

## 4. Verify

- [x] 4.1 Run `pnpm -r test`, `pnpm -r typecheck`, and lint; fix any failures.
- [x] 4.2 Run the sample Output Ports through the UI end-to-end: import one, then import another choosing "add", and confirm both sets of datasets appear together in the graph.
- [x] 4.3 Run `openspec validate merge-output-port-import --strict` and resolve any issues.

## 5. Extend merge to ontology documents

- [x] 5.1 Factor the dataset-append logic into a shared `appendOutputPortDatasets(activeModel, incoming)` helper and add `mergeOutputPortIntoOntology(target, incoming, mapIndex)` in `packages/osi-schema/src/outputPort.ts`, appending the Output Port's datasets into `ontology_mappings[mapIndex].semantic_model` and returning the target unchanged when no such map exists.
- [x] 5.2 Add unit tests covering: datasets appended to the nested model with concepts/mappings preserved, collision uniquification, port-level metadata accumulation, targeting a specific map index, and the no-map no-op.
- [x] 5.3 Branch `mergeSemanticModelDatasets` on the current doc kind so an ontology document merges into its active nested semantic model (via `activeMapIndex`); add a store test that the ontology's concepts are preserved while the datasets are appended.
- [x] 5.4 Offer the replace-vs-add choice in `ImportOutputPortButton` when an ontology document is loaded (so importing an Output Port no longer clears the ontology).
- [x] 5.5 Re-run `pnpm -r test`, `pnpm -r typecheck`, lint, and `openspec validate merge-output-port-import --strict`; verify end-to-end (load an ontology, add an Output Port, confirm concepts kept and datasets added).
