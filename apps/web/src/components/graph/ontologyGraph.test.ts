import type { OntologyComponent } from '@osi-editor/osi-schema';
import { describe, expect, it } from 'vitest';
import {
  buildOntologyGraphModel,
  conceptNodeId,
  countEdgeCrossings,
  defaultExpanded,
  starLayoutGrouped,
  type LayoutBox,
  type LayoutEdge,
} from './ontologyGraph.js';

function component(name: string, relationships: OntologyComponent['relationships']): OntologyComponent {
  return { concept: { name, type: 'EntityType' }, relationships };
}

describe('buildOntologyGraphModel', () => {
  it('emits one edge per resolving role (multi-role relationships not collapsed)', () => {
    const components: OntologyComponent[] = [
      component('Flight', [
        {
          name: 'connects',
          verbalizes: ['{Flight} connects {Airport} {Airport}'],
          roles: [{ concept: 'Airport' }, { concept: 'Airport' }],
        },
      ]),
      component('Airport', []),
    ];

    const { edges } = buildOntologyGraphModel(components, null);
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => e.id)).toEqual(['orel-0-0-0', 'orel-0-0-1']);
    expect(edges.every((e) => e.source === conceptNodeId('Flight'))).toBe(true);
    expect(edges.every((e) => e.target === conceptNodeId('Airport'))).toBe(true);
  });

  it('collects attribute relationships instead of dropping them', () => {
    const components: OntologyComponent[] = [
      component('Airport', [
        { name: 'code', verbalizes: ['{Airport} code {String}'], roles: [{ concept: 'String' }] },
        { name: 'elevation', verbalizes: ['{Airport} elevation {Float}'], roles: [{ concept: 'Float' }] },
      ]),
    ];

    const { edges, attributesByConceptId } = buildOntologyGraphModel(components, null);
    expect(edges).toHaveLength(0);
    const attrs = attributesByConceptId.get(conceptNodeId('Airport'));
    expect(attrs).toBeDefined();
    expect(attrs?.map((a) => a.name)).toEqual(['code', 'elevation']);
    expect(attrs?.map((a) => a.valueType)).toEqual(['String', 'Float']);
    expect(attrs?.[0]).toMatchObject({ componentIndex: 0, relationshipIndex: 0 });
    expect(attrs?.[1]).toMatchObject({ componentIndex: 0, relationshipIndex: 1 });
  });

  it('represents every relationship — none omitted (edges + attributes)', () => {
    const components: OntologyComponent[] = [
      component('Airport', [
        { name: 'code', verbalizes: ['{Airport} code {String}'], roles: [{ concept: 'String' }] },
        { name: 'serves', verbalizes: ['{Airport} serves {City}'], roles: [{ concept: 'City' }] },
      ]),
      component('City', []),
    ];

    const { edges, attributesByConceptId } = buildOntologyGraphModel(components, null);
    const attrCount = [...attributesByConceptId.values()].reduce((n, a) => n + a.length, 0);
    // Two relationships on Airport: one edge (serves→City) + one attribute (code).
    expect(edges).toHaveLength(1);
    expect(attrCount).toBe(1);
    expect(edges[0]?.target).toBe(conceptNodeId('City'));
  });

  it('marks attributes named in identify_by as identity attributes', () => {
    const components: OntologyComponent[] = [
      {
        concept: { name: 'Airport', type: 'EntityType', identify_by: ['code'] },
        relationships: [
          { name: 'code', verbalizes: ['{Airport} code {String}'], roles: [{ concept: 'String' }] },
          { name: 'name', verbalizes: ['{Airport} name {String}'], roles: [{ concept: 'String' }] },
        ],
      },
    ];

    const { attributesByConceptId } = buildOntologyGraphModel(components, null);
    const attrs = attributesByConceptId.get(conceptNodeId('Airport'));
    expect(attrs?.find((a) => a.name === 'code')?.isIdentity).toBe(true);
    expect(attrs?.find((a) => a.name === 'name')?.isIdentity).toBe(false);
  });

  it('treats a role to a referenced (undeclared, non-primitive) concept as an edge, not an attribute', () => {
    const components: OntologyComponent[] = [
      component('Airport', [
        // Example_Flight is referenced but not declared, and is not a value type.
        { name: 'flights', verbalizes: ['{Airport} flights {Example_Flight}'], roles: [{ concept: 'Example_Flight' }] },
        { name: 'code', verbalizes: ['{Airport} code {String}'], roles: [{ concept: 'String' }] },
      ]),
    ];

    const { edges, attributesByConceptId, referencedConcepts } = buildOntologyGraphModel(
      components,
      null,
    );
    expect(edges).toHaveLength(1);
    expect(edges[0]?.target).toBe(conceptNodeId('Example_Flight'));
    expect(referencedConcepts.has('Example_Flight')).toBe(true);
    // Only the String-typed relationship is an attribute.
    expect(attributesByConceptId.get(conceptNodeId('Airport'))?.map((a) => a.name)).toEqual(['code']);
  });

  it('marks foreign-key attributes from a relationship derived_by expression', () => {
    const components: OntologyComponent[] = [
      component('Runway', [
        { name: 'airportid', verbalizes: ['{Runway} airportid {String}'], roles: [{ concept: 'String' }] },
        {
          name: 'airports',
          verbalizes: ['{Runway} airports {Airport}'],
          roles: [{ concept: 'Airport' }],
          derived_by: ['Runway.airportid == Airport.airportid'],
        },
      ]),
      component('Airport', []),
    ];

    const { attributesByConceptId } = buildOntologyGraphModel(components, null);
    const attrs = attributesByConceptId.get(conceptNodeId('Runway'));
    expect(attrs?.find((a) => a.name === 'airportid')?.isForeignKey).toBe(true);
  });

  it('marks edges selected when the relationship is selected', () => {
    const components: OntologyComponent[] = [
      component('Airport', [
        { name: 'serves', verbalizes: ['{Airport} serves {City}'], roles: [{ concept: 'City' }] },
      ]),
      component('City', []),
    ];

    const { edges } = buildOntologyGraphModel(components, {
      kind: 'ontology-relationship',
      componentIndex: 0,
      relationshipIndex: 0,
    });
    expect(edges[0]?.selected).toBe(true);
  });
});

