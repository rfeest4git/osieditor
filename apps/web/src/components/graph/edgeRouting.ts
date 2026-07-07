/**
 * Obstacle-aware orthogonal edge routing.
 *
 * Given a source and target point (the edge's two handles) plus the bounding
 * boxes of every OTHER node, produce an orthogonal polyline (horizontal/vertical
 * segments) that never passes through a non-endpoint box. Used by the custom
 * React Flow `ObstacleEdge` so connection lines bend around intervening boxes
 * instead of being drawn across them.
 *
 * The algorithm has three tiers (see design.md):
 *  1. Direct L/Z path (mirrors `smoothstep`) when the channel is clear.
 *  2. A grid/visibility search (Dijkstra with a bend penalty) over the lines of
 *     obstacle edges when the direct channel is blocked.
 *  3. A simple gutter detour fallback when the search finds nothing.
 *
 * Pure and framework-free so it can be unit-tested without React Flow.
 */

/** An axis-aligned rectangle in flow coordinates (top-left origin). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A point in flow coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** Which side of a node a handle sits on. Matches React Flow's `Position`. */
export type Side = 'left' | 'right' | 'top' | 'bottom';

/** A routed edge: the ordered polyline points, the SVG path, and a label anchor. */
export interface RouteResult {
  points: Point[];
  path: string;
  labelX: number;
  labelY: number;
}

/** Options controlling the router. */
export interface RouteOptions {
  /** Padding added around every obstacle so lines never touch box borders. */
  padding?: number;
  /** Extra cost added each time the path changes direction (keeps paths simple). */
  bendPenalty?: number;
}

/** Default padding inflated around each obstacle box (flow units). */
const DEFAULT_PADDING = 16;
/** Default per-bend penalty, in the same units as segment length. */
const DEFAULT_BEND_PENALTY = 60;

/** Grow a rectangle outward by `padding` on every side. */
export function inflateRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

/**
 * True when the orthogonal segment `a`→`b` passes through the OPEN interior of
 * `rect`. Touching an edge or corner does not count, so a path may run flush
 * against a (padded) box border without being considered a crossing.
 */
export function segmentIntersectsRect(a: Point, b: Point, rect: Rect): boolean {
  const rx1 = rect.x;
  const ry1 = rect.y;
  const rx2 = rect.x + rect.width;
  const ry2 = rect.y + rect.height;
  if (a.y === b.y) {
    // Horizontal segment.
    const y = a.y;
    if (y <= ry1 || y >= ry2) return false;
    const xmin = Math.min(a.x, b.x);
    const xmax = Math.max(a.x, b.x);
    return xmax > rx1 && xmin < rx2;
  }
  if (a.x === b.x) {
    // Vertical segment.
    const x = a.x;
    if (x <= rx1 || x >= rx2) return false;
    const ymin = Math.min(a.y, b.y);
    const ymax = Math.max(a.y, b.y);
    return ymax > ry1 && ymin < ry2;
  }
  // Non-orthogonal segments are not produced by this router; be conservative.
  return false;
}

/** True when none of `obstacles` is crossed by any segment of the polyline. */
export function pathIsClear(points: Point[], obstacles: Rect[]): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    for (const rect of obstacles) {
      if (segmentIntersectsRect(a, b, rect)) return false;
    }
  }
  return true;
}

/** Whether a handle side is horizontal (left/right) vs vertical (top/bottom). */
function isHorizontal(side: Side): boolean {
  return side === 'left' || side === 'right';
}

/** Remove consecutive duplicate and collinear points from a polyline. */
export function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    out.push(p);
  }
  for (let i = 1; i < out.length - 1; ) {
    const a = out[i - 1]!;
    const b = out[i]!;
    const c = out[i + 1]!;
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (collinear) {
      out.splice(i, 1);
    } else {
      i++;
    }
  }
  return out;
}

/**
 * Direct orthogonal Z path from `source` to `target`, mirroring `smoothstep`:
 * leave the source in its handle's axis, split at the midpoint, and enter the
 * target. Returns the (simplified) polyline.
 */
