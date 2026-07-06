## 1. Layout state in the store

- [x] 1.1 Add `navigatorCollapsed` and `sourcePreviewCollapsed` boolean state (default `false`) to `apps/web/src/store/editorStore.ts`
- [x] 1.2 Add `toggleNavigatorCollapsed` and `toggleSourcePreviewCollapsed` actions to the store
- [x] 1.3 Add/extend unit tests in `apps/web/src/store/editorStore.test.ts` covering the toggle actions and independent state

## 2. Navigator panel collapse

- [x] 2.1 In `apps/web/src/routes/__root.tsx`, read `navigatorCollapsed` from the store and hide/collapse the left `<aside>` when true so `<main>` reclaims the space
- [x] 2.2 Add a collapse toggle affordance (PIcon/PButtonPure) for the navigator when expanded
- [x] 2.3 Add a persistent re-open affordance (thin rail or header button) shown when the navigator is collapsed
- [x] 2.4 Ensure the toggle icon/state reflects whether activating it will collapse or expand

## 3. Source preview panel collapse

- [x] 3.1 In `apps/web/src/routes/index.tsx`, read `sourcePreviewCollapsed` from the store and hide the right `<aside>` when true so the center `<section>` reclaims the space
- [x] 3.2 Add a collapse toggle in the `SourcePreview` header bar (`apps/web/src/components/editor/SourcePreview.tsx`) or the center pane
- [x] 3.3 Add a persistent re-open affordance shown when the source preview is collapsed
- [x] 3.4 Preserve the existing responsive default (hidden below `lg`) while layering explicit user toggle on top

## 4. Verification

- [x] 4.1 Verify collapse/expand of each panel widens/restores the center pane and both panels toggle independently
- [x] 4.2 Verify collapsed state persists when switching the center view between form editor and relationship graph
- [x] 4.3 Run `pnpm lint` and `pnpm test` (web) and fix any issues
- [x] 4.4 Manually confirm affordances are discoverable and collapsed panels are always re-openable

## 5. Graph selection-detail inspector collapse

- [x] 5.1 Add `inspectorCollapsed` state and `toggleInspectorCollapsed` action to `apps/web/src/store/editorStore.ts`
- [x] 5.2 Wrap the graph's right-hand `SelectionDetail` inspector in a collapsible `InspectorPanel` (thin rail + collapse/expand affordances) in `apps/web/src/components/graph/GraphView.tsx`, applied to both the ERD and ontology layouts
- [x] 5.3 Run lint, typecheck, and tests
