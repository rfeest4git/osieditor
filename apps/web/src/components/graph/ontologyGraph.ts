import type { AnyDraftDocument, OntologyComponent } from '@osi-editor/osi-schema';
import type { Edge, XYPosition } from '@xyflow/react';
import type { Selection } from '../../store/editorStore.js';

/** Stable React Flow node id for a concept node. */
export function conceptNodeId(name: string): string {
  return `concept:${name}`;
}

/** Stable React Flow node id for a mapped dataset node. */
export function datasetNodeId(name: string): string {
  return `dataset:${name}`;
}

/** Stable React Flow node id for a metric node. */
export function metricNodeId(name: string): string {
  return `metric:${name}`;
}

/** Top-left origin of the first node. */
const LAYOUT_ORIGIN = 40;
/** Horizontal gap left between two nodes on the same shelf row. */
const H_GUTTER = 64;
/** Vertical gap left between two shelf rows within a band. */
const V_GUTTER = 72;
/**
 * Vertical gap between two adjacent bands (concept / dataset / metric). Generous
 * so cross-band connection edges have room to route without crossing nodes.
 */
const BAND_GUTTER = 220;
/** Target width a shelf row fills before wrapping to the next row. */
const DEFAULT_ROW_WIDTH = 1600;

/** Header height of a node with no expanded rows (matches the node components). */
const NODE_HEADER_HEIGHT = 46;
/** Height contributed by each expanded field/attribute row (biased high). */
const NODE_ROW_HEIGHT = 28;
/** Approx. rendered width of one character in the node's label/row font. */
const CHAR_WIDTH = 7.3;
/** Horizontal padding + affordances added around a node's widest text. */
const NODE_H_PADDING = 48;
/** Clamp for the estimated node width (real nodes truncate very long text). */
const NODE_MIN_WIDTH = 180;
const NODE_MAX_WIDTH = 480;

/**
 * Estimate a node's rendered height from its expanded row count. Deliberately
 * biased high so drift from the real DOM height never produces an overlap on the
 * initial (pre-measurement) layout. Not capped — a 50-field node really is tall,
 * and clamping its height is exactly what caused the old layout to overlap.
 */
export function estimateNodeHeight(rows = 0): number {
  return NODE_HEADER_HEIGHT + Math.max(0, rows) * NODE_ROW_HEIGHT;
}

/**
 * Estimate a node's rendered width from its widest piece of text (label or a
 * field/attribute row). Clamped to a sane range because real nodes have a min
 * width and truncate very long labels. Biased high, like {@link estimateNodeHeight}.
 */
export function estimateNodeWidth(texts: string[]): number {
  const longest = texts.reduce((max, t) => Math.max(max, t?.length ?? 0), 0);
  const raw = Math.ceil(longest * CHAR_WIDTH) + NODE_H_PADDING;
  return Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, raw));
}

/** A box to place: a stable id, its size, and which band (row-group) it belongs to. */
export interface LayoutBox {
  id: string;
  width: number;
  height: number;
  /** Band index; lower bands are placed above higher ones. */
  band: number;
}

/** Tunables for {@link arrangeBoxes}. */
export interface ArrangeOptions {
  originX?: number;
  originY?: number;
  hGutter?: number;
  vGutter?: number;
  bandGutter?: number;
  /** Width a shelf row fills before wrapping. Falls back to {@link DEFAULT_ROW_WIDTH}. */
  maxRowWidth?: number;
}

/**
 * Shelf-pack boxes into non-overlapping positions, grouped into vertically
 * stacked bands. Within a band, boxes are laid left-to-right until the row width
 * budget is exceeded, then wrap to a new shelf row whose y clears the tallest box
 * of the previous row. The next band starts below the previous band's bottom.
 *
 * Guarantees no two boxes overlap for ANY mix of widths/heights: same-row boxes
 * are separated horizontally by their real width + gutter, rows by the row's max
 * height + gutter, and bands by a band gutter. Input order within a band is kept.
 *
 * Works identically for estimated sizes (initial layout) and real measured sizes
 * (the manual "Arrange" action) — only the width/height source differs.
 */
export function arrangeBoxes(boxes: LayoutBox[], options: ArrangeOptions = {}): Map<string, XYPosition> {
  const originX = options.originX ?? LAYOUT_ORIGIN;
  const hGutter = options.hGutter ?? H_GUTTER;
  const vGutter = options.vGutter ?? V_GUTTER;
  const bandGutter = options.bandGutter ?? BAND_GUTTER;
  const widest = boxes.reduce((max, b) => Math.max(max, b.width), 0);
  // Never let the budget be narrower than the widest box, or it could never fit.
  const maxRowWidth = Math.max(options.maxRowWidth ?? DEFAULT_ROW_WIDTH, widest);

  const positions = new Map<string, XYPosition>();
  const bands = [...new Set(boxes.map((b) => b.band))].sort((a, b) => a - b);
  let originY = options.originY ?? LAYOUT_ORIGIN;

  for (const band of bands) {
    const items = boxes.filter((b) => b.band === band);
    let x = originX;
    let rowY = originY;
    let rowMaxHeight = 0;
    for (const item of items) {
      // Wrap when the box would spill past the row budget — but never wrap a box
      // that is alone at the row start (it simply gets its own over-wide row).
      if (x > originX && x + item.width > originX + maxRowWidth) {
        rowY += rowMaxHeight + vGutter;
        x = originX;
        rowMaxHeight = 0;
      }
      positions.set(item.id, { x, y: rowY });
      x += item.width + hGutter;
      rowMaxHeight = Math.max(rowMaxHeight, item.height);
    }
    if (items.length > 0) originY = rowY + rowMaxHeight + bandGutter;
  }
  return positions;
}