export function directOrthogonalPath(
  source: Point,
  target: Point,
  sourceSide: Side,
  targetSide: Side,
): Point[] {
  const points: Point[] = [source];
  if (isHorizontal(sourceSide) || (!isHorizontal(sourceSide) && !isHorizontal(targetSide))) {
    if (isHorizontal(sourceSide)) {
      const midX = (source.x + target.x) / 2;
      points.push({ x: midX, y: source.y }, { x: midX, y: target.y });
    } else {
      const midY = (source.y + target.y) / 2;
      points.push({ x: source.x, y: midY }, { x: target.x, y: midY });
    }
  } else {
    // Source vertical, target horizontal: single elbow through the corner.
    points.push({ x: source.x, y: target.y });
  }
  points.push(target);
  return simplify(points);
}

/** Convert a polyline to an SVG path string (`M … L … L …`). */
export function toSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [head, ...rest] = points;
  const move = `M${head!.x},${head!.y}`;
  const lines = rest.map((p) => `L${p.x},${p.y}`).join('');
  return move + lines;
}

/** Point on the polyline at half its total length — used to anchor the label. */
export function labelAnchor(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0]!;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.abs(points[i + 1]!.x - points[i]!.x) + Math.abs(points[i + 1]!.y - points[i]!.y);
  }
  let target = total / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (len >= target) {
      const t = len === 0 ? 0 : target / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    target -= len;
  }
  return points[points.length - 1]!;
}

/** Sorted unique numeric list. */
function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Grid/visibility routing: build candidate x/y lines from the obstacle edges
 * (plus the endpoints), then Dijkstra with a bend penalty over the lattice,
 * skipping any segment that crosses an obstacle. Returns `null` when the goal is
 * unreachable on the lattice.
 */
