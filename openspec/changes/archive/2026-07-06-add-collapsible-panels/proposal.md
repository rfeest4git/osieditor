## Why

The editor workspace is split into fixed side panels — the left navigator (Ontology/Concepts tree) and the right source preview (YAML/JSON) — that always occupy their full width. On smaller screens, or when a user wants to focus on the graph or the form editor, these panels waste horizontal space and cannot be temporarily hidden to give the central content room to breathe.

## What Changes

- Add a collapse/expand control to the **left navigator** panel so it can be hidden to a thin rail and restored on demand.
- Add a collapse/expand control to the **right source preview** panel so it can be hidden and restored on demand.
- When a panel is collapsed, the central content (form editor / relationship graph) expands to reclaim the freed horizontal space.
- Collapsed/expanded state is preserved for the duration of the session so the layout does not reset on every interaction.
- Provide clear, discoverable affordances (a toggle button with an icon) and keep collapsed panels re-openable.

## Capabilities

### New Capabilities
- `workspace-layout`: Collapsing and expanding the workspace's side panels (navigator and source preview) to give the central editor/graph more space, including the toggle affordances and state persistence within a session.

### Modified Capabilities
<!-- No spec-level requirement changes to existing capabilities; the navigator and source-preview behaviors themselves are unchanged, only their show/hide layout is added. -->

## Impact

- **Affected UI**: `apps/web/src/routes/__root.tsx` (navigator aside), `apps/web/src/routes/index.tsx` (source-preview aside and center pane), and the shell components under `apps/web/src/components/shell/`.
- **State**: A small amount of layout UI state (per-panel collapsed flag) held in the editor store or a dedicated layout store.
- **No API, schema, or data-model changes.**
