import { describe, expect, it } from 'vitest';
import {
  arrangeBoxes,
  buildMetricRows,
  buildSemanticEdges,
  computeRegionRects,
  datasetFieldsById,
  datasetNodeId,
  estimateNodeHeight,
  estimateNodeWidth,
  gridPosition,
  layoutEstimatedBands,
  reconcilePositions,
  starLayout,
  starLayoutGrouped,
  type DomainNodeBounds,
  type EstimatedItem,
  type LayoutBox,
  type LayoutEdge,
  type SemanticModelLike,
} from './ontologyGraph.js';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** True when two axis-aligned boxes intersect (touching edges do not count). */
function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Bounding boxes for laid-out {@link LayoutBox}es, using their own declared sizes. */
function boxesFor(boxes: LayoutBox[], positions: Map<string, { x: number; y: number }>): Box[] {
  return boxes.map((b) => {
    const pos = positions.get(b.id);
    if (!pos) throw new Error(`no position for ${b.id}`);
    return { x: pos.x, y: pos.y, w: b.width, h: b.height };
  });
}

/** Assert no two boxes in the set overlap. */
function expectNoOverlap(boxes: Box[]): void {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(intersects(boxes[i]!, boxes[j]!)).toBe(false);
    }
  }
}

describe('buildSemanticEdges', () => {
  it('renders every relationship whose from/to datasets both exist (none omitted)', () => {
    const model: SemanticModelLike = {
      datasets: [{ name: 'orders' }, { name: 'customers' }, { name: 'items' }],
      relationships: [
        { from: 'orders', to: 'customers', name: 'placed_by' },
        { from: 'orders', to: 'items', name: 'contains' },
        { from: 'items', to: 'orders', name: 'belongs_to' },
      ],
    };

    const edges = buildSemanticEdges(model, null);
    expect(edges).toHaveLength(3);
    expect(edges.map((e) => e.id)).toEqual(['rel-0', 'rel-1', 'rel-2']);
  });

  it('omits relationships whose endpoint dataset is missing but keeps the rest', () => {
    const model: SemanticModelLike = {
      datasets: [{ name: 'orders' }, { name: 'customers' }],
      relationships: [
        { from: 'orders', to: 'customers', name: 'placed_by' },
        { from: 'orders', to: 'ghost', name: 'dangling' },
      ],
    };

    const edges = buildSemanticEdges(model, null);
    // Edge id keeps the original relationship index so selection still maps back.
    expect(edges.map((e) => e.id)).toEqual(['rel-0']);
  });

  it('marks the edge selected when its relationship is selected', () => {
    const model: SemanticModelLike = {
      datasets: [{ name: 'orders' }, { name: 'customers' }],
      relationships: [{ from: 'orders', to: 'customers' }],
    };
    const edges = buildSemanticEdges(model, { kind: 'relationship', relationshipIndex: 0 });
    expect(edges[0]?.selected).toBe(true);
  });

  it('maps join endpoints through the node-id mapper (unified canvas ids)', () => {
    const model: SemanticModelLike = {
      datasets: [{ name: 'orders' }, { name: 'customers' }],
      relationships: [{ from: 'orders', to: 'customers' }],
    };
    const edges = buildSemanticEdges(model, null, datasetNodeId);
    expect(edges[0]?.source).toBe(datasetNodeId('orders'));
    expect(edges[0]?.target).toBe(datasetNodeId('customers'));
  });
});

describe('estimateNodeHeight', () => {
  it('grows with the row count and never caps a tall node', () => {
    expect(estimateNodeHeight(0)).toBeLessThan(estimateNodeHeight(3));
    expect(estimateNodeHeight(3)).toBeLessThan(estimateNodeHeight(10));
    // A 50-field node really is tall — clamping its height is what caused overlap.
    expect(estimateNodeHeight(50)).toBeGreaterThan(estimateNodeHeight(10));
    expect(estimateNodeHeight(50)).toBeGreaterThan(1000);
  });
});

describe('estimateNodeWidth', () => {
  it('widens with the longest text but stays within a clamp', () => {
    const narrow = estimateNodeWidth(['id']);
    const wide = estimateNodeWidth(['destination_display_airport_city_market_name_full']);
    expect(wide).toBeGreaterThan(narrow);
    // Clamped: a pathologically long label does not blow the node out to full width.
    expect(estimateNodeWidth(['x'.repeat(500)])).toBe(estimateNodeWidth(['y'.repeat(1000)]));
  });
});

