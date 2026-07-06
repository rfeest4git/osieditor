## Context

The workspace shell is composed in two places:
- `apps/web/src/routes/__root.tsx` renders the fixed header and a two-column body: a left `<aside className="w-72 …">` holding the `Navigator`, and a `<main>` with the routed `<Outlet />`.
- `apps/web/src/routes/index.tsx` renders the routed content: a center `<section>` (form editor / relationship graph tabs) and a right `<aside className="hidden w-96 … lg:block">` holding the `SourcePreview`.

Panel widths are fixed Tailwind classes (`w-72`, `w-96`) and the right panel is only shown at `lg` breakpoints. There is no way for the user to hide either side panel to give the central content more room. UI state today lives in the Zustand `editorStore` (`apps/web/src/store/editorStore.ts`) plus small local `useState` (e.g. the center `view` toggle in `index.tsx`).

## Goals / Non-Goals

**Goals:**
- Let the user collapse and expand the left navigator and the right source-preview panels independently.
- Reclaim horizontal space for the center pane when a panel is collapsed.
- Keep a clear, discoverable toggle affordance for each panel, including a way to re-open a collapsed panel.
- Preserve each panel's collapsed/expanded state for the session across center-view switches and edits.

**Non-Goals:**
- Draggable / resizable panel widths (only collapse/expand, not free resizing).
- Persisting layout preferences to disk / localStorage across reloads (session-scoped state is sufficient for this change).
- Changing the content or behavior of the Navigator or SourcePreview themselves.
- Restructuring the header or introducing a new layout framework.

## Decisions

### Layout state lives in the Zustand editor store
Add two boolean flags — `navigatorCollapsed` and `sourcePreviewCollapsed` — plus toggle actions to `editorStore`. Rationale: the store is already the app-wide state container and is shared across `__root.tsx` and `index.tsx`, which render the two panels in different component trees. Local `useState` cannot be shared across those trees without lifting state up awkwardly. Session persistence is automatic because the store lives for the session.

- Alternative considered: a dedicated `layoutStore`. Rejected for now to avoid an extra store for two booleans; can be extracted later if layout state grows.
- Alternative considered: React context. Rejected because the existing pattern in this codebase is Zustand selectors, and mixing paradigms adds inconsistency.

### Collapse = hide panel, show a re-open rail/button
When collapsed, the panel is removed from the flex row (or reduced to a thin rail) so the center pane's `flex-1` naturally expands. A small toggle button provides the collapse action when expanded and an expand action when collapsed. Rationale: `flex-1` on the center already reclaims freed space with no width math. Using the existing Porsche Design System `PIcon`/`PButtonPure` (already used in `Navigator.tsx`) keeps affordances consistent.

- The navigator toggle and its re-open affordance live in the shell (header or the navigator column edge).
- The source-preview toggle lives in the `SourcePreview` header bar (which already has a header row) with a re-open affordance on the right edge of the center pane.

### Keep the existing responsive default
The right source-preview panel currently defaults hidden below `lg`. Collapse state is layered on top of, and does not replace, the responsive behavior; the explicit user toggle governs visibility at `lg` and above.

## Risks / Trade-offs

- [Collapsed panel becomes undiscoverable] → Always render a persistent, labeled/iconed re-open affordance (thin rail or header button) so a collapsed panel can always be restored.
- [State shared in editorStore couples layout to document state] → Keep the flags and actions clearly namespaced (`…Collapsed`, `toggle…`) and independent of document mutations so a future extraction into a layout store is trivial.
- [Session-only persistence surprises users who expect it to stick across reloads] → Acceptable for this change; documented as a Non-Goal and can be upgraded to localStorage later without changing the UI contract.

## Open Questions

- Should the navigator collapse to a zero-width (fully hidden) column with a floating re-open button, or to a thin icon rail? Default to a thin rail unless it complicates the header layout, in which case use a header toggle button.