describe('defaultExpanded', () => {
  it('keeps small nodes expanded up to and including the fold threshold (8)', () => {
    expect(defaultExpanded(0)).toBe(true);
    expect(defaultExpanded(4)).toBe(true);
    expect(defaultExpanded(8)).toBe(true);
  });

  it('folds large nodes with more fields than the threshold', () => {
    expect(defaultExpanded(9)).toBe(false);
    expect(defaultExpanded(50)).toBe(false);
  });
});

describe('countEdgeCrossings', () => {
  /** Node centres for a laid-out box set (positions are top-left corners). */
  function centres(
    boxes: LayoutBox[],
    positions: Map<string, { x: number; y: number }>,
  ): Map<string, { x: number; y: number }> {
    const m = new Map<string, { x: number; y: number }>();
    for (const b of boxes) {
      const p = positions.get(b.id);
      if (p) m.set(b.id, { x: p.x + b.width / 2, y: p.y + b.height / 2 });
    }
    return m;
  }

  it('counts a pair of edges that visibly cross (an X)', () => {
    const positions = new Map<string, { x: number; y: number }>([
      ['c1', { x: 0, y: 0 }],
      ['c2', { x: 100, y: 0 }],
      ['d1', { x: 0, y: 100 }],
      ['d2', { x: 100, y: 100 }],
    ]);
    const edges: LayoutEdge[] = [
      { source: 'c1', target: 'd2' },
      { source: 'c2', target: 'd1' },
    ];
    expect(countEdgeCrossings(positions, edges)).toBe(1);
  });

  it('returns zero for parallel, non-crossing edges', () => {
    const positions = new Map<string, { x: number; y: number }>([
      ['c1', { x: 0, y: 0 }],
      ['c2', { x: 100, y: 0 }],
      ['d1', { x: 0, y: 100 }],
      ['d2', { x: 100, y: 100 }],
    ]);
    const edges: LayoutEdge[] = [
      { source: 'c1', target: 'd1' },
      { source: 'c2', target: 'd2' },
    ];
    expect(countEdgeCrossings(positions, edges)).toBe(0);
  });

  it('ignores edges that merely share an endpoint', () => {
    const positions = new Map<string, { x: number; y: number }>([
      ['hub', { x: 50, y: 0 }],
      ['a', { x: 0, y: 100 }],
      ['b', { x: 100, y: 100 }],
    ]);
    const edges: LayoutEdge[] = [
      { source: 'hub', target: 'a' },
      { source: 'hub', target: 'b' },
    ];
    expect(countEdgeCrossings(positions, edges)).toBe(0);
  });

  it('detects a naive-placement crossing that starLayoutGrouped then removes', () => {
    // Reversed cross-band pairing: with the bands in id order the two mapping
    // edges cross; the grouped layout reorders the lower band to remove them.
    const boxes: LayoutBox[] = [
      { id: 'c1', width: 200, height: 100, band: 0 },
      { id: 'c2', width: 200, height: 100, band: 0 },
      { id: 'd1', width: 200, height: 100, band: 1 },
      { id: 'd2', width: 200, height: 100, band: 1 },
    ];
    const mapping: LayoutEdge[] = [
      { source: 'c1', target: 'd2' },
      { source: 'c2', target: 'd1' },
    ];
    const naive = new Map<string, { x: number; y: number }>([
      ['c1', { x: 0, y: 0 }],
      ['c2', { x: 300, y: 0 }],
      ['d1', { x: 0, y: 300 }],
      ['d2', { x: 300, y: 300 }],
    ]);
    expect(countEdgeCrossings(naive, mapping)).toBeGreaterThan(0);

    const positions = starLayoutGrouped(boxes, mapping);
    expect(countEdgeCrossings(centres(boxes, positions), mapping)).toBe(0);
  });

  it('reduces cross-band crossings across multiple clusters per band', () => {
    // Each band has two connected clusters (hub + leaf). The cross-band mapping
    // links the clusters in reversed id order, so a naive id-order placement makes
    // the two mapping edges cross; the inter-cluster ordering must realign them.
    const top: LayoutBox[] = [
      { id: 'a0', width: 200, height: 100, band: 0 },
      { id: 'a1', width: 200, height: 100, band: 0 },
      { id: 'b0', width: 200, height: 100, band: 0 },
      { id: 'b1', width: 200, height: 100, band: 0 },
    ];
    const bottom: LayoutBox[] = [
      { id: 'p0', width: 200, height: 100, band: 1 },
      { id: 'p1', width: 200, height: 100, band: 1 },
      { id: 'q0', width: 200, height: 100, band: 1 },
      { id: 'q1', width: 200, height: 100, band: 1 },
    ];
    const boxes = [...top, ...bottom];
    const intra: LayoutEdge[] = [
      { source: 'a0', target: 'a1' },
      { source: 'b0', target: 'b1' },
      { source: 'p0', target: 'p1' },
      { source: 'q0', target: 'q1' },
    ];
    // Reversed pairing: cluster A ↔ cluster Q, cluster B ↔ cluster P.
    const cross: LayoutEdge[] = [
      { source: 'a0', target: 'q0' },
      { source: 'b0', target: 'p0' },
    ];
    const positions = starLayoutGrouped(boxes, [...intra, ...cross]);
    // The sweep aligns the mapping edges so they no longer cross.
    expect(countEdgeCrossings(centres(boxes, positions), cross)).toBe(0);
  });
});