describe('arrangeBoxes', () => {
  it('never overlaps boxes of wildly different widths and heights', () => {
    // A very tall/narrow box next to short/wide ones, spilling across several rows.
    const boxes: LayoutBox[] = Array.from({ length: 12 }, (_, i) => ({
      id: `n${i}`,
      width: i % 2 === 0 ? 460 : 200,
      height: i % 4 === 0 ? 1300 : 90, // the 51-field-node case that used to overlap
      band: 0,
    }));
    expectNoOverlap(boxesFor(boxes, arrangeBoxes(boxes)));
  });

  it('stacks bands so a tall box in one band never overlaps an adjacent band', () => {
    const boxes: LayoutBox[] = [
      { id: 'c0', width: 300, height: 1400, band: 0 }, // huge concept
      { id: 'c1', width: 200, height: 90, band: 0 },
      { id: 'd0', width: 400, height: 600, band: 1 },
      { id: 'm0', width: 200, height: 80, band: 2 },
    ];
    const positions = arrangeBoxes(boxes);
    const band = (ids: string[]) => boxesFor(boxes.filter((b) => ids.includes(b.id)), positions);
    const bottom = (ids: string[]) => Math.max(...band(ids).map((b) => b.y + b.h));
    const top = (ids: string[]) => Math.min(...band(ids).map((b) => b.y));

    expectNoOverlap(boxesFor(boxes, positions));
    expect(bottom(['c0', 'c1'])).toBeLessThan(top(['d0']));
    expect(bottom(['d0'])).toBeLessThan(top(['m0']));
  });

  it('gives a box wider than the row budget its own row instead of looping forever', () => {
    const boxes: LayoutBox[] = [
      { id: 'a', width: 5000, height: 100, band: 0 },
      { id: 'b', width: 200, height: 100, band: 0 },
    ];
    const positions = arrangeBoxes(boxes, { maxRowWidth: 800 });
    expect(positions.get('a')!.y).toBeLessThan(positions.get('b')!.y); // b wrapped below a
    expectNoOverlap(boxesFor(boxes, positions));
  });
});

describe('computeRegionRects', () => {
  it('returns one padded box per domain, each enclosing its nodes', () => {
    const nodes: DomainNodeBounds[] = [
      { domain: 'ontology', x: 100, y: 100, width: 200, height: 80 },
      { domain: 'ontology', x: 400, y: 120, width: 200, height: 300 },
      { domain: 'semantic', x: 120, y: 800, width: 240, height: 500 },
    ];
    const rects = computeRegionRects(nodes);
    expect(rects.map((r) => r.domain)).toEqual(['ontology', 'semantic']);

    const ont = rects.find((r) => r.domain === 'ontology')!;
    // Encloses both ontology nodes (x:100..600, y:100..420) with padding, so the
    // box starts left/above the min corner and extends past the max corner.
    expect(ont.x).toBeLessThan(100);
    expect(ont.y).toBeLessThan(100);
    expect(ont.x + ont.width).toBeGreaterThan(600);
    expect(ont.y + ont.height).toBeGreaterThan(420);

    // The two domain boxes do not vertically overlap (semantic sits well below).
    const sem = rects.find((r) => r.domain === 'semantic')!;
    expect(ont.y + ont.height).toBeLessThan(sem.y);
  });

  it('ignores nodes that have not been measured yet (zero size)', () => {
    const rects = computeRegionRects([
      { domain: 'semantic', x: 0, y: 0, width: 0, height: 0 },
    ]);
    expect(rects).toEqual([]);
  });
});

describe('layoutEstimatedBands', () => {
  it('estimates sizes and lays bands out without overlap', () => {
    const concepts: EstimatedItem[] = [
      { id: 'c0', rows: 15, texts: ['Airport', 'airportid ID', 'displayname String'] },
      { id: 'c1', rows: 2, texts: ['Runway'] },
    ];
    const datasets: EstimatedItem[] = [{ id: 'd0', rows: 51, texts: ['huge_dataset'] }];
    const metrics: EstimatedItem[] = [{ id: 'm0', texts: ['revenue'] }];
    const positions = layoutEstimatedBands([concepts, datasets, metrics]);
    expect([...positions.keys()].sort()).toEqual(['c0', 'c1', 'd0', 'm0']);
    // d0 (band 1) sits below the concept band; m0 (band 2) below d0.
    expect(positions.get('c0')!.y).toBeLessThan(positions.get('d0')!.y);
    expect(positions.get('d0')!.y).toBeLessThan(positions.get('m0')!.y);
  });
});

