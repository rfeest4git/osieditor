import { describe, expect, it } from 'vitest';
import {
  buildSemanticEdges,
  datasetLanePosition,
  datasetNodeId,
  gridPosition,
  reconcilePositions,
  type SemanticModelLike,
} from './ontologyGraph.js';

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

describe('datasetLanePosition', () => {
  it('places datasets in a lane below the concept grid', () => {
    expect(datasetLanePosition(0).y).toBeGreaterThan(gridPosition(0).y);
    // Same column x as the concept grid so lanes align vertically.
    expect(datasetLanePosition(0).x).toBe(gridPosition(0).x);
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
});
