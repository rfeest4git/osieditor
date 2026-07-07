## Context

The workspace has three foldable regions managed by boolean collapse flags in a Zustand store ([apps/web/src/store/editorStore.ts](apps/web/src/store/editorStore.ts)): the left navigator, the right source preview, and the graph selection-detail inspector. Layout is pure Tailwind 4 + flexbox: the side regions use fixed widths (`w-72`, `w-96`) and the center pane uses `flex-1` to reclaim space when a region collapses. There is no resizing and no maximize capability today. State is session-scoped (in-memory Zustand), not persisted to storage.

This change adds drag-to-resize for the three side regions and a single-region full-screen mode, staying within the existing store + Tailwind approach without introducing a heavy panel library.

## Goals / Non-Goals

**Goals:**
- Users can drag an inner-edge handle to resize each side region within min/max bounds.
- Resized widths persist for the session and survive collapse/expand and center-view switches.
- Users can maximize any one region to fill the workspace and restore it afterward.
- Keep the dependency surface unchanged (no new layout library).

**Non-Goals:**
- Persisting layout to `localStorage` or across page reloads (state remains session-scoped, consistent with current behavior).
- Resizing the center pane directly (it continues to flex to fill remaining space).
- Vertical/height resizing or multi-region split arrangements.
- Native browser Fullscreen API usage; full-screen here means filling the app workspace area, not the OS screen.

## Decisions

### Decision: Widths stored as numeric pixels in the Zustand store
Add `navigatorWidth`, `sourcePreviewWidth`, and `inspectorWidth` (numbers, seeded from current fixed widths: navigator 288px = `w-72`, source preview / inspector 384px = `w-96`) plus setter actions. Widths are applied via inline `style={{ width }}` while keeping Tailwind for the rest.

- **Why:** Matches the existing session-scoped store pattern; minimal footprint; easy to clamp and persist for the session.
- **Alternative considered:** A dedicated library such as `react-resizable-panels` or `allotment`. Rejected to avoid a new dependency and to preserve the current collapse/flex behavior which these libraries would partly replace.

### Decision: Lightweight custom drag-to-resize hook
Implement a small `usePanelResize` hook using pointer events (`pointerdown` on the handle, `pointermove`/`pointerup` on `window`, with `setPointerCapture`). The hook computes the new width from pointer delta and calls the store setter with clamping to `[MIN, MAX]`. For right-side regions the delta sign is inverted (dragging left widens).

- **Why:** Pointer events unify mouse/touch, `setPointerCapture` gives robust dragging outside the handle, and clamping enforces the spec's min/max requirement.
- **Alternative considered:** CSS `resize: horizontal`. Rejected — it only resizes toward one direction from a corner grip, lacks min/max symmetry for right-docked panels, and gives poor affordance/UX.

### Decision: Min/max width constraints
Define per-region constants: min ~200px, max clamped to a fraction of the viewport (e.g. `min(MAX_PX, ~40vw)`) so the center pane always keeps usable space. Clamp in the hook before writing to the store.

- **Why:** Satisfies the "width is clamped to limits" scenario and prevents the center content from being crowded out.

### Decision: Full-screen mode via a single `fullscreenRegion` store field
Add `fullscreenRegion: 'navigator' | 'sourcePreview' | 'inspector' | null` with `toggleFullscreenRegion(region)` and `exitFullscreen()` actions. When set, the layout renders only that region filling the workspace and hides the others; setting a new region replaces the previous one (enforcing single-region full-screen). Exiting restores the prior collapse/width state, which is untouched while maximized.

- **Why:** A single nullable field naturally enforces "only one region full-screen at a time" and keeps restore trivial since underlying collapse/width state is preserved.
- **Alternative considered:** Per-region boolean `maximized` flags. Rejected — would require extra logic to guarantee mutual exclusion.

### Decision: Maximize/restore and resize affordances
Each region header gains a maximize/restore `PButtonPure` (Porsche Design System) using an expand icon when normal and a compress/exit icon when maximized, alongside the existing collapse toggle. The resize handle is a thin (~4–6px) hoverable strip on the inner edge with `cursor-col-resize`.

- **Why:** Consistent with existing icon-button affordances; discoverable and matches the spec's exit-affordance requirement.

## Risks / Trade-offs

- **Drag performance / re-render churn** → Update width via the store on `pointermove`; if jank appears, throttle with `requestAnimationFrame`. Widths are simple numbers so re-renders are cheap.
- **Resize handle overlapping graph/scroll interactions** → Keep the handle a narrow dedicated strip with its own cursor and pointer capture so drags don't leak into canvas panning or text selection (disable text selection during drag).
- **Full-screen hides in-progress context (e.g., selection)** → Underlying state is preserved, not reset; exiting restores exactly the prior layout, so no data/selection is lost.
- **Clamp interacting with very small viewports** → Max width uses a viewport-relative bound so the center pane retains space on narrow screens; min width keeps the region legible.
- **State not persisted across reloads** → Intentional (Non-Goal); consistent with existing collapse behavior. Can be revisited later if users request durable layouts.

## Migration Plan

Purely additive UI/state change in the web app; no schema, API, or data migration. New store fields default to current widths and `fullscreenRegion: null`, so initial render is unchanged. Rollback is reverting the web changes.

## Open Questions

- Should double-clicking a resize handle reset the region to its default width? (Nice-to-have; can be added in tasks if desired.)
- Should full-screen be dismissible via the `Esc` key in addition to the on-screen affordance? (Recommended; low cost.)
