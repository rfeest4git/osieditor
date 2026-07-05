## Context

OSIEditor is greenfield: the repo currently contains only OpenSpec scaffolding. We are building a web-based graphical editor for OSI (Open Semantic Interchange) semantic models. An OSI model is a JSON/YAML document with a root Semantic Model that owns `datasets` (each with `fields`), `metrics`, and `relationships`; fields and metrics carry multi-dialect `expression` objects. The source of truth for the schema is the OSI `core-spec` (`osi-schema.json` / `spec.yaml`).

The chosen stack is fixed by the user: pnpm workspaces + Turborepo monorepo; TypeScript 5.9 (ES2022, `moduleResolution: "bundler"`); frontend on Vite 6 + React 19, TanStack Router (file-based) + TanStack Query, Tailwind CSS 4 (OKLCH tokens, shadcn-style) and Porsche Design System v4; API on Hono 4 (`@hono/node-server`) with Zod validation; deployed as a multi-stage Docker image behind nginx on port 8080.

## Goals / Non-Goals

**Goals:**
- A canonical, typed, Zod-validated in-app OSI model shared by frontend and API.
- Import `.json` / `.yaml` / `.yml`, edit via forms + an ERD graph, validate live, export to JSON or YAML with round-trip fidelity.
- One monorepo that builds to a single Docker image served by nginx on 8080.
- Spec-accurate validation: required fields, referential integrity, key arity, uniqueness.

**Non-Goals:**
- Format converters (dbt, Tableau, GoodData, etc.).
- Persistent server-side storage, accounts, or multi-user collaboration.
- Editing every vendor extension by form — `custom_extensions`/`ai_context` are preserved and shown, edited as raw where no structured form exists.

## Decisions

### Monorepo layout
- `packages/osi-schema` — Zod schemas + TypeScript types for the OSI model, plus `parse`, `serialize`, and `validate` functions. **Framework-free**, imported by both `apps/web` and `apps/api`.
- `apps/web` — Vite/React SPA (the editor).
- `apps/api` — Hono service.
- `packages/ui` (optional) — shared Porsche/Tailwind wrappers if needed.
- Turborepo orchestrates `build`/`lint`/`typecheck`/`test`; pnpm workspaces link packages.
- **Rationale:** the schema/validation logic is the core asset and must be identical on both tiers, so it lives in a shared package rather than being duplicated.

### Role of the Hono API
The editor is client-side, but the user mandated a Hono API + nginx. The API will:
- Serve the built SPA static assets (nginx proxies `/` to the SPA and `/api/*` to Hono).
- Expose `POST /api/import` (parse+validate an uploaded JSON/YAML payload → normalized model + diagnostics), `POST /api/export` (model + format → serialized text), and `POST /api/validate` (model → diagnostics).
- **Rationale:** keeping parse/validate/serialize reachable server-side gives a stable contract, keeps heavy/edge YAML handling off the critical UI path, and leaves room for future converters. The same `packages/osi-schema` runs client-side too, so the app still works without round-trips; API endpoints are the authoritative path used for import/export.
- **Alternative considered:** pure static SPA with no API — rejected because the user specified a Hono API and Docker/nginx topology.

### Serialization / YAML
- Use the `yaml` package (eemeli) for YAML parse/stringify (comment/anchor awareness, good round-trip behavior); `JSON.parse`/`stringify` for JSON.
- Detect format by extension first, falling back to content sniffing (leading `{`/`[` ⇒ JSON).
- Round-trip fidelity: parse into the canonical model, keep unknown keys (`custom_extensions`, `ai_context`, unrecognized vendor fields) via passthrough in the Zod schema so export re-emits them.
- **Alternative considered:** `js-yaml` — rejected in favor of `yaml` for better round-trip and typed document API.

### Domain model & validation
- Zod schemas model the spec; `.passthrough()` on objects preserves unknown fields.
- Two validation layers: (1) **structural** via Zod (types, required fields, enums like dialect), (2) **semantic** via custom checks over the parsed model (referential integrity of relationships, `from_columns`/`to_columns` arity equality, unique names within scope). Both return a flat `Diagnostic[]` (`{ severity, path, message, entityRef }`) so the UI can anchor errors to entities.
- **Rationale:** Zod can't express cross-entity rules cleanly; separating structural and semantic validation keeps each simple and testable.

### Frontend state & data flow
- **Editor (client) state** — the active model, selection, and dirty flag — lives in a Zustand store (single source of truth for edits). TanStack Query is used for API interactions (import/export/validate calls), not for owning the edited model.
- Immutable updates through small typed actions (addDataset, updateField, deleteRelationship, …) so undo/redo and dirty-tracking are straightforward.
- The live source preview and the graph both derive from the same store, guaranteeing form/graph/preview stay in sync.
- **Rationale:** the edited model is client-owned mutable state, which is a poor fit for TanStack Query's server-cache model; Zustand fits and keeps derivations cheap.

### Graph view
- Use **React Flow** (`@xyflow/react`) for the ERD: dataset nodes, relationship edges, drag-to-connect (`onConnect` creates a relationship then opens a key-mapping form).
- Nodes/edges are derived from the store; selection is bidirectional with the form editor.
- **Alternative considered:** hand-rolled SVG / Cytoscape — React Flow gives interaction (drag, connect, pan/zoom, selection) out of the box with a React-idiomatic API.

### UI system
- Porsche Design System v4 web components as the primary component layer, with Tailwind 4 (OKLCH tokens) for layout and app-specific styling; shadcn-style local primitives only where PDS lacks a component.
- React 19 interops with PDS custom elements (attributes/props, `ref`); wrap awkward ones in thin React components.

### Deployment
- Multi-stage Dockerfile: build stage runs `pnpm install` + `turbo build`; runtime stage runs the Hono server (Node) and nginx. nginx listens on 8080, serves SPA static files, proxies `/api` to Hono.

## Risks / Trade-offs

- **[Porsche DS + React 19 web-component interop friction]** → Isolate PDS usage behind thin React wrappers; validate the interop early with a spike before building all forms.
- **[Round-trip fidelity loss for unknown/vendor fields]** → Zod passthrough + a dedicated round-trip test corpus (import→export→diff) drawn from the OSI `examples/` (e.g. TPC-DS) in CI.
- **[Spec drift]** → Vendor the OSI `osi-schema.json` version we target and record it; add a check/issue process when upstream changes. Do not hand-maintain schemas divergently from the vendored file.
- **[Duplicated validation logic client vs server]** → Single shared `packages/osi-schema` used by both; no re-implementation.
- **[Large models degrade graph performance]** → React Flow virtualization / only render viewport; defer optimization until measured.
- **[YAML edge cases (anchors, multi-doc)]** → Use `yaml` document API; document that only single-document OSI files are supported in v1.

## Migration Plan

Greenfield — no data migration. Deployment: build image, run behind nginx on 8080. Rollback = redeploy previous image. First milestone is a vertical slice (import JSON → view in form editor → export JSON) to de-risk the shared-schema + API + UI wiring before adding YAML, the graph, and full editing.

## Open Questions

- Which exact OSI `osi-schema.json` revision/tag do we target and vendor first?
- Are undo/redo and localStorage session persistence in scope for v1, or deferred?
- Do we need file-open via the File System Access API (Chromium) in addition to upload, or is upload/download sufficient for v1?