/** An item to lay out with estimated (pre-measurement) sizing. */
export interface EstimatedItem {
  id: string;
  /** Expanded field/attribute rows → estimated height. 0 for a bare/collapsed node. */
  rows?: number;
  /** Label + row texts → estimated width. */
  texts?: string[];
}

/**
 * Estimate box sizes for each item and {@link arrangeBoxes} them into bands (one
 * band per input array). Used for the initial layout before React Flow has
 * measured the real node sizes.
 */
export function layoutEstimatedBands(
  bands: EstimatedItem[][],
  options: ArrangeOptions = {},
): Map<string, XYPosition> {
  const boxes: LayoutBox[] = [];
  bands.forEach((items, band) => {
    for (const item of items) {
      boxes.push({
        id: item.id,
        width: estimateNodeWidth(item.texts ?? []),
        height: estimateNodeHeight(item.rows ?? 0),
        band,
      });
    }
  });
  return arrangeBoxes(boxes, options);
}

/** Simple grid layout used as an ultimate fallback for a single index-placed node. */
export function gridPosition(index: number): XYPosition {
  return {
    x: (index % 4) * 280 + LAYOUT_ORIGIN,
    y: Math.floor(index / 4) * 220 + LAYOUT_ORIGIN,
  };
}

// ---------------------------------------------------------------------------
// Edge-aware star-schema layout
// ---------------------------------------------------------------------------

/** An undirected layout edge between two node ids (direction is ignored for placement). */
export interface LayoutEdge {
  source: string;
  target: string;
}

/** Tunables for {@link starLayout} / {@link starLayoutGrouped}. */
export interface StarLayoutOptions {
  originX?: number;
  originY?: number;
  /** Minimum gap kept between any two node bounding circles. */
  gap?: number;
  /** Gap between packed component / cluster bounding boxes. */
  componentGutter?: number;
  /** Vertical gap between stacked domain groups in {@link starLayoutGrouped}. */
  groupGutter?: number;
  /**
   * Optional per-node desired horizontal position (typically the x of a node's
   * partner in an already-placed band). Freely-orderable nodes (edgeless grids)
   * and whole clusters are ordered left-to-right by this hint to reduce edge
   * crossings between stacked domain groups. Nodes without a hint sort last.
   */
  orderHint?: Map<string, number>;
}

/** Minimum clearance between two node bounding circles in the star layout. */
const STAR_GAP = 56;
/** Gap between packed cluster/component bounding boxes. */
const STAR_COMPONENT_GUTTER = 140;
/** Vertical gap between stacked domain groups. */
const STAR_GROUP_GUTTER = 220;
/** Width the cluster-packing row fills before wrapping to a new row of clusters. */
const STAR_ROW_WIDTH = 2400;

/** Bounding-circle radius of a box (half its diagonal): a size-agnostic overlap proxy. */
function boundingRadius(width: number, height: number): number {
  return Math.hypot(width, height) / 2;
}

/** Stable ascending id comparator for deterministic ordering. */
const byId = (a: string, b: string): number => a.localeCompare(b);

/**
 * Order ids left-to-right by a positional hint (a partner node's x). Ids without a
 * hint sort last; ties break by id so the result stays deterministic.
 */
function sortByHint(ids: string[], hint: Map<string, number>): string[] {
  return [...ids].sort((a, b) => {
    const ha = hint.get(a) ?? Number.POSITIVE_INFINITY;
    const hb = hint.get(b) ?? Number.POSITIVE_INFINITY;
    return ha - hb || byId(a, b);
  });
}

/**
 * Undirected adjacency restricted to the given node ids. Self-loops and edges to
 * ids outside the set are dropped so the layout never references a missing node.
 */
export function buildAdjacency(ids: Set<string>, edges: LayoutEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const id of ids) adj.set(id, new Set());
  for (const e of edges) {
    if (e.source === e.target) continue;
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }
  return adj;
}

/**
 * Partition ids into connected components. Deterministic: components and the ids
 * within each are returned in sorted order so the layout is reproducible.
 */
export function connectedComponents(ids: string[], adj: Map<string, Set<string>>): string[][] {
  const seen = new Set<string>();
  const comps: string[][] = [];
  for (const start of [...ids].sort(byId)) {
    if (seen.has(start)) continue;
    const comp: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const n = stack.pop()!;
      comp.push(n);
      for (const m of [...(adj.get(n) ?? [])].sort(byId)) {
        if (!seen.has(m)) {
          seen.add(m);
          stack.push(m);
        }
      }
    }
    comps.push([...comp].sort(byId));
  }
  return comps;
}

