## Context

OSIEditor is a pnpm/Turbo monorepo: `packages/osi-schema` (framework-free Zod model +
parse/serialize/validate), `apps/api` (Hono import/export/validate), `apps/web` (Vite +
React 19 SPA, Zustand editor store, React Flow graph). The schema package currently mirrors
only the **semantic_model** layer of a vendored OSI JSON Schema (`vendor/osi-schema.json`,
v0.2.0.dev0). That vendored schema contains **no ontology definitions** — verified by
grepping it for `ontology`, `Concept`, `EntityType`, `multiplicity`, `roles` (zero hits).

The OSI standard's ontology layer, present in the reference `examples/flights.yaml`, adds:

- **`ontology`** — Concepts (`EntityType` / `ValueType`) and ontology Relationships
  (`multiplicity`, `roles`, `verbalizes`, `derived_by`, `requires`).
- **`ontology_mappings`** — `concept_mappings` with nested `object_mappings` /
  `link_mappings` (`referent_mappings` and `children` trees) binding concepts and
  relationships to semantic_model expressions.

The whole architecture already leans on `.passthrough()` for round-trip fidelity, so
ontology data is *currently preserved verbatim on round-trip but is invisible and
unvalidated*. This change makes it first-class: typed, validated, editable, and visualized.

## Goals / Non-Goals

**Goals:**

- Typed Zod schemas + TS types for Concepts, ontology Relationships, and ontology_mappings,
  folded into `OsiDocumentSchema` without breaking semantic_model behavior.
- Import / validate / export round-trip fidelity for ontology-bearing documents, including
  the reference `flights.yaml`.
- Editing UI (forms + Navigator + EditorPane) for concepts, relationships, and mappings.
- Graph visualization of the ontology with layer toggle and drag-to-connect.
- Ontology-aware validation diagnostics (broken concept/relationship/dataset references).

**Non-Goals:**

- A reasoning engine, verbalization NL generation, or query execution over the ontology.
- Auto-deriving mappings from the semantic_model (mappings are authored manually).
- Changing the semantic_model layer's schema or UI beyond additive integration points.
- Multi-document (`semantic_model[]` > 1) ontology cross-linking beyond what files already
  express.

## Decisions

