import type { OntologyComponent } from '@osi-editor/osi-schema';
import { describe, expect, it } from 'vitest';
import { buildOntologyGraphModel, conceptNodeId } from './ontologyGraph.js';

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