/**
 * Choose the hub(s) of a connected component by degree. The highest-degree node
 * is always a hub (the "fact table" of a star schema). Additional local-maxima
 * hubs are detected for multi-fact graphs: a node with degree ≥ 3, at least 60%
 * of the component's max degree, and no neighbour of higher degree. Ties break by
 * degree then id for determinism.
 */
export function selectHubs(comp: string[], adj: Map<string, Set<string>>): string[] {
  if (comp.length === 0) return [];
  const deg = (id: string) => adj.get(id)?.size ?? 0;
  const byRank = (a: string, b: string) => deg(b) - deg(a) || byId(a, b);
  const maxDeg = Math.max(...comp.map(deg));
  const hubs = new Set<string>([[...comp].sort(byRank)[0]!]);
  for (const id of [...comp].sort(byId)) {
    const d = deg(id);
    if (d < 3 || d < maxDeg * 0.6) continue;
    if ([...(adj.get(id) ?? [])].every((m) => deg(m) <= d)) hubs.add(id);
  }
  return [...hubs].sort(byRank);
}

/**
 * Assign every node of a multi-hub component to its nearest hub via multi-source
 * BFS (ties resolved by hub rank order, then by sorted traversal). Returns one
 * member list per hub, each including the hub itself.
 */
function partitionByHubs(
  comp: string[],
  hubs: string[],
  adj: Map<string, Set<string>>,
): Map<string, string[]> {
  const owner = new Map<string, string>();
  const queue: string[] = [];
  for (const h of hubs) {
    owner.set(h, h);
    queue.push(h);
  }
  for (const n of queue) {
    for (const m of [...(adj.get(n) ?? [])].sort(byId)) {
      if (!owner.has(m)) {
        owner.set(m, owner.get(n)!);
        queue.push(m);
      }
    }
  }
  const groups = new Map<string, string[]>();
  for (const h of hubs) groups.set(h, []);
  for (const id of [...comp].sort(byId)) groups.get(owner.get(id) ?? hubs[0]!)!.push(id);
  return groups;
}

/**
 * Build an adjacency map among a hub's direct neighbours: two neighbours are
 * linked when they connect to each other or share a deeper node (so mutually
 * related neighbours can be ordered adjacently to reduce edge crossings).
 */
function neighbourAdjacency(
  kids: string[],
  adj: Map<string, Set<string>>,
): Map<string, Set<string>> {
  const kidSet = new Set(kids);
  const kadj = new Map<string, Set<string>>(kids.map((k) => [k, new Set<string>()]));
  const link = (a: string, b: string) => {
    if (a !== b && kidSet.has(a) && kidSet.has(b)) {
      kadj.get(a)!.add(b);
      kadj.get(b)!.add(a);
    }
  };
  for (const k of kids) {
    for (const m of adj.get(k) ?? []) {
      if (kidSet.has(m)) link(k, m);
      else for (const k2 of adj.get(m) ?? []) link(k, k2);
    }
  }
  return kadj;
}

/** DFS ordering over a neighbour-adjacency so linked neighbours sit adjacently. */
function crossingAwareOrder(kids: string[], kadj: Map<string, Set<string>>): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const start of [...kids].sort(byId)) {
    if (seen.has(start)) continue;
    const stack = [start];
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      order.push(n);
      for (const m of [...(kadj.get(n) ?? [])].sort(byId).reverse()) {
        if (!seen.has(m)) stack.push(m);
      }
    }
  }
  return order;
}