describe('datasetFieldsById', () => {
  it('derives field rows per dataset keyed by node id', () => {
    const model = {
      datasets: [
        {
          name: 'orders',
          fields: [
            { name: 'id' },
            { name: 'placed_at', label: 'Placed', dimension: { is_time: true } },
          ],
        },
        { name: 'customers', fields: [] },
      ],
    };

    const map = datasetFieldsById(model);
    const orders = map.get('orders');
    expect(orders?.map((r) => r.name)).toEqual(['id', 'placed_at']);
    // label wins over the time-dimension detail; second field carries indices.
    expect(orders?.[1]).toMatchObject({ detail: 'Placed', datasetIndex: 0, fieldIndex: 1 });
    // A dataset with no fields maps to an empty list (not undefined).
    expect(map.get('customers')).toEqual([]);
  });

  it('shows the time-dimension detail when a field has no label', () => {
    const model = {
      datasets: [{ name: 'orders', fields: [{ name: 'ts', dimension: { is_time: true } }] }],
    };
    expect(datasetFieldsById(model).get('orders')?.[0]?.detail).toBe('time');
  });

  it('keys rows through the node-id mapper for the unified canvas', () => {
    const model = { datasets: [{ name: 'orders', fields: [{ name: 'id' }] }] };
    const map = datasetFieldsById(model, datasetNodeId);
    expect(map.has(datasetNodeId('orders'))).toBe(true);
    expect(map.has('orders')).toBe(false);
  });
});

describe('buildMetricRows', () => {
  it('includes the description and preserves the metric index', () => {
    const model = {
      metrics: [
        { name: 'revenue', description: 'Sum of order totals' },
        { name: 'orders_count' },
      ],
    };
    const rows = buildMetricRows(model);
    expect(rows).toEqual([
      { name: 'revenue', description: 'Sum of order totals', metricIndex: 0 },
      { name: 'orders_count', description: undefined, metricIndex: 1 },
    ]);
  });

  it('returns an empty list when the model has no metrics', () => {
    expect(buildMetricRows({})).toEqual([]);
  });
});

describe('reconcilePositions', () => {
  it('preserves dragged positions across a model reconciliation (by id)', () => {
    const dragged = { x: 999, y: 777 };
    const prev = [
      { id: 'orders', position: dragged },
      { id: 'customers', position: { x: 0, y: 0 } },
    ];
    // Model changes: a new dataset is inserted first, reordering the list.
    const positionFor = reconcilePositions(prev);
    expect(positionFor('new_ds', 0)).toEqual(gridPosition(0)); // new node → grid slot
    expect(positionFor('orders', 1)).toEqual(dragged); // orders keeps its dragged position
    expect(positionFor('customers', 2)).toEqual({ x: 0, y: 0 });
  });

  it('remembered position wins over the computed layout; new ids fall back to it', () => {
    // Mirrors the reconciliation fallback in GraphView: positions.get(id) ?? computed.get(id).
    const dragged = { x: 999, y: 777 };
    const remembered = new Map([['orders', dragged]]);
    const computed = layoutEstimatedBands([
      [{ id: 'orders', rows: 4 }, { id: 'customers', rows: 2 }],
    ]);

    const resolve = (id: string) => remembered.get(id) ?? computed.get(id);
    expect(resolve('orders')).toEqual(dragged); // remembered wins, ignores computed
    expect(resolve('customers')).toEqual(computed.get('customers')); // new id → computed slot
  });
});

/** Centre point of a laid-out box (positions are top-left corners). */
function centreOf(box: LayoutBox, positions: Map<string, { x: number; y: number }>): { x: number; y: number } {
  const p = positions.get(box.id);
  if (!p) throw new Error(`no position for ${box.id}`);
  return { x: p.x + box.width / 2, y: p.y + box.height / 2 };
}

/** Union bounding box of a subset of laid-out boxes. */
function unionBox(boxes: LayoutBox[], positions: Map<string, { x: number; y: number }>): Box {
  const rects = boxesFor(boxes, positions);
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Orientation of the ordered triple (a, b, c): >0 ccw, <0 cw, 0 collinear. */
function cross(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** True when segments p1p2 and p3p4 properly cross at an interior point. */
function segmentsCross(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Assert no two edges cross except where they share an endpoint node. */
function expectNoEdgeCrossings(
  boxes: LayoutBox[],
  edges: LayoutEdge[],
  positions: Map<string, { x: number; y: number }>,
): void {
  const byId = new Map(boxes.map((b) => [b.id, b]));
  const pt = (id: string) => centreOf(byId.get(id)!, positions);
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i]!;
      const b = edges[j]!;
      const shared = a.source === b.source || a.source === b.target || a.target === b.source || a.target === b.target;
      if (shared) continue;
      expect(segmentsCross(pt(a.source), pt(a.target), pt(b.source), pt(b.target))).toBe(false);
    }
  }
}

