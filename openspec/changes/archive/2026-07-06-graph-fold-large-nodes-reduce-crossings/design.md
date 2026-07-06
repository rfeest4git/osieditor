## Context

The relationship graph renders concept and dataset nodes with expandable field rows
([ConceptNode.tsx](apps/web/src/components/graph/ConceptNode.tsx),
[DatasetNode.tsx](apps/web/src/components/graph/DatasetNode.tsx)) and lays them out with a
deterministic, edge-aware star-schema algorithm
([ontologyGraph.ts](apps/web/src/components/graph/ontologyGraph.ts)). Today:

- **Fold state** is tracked in [GraphView.tsx](apps/web/src/components/graph/GraphView.tsx) as a
  single `collapsed: Set<string>`; nodes default to **expanded**. A node with 23 fields therefore
  renders full-height by default, dominating the canvas and pushing neighbours away.
- **Crossing reduction** exists but is local: `crossingAwareOrder` + `neighbourAdjacency` order a
  hub's direct neighbours, and `sortByHint` orders clusters / band nodes by a single partner's x.
  Multi-cluster packing (`connectedComponents` order) and cross-band alignment in
  `starLayoutGrouped` are not barycenter-optimised, so long edges still cross unrelated boxes
  (see screenshot).
- The initial estimated layout (`layoutEstimatedStar*`) and the measured `ArrangeControl` both
  size nodes from their `rows`/measured height, so they already consume whatever fold state is
  active — but nothing makes large nodes fold in the first place.

Constraints: the layout must stay **deterministic** (stable id tie-breaks), must **never move
user-dragged nodes** (existing `graph-visual-layout` requirement), and folding must persist
across model reconciliation and layer switches (fold state is keyed by stable node id, like
dragged positions).

## Goals / Non-Goals

**Goals:**
- Large nodes fold by default so the canvas stays compact; small nodes stay expanded.
- A user's explicit fold/unfold sticks and overrides the size default.
- A one-click Collapse-all / Expand-all view control in every layer.
- Fewer edge crossings across the whole graph — between clusters and across the unified view's
  two domain bands — while keeping the layout deterministic and non-overlapping.

**Non-Goals:**
- No optimal (NP-hard) crossing minimisation; a barycenter heuristic is sufficient.
- No automatic re-arrange when a node is folded/unfolded — repacking stays the user's explicit
  choice via **Arrange** (consistent with the existing "does not fight the user" requirement).
- No schema, file-I/O, store, or API changes.

## Decisions

### 1. Replace `collapsed: Set` with a fold-override map + size-based default

Introduce a shared threshold and a default rule in `ontologyGraph.ts`:

- `FOLD_THRESHOLD = 8` (exported const).
- `defaultExpanded(fieldCount: number): boolean` → `fieldCount <= FOLD_THRESHOLD`.

In `GraphView`, replace `collapsed` with `foldOverride: Map<string, boolean>` where a present
entry is the user's explicit choice (`true` = expanded, `false` = collapsed) and an **absent**
entry means "use the size default". Effective state:

```
isExpanded(id, fieldCount) = foldOverride.get(id) ?? defaultExpanded(fieldCount)
```

`toggleExpand(id, fieldCount)` writes `!isExpanded(...)` into the map (so the first toggle always
records an explicit override). Every place that currently reads `!collapsed.has(id)` switches to
`isExpanded(id, fieldCount)` — the three node builders (semantic, ontology-in-unified, dataset-in-
unified) and the three estimated-size builders already have the field/attribute count in scope.

*Why over keeping two Sets (`collapsed` + `expandedOverride`):* a single `Map<string,boolean>`
expresses the three states (default / forced-open / forced-closed) without ambiguity and prunes
cleanly. Overrides for ids no longer present are dropped during reconciliation to bound growth.

### 2. Collapse-all / Expand-all as a view control next to "Arrange"

Add two actions in the same `<Panel position="top-right">` that hosts `ArrangeControl`
([GraphView.tsx](apps/web/src/components/graph/GraphView.tsx#L260)). They call
`onCollapseAll` / `onExpandAll` supplied by `GraphView`, which set an explicit override
(`false` / `true`) for **every current node id** (obtained from the control via `getNodes()`, so
it always matches what is rendered in the active layer). Setting explicit overrides — rather than
clearing the map — guarantees Expand-all also opens the large nodes that were folded by default.
Per the spec these actions change only fold state; they do **not** reposition nodes (Arrange
remains the repacking action).

### 3. Barycenter crossing-reduction pass

Add a deterministic barycenter ordering helper to `ontologyGraph.ts` and apply it in two places:

- **Cross-band alignment (unified):** in `starLayoutGrouped`, after each band's clusters are laid
  out, run alternating barycenter sweeps — order band B's nodes by the mean x of their band-A
  partners, then re-order band A by their band-B partners, for a small fixed number of sweeps
  (e.g. 4). This replaces the single-hint `sortByHint` alignment for cross-band edges (mapping +
  relationship links) and is the standard cheap fix for the crossings in the screenshot.
- **Cluster ordering:** when packing multiple clusters/components into a row, order them
  left-to-right by the barycenter of their inter-cluster edges instead of `connectedComponents`
  id order, so clusters that link to each other sit adjacently.

Ties break by id to preserve determinism. The pass only sets computed positions for ids without a
remembered position, so user drags are never disturbed. Node sizes (hence folded footprints from
Decision 1) flow straight into the same boxes the pass orders, satisfying "folded nodes pack
tighter".

*Alternatives considered:* full crossing-count minimisation (NP-hard, overkill) and a
force-directed pass via `d3-force` (non-deterministic, fights the analytic layout and the
"don't move user nodes" rule) — both rejected in favour of barycenter, which matches the existing
deterministic, analytic design.

### 4. Testable crossing metric

Add a pure `countEdgeCrossings(positions, edges)` helper (counts pairwise segment intersections)
used only in tests to assert the barycenter pass reduces crossings on a representative fixture,
making the spec scenarios deterministically verifiable.

## Risks / Trade-offs

- **Collapse-all leaves gaps / possible overlaps** (heights shrink but positions stay) → Acceptable
  and intentional; the existing **Arrange** control repacks on demand, and not moving nodes honours
  the "don't override user positions" requirement.
- **Barycenter sweeps could reorder nodes surprisingly** → Bounded sweep count, deterministic id
  tie-breaks, and computed positions still apply only to ids without a remembered position, so
  user-dragged nodes never move.
- **Threshold of 8 may not suit every model** → Kept as a single exported constant, easy to tune
  after a visual check; the count affordance and Expand-all mitigate any over-folding.
- **Fold-override map could accumulate stale ids** → Pruned to the current node id set during
  reconciliation.

## Open Questions

- Final value of `FOLD_THRESHOLD` (starting at 8; VehicleComponents=4 stays open, BaseInfo=10 and
  Warranties=23 fold) — confirm during visual review.
- Whether a later iteration should offer an optional "Arrange after Collapse-all" convenience;
  out of scope here to keep repacking explicit.
