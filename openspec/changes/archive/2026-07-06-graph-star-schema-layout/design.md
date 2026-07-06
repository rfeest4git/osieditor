## Context

The graph canvas (`GraphView.tsx`) lays out nodes with `arrangeBoxes` in
`ontologyGraph.ts`: a shelf-pack that groups nodes into horizontal *bands* by kind
(concepts / datasets / metrics) and wraps them left-to-right into rows. This is purely
size-driven — it never looks at the edges — so connected nodes routinely land far apart
and their `smoothstep` connection lines cross each other and cut across unrelated nodes
(the tangled "today" screenshot). The same pack runs for the estimated initial layout
(`layoutEstimatedBands`) and the measured "Arrange" action.

Constraints already established by `graph-visual-layout`:
- Nodes must never overlap (variable, uncapped heights).
- User-dragged positions must be preserved; auto-arrange runs once per layer.
- The unified view draws "Ontology" / "Semantic model" background region boxes behind
  domain clusters, so those clusters must not overlap.

## Goals / Non-Goals

**Goals:**
- Place connected nodes in a star / hub-and-spoke arrangement so edges radiate from
  hubs without crossing, matching the desired "star schema" screenshot.
- Keep the non-overlap guarantee for any mix of node sizes.
- Reuse one layout for both estimated-initial and measured-manual arrange.
- Keep the two domains spatially separated in the unified view so region boxes stay
  clear.

**Non-Goals:**
- A globally optimal crossing-minimization (NP-hard). We aim for a good heuristic, not
  provable minimum crossings.
- Changing edge rendering/routing, node visuals, colours, or the persisted model.
- Pulling in a heavyweight graph-layout dependency (dagre/elk) unless the heuristic
  proves insufficient.

## Decisions

**1. Edge topology becomes a layout input.**
The layout functions currently take only sized boxes. We add the layer's edges (source
/ target node ids) as input so placement can be driven by connectivity. `GraphView`
already builds the edge lists (`buildSemanticEdges`, ontology relationship edges,
mapping links) and can pass them to both the estimated and measured layout calls.

**2. Hub selection by degree.**
Compute each node's degree (edge count). Pick the highest-degree node as the primary
hub; when several nodes have comparably high degree (multiple fact-like tables),
support multiple hubs. Rationale: in a star schema the fact table is the most-connected
node — degree is a cheap, robust proxy that needs no schema semantics. Alternative
considered: use identity/foreign-key metadata to name the fact table explicitly —
rejected as brittle and schema-specific.

**3. Radial placement with crossing-aware neighbour ordering.**
For each hub, place its directly-connected neighbours on a ring around it. The ring
radius is derived from the neighbours' measured sizes so boxes on the ring do not
overlap (radius grows with neighbour count and box size). Neighbours are ordered around
the ring to reduce crossings: neighbours that also connect to each other (or to the
same second hub) are placed adjacently, and second-degree nodes hang off their parent
neighbour on the outer side (a spoke), keeping each subtree in an angular wedge.
Alternative considered: pure force-directed relaxation — rejected as non-deterministic
and prone to residual overlaps that violate the hard non-overlap requirement.

**4. Multiple hubs and disconnected nodes.**
Lay out each connected component around its own hub, then pack the component bounding
boxes apart (reuse the existing shelf-pack at the *component* level so components don't
overlap). Edgeless nodes collapse into a compact grid placed clear of the clusters.

**5. Preserve domain grouping in the unified view.**
The unified layer must keep concepts apart from datasets/metrics for the region boxes.
Approach: run the star layout per domain and offset the domain clusters so their
bounding boxes don't overlap (concepts cluster above/left of the semantic cluster),
rather than a single global star that would interleave the two domains. This replaces
the old strict horizontal-band requirement with a softer "clusters don't overlap" one.

**6. Same layout for estimated and measured.**
Like today, the only difference between the initial and manual arrange is the size
source (estimated vs measured). The new `starLayout` takes boxes + edges and is called
from both `layoutEstimated*` and `ArrangeControl`, preserving the existing
"position only nodes without a remembered position" and "reframe after arrange"
behaviour.

## Risks / Trade-offs

- [Heuristic leaves some crossings on dense/cyclic graphs] → Accept as best-effort;
  degree-ordered radial placement removes the common star crossings the user reported.
  Keep the door open to swap in dagre/elk later behind the same function boundary.
- [Radial rings can spread wide for high-degree hubs, needing more panning] → Mitigate
  by sizing radius to content and letting `fitView` reframe after arrange.
- [Determinism] → Break degree/angle ties by stable node id so the layout is
  reproducible and testable (the existing tests assert exact/relative positions).
- [Domain separation vs. star compactness in unified view] → Slightly less compact than
  a single global star, but required to keep the region boxes from overlapping.

## Open Questions

- Multi-hub threshold: what degree gap qualifies a second node as its own hub vs. a
  spoke of the primary hub? Start with "local maxima of degree within a component" and
  tune against the sample models.
