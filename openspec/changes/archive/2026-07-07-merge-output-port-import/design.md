## Context

`add-output-port-import` added a one-way Output Port import: `ImportOutputPortButton` →
`/api/import-output-port` → `importOutputPortText` → `outputPortToSemanticModel`, producing an
OSI **semantic-model** document (`{ version, semantic_model: SemanticModel[] }`) where each
output port becomes a `SemanticModel`, each table a `Dataset`, and each field a `Field`. That
flow is **replace-only**: it always calls `loadDocument`, discarding the active model.

The Data Asset import already solved the analogous problem (`import-multiple-data-assets`): when
a compatible document is loaded, the user chooses **replace** or **add to session**, and "add"
calls `mergeOntologyComponents` → `mergeDataAssetOntology(target, incoming)` — a pure helper in
`packages/osi-schema` that appends the incoming ontology's components, uniquifies colliding
concept names, and accumulates the preserved metadata bag. The store action replaces `doc`,
sets `dirty`, and does **not** bump `docLoadId` or reset selection, preserving graph layout.

A key constraint shapes this design: the semantic-model navigator and graph render **only the
active model** (`getActiveModel(doc, activeModelIndex, …)`, where `activeModelIndex` is always
`0`); there is no model-switcher UI. So the visible, mergeable unit of a semantic-model document
is the **dataset**, just as the ontology's visible unit is the **concept/component**.

## Goals / Non-Goals

**Goals:**
- Let a user **add** an imported Output Port to the currently loaded semantic model instead of
  replacing it, so datasets from several Output Ports accumulate in one editable model.
- Reuse the established replace-vs-add UX and the pure-merge-helper pattern from the Data Asset
  merge for parity and testability.
- Preserve existing content, document identity, graph layout, and selection on merge; keep all
  preserved Output Port metadata across merged imports.

**Non-Goals:**
- Appending Output Ports as separate, switchable semantic models (blocked by the absence of a
  model-switcher UI; datasets are merged into the active model instead).
- Any change to the converter, the `/api/import-output-port` endpoint, or the replace path.

## Decisions

### 1. Merge unit — append datasets into the active model, not append models

"Add" merges the converted Output Port's **datasets** into the currently active semantic model.
The navigator/graph only ever render `semantic_model[0]`, so appending new `semantic_model[]`
entries would be invisible and would not satisfy the user goal ("added … without clearing
everything out"). Datasets are the semantic-model analog of the ontology components that the
Data Asset merge appends into the (fully rendered) `ontology` array.

_Alternative considered:_ append whole `SemanticModel`s to `semantic_model[]` (the direct
structural analog of component-append). Rejected: with no model switcher the added models are
not visible, defeating the purpose; it would need a separate navigation feature first.

### 2. Flatten multiple incoming ports into the active model

A converted Output Port document may contain more than one `SemanticModel` (one per output
port). Merge appends the datasets of **all** incoming models into the single active model, so a
multi-port file adds all its tables at once. Port-level metadata is accumulated (Decision 4) so
nothing is lost by flattening.

### 3. Pure merge helper in `packages/osi-schema`

Add `mergeOutputPortModel(target, incoming)` in `packages/osi-schema/src/outputPort.ts`,
mirroring `mergeDataAssetOntology`: a pure function taking the target semantic-model document
and the incoming converted document, returning a **new** document with the incoming datasets
appended to the target's first (active) semantic model. This keeps merge logic unit-testable in
the schema package and the store action thin.

_Alternative considered:_ merge inline in the store with immer. Rejected for parity with the
Data Asset merge helper and to keep the logic covered by schema-package unit tests. The helper
targets `semantic_model[0]` because the store's active model index is always `0`.

### 4. Metadata accumulation

Each converted **dataset** already carries its own `output-port` `custom_extensions` bag
(`identifier`, `database`, `schema`, `type`) and moves with the dataset, so dataset metadata is
preserved automatically. Each incoming **model-level** `output-port` bag (`identifier`,
`platform`) is **appended** to the target active model's `custom_extensions` array — multiple
`output-port` bags are allowed (the schema is an unconstrained array) — so port-level metadata
from every merged import is retained rather than overwritten.

_Alternative considered:_ deep-merge a single bag's JSON (as the Data Asset merge does with
`mergeCollibraMetadata`). Rejected: output ports are distinct entities, so appending separate
bags is lossless and simpler, with no keys to reconcile.