**1. Source the authoritative ontology schema, then mirror it in Zod (don't hand-invent).**
The current vendored schema predates the ontology layer. We will vendor the OSI ontology
schema from the upstream repo (`ontology/ontology.json` + the semantic-layer definitions),
update `vendor/osi-schema.json` and `VENDOR.md` provenance, and mirror the ontology
definitions as new Zod schemas in `model.ts`. Rationale: the Zod model is the project's
source of truth for validation and types; keeping it faithful to a pinned vendored schema
is the established pattern. *Alternative rejected:* infer the shape only from `flights.yaml`
— too lossy and version-fragile.
  - Reconcile the version string: if the ontology definitions live in a newer OSI release
    than `0.2.0.dev0`, bump `OSI_SPEC_VERSION` and note the reconciliation in `VENDOR.md`.

**2. Keep `.passthrough()` and required-field-focused validation.** New schemas
(`ConceptSchema`, `OntologyRelationshipSchema`, `RoleSchema`, `ConceptMappingSchema`,
`ObjectMappingSchema`, `ReferentMappingSchema`, `LinkMappingSchema`) follow the existing
convention: validate required fields + enum membership (`type`, `multiplicity`), passthrough
unknown keys. Rationale: consistent with the round-trip fidelity design already documented in
`model.ts`. The recursive mapping trees (`referent_mappings` / `children`) use
`z.lazy(...)`.

**3. Model the OSI ontology document as its own top-level kind (RESOLVED during apply —
supersedes the original "extend the envelope" plan).** Inspecting the authoritative
`ontology/ontology.json` and the raw `flights.yaml` showed the ontology is **not** additive
blocks on the semantic-model envelope. An OSI ontology document is a distinct top-level shape:
`{ version, name, description?, ai_context?, ontology: OntologyComponent[], ontology_mappings?:
OntologyMap[] }`, where each `OntologyMap` **nests** a `semantic_model` (`ontology_mappings[i]
.semantic_model`) plus `concept_mappings`. `flights.yaml` has no top-level `semantic_model` at
all. Therefore:
  - Add `OntologyDocumentSchema` alongside the existing `OsiDocumentSchema`; export a union for
    "any OSI document" the editor can hold.
  - `importText` **detects the kind** (top-level `ontology` ⇒ ontology doc; top-level
    `semantic_model` ⇒ semantic-model doc) and returns which. This replaces the old
    `detectUnsupported`, which deliberately *rejected* ontology docs.
  - The ontology layer's `Expression` is a **plain ANSI-SQL string**, distinct from the
    semantic-model layer's multi-dialect `{ dialects: [...] }` object — the two must not be
    conflated.
  - Per user decision, both kinds are editable. The nested `semantic_model` inside an ontology
    doc is edited by pointing the **existing** dataset/field/metric/relationship machinery at
    `ontology_mappings[activeMapIndex].semantic_model`, so no duplicate semantic-model UI.
  *Alternative rejected:* forcing ontology data into the semantic-model envelope — diverges from
  the standard and cannot round-trip real files like `flights.yaml`.

**4. Validation lives in `validation.ts` as pure functions over the parsed model.**
Add ontology integrity checks: concept `type` in enum; relationship `roles[].concept`
resolves to a known concept; multiplicity in enum; `concept_mappings[].concept` resolves;
mapping expressions reference known datasets/fields where determinable. Surfaced through the
existing `/api/validate` → diagnostics pipeline and the web `DiagnosticsBanner`. Rationale:
reuses the one diagnostics channel both API and UI already share.

**5. UI mirrors the existing form/graph patterns.** New components under
`apps/web/src/components/editor/` (`ConceptForm`, `OntologyRelationshipForm`,
`ConceptMappingForm`) modeled on the existing `DatasetForm` / `RelationshipForm`; Navigator
gains an "Ontology" section; EditorPane routes to the new forms by selection type; the
Zustand `editorStore` gains ontology slices + selection kinds. GraphView gets an ontology
render mode (Concept nodes / relationship edges) with a semantic-model↔ontology toggle, and
drag-to-connect creates an `OntologyRelationship`. Rationale: lowest-friction extension of
established patterns; keeps the two layers visually separable per the `ontology-graph` spec.
  - Factory helpers (`createConcept`, `createOntologyRelationship`, `createConceptMapping`)
    added to `factory.ts` for consistent defaults.

## Risks / Trade-offs

- **Vendored ontology schema shape/version differs from `flights.yaml`** → Pin the exact
  upstream ontology schema, write the round-trip test against the real `flights.yaml` early,
  and reconcile any field-name drift in the Zod model before building UI on top.
- **Recursive mapping trees are complex to edit in a form** → First-class the *structure*
  (typed + round-trip + read/edit of nested nodes); keep the mapping editor pragmatic (tree
  view with add/remove/edit of referent/child nodes) rather than a bespoke visual builder.
- **Graph clutter when both layers render at once** → Default to a layer toggle (spec
  `ontology-graph`) rather than a merged view; mapping-to-dataset links shown on demand.
- **Scope is large for one change** → Tasks are ordered so schema + round-trip land first
  (independently valuable and testable), then validation, then editing, then graph; each
  phase is shippable.
- **Version bump could confuse existing round-trip tests** → Keep the existing
  semantic-model fixtures passing; add ontology fixtures separately.

## Migration Plan

Additive and backward-compatible — no data migration. Deploy order within the change:
schema/model + vendored refresh → validation → API diagnostics → web editing → web graph.
Rollback is reverting the change; documents authored with ontology data still round-trip
through older builds via passthrough (they simply become uneditable, not lost).

## Open Questions

- ~~Exact upstream file(s)/tag to vendor and whether it forces a version bump.~~ **Resolved:**
  vendor `ontology/ontology.json` from `main`; it declares `version.const 0.2.0.dev0` (same as
  the core-spec), so no `OSI_SPEC_VERSION` bump. Its `AIContext`/`SemanticModel` `$ref` the
  core-spec, matching our existing `SemanticModelSchema`.
- ~~Whether `flights.yaml` includes a top-level `semantic_model`.~~ **Resolved:** it does not —
  the physical model is nested at `ontology_mappings[0].semantic_model`. Drove Decision 3.
- Verbalization editing depth: plain template string vs. structured role-slot editor — start
  with a plain template field (`verbalizes` is `string[]`); revisit if authoring proves
  error-prone.
- Mapping-tree editor depth: `object_mappings`/`link_mappings` are recursive trees. Start with a
  structured add/remove/edit tree view; a visual drag builder is out of scope for this change.
