## Why

OSI (Open Semantic Interchange) defines a vendor-agnostic semantic model, but the specs are authored as raw JSON/YAML by hand — tedious and error-prone across datasets, fields, metrics, relationships, and multi-dialect SQL expressions. A graphical editor lets authors create, edit, import, and validate OSI models visually, with structured forms and a relationship graph, instead of editing serialized files directly.

## What Changes

- Stand up a new pnpm + Turborepo monorepo (web frontend + Hono API) that serves the OSI Editor application.
- Model the OSI core spec as typed, Zod-validated domain types (Semantic Model → datasets → fields; plus metrics and relationships, with multi-dialect expression objects).
- **Import** existing OSI files by uploading/opening `.json`, `.yaml`, or `.yml`, parsing them into the in-app model, and reporting validation errors.
- **Export** the current model back to OSI as either JSON or YAML.
- Provide a **form/tree editor**: a navigator for datasets, fields, metrics, and relationships, with structured, validated forms per entity.
- Provide a **relationship graph** (ERD-style) view: datasets as nodes, relationships as edges, with drag-to-connect and click-to-edit.
- Live validation surfacing spec violations (missing required fields, dangling references, mismatched key arities) and a source (JSON/YAML) preview.
- UI built with Porsche Design System v4, Tailwind CSS 4 (OKLCH tokens), TanStack Router/Query on React 19.

Non-goals (this change): converters to/from other formats (dbt, Tableau, etc.), persistent multi-user storage/accounts, and real-time collaboration.

## Capabilities

### New Capabilities
- `osi-model-schema`: Canonical in-app representation of an OSI semantic model — typed/Zod schemas for models, datasets, fields, metrics, relationships, and multi-dialect expressions, plus semantic validation against the OSI core spec (referential integrity, key arity, uniqueness).
- `osi-file-io`: Import OSI files from JSON and YAML into the in-app model, and export the model back to JSON or YAML, with round-trip fidelity and parse/validation error reporting.
- `model-form-editor`: Form/tree editing experience — navigate and create/edit/delete datasets, fields, metrics, and relationships through structured, inline-validated forms, with a live source preview and unsaved-change tracking.
- `relationship-graph`: Visual ERD/graph view of datasets and their relationships — nodes per dataset, edges per relationship, drag-to-connect to create relationships, and selection that drives the detail form.

### Modified Capabilities
<!-- None — greenfield project; no existing specs in openspec/specs/. -->

## Impact

- **New codebase**: greenfield monorepo (`apps/web`, `apps/api`, shared `packages/*`). No existing code to migrate.
- **Dependencies**: pnpm, Turborepo, TypeScript 5.9, Vite 6, React 19, TanStack Router + Query, Tailwind CSS 4, Porsche Design System v4, Hono 4 (@hono/node-server), Zod, a YAML library, and a graph/diagram library for the ERD view.
- **Deployment**: Docker multi-stage image behind an nginx reverse proxy on port 8080.
- **External contract**: must track the OSI core-spec schema (`core-spec/osi-schema.json`) so imported/exported files stay spec-compliant.