describe('starLayout', () => {
  it('places a hub and its neighbours without overlap across wildly mixed sizes', () => {
    // A hub fanning out to neighbours including one node far taller than the rest.
    const boxes: LayoutBox[] = [
      { id: 'hub', width: 240, height: 120, band: 0 },
      { id: 'a', width: 200, height: 90, band: 0 },
      { id: 'b', width: 460, height: 1400, band: 0 }, // the 50-field-node case: very tall
      { id: 'c', width: 180, height: 80, band: 0 },
      { id: 'd', width: 320, height: 220, band: 0 },
      { id: 'e', width: 200, height: 90, band: 0 },
    ];
    const edges: LayoutEdge[] = ['a', 'b', 'c', 'd', 'e'].map((n) => ({ source: 'hub', target: n }));
    expectNoOverlap(boxesFor(boxes, starLayout(boxes, edges)));
  });

  it('distributes a hub`s neighbours around it so their spokes do not cross', () => {
    const boxes: LayoutBox[] = [
      { id: 'hub', width: 220, height: 120, band: 0 },
      ...['a', 'b', 'c', 'd', 'e', 'f'].map((id): LayoutBox => ({ id, width: 200, height: 100, band: 0 })),
    ];
    const edges: LayoutEdge[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => ({ source: 'hub', target: n }));
    const positions = starLayout(boxes, edges);

    // Every neighbour sits at a distinct angle around the hub (radiating outward).
    const hub = centreOf(boxes[0]!, positions);
    const angles = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => {
      const c = centreOf(boxes.find((b) => b.id === id)!, positions);
      return Math.atan2(c.y - hub.y, c.x - hub.x);
    });
    expect(new Set(angles.map((a) => a.toFixed(4))).size).toBe(angles.length);
    // Spokes share the hub endpoint, so they never cross one another.
    expectNoEdgeCrossings(boxes, edges, positions);
    expectNoOverlap(boxesFor(boxes, positions));
  });

  it('orders mutually connected neighbours adjacently to avoid crossings', () => {
    // Hub → a,b,c,d, with a–b and c–d also connected: the layout should place each
    // connected pair adjacently on the ring so the a–b / c–d edges do not cross spokes.
    const boxes: LayoutBox[] = [
      { id: 'hub', width: 220, height: 120, band: 0 },
      ...['a', 'b', 'c', 'd'].map((id): LayoutBox => ({ id, width: 200, height: 100, band: 0 })),
    ];
    const edges: LayoutEdge[] = [
      ...['a', 'b', 'c', 'd'].map((n) => ({ source: 'hub', target: n })),
      { source: 'a', target: 'b' },
      { source: 'c', target: 'd' },
    ];
    const positions = starLayout(boxes, edges);
    const hub = centreOf(boxes[0]!, positions);
    const angleOf = (id: string) => {
      const c = centreOf(boxes.find((b) => b.id === id)!, positions);
      return Math.atan2(c.y - hub.y, c.x - hub.x);
    };
    const order = ['a', 'b', 'c', 'd'].sort((x, y) => angleOf(x) - angleOf(y));
    const cyclicAdjacent = (x: string, z: string) => {
      const i = order.indexOf(x);
      const j = order.indexOf(z);
      const diff = Math.abs(i - j);
      return diff === 1 || diff === order.length - 1;
    };
    expect(cyclicAdjacent('a', 'b')).toBe(true);
    expect(cyclicAdjacent('c', 'd')).toBe(true);
    expectNoOverlap(boxesFor(boxes, positions));
  });

  it('packs separate components and edgeless nodes clear of the connected clusters', () => {
    const comp1: LayoutBox[] = [
      { id: 'h1', width: 220, height: 120, band: 0 },
      { id: 'a1', width: 200, height: 100, band: 0 },
      { id: 'b1', width: 200, height: 100, band: 0 },
    ];
    const comp2: LayoutBox[] = [
      { id: 'h2', width: 220, height: 120, band: 0 },
      { id: 'a2', width: 200, height: 100, band: 0 },
      { id: 'b2', width: 200, height: 100, band: 0 },
    ];
    const edgeless: LayoutBox[] = [
      { id: 'e1', width: 180, height: 80, band: 0 },
      { id: 'e2', width: 180, height: 80, band: 0 },
      { id: 'e3', width: 180, height: 80, band: 0 },
    ];
    const boxes = [...comp1, ...comp2, ...edgeless];
    const edges: LayoutEdge[] = [
      { source: 'h1', target: 'a1' },
      { source: 'h1', target: 'b1' },
      { source: 'h2', target: 'a2' },
      { source: 'h2', target: 'b2' },
    ];
    const positions = starLayout(boxes, edges);
    expectNoOverlap(boxesFor(boxes, positions));

    // The two connected clusters and the edgeless grid occupy disjoint bounding boxes.
    const b1 = unionBox(comp1, positions);
    const b2 = unionBox(comp2, positions);
    const be = unionBox(edgeless, positions);
    expect(intersects(b1, b2)).toBe(false);
    expect(intersects(b1, be)).toBe(false);
    expect(intersects(b2, be)).toBe(false);
  });
});

