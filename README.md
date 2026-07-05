# OSI Editor

A graphical editor for **OSI (Open Semantic Interchange)** models. Create, edit,
import, and validate OSI models visually — through structured forms and an ERD-style
relationship graph — instead of hand-editing JSON/YAML.

Supports both OSI document kinds, detected automatically on import:

- **Semantic-model documents** — datasets, fields (with multi-dialect expressions),
  metrics, and foreign-key relationships.
- **Ontology documents** — concepts (`EntityType` / `ValueType`), ontology
  relationships (multiplicity, roles, verbalizations), and `ontology_mappings` that
  bind concepts to a nested semantic model. An ontology document's nested
  `semantic_model` is editable with the same dataset/field/metric forms.

Feature highlights:

- Import `.json` / `.yaml` / `.yml` OSI files and export back to either format with
  round-trip fidelity (unknown/vendor fields preserved).
- Form/tree editor for every entity, with live validation (including ontology
  integrity: concept-name uniqueness, concept-mapping references).
- Graph (React Flow) with a semantic-model ↔ ontology layer toggle, drag-to-connect,
  and on-demand concept→dataset mapping links.
- Live source preview (JSON/YAML).

Targets the vendored OSI schemas **v0.2.0.dev0** — the core semantic-model schema
(`packages/osi-schema/vendor/osi-schema.json`) and the ontology schema
(`packages/osi-schema/vendor/ontology-schema.json`); see `VENDOR.md` for provenance.

## Repository layout

```
packages/osi-schema   Zod model + parse/serialize/validate (framework-free, shared)
apps/api              Hono API (import/export/validate) on @hono/node-server
apps/web              Vite + React SPA (the editor)
docker/               nginx config + container entrypoint
scripts/smoke.mjs     End-to-end runtime smoke test
```

Monorepo tooling: **pnpm workspaces + Turborepo**, TypeScript 5.9.

## Prerequisites

- **Node.js ≥ 20** (Node 22 recommended)
- **pnpm 11** — install with `npm install -g pnpm@11.10.0` (or via `corepack enable`)
- Docker (optional — only for the container build)

## Setup

```sh
pnpm install
```

## Running in development

Start the API and the web app together (Turborepo runs both):

```sh
pnpm dev
```

- Web app: <http://localhost:5173>
- API: <http://localhost:3001>

The Vite dev server proxies `/api/*` to the API, so open only the web URL. To run
them individually:

```sh
pnpm --filter @osi-editor/api dev    # API with watch (tsx)
pnpm --filter @osi-editor/web dev    # Vite dev server
```

## Configuration

The app needs no configuration to run locally. Available environment variables:

| Variable  | Used by  | Default                 | Purpose                                             |
| --------- | -------- | ----------------------- | --------------------------------------------------- |
| `PORT`    | API      | `3001`                  | Port the Hono server listens on.                    |
| `API_URL` | Web dev  | `http://localhost:3001` | Proxy target for `/api` in the Vite dev server.     |

Example — run the API on a different port and point the dev proxy at it:

```sh
PORT=4000 pnpm --filter @osi-editor/api dev
API_URL=http://localhost:4000 pnpm --filter @osi-editor/web dev
```

In the production container, nginx serves the SPA on port **8080** and proxies
`/api` to the API on `127.0.0.1:3001` (see `docker/nginx.conf`).

## Build

```sh
pnpm build       # builds osi-schema, api, and web
pnpm typecheck   # type-check all packages
pnpm lint        # lint all packages
pnpm test        # unit + integration tests (incl. import→export round-trip)
```

Build outputs: `apps/web/dist` (static SPA) and `apps/api/dist` (compiled API).

To preview the production web build locally:

```sh
pnpm --filter @osi-editor/web preview
```

## Production / Docker

The multi-stage `Dockerfile` builds everything, bundles the API to a single file,
and produces an image where **nginx serves the SPA and proxies `/api` to the Node
API**, all on port 8080.

```sh
pnpm docker:build     # docker build -t osi-editor .
pnpm docker:run       # docker run --rm -p 8080:8080 osi-editor
```

Then open <http://localhost:8080>.

### Running without Docker

The API bundles to a standalone file you can run with Node:

```sh
pnpm build
pnpm --filter @osi-editor/api bundle     # → apps/api/dist/server.mjs
PORT=3001 node apps/api/dist/server.mjs  # start the API
```

Then serve the built SPA (`apps/web/dist`) with a static file server and put a
reverse proxy in front that forwards `/api` to the API — the provided
`docker/nginx.conf` is exactly this setup. For quick local use, prefer `pnpm dev`,
whose Vite dev server already proxies `/api` (note: `vite preview` serves the
static build but does **not** proxy `/api`).

## Smoke test

Verify a running server end-to-end (import → edit → export → round-trip). Point
`BASE` at the server (defaults to `http://localhost:8080`):

```sh
BASE=http://localhost:3001 pnpm smoke
```

## API endpoints

| Method + path       | Body                                  | Response                                  |
| ------------------- | ------------------------------------- | ----------------------------------------- |
| `GET /health`       | —                                     | `{ status: "ok" }`                        |
| `POST /api/import`  | `{ text, filename?, format? }`        | `{ format, kind?, document?, diagnostics }` — `kind` is `"semantic-model"` or `"ontology"` (422 + `parseError` on unparseable input) |
| `POST /api/export`  | `{ model, format: "json" \| "yaml" }` | Serialized text with download headers (accepts either document kind) |
| `POST /api/validate`| `{ model }`                           | `{ diagnostics }` (accepts either document kind) |
