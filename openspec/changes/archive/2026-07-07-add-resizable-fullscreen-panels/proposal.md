## Why

The workspace panels (navigator, source preview, graph inspector) are collapsible but have fixed widths, so users cannot tune how much space each region gets. When focusing on the ontology tree, editing a large YAML source, or reading a wide inspector form, users need to give one region more room — and sometimes to devote the entire workspace to a single region. Fixed widths force awkward horizontal scrolling and truncation.

## What Changes

- Make the foldable side regions resizable by dragging a handle on their inner edge: the left **navigator**, the right **source preview**, and the graph **selection-detail inspector**.
- Enforce sensible minimum and maximum widths while dragging so no region collapses to unusable size or crowds out the center content.
- Persist each region's resized width for the session (alongside the existing collapsed/expanded state).
- Add a **full-screen (maximize) control** to each foldable region that expands one region to fill the entire workspace, hiding the others; activating it again (or an exit affordance) restores the previous layout.
- Ensure only one region can be full-screen at a time; entering full-screen for one region exits any other.

## Capabilities

### New Capabilities
<!-- None: this extends the existing workspace-layout capability. -->

### Modified Capabilities
- `workspace-layout`: Add requirements for user-resizable panel widths (with min/max constraints and session persistence) and a single-region full-screen/maximize mode. Existing collapse/expand requirements are unchanged.

## Impact

- **Web app** ([apps/web/src/](apps/web/src/)):
  - Store: [apps/web/src/store/editorStore.ts](apps/web/src/store/editorStore.ts) — add per-panel width state, resize actions, and a full-screen region flag with actions.
  - Layout: [apps/web/src/routes/__root.tsx](apps/web/src/routes/__root.tsx) and [apps/web/src/routes/index.tsx](apps/web/src/routes/index.tsx) — replace fixed Tailwind widths with dynamic widths, render drag handles, and honor full-screen mode.
  - Components: [apps/web/src/components/shell/Navigator.tsx](apps/web/src/components/shell/Navigator.tsx), [apps/web/src/components/editor/SourcePreview.tsx](apps/web/src/components/editor/SourcePreview.tsx), [apps/web/src/components/graph/GraphView.tsx](apps/web/src/components/graph/GraphView.tsx) — add resize handles and maximize/restore affordances.
- **Styling**: Tailwind 4 utility classes + inline dynamic width styles; no new layout library required (a lightweight drag-to-resize hook keeps the dependency surface unchanged).
- **No API, schema, or backend changes.**