describe('starLayoutGrouped', () => {
  it('keeps domain clusters spatially separated so their region boxes do not overlap', () => {
    // Band 0 = ontology (concepts), band 1 = semantic (datasets), each internally
    // connected. The grouped layout must stack them so the domain bounding boxes,
    // and thus their region boxes, never intersect — even with a tall dataset node.
    const ontology: LayoutBox[] = [
      { id: 'c-hub', width: 240, height: 120, band: 0 },
      { id: 'c-a', width: 200, height: 100, band: 0 },
      { id: 'c-b', width: 200, height: 100, band: 0 },
    ];
    const semantic: LayoutBox[] = [
      { id: 'd-hub', width: 260, height: 140, band: 1 },
      { id: 'd-a', width: 220, height: 100, band: 1 },
      { id: 'd-b', width: 460, height: 1200, band: 1 }, // tall dataset
    ];
    const boxes = [...ontology, ...semantic];
    const edges: LayoutEdge[] = [
      { source: 'c-hub', target: 'c-a' },
      { source: 'c-hub', target: 'c-b' },
      { source: 'd-hub', target: 'd-a' },
      { source: 'd-hub', target: 'd-b' },
    ];
    const positions = starLayoutGrouped(boxes, edges);
    expectNoOverlap(boxesFor(boxes, positions));

    const ontBox = unionBox(ontology, positions);
    const semBox = unionBox(semantic, positions);
    expect(intersects(ontBox, semBox)).toBe(false);
    // Region rects derived from the domain bounds also stay clear of each other.
    const bounds: DomainNodeBounds[] = boxes.map((b) => {
      const p = positions.get(b.id)!;
      return { domain: b.band === 0 ? 'ontology' : 'semantic', x: p.x, y: p.y, width: b.width, height: b.height };
    });
    const rects = computeRegionRects(bounds);
    expect(rects).toHaveLength(2);
    const asBox = (r: { x: number; y: number; width: number; height: number }): Box => ({
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
    });
    expect(intersects(asBox(rects[0]!), asBox(rects[1]!))).toBe(false);
  });

  it('orders the lower band by its cross-layer partners so mapping edges do not cross', () => {
    // Two concepts (top band) each map to a dataset (bottom band), but the id order
    // of the datasets is the reverse of their partners. Without alignment the two
    // "maps to" edges would cross; the grouped layout must order the bottom band by
    // partner position so the crossings disappear.
    const concepts: LayoutBox[] = [
      { id: 'c1', width: 200, height: 100, band: 0 },
      { id: 'c2', width: 200, height: 100, band: 0 },
    ];
    const datasets: LayoutBox[] = [
      { id: 'd1', width: 200, height: 100, band: 1 },
      { id: 'd2', width: 200, height: 100, band: 1 },
    ];
    const boxes = [...concepts, ...datasets];
    // c1 (left) ↔ d2, c2 (right) ↔ d1: reversed id order on purpose.
    const mapping: LayoutEdge[] = [
      { source: 'c1', target: 'd2' },
      { source: 'c2', target: 'd1' },
    ];
    const positions = starLayoutGrouped(boxes, mapping);
    expectNoOverlap(boxesFor(boxes, positions));

    // The bottom band is reordered so d2 sits under c1 (left) and d1 under c2 (right).
    const x = (id: string) => positions.get(id)!.x;
    expect(x('c1')).toBeLessThan(x('c2'));
    expect(x('d2')).toBeLessThan(x('d1'));
    // With the aligned ordering the two mapping edges no longer cross.
    expectNoEdgeCrossings(boxes, mapping, positions);
  });
});