function gridRoute(
  source: Point,
  target: Point,
  obstacles: Rect[],
  bendPenalty: number,
): Point[] | null {
  const xsRaw = [source.x, target.x];
  const ysRaw = [source.y, target.y];
  for (const r of obstacles) {
    xsRaw.push(r.x, r.x + r.width);
    ysRaw.push(r.y, r.y + r.height);
  }
  const xs = uniqueSorted(xsRaw);
  const ys = uniqueSorted(ysRaw);
  const W = xs.length;
  const H = ys.length;
  const xIndex = new Map(xs.map((v, i) => [v, i]));
  const yIndex = new Map(ys.map((v, i) => [v, i]));

  const idx = (i: number, j: number) => j * W + i;
  const startI = xIndex.get(source.x)!;
  const startJ = yIndex.get(source.y)!;
  const goalI = xIndex.get(target.x)!;
  const goalJ = yIndex.get(target.y)!;
  const start = idx(startI, startJ);
  const goal = idx(goalI, goalJ);

  // Dijkstra state keyed by (node, incoming direction): 0 = none, 1 = H, 2 = V.
  const stateKey = (node: number, dir: number) => node * 3 + dir;
  const best = new Map<number, number>();
  const prev = new Map<number, number>();
  // Small graph → a linear-scan priority frontier is fine.
  const frontier: Array<{ cost: number; node: number; dir: number }> = [
    { cost: 0, node: start, dir: 0 },
  ];
  best.set(stateKey(start, 0), 0);

  const pointOf = (node: number): Point => ({ x: xs[node % W]!, y: ys[Math.floor(node / W)]! });
  let goalState = -1;

  while (frontier.length > 0) {
    let bi = 0;
    for (let k = 1; k < frontier.length; k++) {
      if (frontier[k]!.cost < frontier[bi]!.cost) bi = k;
    }
    const cur = frontier.splice(bi, 1)[0]!;
    const curKey = stateKey(cur.node, cur.dir);
    if (cur.cost > (best.get(curKey) ?? Infinity)) continue;
    if (cur.node === goal) {
      goalState = curKey;
      break;
    }
    const ci = cur.node % W;
    const cj = Math.floor(cur.node / W);
    const neighbors: Array<{ node: number; dir: number; dist: number }> = [];
    if (ci > 0) neighbors.push({ node: idx(ci - 1, cj), dir: 1, dist: xs[ci]! - xs[ci - 1]! });
    if (ci < W - 1) neighbors.push({ node: idx(ci + 1, cj), dir: 1, dist: xs[ci + 1]! - xs[ci]! });
    if (cj > 0) neighbors.push({ node: idx(ci, cj - 1), dir: 2, dist: ys[cj]! - ys[cj - 1]! });
    if (cj < H - 1) neighbors.push({ node: idx(ci, cj + 1), dir: 2, dist: ys[cj + 1]! - ys[cj]! });

    const from = pointOf(cur.node);
    for (const nb of neighbors) {
      const to = pointOf(nb.node);
      let blocked = false;
      for (const rect of obstacles) {
        if (segmentIntersectsRect(from, to, rect)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      const bend = cur.dir !== 0 && cur.dir !== nb.dir ? bendPenalty : 0;
      const nextCost = cur.cost + nb.dist + bend;
      const nbKey = stateKey(nb.node, nb.dir);
      if (nextCost < (best.get(nbKey) ?? Infinity)) {
        best.set(nbKey, nextCost);
        prev.set(nbKey, curKey);
        frontier.push({ cost: nextCost, node: nb.node, dir: nb.dir });
      }
    }
  }

  if (goalState < 0) {
    // Goal may have been reached via a non-zero direction not popped yet; pick
    // the cheapest recorded state on the goal node.
    for (const dir of [1, 2]) {
      const key = stateKey(goal, dir);
      if (best.has(key) && (goalState < 0 || best.get(key)! < best.get(goalState)!)) {
        goalState = key;
      }
    }
  }
  if (goalState < 0) return null;

  const path: Point[] = [];
  let key: number | undefined = goalState;
  while (key !== undefined) {
    const node = Math.floor(key / 3);
    path.push(pointOf(node));
    key = prev.get(key);
  }
  path.reverse();
  return simplify(path);
}

/**
 * Fallback gutter detour: route via a horizontal line placed just above or below
 * every obstacle, whichever yields a clear path. Best-effort — returns the direct
 * path if neither gutter is clear.
 */
function detourPath(
  source: Point,
  target: Point,
  sourceSide: Side,
  targetSide: Side,
  obstacles: Rect[],
): Point[] {
  if (obstacles.length === 0) {
    return directOrthogonalPath(source, target, sourceSide, targetSide);
  }
  const minTop = Math.min(...obstacles.map((r) => r.y));
  const maxBottom = Math.max(...obstacles.map((r) => r.y + r.height));
  const minLeft = Math.min(...obstacles.map((r) => r.x));
  const maxRight = Math.max(...obstacles.map((r) => r.x + r.width));
  const gap = 24;

  const horizontalCandidates = [minTop - gap, maxBottom + gap].map((gy) =>
    simplify([source, { x: source.x, y: gy }, { x: target.x, y: gy }, target]),
  );
  const verticalCandidates = [minLeft - gap, maxRight + gap].map((gx) =>
    simplify([source, { x: gx, y: source.y }, { x: gx, y: target.y }, target]),
  );
  for (const candidate of [...horizontalCandidates, ...verticalCandidates]) {
    if (pathIsClear(candidate, obstacles)) return candidate;
  }
  return directOrthogonalPath(source, target, sourceSide, targetSide);
}

/**
 * Route an orthogonal edge from `source` to `target` avoiding every rectangle in
 * `obstacles` (which MUST exclude the edge's own two endpoint boxes). Tries the
 * direct path, then grid search, then a gutter detour.
 */
export function routeEdge(
  source: Point,
  target: Point,
  sourceSide: Side,
  targetSide: Side,
  obstacles: Rect[],
  options: RouteOptions = {},
): RouteResult {
  const padding = options.padding ?? DEFAULT_PADDING;
  const bendPenalty = options.bendPenalty ?? DEFAULT_BEND_PENALTY;
  const inflated = obstacles.map((r) => inflateRect(r, padding));

  let points = directOrthogonalPath(source, target, sourceSide, targetSide);
  if (!pathIsClear(points, inflated)) {
    const grid = gridRoute(source, target, inflated, bendPenalty);
    if (grid && pathIsClear(grid, inflated)) {
      points = grid;
    } else {
      points = detourPath(source, target, sourceSide, targetSide, inflated);
    }
  }

  const anchor = labelAnchor(points);
  return { points, path: toSvgPath(points), labelX: anchor.x, labelY: anchor.y };
}
