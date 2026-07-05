## Why

Binding ontology concepts to physical data is the whole point of the mapping layer, yet in practice it is not usable through the UI. A `ConceptMappingForm` exists, but it edits `object_mappings`, `referent_mappings`, and `link_mappings` as raw free-text strings (a `"dataset.column"` placeholder, hand-typed relationship names). Users have no way to *see* which datasets, fields, and relationships are available, so authoring a correct binding by hand is effectively unsupported. This change turns the raw structural tree into a guided binding editor driven by the model's actual datasets, fields, and relationships.

## What Changes

- Replace the free-text `expression` inputs in the concept-mapping editor with guided pickers sourced from the active map's nested semantic model: choose a **Dataset**, then choose a **Field** within it (or fall back to a raw expression for advanced cases).
- Replace the free-text `relationship` inputs (in `referent_mappings` and `link_mappings`) with a dropdown of ontology relationships defined for the concept being mapped.
- Guide the top-level binding flow: an `object_mapping` binds the concept to a **Dataset**; `referent_mappings` map the concept's identifiers to **key fields**; `link_mappings` map each attribute/relationship to a **field**.
- Add live, mapping-specific diagnostics that flag broken `dataset.field` expression references at the field where they occur, using the existing diagnostics surface. (Relationship references are steered by the guided picker rather than validated, since OSI permits a mapping's relationship name to diverge from the declared relationship name — the reference `flights` model relies on this.)
- Preserve full round-trip fidelity and keep a raw-expression escape hatch so advanced/custom expressions are never blocked.

## Capabilities

### New Capabilities
<!-- None. This builds on the existing ontology-editing capability rather than introducing a new spec surface. -->

### Modified Capabilities
- `ontology-editing`: Upgrade the "Author concept mappings" requirement from a free-text tree to a guided binding editor (dataset/field/relationship pickers sourced from the model, with a raw-expression fallback), and extend live validation to surface broken mapping references (dataset, field, or relationship) at the offending field.

## Impact

- `apps/web/src/components/editor/ConceptMappingForm.tsx` — replace free-text inputs with dataset/field/relationship pickers; add per-field diagnostics.
- `apps/web/src/store/editorStore.ts` — selectors exposing the active map's datasets/fields and the concept's ontology relationships as picker options; ensure `updateConceptMapping` supports the new edit paths.
- `apps/web/src/lib/diagnostics.ts` (and validation in `packages/osi-schema/src/validation.ts`) — surface mapping-reference diagnostics at mapping paths.
- No document schema change: `ConceptMapping`/`object_mappings`/`link_mappings` in `packages/osi-schema/src/model.ts` and API endpoints are unaffected; round-trip fidelity preserved.
