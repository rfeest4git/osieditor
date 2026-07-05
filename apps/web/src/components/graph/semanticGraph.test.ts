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
  type DomainNodeBounds,
  type EstimatedItem,
  type LayoutBox,
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