/** A node centre plus the size needed to derive its bounding box. */
interface Cluster {
  centres: Map<string, XYPosition>;
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/** Bounding box of a set of node centres, using each node's own size. */
function clusterBounds(
  centres: Map<string, XYPosition>,
  boxById: Map<string, LayoutBox>,
): Cluster {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [id, c] of centres) {
    const b = boxById.get(id)!;
    minX = Math.min(minX, c.x - b.width / 2);
    minY = Math.min(minY, c.y - b.height / 2);
    maxX = Math.max(maxX, c.x + b.width / 2);
    maxY = Math.max(maxY, c.y + b.height / 2);
  }
  return { centres, minX, minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Radial-tree layout of one connected component around its hub. Returns each
 * node's CENTRE in a hub-centred local frame. Guarantees no two bounding circles
 * overlap: nodes on the same ring are angularly spaced by their footprints, and
 * nodes on different rings are separated radially by their sizes plus the gap.
 */
function layoutStarCluster(
  members: string[],
  hub: string,
  adj: Map<string, Set<string>>,
  boxById: Map<string, LayoutBox>,
  gap: number,
): Map<string, XYPosition> {
  const memberSet = new Set(members);
  const depth = new Map<string, number>([[hub, 0]]);
  const children = new Map<string, string[]>(members.map((m) => [m, []]));
  const queue = [hub];
  for (const n of queue) {
    for (const m of [...(adj.get(n) ?? [])].filter((x) => memberSet.has(x)).sort(byId)) {
      if (!depth.has(m)) {
        depth.set(m, depth.get(n)! + 1);
        children.get(n)!.push(m);
        queue.push(m);
      }
    }
  }

  const maxDepth = Math.max(...members.map((m) => depth.get(m) ?? 0));
  const rOf = (id: string) => {
    const b = boxById.get(id)!;
    return boundingRadius(b.width, b.height);
  };
  // Max bounding radius at each depth, and the base ring radius per depth.
  const levelR: number[] = [];
  for (let l = 0; l <= maxDepth; l++) {
    const at = members.filter((m) => depth.get(m) === l);
    levelR[l] = at.length ? Math.max(...at.map(rOf)) : 0;
  }
  const baseRadius: number[] = [0];
  for (let l = 1; l <= maxDepth; l++) {
    baseRadius[l] = baseRadius[l - 1]! + levelR[l - 1]! + levelR[l]! + gap;
  }

  // Order the hub's direct neighbours so ones that connect to each other (or share
  // a deeper node) sit adjacently on the ring, reducing inter-neighbour crossings.
  const hubKids = children.get(hub)!;
  children.set(hub, crossingAwareOrder(hubKids, neighbourAdjacency(hubKids, adj)));
  for (const m of members) if (m !== hub) children.set(m, [...children.get(m)!].sort(byId));

  // Angular demand of a subtree at a given radial scale: the wider of the node's
  // own angular footprint and the sum of its children's demands.
  const demandFor = (id: string, scale: number): number => {
    const d = depth.get(id)!;
    const R = baseRadius[d]! * scale;
    const own = R > 0 ? 2 * Math.asin(Math.min(0.999, (rOf(id) + gap / 2) / R)) : 0;
    let sum = 0;
    for (const k of children.get(id)!) sum += demandFor(k, scale);
    return Math.max(own, sum);
  };
  const hubDemand = (scale: number) =>
    children.get(hub)!.reduce((a, k) => a + demandFor(k, scale), 0);

  // Grow the radial scale until every level-1 subtree fits within the full circle.
  let scale = 1;
  const limit = 2 * Math.PI * 0.95;
  for (let i = 0; i < 60 && hubDemand(scale) > limit; i++) scale *= 1.15;

  const centres = new Map<string, XYPosition>([[hub, { x: 0, y: 0 }]]);
  const place = (id: string, lo: number, hi: number): void => {
    const d = depth.get(id)!;
    if (d > 0) {
      const R = baseRadius[d]! * scale;
      const angle = (lo + hi) / 2;
      centres.set(id, { x: R * Math.cos(angle), y: R * Math.sin(angle) });
    }
    const kids = children.get(id)!;
    if (kids.length === 0) return;
    const demands = kids.map((k) => demandFor(k, scale));
    const slack = Math.max(0, hi - lo - demands.reduce((a, b) => a + b, 0));
    // Spread the hub's ring evenly around the full circle; keep deeper subtrees
    // compact and centred within their parent's wedge.
    const between = id === hub && kids.length > 0 ? slack / kids.length : 0;
    let cursor = lo + (id === hub ? between / 2 : slack / 2);
    kids.forEach((k, i) => {
      place(k, cursor, cursor + demands[i]!);
      cursor += demands[i]! + between;
    });
  };
  place(hub, 0, 2 * Math.PI);
  return centres;
}

/** Lay edgeless nodes into a compact near-square grid; returns their centres. */
function gridClusterCentres(
  ids: string[],
  boxById: Map<string, LayoutBox>,
  gap: number,
): Map<string, XYPosition> {
  const boxes: LayoutBox[] = ids.map((id) => {
    const b = boxById.get(id)!;
    return { id, width: b.width, height: b.height, band: 0 };
  });
  const widest = boxes.reduce((max, b) => Math.max(max, b.width), 0);
  const columns = Math.max(1, Math.ceil(Math.sqrt(boxes.length)));
  const topLeft = arrangeBoxes(boxes, {
    originX: 0,
    originY: 0,
    hGutter: gap,
    vGutter: gap,
    maxRowWidth: columns * (widest + gap),
  });
  const centres = new Map<string, XYPosition>();
  for (const b of boxes) {
    const p = topLeft.get(b.id)!;
    centres.set(b.id, { x: p.x + b.width / 2, y: p.y + b.height / 2 });
  }
  return centres;
}

/** Lay out a flat box set (single domain) and report the resulting bounding size. */
function layoutBoxSet(
  boxes: LayoutBox[],
  edges: LayoutEdge[],
  options: StarLayoutOptions,
): { positions: Map<string, XYPosition>; width: number; height: number } {
  const originX = options.originX ?? LAYOUT_ORIGIN;
  const originY = options.originY ?? LAYOUT_ORIGIN;
  const gap = options.gap ?? STAR_GAP;
  const componentGutter = options.componentGutter ?? STAR_COMPONENT_GUTTER;
  const orderHint = options.orderHint;
  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const ids = boxes.map((b) => b.id);
  const adj = buildAdjacency(new Set(ids), edges);

  const clusters: Cluster[] = [];
  const edgeless: string[] = [];
  for (const comp of connectedComponents(ids, adj)) {
    if (comp.length === 1 && (adj.get(comp[0]!)?.size ?? 0) === 0) {
      edgeless.push(comp[0]!);
      continue;
    }
    const hubs = selectHubs(comp, adj);
    const groups =
      hubs.length > 1 ? partitionByHubs(comp, hubs, adj) : new Map([[hubs[0]!, comp]]);
    for (const [hub, membersOfHub] of groups) {
      if (membersOfHub.length === 0) continue;
      clusters.push(clusterBounds(layoutStarCluster(membersOfHub, hub, adj, boxById, gap), boxById));
    }
  }
  // Isolated nodes tuck into their own grid cluster, kept clear of the stars.
  // When aligning to another band, order them by their partner's position.
  if (edgeless.length > 0) {
    const orderedEdgeless = orderHint ? sortByHint(edgeless, orderHint) : edgeless;
    clusters.push(clusterBounds(gridClusterCentres(orderedEdgeless, boxById, gap), boxById));
  }

  // Order clusters left-to-right by their partners' positions to reduce the
  // number of crossing edges between this band and the one it aligns to.
  if (orderHint) {
    const clusterHint = (c: Cluster): number => {
      const xs = [...c.centres.keys()]
        .map((id) => orderHint.get(id))
        .filter((v): v is number => v !== undefined);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.POSITIVE_INFINITY;
    };
    clusters.sort((a, b) => clusterHint(a) - clusterHint(b));
  }

  // Pack the cluster bounding boxes apart so no two clusters overlap.
  const packBoxes: LayoutBox[] = clusters.map((c, i) => ({
    id: String(i),
    width: c.width,
    height: c.height,
    band: 0,
  }));
  const packed = arrangeBoxes(packBoxes, {
    originX,
    originY,
    hGutter: componentGutter,
    vGutter: componentGutter,
    maxRowWidth: STAR_ROW_WIDTH,
  });

  const positions = new Map<string, XYPosition>();
  let maxX = originX;
  let maxY = originY;
  clusters.forEach((c, i) => {
    const at = packed.get(String(i))!;
    for (const [id, centre] of c.centres) {
      const b = boxById.get(id)!;
      const x = at.x + (centre.x - b.width / 2 - c.minX);
      const y = at.y + (centre.y - b.height / 2 - c.minY);
      positions.set(id, { x, y });
      maxX = Math.max(maxX, x + b.width);
      maxY = Math.max(maxY, y + b.height);
    }
  });
  return { positions, width: maxX - originX, height: maxY - originY };
}

/**
 * Edge-aware star-schema layout. Places each connected component around its
 * most-connected hub node, fanning the hub's neighbours out on a size-derived ring
 * (with second-degree nodes hanging off their parent in the same wedge), packs
 * separate components apart, and tucks edgeless nodes into a side grid. Guarantees
 * no two node bounding boxes overlap for any mix of sizes. Deterministic.
 */
export function starLayout(
  boxes: LayoutBox[],
  edges: LayoutEdge[],
  options: StarLayoutOptions = {},
): Map<string, XYPosition> {
  return layoutBoxSet(boxes, edges, options).positions;
}

/**
 * Domain-aware star layout: lay out each band (domain) as its own star cluster and
 * stack the bands vertically so their bounding boxes never overlap. Used by the
 * unified view to keep the ontology and semantic-model clusters (and their region
 * boxes) spatially separated while each is arranged as a star.
 */
export function starLayoutGrouped(
  boxes: LayoutBox[],
  edges: LayoutEdge[],
  options: StarLayoutOptions = {},
): Map<string, XYPosition> {
  const originX = options.originX ?? LAYOUT_ORIGIN;
  let originY = options.originY ?? LAYOUT_ORIGIN;
  const groupGutter = options.groupGutter ?? STAR_GROUP_GUTTER;
  const positions = new Map<string, XYPosition>();
  // x of every node already placed in an earlier band, used to align later bands.
  const priorX = new Map<string, number>();
  const bands = [...new Set(boxes.map((b) => b.band))].sort((a, b) => a - b);
  for (const band of bands) {
    const groupBoxes = boxes.filter((b) => b.band === band);
    if (groupBoxes.length === 0) continue;
    // Build a positional hint: for each node in this band, the mean x of its
    // partners already placed in earlier bands. Later bands are then ordered to
    // sit above/below their partners, minimising cross-layer edge crossings.
    const idSet = new Set(groupBoxes.map((b) => b.id));
    const partners = new Map<string, number[]>();
    for (const e of edges) {
      const inBand = idSet.has(e.source) ? e.source : idSet.has(e.target) ? e.target : undefined;
      if (inBand === undefined) continue;
      const other = inBand === e.source ? e.target : e.source;
      const ox = priorX.get(other);
      if (ox === undefined) continue;
      (partners.get(inBand) ?? partners.set(inBand, []).get(inBand)!).push(ox);
    }
    const hint = new Map<string, number>();
    for (const [id, xs] of partners) hint.set(id, xs.reduce((a, b) => a + b, 0) / xs.length);
    const { positions: gp, height } = layoutBoxSet(groupBoxes, edges, {
      ...options,
      originX,
      originY,
      orderHint: hint.size > 0 ? hint : undefined,
    });
    for (const [id, p] of gp) {
      positions.set(id, p);
      priorX.set(id, p.x);
    }
    originY += height + groupGutter;
  }
  return positions;
}

/**
 * Estimate box sizes for each item and {@link starLayout} them using the given
 * edges. The pre-measurement counterpart of the measured "Arrange" action.
 */
export function layoutEstimatedStar(
  items: EstimatedItem[],
  edges: LayoutEdge[],
  options: StarLayoutOptions = {},
): Map<string, XYPosition> {
  const boxes: LayoutBox[] = items.map((item) => ({
    id: item.id,
    width: estimateNodeWidth(item.texts ?? []),
    height: estimateNodeHeight(item.rows ?? 0),
    band: 0,
  }));
  return starLayout(boxes, edges, options);
}

/**
 * Estimate box sizes for each band's items and {@link starLayoutGrouped} them, so
 * the unified estimated layout keeps its domains separated (one band per domain).
 */
export function layoutEstimatedStarGrouped(
  bands: EstimatedItem[][],
  edges: LayoutEdge[],
  options: StarLayoutOptions = {},
): Map<string, XYPosition> {
  const boxes: LayoutBox[] = [];
  bands.forEach((items, band) => {
    for (const item of items) {
      boxes.push({
        id: item.id,
        width: estimateNodeWidth(item.texts ?? []),
        height: estimateNodeHeight(item.rows ?? 0),
        band,
      });
    }
  });
  return starLayoutGrouped(boxes, edges, options);
}

/** A positioned, sized node grouped under a domain, for region-box computation. */
export interface DomainNodeBounds {
  /** Domain the node belongs to (e.g. `ontology` / `semantic`). */
  domain: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A background region box enclosing every node of one domain. */
export interface RegionRect {
  domain: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Padding around a domain's node cluster on the sides and bottom of its region box. */
const REGION_PADDING = 32;
/** Extra top padding inside a region box, leaving room for its label. */
const REGION_LABEL_SPACE = 24;

/**
 * Compute one enclosing box per domain from its nodes' bounds. The box is the
 * union of the domain's node rectangles, expanded by {@link REGION_PADDING} (plus
 * label space on top). Domains are returned in first-seen order; a domain with no
 * sized nodes yields no box. Pure — used to render the ontology / semantic-model
 * background regions from live measured node bounds.
 */
export function computeRegionRects(
  nodes: DomainNodeBounds[],
  padding = REGION_PADDING,
  labelSpace = REGION_LABEL_SPACE,
): RegionRect[] {
  interface Extent {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }
  const order: string[] = [];
  const extents = new Map<string, Extent>();
  for (const n of nodes) {
    if (!(n.width > 0) || !(n.height > 0)) continue;
    const prev = extents.get(n.domain);
    if (!prev) {
      order.push(n.domain);
      extents.set(n.domain, { minX: n.x, minY: n.y, maxX: n.x + n.width, maxY: n.y + n.height });
    } else {
      prev.minX = Math.min(prev.minX, n.x);
      prev.minY = Math.min(prev.minY, n.y);
      prev.maxX = Math.max(prev.maxX, n.x + n.width);
      prev.maxY = Math.max(prev.maxY, n.y + n.height);
    }
  }
  return order.map((domain) => {
    const e = extents.get(domain)!;
    return {
      domain,
      x: e.minX - padding,
      y: e.minY - padding - labelSpace,
      width: e.maxX - e.minX + padding * 2,
      height: e.maxY - e.minY + padding * 2 + labelSpace,
    };
  });
}

/**
 * Reconcile node positions across a model change. Returns a resolver that, for a
 * given id, reuses the previous (possibly user-dragged) position and falls back
 * to the grid slot for ids that did not exist before.
 */
export function reconcilePositions(
  prev: Array<{ id: string; position: XYPosition }>,
): (id: string, index: number) => XYPosition {
  const positions = new Map(prev.map((n) => [n.id, n.position]));
  return (id, index) => positions.get(id) ?? gridPosition(index);
}

/** Minimal shape of a semantic model needed to derive ERD edges. */
export interface SemanticModelLike {
  datasets: Array<{ name: string }>;
  relationships?: Array<{ from: string; to: string; name?: string }>;
}

/** A field row shown inside a dataset node's expandable list. */
export interface FieldRow {
  /** Field name. */
  name: string;
  /** Optional secondary detail (the field label, or `time` for a time dimension). */
  detail?: string;
  /** Index of the owning dataset in `model.datasets`. */
  datasetIndex: number;
  /** Index of the field within the dataset. */
  fieldIndex: number;
}

/** Minimal shape of a dataset needed to derive its field rows. */
interface DatasetLike {
  name: string;
  fields?: Array<{ name: string; label?: string; dimension?: { is_time?: boolean } }>;
}

/**
 * Derive each dataset's field rows keyed by its React Flow node id. `nodeId`
 * defaults to the raw dataset name (semantic-model layer) and is overridden to
 * {@link datasetNodeId} on the unified canvas, mirroring {@link buildSemanticEdges}.
 * A dataset with no fields maps to an empty array.
 */
export function datasetFieldsById(
  model: { datasets: DatasetLike[] },
  nodeId: (name: string) => string = (name) => name,
): Map<string, FieldRow[]> {
  const map = new Map<string, FieldRow[]>();
  model.datasets.forEach((dataset, datasetIndex) => {
    const rows: FieldRow[] = (dataset.fields ?? []).map((field, fieldIndex) => ({
      name: field.name,
      detail: field.label ?? (field.dimension?.is_time ? 'time' : undefined),
      datasetIndex,
      fieldIndex,
    }));
    map.set(nodeId(dataset.name), rows);
  });
  return map;
}

/** A metric row backing a metric node. */
export interface MetricRow {
  name: string;
  description?: string;
  /** Index of the metric within `model.metrics`. */
  metricIndex: number;
}

/** Derive metric rows (name + description) from a semantic model. */
export function buildMetricRows(model: {
  metrics?: Array<{ name: string; description?: string }>;
}): MetricRow[] {
  return (model.metrics ?? []).map((metric, metricIndex) => ({
    name: metric.name,
    description: metric.description,
    metricIndex,
  }));
}

/**
 * ERD edges: one directed edge per relationship whose `from` and `to` datasets
 * both exist as nodes. Every such relationship is included — none omitted.
 *
 * `nodeId` maps a dataset name to its React Flow node id; it defaults to the raw
 * name (the focused semantic view) and is overridden to {@link datasetNodeId} on
 * the unified canvas where dataset nodes are prefixed.
 */
export function buildSemanticEdges(
  model: SemanticModelLike,
  selection: Selection,
  nodeId: (name: string) => string = (name) => name,
): Edge[] {
  const names = new Set(model.datasets.map((d) => d.name));
  return (model.relationships ?? [])
    .map((rel, index) => ({ rel, index }))
    .filter(({ rel }) => names.has(rel.from) && names.has(rel.to))
    .map(({ rel, index }) => ({
      id: `rel-${index}`,
      source: nodeId(rel.from),
      target: nodeId(rel.to),
      label: rel.name,
      animated: true,
      selected: selection?.kind === 'relationship' && selection.relationshipIndex === index,
    }));
}

/** Concept names that exist as nodes in the current ontology graph. */
export function conceptNames(components: OntologyComponent[]): Set<string> {
  return new Set(
    components.map((c) => c?.concept?.name).filter((n): n is string => typeof n === 'string'),
  );
}

/**
 * Built-in value types (primitives). A relationship whose role points at one of
 * these is an *attribute* of the owning concept; a role pointing at anything else
 * is a reference to another concept and becomes a relationship edge — even when
 * that concept is only referenced, not declared (e.g. `Example_Flight`).
 */
export const PRIMITIVE_VALUE_TYPES = new Set([
  'String',
  'Text',
  'Float',
  'Double',
  'Decimal',
  'Integer',
  'Int',
  'Long',
  'Number',
  'Boolean',
  'Bool',
  'Date',
  'DateTime',
  'Time',
  'Timestamp',
  'UUID',
  'Binary',
  'Bytes',
]);

/** True when a role concept is a built-in value type (→ attribute, not a relationship). */
export function isValueType(concept: string | undefined): boolean {
  return typeof concept === 'string' && PRIMITIVE_VALUE_TYPES.has(concept);
}

/** An attribute sub-element of a concept: a relationship to a value type/primitive. */
export interface ConceptAttribute {
  /** Attribute (relationship) name. */
  name: string;
  /** The value type / primitive the attribute points at (first role concept). */
  valueType: string;
  /** Multiplicity of the underlying relationship, when declared. */
  multiplicity?: string;
  /** True when this attribute identifies the concept (per `concept.identify_by`). */
  isIdentity: boolean;
  /** True when this attribute is used as a foreign key in a relationship's `derived_by`. */
  isForeignKey: boolean;
  /** Index of the owning component in `components`. */
  componentIndex: number;
  /** Index of the relationship within the component. */
  relationshipIndex: number;
}

export interface OntologyGraphModel {
  /** Every concept-to-concept edge (one per resolving role). */
  edges: Edge[];
  /** Attribute sub-elements keyed by concept node id (`concept:<name>`). */
  attributesByConceptId: Map<string, ConceptAttribute[]>;
  /** Names referenced by relationships but not declared as concepts (ghost nodes). */
  referencedConcepts: Set<string>;
}

/**
 * Collect a component's foreign-key attribute names by scanning its relationships'
 * `derived_by` expressions for `<Owner>.<attr>` tokens (e.g.
 * `Example_Runway.airportid == Example_Airport.airportid` → `airportid`).
 */
function foreignKeyAttrs(comp: OntologyComponent, owner: string): Set<string> {
  const fks = new Set<string>();
  const pattern = new RegExp(`\\b${owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\w+)`, 'g');
  for (const rel of comp.relationships ?? []) {
    for (const expr of rel?.derived_by ?? []) {
      if (typeof expr !== 'string') continue;
      for (const match of expr.matchAll(pattern)) {
        if (match[1]) fks.add(match[1]);
      }
    }
  }
  return fks;
}

/**
 * Derive the full ontology graph from the components. Every relationship is
 * represented — none dropped:
 *
 * - A relationship whose roles resolve to concept nodes yields one edge per
 *   resolving role (owner → role concept). Edge ids encode the role index
 *   (`orel-<ci>-<ri>-<roleIndex>`) but all edges of a relationship resolve back
 *   to the same `relationshipIndex` for selection.
 * - A relationship with no concept-resolving role is an attribute of the owning
 *   concept and is collected as an unfoldable sub-element instead.
 */
export function buildOntologyGraphModel(
  components: OntologyComponent[],
  selection: Selection,
): OntologyGraphModel {
  const known = conceptNames(components);
  const edges: Edge[] = [];
  const attributesByConceptId = new Map<string, ConceptAttribute[]>();
  const referencedConcepts = new Set<string>();
  components.forEach((comp, ci) => {
    const owner = comp?.concept?.name;
    if (!owner) return;
    const ownerId = conceptNodeId(owner);
    const identifiers = new Set(comp?.concept?.identify_by ?? []);
    const fkAttrs = foreignKeyAttrs(comp, owner);
    (comp.relationships ?? []).forEach((rel, ri) => {
      const roles = rel?.roles ?? [];
      const name = rel?.name ?? `relationship_${ri + 1}`;
      const label = rel?.multiplicity ? `${name} (${rel.multiplicity})` : name;
      const selected =
        selection?.kind === 'ontology-relationship' &&
        selection.componentIndex === ci &&
        selection.relationshipIndex === ri;
      // A role that points at a value type is an attribute; anything else is a
      // reference to another concept and becomes a relationship edge — including
      // concepts that are only referenced, not declared (drawn as ghost nodes).
      let isRelationship = false;
      roles.forEach((role, roleIndex) => {
        const target = role?.concept;
        if (typeof target !== 'string' || isValueType(target)) return;
        isRelationship = true;
        if (!known.has(target)) referencedConcepts.add(target);
        edges.push({
          id: `orel-${ci}-${ri}-${roleIndex}`,
          source: ownerId,
          target: conceptNodeId(target),
          label,
          animated: true,
          selected,
        });
      });
      if (!isRelationship) {
        const list = attributesByConceptId.get(ownerId) ?? [];
        list.push({
          name,
          valueType: roles[0]?.concept ?? '',
          multiplicity: rel?.multiplicity,
          isIdentity: identifiers.has(name),
          isForeignKey: fkAttrs.has(name),
          componentIndex: ci,
          relationshipIndex: ri,
        });
        attributesByConceptId.set(ownerId, list);
      }
    });
  });
  return { edges, attributesByConceptId, referencedConcepts };
}

/**
 * Concept-to-concept edges only. Thin wrapper over {@link buildOntologyGraphModel}
 * for callers that don't need the attribute sub-elements.
 */
export function buildOntologyEdges(
  components: OntologyComponent[],
  selection: Selection,
): Edge[] {
  return buildOntologyGraphModel(components, selection).edges;
}

/** Recursively collect every `expression` string found within a mapping tree. */
function walkExpressions(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkExpressions(child, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.expression === 'string') out.push(obj.expression);
  for (const key of [
    'object_mappings',
    'object_mapping',
    'referent_mappings',
    'link_mappings',
    'children',
  ]) {
    if (key in obj) walkExpressions(obj[key], out);
  }
}

/** Extract the dataset name (token before the first `.`) from an expression. */
function datasetFromExpression(expression: string): string | undefined {
  const token = expression.split('.')[0]?.trim();
  if (!token || !/^[A-Za-z_]\w*$/.test(token)) return undefined;
  return token;
}

export interface MappingLink {
  concept: string;
  dataset: string;
}

export interface MappingLinks {
  datasetNames: string[];
  links: MappingLink[];
}

/**
 * Derive concept→dataset mapping links from `ontology_mappings[mapIndex]
 * .concept_mappings`. Only concepts present as nodes (in `known`) are linked.
 * Never throws: malformed data simply yields fewer links.
 */
export function buildMappingLinks(
  doc: AnyDraftDocument | null,
  mapIndex: number,
  known: Set<string>,
): MappingLinks {
  const result: MappingLinks = { datasetNames: [], links: [] };
  try {
    const ontDoc = doc as {
      ontology_mappings?: Array<{ concept_mappings?: unknown[] }>;
    } | null;
    const conceptMappings = ontDoc?.ontology_mappings?.[mapIndex]?.concept_mappings ?? [];
    const datasets = new Set<string>();
    for (const cm of conceptMappings) {
      const concept = (cm as { concept?: unknown })?.concept;
      if (typeof concept !== 'string' || !known.has(concept)) continue;
      const expressions: string[] = [];
      walkExpressions(cm, expressions);
      for (const expr of expressions) {
        const dataset = datasetFromExpression(expr);
        if (!dataset) continue;
        datasets.add(dataset);
        if (!result.links.some((l) => l.concept === concept && l.dataset === dataset)) {
          result.links.push({ concept, dataset });
        }
      }
    }
    result.datasetNames = [...datasets];
  } catch {
    /* never throw on malformed mapping data */
  }
  return result;
}
