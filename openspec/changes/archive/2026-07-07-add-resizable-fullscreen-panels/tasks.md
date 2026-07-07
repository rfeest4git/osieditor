## 1. Store: width and full-screen state

- [x] 1.1 Add numeric width fields `navigatorWidth`, `sourcePreviewWidth`, `inspectorWidth` to the store with defaults (288, 384, 384) in [apps/web/src/store/editorStore.ts](apps/web/src/store/editorStore.ts)
- [x] 1.2 Add setter actions `setNavigatorWidth`, `setSourcePreviewWidth`, `setInspectorWidth` that clamp to per-region `[MIN, MAX]` bounds
- [x] 1.3 Add `fullscreenRegion: 'navigator' | 'sourcePreview' | 'inspector' | null` field defaulting to `null`
- [x] 1.4 Add `toggleFullscreenRegion(region)` (replaces any current full-screen region, toggles off if same) and `exitFullscreen()` actions
- [x] 1.5 Define shared width constants (min ~200px, viewport-relative max) in a small module or within the store

## 2. Resize hook

- [x] 2.1 Implement a `usePanelResize` hook (pointer events + `setPointerCapture`, `pointermove`/`pointerup` on window) that reports width deltas and calls a provided clamped setter
- [x] 2.2 Support left- vs right-docked regions via a direction/side option (invert delta sign for right-side panels)
- [x] 2.3 Disable text selection and set `cursor-col-resize` during an active drag

## 3. Navigator region

- [x] 3.1 Apply dynamic width via inline style from `navigatorWidth` in [apps/web/src/routes/__root.tsx](apps/web/src/routes/__root.tsx)
- [x] 3.2 Add an inner-edge resize handle wired to `usePanelResize` + `setNavigatorWidth`
- [x] 3.3 Add a maximize/restore `PButtonPure` affordance that calls `toggleFullscreenRegion('navigator')` in [apps/web/src/components/shell/Navigator.tsx](apps/web/src/components/shell/Navigator.tsx)

## 4. Source preview region

- [x] 4.1 Apply dynamic width via inline style from `sourcePreviewWidth` in [apps/web/src/routes/index.tsx](apps/web/src/routes/index.tsx)
- [x] 4.2 Add an inner-edge resize handle wired to `usePanelResize` + `setSourcePreviewWidth`
- [x] 4.3 Add a maximize/restore affordance calling `toggleFullscreenRegion('sourcePreview')` in [apps/web/src/components/editor/SourcePreview.tsx](apps/web/src/components/editor/SourcePreview.tsx)

## 5. Graph inspector region

- [x] 5.1 Apply dynamic width via inline style from `inspectorWidth` in [apps/web/src/components/graph/GraphView.tsx](apps/web/src/components/graph/GraphView.tsx)
- [x] 5.2 Add an inner-edge resize handle wired to `usePanelResize` + `setInspectorWidth`
- [x] 5.3 Add a maximize/restore affordance calling `toggleFullscreenRegion('inspector')`

## 6. Full-screen layout rendering

- [x] 6.1 When `fullscreenRegion` is set, render only that region filling the workspace and hide the others in the root/index layout
- [x] 6.2 Show a persistent exit-full-screen affordance (compress icon) in the maximized region
- [x] 6.3 Optionally support `Esc` to exit full-screen
- [x] 6.4 Ensure exiting restores prior collapse/width state unchanged

## 7. Verification

- [x] 7.1 Manually verify drag-resize within min/max for all three regions and that the center pane adjusts
- [x] 7.2 Verify widths persist across form/graph view switches and across collapse then expand
- [x] 7.3 Verify only one region can be full-screen at a time and exit restores the previous layout
- [x] 7.4 Run lint/build (`pnpm --filter web lint` / `pnpm --filter web build`) and fix any issues
