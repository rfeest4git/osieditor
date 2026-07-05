## 1. Monorepo & tooling scaffold

- [x] 1.1 Initialize pnpm workspaces + Turborepo at repo root (`pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `.gitignore`)
- [x] 1.2 Add shared TypeScript config (TS 5.9, ES2022, `moduleResolution: "bundler"`) and base ESLint/Prettier
- [x] 1.3 Create workspace skeletons: `packages/osi-schema`, `apps/web`, `apps/api`
- [x] 1.4 Wire Turbo pipelines: `build`, `dev`, `lint`, `typecheck`, `test`
- [x] 1.5 Vendor the target OSI `osi-schema.json` from core-spec and record its version/tag in the repo

## 2. `packages/osi-schema` — domain model & validation

- [x] 2.1 Define Zod schemas + TS types for Semantic Model, Dataset, Field, Metric, Relationship, and multi-dialect Expression (dialect enum), with `.passthrough()` for unknown/vendor fields
- [x] 2.2 Implement `parse(text, format)` and `detectFormat(filename, text)` (JSON via `JSON`, YAML via the `yaml` package)
- [x] 2.3 Implement `serialize(model, format)` for JSON and YAML with round-trip preservation of `custom_extensions`/`ai_context`
- [x] 2.4 Implement structural validation (Zod) returning a flat `Diagnostic[]`
- [x] 2.5 Implement semantic validation: relationship reference integrity, `from_columns`/`to_columns` arity, unique names within scope
- [x] 2.6 Unit tests for parse/serialize/validate, plus an import→export→diff round-trip test using an OSI `examples/` model (e.g. TPC-DS)

## 3. `apps/api` — Hono service

- [x] 3.1 Scaffold Hono 4 app on `@hono/node-server` with health check
- [x] 3.2 `POST /api/import` — parse+validate uploaded JSON/YAML payload → normalized model + diagnostics
- [x] 3.3 `POST /api/export` — model + format → serialized text (correct content-type/filename)
- [x] 3.4 `POST /api/validate` — model → diagnostics
- [x] 3.5 Zod request/response validation reusing `packages/osi-schema`; error handling for malformed input
- [x] 3.6 API integration tests for import/export/validate happy-path and error cases

## 4. `apps/web` — app shell & UI foundation

- [x] 4.1 Scaffold Vite 6 + React 19 app with TanStack Router (file-based) and TanStack Query
- [x] 4.2 Integrate Tailwind CSS 4 with OKLCH design tokens and Porsche Design System v4 (spike PDS + React 19 web-component interop; add thin React wrappers)
- [x] 4.3 Build the app shell layout (header, navigator sidebar, main editor pane, source-preview pane)
- [x] 4.4 Create the Zustand editor store: active model, selection, dirty flag, and typed mutation actions (add/update/delete for each entity)

## 5. Import / export (capability: osi-file-io)

- [x] 5.1 Import UI: file open/upload for `.json`/`.yaml`/`.yml`, calling `/api/import`, loading the model on success
- [x] 5.2 Import error handling: show parse errors without replacing the active model; show validation errors with "load anyway / cancel"
- [x] 5.3 Export UI: choose JSON or YAML, call `/api/export`, download the file
- [x] 5.4 "New empty model" action producing a valid empty skeleton

## 6. Form/tree editor (capability: model-form-editor)

- [x] 6.1 Navigator tree listing datasets (with fields), metrics, and relationships; selection wired to the store
- [x] 6.2 Dataset form (name, source, keys, description, ai_context) with create/edit/delete
- [x] 6.3 Field form including a multi-dialect expression editor (add/remove dialect rows) with create/edit/delete
- [x] 6.4 Metric form with multi-dialect expressions; create/edit/delete
- [x] 6.5 Relationship form (from/to datasets, from_columns/to_columns mapping); create/edit/delete
- [x] 6.6 Inline form validation from `packages/osi-schema`; surface model-level diagnostics (duplicates, dangling refs)
- [x] 6.7 Live source preview (JSON/YAML) derived from the store
- [x] 6.8 Unsaved-change tracking with confirm-before-discard on import/new

## 7. Relationship graph (capability: relationship-graph)

- [x] 7.1 Integrate React Flow (`@xyflow/react`); derive nodes (datasets) and edges (relationships) from the store
- [x] 7.2 Empty-state view when the model has no datasets
- [x] 7.3 Drag-to-connect (`onConnect`) creating a relationship and opening the key-mapping form
- [x] 7.4 Bidirectional selection sync between graph and form editor (node→dataset form, edge→relationship form)
- [x] 7.5 Keep graph consistent with model changes (deleted dataset removes node + connected edges)

## 8. Packaging & deployment

- [x] 8.1 Multi-stage Dockerfile: build stage (`pnpm install` + `turbo build`), runtime stage running Hono (Node) + nginx
- [x] 8.2 nginx config: listen on 8080, serve SPA static assets, proxy `/api` to Hono
- [~] 8.3 Local `docker build` + run smoke test: import a sample OSI file, edit, export, verify round-trip
      <!-- Docker is not installed on this machine, so `docker build`/run could not be executed.
           Equivalent smoke test (`scripts/smoke.mjs`, `pnpm smoke`) runs against the exact
           production API bundle (apps/api/dist/server.mjs) + built web/dist and passes:
           import TPC-DS YAML → edit (add dataset) → export JSON → YAML round-trip verified. -->


## 9. Verification

- [x] 9.1 End-to-end walkthrough covering each capability's key scenarios (import JSON+YAML, form edits, graph create/connect, export both formats, validation errors)
      <!-- Verified via automated tests + a live-artifact smoke test, covering each capability's
           logic path: import JSON & YAML + format detection (osi-schema io.test.ts, api app.test.ts);
           validation errors incl. dangling refs / duplicates / arity / required fields
           (validation.test.ts, api validate tests); form edits + graph create-connect + delete
           consistency + selection (web editorStore.test.ts); export both formats + round-trip
           (roundtrip.test.ts, scripts/smoke.mjs against the bundled production server); SPA served
           and /api proxied through Vite → Hono. NOTE: real-browser rendering of the PDS v4 web
           components and React Flow canvas was not driven here (no browser available in this
           environment); those layers are exercised at the store/logic and API level. -->
- [x] 9.2 `openspec validate --change add-osi-editor --strict` passes; CI runs typecheck/lint/test/round-trip
      <!-- `openspec validate add-osi-editor --type change --strict` → "Change 'add-osi-editor' is valid".
           CI at .github/workflows/ci.yml runs install → typecheck → lint → test (incl. round-trip) →
           build → bundle → runtime smoke test. -->