### 5. Dataset-name collision handling

When an incoming dataset name collides with a dataset already in the target model — or with an
earlier incoming dataset in the same merge — it is uniquified with a `_N` suffix (reusing the
converter's existing `uniqueDatasetName` precedent) so no dataset is silently overwritten.

### 6. Store action + document-kind guard

Add `mergeSemanticModelDatasets(incoming)` to `apps/web/src/store/editorStore.ts`, mirroring
`mergeOntologyComponents`: read the current `doc`, guard it with a new `isSemanticModelDoc`
helper, compute `mergeOutputPortModel(current, incoming)` against a plain snapshot, replace
`state.doc`, set `dirty = true`, and do **not** bump `docLoadId` or reset
`selection`/`activeModelIndex` — so graph layout and selection for the existing datasets are
preserved. `isSemanticModelDoc(doc)` is true when `doc` is non-null, is not an ontology
document, and carries a `semantic_model` array.

### 7. UI — replace-vs-add choice in `ImportOutputPortButton`

Clone the Data Asset button's `ChooseModeDialog` pattern: when import succeeds and a
semantic-model document is already loaded, present a **replace vs add** choice. "Replace" keeps
the current `loadDocument` path (still routed through the unsaved-changes guard); "add" calls
`mergeSemanticModelDatasets`. When no document is loaded, the existing replace-only path is
unchanged. The parse-error, unsupported, and validation-confirm guards are preserved for both
paths.

### 8. Extend the merge to ontology documents

An ontology document holds its datasets in the active nested semantic model
(`ontology_mappings[activeMapIndex].semantic_model`), which the editor renders via
`getActiveModel`. Importing an Output Port while an ontology was loaded therefore hit the
replace-only path and discarded the entire ontology (concepts, relationships, mappings) — a
data-loss surprise. So the merge is extended to ontology documents: the dataset-append logic is
factored into a shared `appendOutputPortDatasets(activeModel, incoming)` helper reused by both
`mergeOutputPortModel` (semantic-model docs) and a new `mergeOutputPortIntoOntology(target,
incoming, mapIndex)` (ontology docs, appending into `ontology_mappings[mapIndex].semantic_model`
and leaving concepts/mappings untouched). `mergeSemanticModelDatasets` branches on the current
doc kind (`isSemanticModelDoc` / `isOntologyDoc`), and `ImportOutputPortButton` offers the
replace-vs-add choice whenever a semantic-model **or** ontology document is loaded. Collision
handling, metadata accumulation, and session-identity preservation match the semantic-model
merge.

## Risks / Trade-offs

- **Flattening multiple ports into one model loses the per-port model boundary** → Port-level
  metadata is preserved in accumulated `output-port` bags and each dataset keeps its own bag, so
  the boundary can be reconstructed if ever needed. Acceptable because the single-active-model
  UI cannot surface multiple models anyway.
- **Merge into an ontology replaces vs. adds is a heavier choice** — an ontology's "replace"
  discards its concepts and mappings, while "add" only appends datasets → the add/replace dialog
  makes the choice explicit and defaults the primary action to "add", so the ontology is never
  cleared without an explicit choice.
- **Converter's identity field expressions may not fit the target model's dialect** → Unchanged
  from the base import; the user can edit any expression afterward.
- **Converted document has validation errors on the add path** → The same "load anyway / cancel"
  validation-confirm applies before the merge is committed.

## Migration Plan

Additive only: a new schema merge helper, a new store action plus an `isSemanticModelDoc` guard,
and a new dialog branch in `ImportOutputPortButton`. No changes to the converter, the endpoint,
or the existing replace path. This change builds on `add-output-port-import`; that change should
be archived first so the `output-port-import` capability's base spec exists for the MODIFIED
delta here.

## Open Questions

- Should a later change add a model switcher so appending Output Ports as separate models
  becomes viable? Deferred; merging datasets into the active model keeps added content visible
  today.
- Should merging into an ontology document's nested semantic model be supported? Deferred as a
  Non-Goal.
