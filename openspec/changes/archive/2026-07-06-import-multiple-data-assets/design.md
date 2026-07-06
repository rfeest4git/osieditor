## Context

The DataAsset import flow converts a Collibra DataAsset into an OSI ontology document
(`dataAssetToOntology` in `packages/osi-schema/src/dataAsset.ts`) and applies it via the
editor store's `loadDocument`, which resets the whole session: it swaps `doc`, resets
`activeModelIndex`/`activeMapIndex`, resets `selection`, clears `dirty`, and bumps
`docLoadId` (triggering graph auto-arrange). This means a second DataAsset import always
replaces the first — there is no way to view several DataAssets together.

The ontology document already stores entities as an array of `OntologyComponent`s under
`doc.ontology`, and non-mappable DataAsset metadata under a single `custom_extensions` bag
with `vendor_name: 'collibra-data-asset'` holding a JSON string. Concept names are derived
from entity keys via `toConceptName` and must match `^[A-Z][a-zA-Z0-9_-]*$`.

## Goals / Non-Goals

**Goals:**
- Let a user add additional DataAssets to the currently loaded ontology without starting a
  new session.
- Preserve existing entities, selection, and graph content when merging.
- Avoid silently overwriting concepts whose names collide.
- Accumulate preserved metadata across merged imports.

**Non-Goals:**
- Merging OSI semantic-model documents or arbitrary OSI files (only DataAsset → ontology
  merge is in scope).
- Deduplicating or reconciling semantically-equivalent entities across DataAssets (a
  collision is resolved by uniquifying names, not by merging the two concepts).
- Cross-DataAsset relationship inference between entities of different assets.

## Decisions

### Decision: Add a pure `mergeDataAssetOntology` helper in `osi-schema`

Introduce a pure function that takes the current ontology document and a freshly converted
DataAsset ontology document and returns a new ontology document with the incoming
components appended. Keeping this in `osi-schema` (alongside `dataAssetToOntology`) keeps
the merge logic unit-testable and independent of React/store code.

Alternatives considered: doing the merge inline in the store action. Rejected because the
name-collision and metadata-accumulation logic warrants dedicated tests and reuse.

### Decision: Resolve name collisions by uniquifying the incoming concept

When an incoming concept name already exists in the target ontology, append a numeric
suffix (e.g. `Customer` → `Customer_2`) that still satisfies the concept-name pattern, and
rewrite that component's relationship `verbalizes` templates (which embed the concept name)
to the new name. The existing concept is left untouched.

Alternatives considered: (a) skip the colliding entity — rejected, it drops data; (b) deep-
merge the two concepts' relationships — rejected as out of scope and error-prone.

### Decision: Accumulate metadata by merging the `collibra-data-asset` bag

Parse the existing `collibra-data-asset` `custom_extensions` JSON (if any) and the incoming
one, and combine them (e.g. under per-DataAsset keyed entries or a merged structure) so no
earlier metadata is lost. If the current document has no such bag, the incoming bag is
added as-is.

### Decision: New store action `mergeOntologyComponents` that does not reset session

Add an editor-store action that appends merged components/metadata to the active ontology
`doc`, sets `dirty = true`, and does NOT bump `docLoadId` or reset `selection`/indices, so
existing graph layout and selection are preserved. Merge is only valid when the active doc
is an ontology document (`isOntologyDoc`).

### Decision: Import control offers replace-vs-add when a document is loaded

In `ImportDataAssetButton`, when the DataAsset parses/converts successfully and an ontology
document is already loaded, present a choice (replace the active model vs add to the current
session) before applying. When no document is loaded, behave as today (load as active).
Parse/unsupported/validation guards are unchanged.

## Risks / Trade-offs

- [Name-suffix collisions could still theoretically repeat] → Uniquify by scanning all
  existing names and incrementing the suffix until unique.
- [Verbalizes templates reference concept names by string] → Rewrite only the incoming
  component's own templates using the exact old→new name substitution to avoid corrupting
  unrelated text.
- [Metadata bag shape divergence across imports] → Namespace accumulated metadata so
  combining is additive and never overwrites prior keys.
- [User confusion between replace and add] → Present a clear, explicit choice only when a
  document is already loaded; keep the no-document path unchanged.

## Migration Plan

No data migration required. The change is additive: existing single-import behavior is
preserved for the no-document-loaded path, and the new add-to-session path is opt-in via the
import dialog. Rollback is removing the merge helper, store action, and the dialog choice.

## Open Questions

- Exact suffix format for uniquified names (`_2` vs ` (2)` — must stay within the
  `^[A-Z][a-zA-Z0-9_-]*$` pattern, so a `_N` suffix is preferred).
