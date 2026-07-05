import { describe, expect, it } from 'vitest';
import { createEmptyDocument, createDataset } from './factory.js';
import type { OsiDocument } from './model.js';
import { validate, validateSemantics, validateStructure } from './validation.js';

function docWith(model: Partial<OsiDocument['semantic_model'][number]>): OsiDocument {
  return {
    version: '0.2.0.dev0',
    semantic_model: [{ name: 'm', datasets: [], ...model }],
  };
}

describe('validateStructure', () => {
  it('passes a valid model', () => {
    const doc = docWith({ datasets: [createDataset('orders', 'db.public.orders')] });
    expect(validateStructure(doc)).toEqual([]);
  });

  it('reports a missing required dataset field (source)', () => {
    const doc = docWith({ datasets: [{ name: 'orders' } as never] });
    const diags = validateStructure(doc);
    const sourceIssue = diags.find((d) => d.path.includes('source'));
    expect(sourceIssue).toBeDefined();
    expect(sourceIssue?.code).toBe('required_field');
    expect(sourceIssue?.entityRef?.kind).toBe('dataset');
  });

  it('reports a missing required dataset name', () => {
    const doc = docWith({ datasets: [{ source: 'db.t' } as never] });
    const diags = validateStructure(doc);
    expect(diags.some((d) => d.path.includes('name') && d.code === 'required_field')).toBe(true);
  });

  it('accepts an empty (draft) model with no datasets', () => {
    expect(validateStructure(createEmptyDocument('m'))).toEqual([]);
  });
});

describe('validateSemantics — referential integrity', () => {
  it('flags a dangling relationship reference', () => {
    const doc = docWith({
      datasets: [createDataset('orders', 'db.orders')],
      relationships: [
        { name: 'r', from: 'orders', to: 'ghost', from_columns: ['a'], to_columns: ['b'] },
      ],
    });
    const diags = validateSemantics(doc);
    const dangling = diags.find((d) => d.code === 'dangling_reference');
    expect(dangling?.message).toContain('ghost');
    expect(dangling?.entityRef?.kind).toBe('relationship');
  });

  it('flags mismatched key arity', () => {
    const doc = docWith({
      datasets: [createDataset('a', 'db.a'), createDataset('b', 'db.b')],
      relationships: [
        { name: 'r', from: 'a', to: 'b', from_columns: ['x', 'y'], to_columns: ['z'] },
      ],
    });
    const diags = validateSemantics(doc);
    expect(diags.some((d) => d.code === 'key_arity_mismatch')).toBe(true);
  });
});

describe('validateSemantics — uniqueness', () => {
  it('flags duplicate dataset names', () => {
    const doc = docWith({
      datasets: [createDataset('orders', 'db.a'), createDataset('orders', 'db.b')],
    });
    const diags = validateSemantics(doc);
    expect(diags.some((d) => d.code === 'duplicate_name')).toBe(true);
  });

  it('flags duplicate field names within a dataset', () => {
    const doc = docWith({
      datasets: [
        {
          name: 'orders',
          source: 'db.orders',
          fields: [
            { name: 'id', expression: { dialects: [{ dialect: 'ANSI_SQL', expression: 'id' }] } },
            { name: 'id', expression: { dialects: [{ dialect: 'ANSI_SQL', expression: 'id' }] } },
          ],
        },
      ],
    });
    const diags = validateSemantics(doc);
    const dup = diags.find((d) => d.code === 'duplicate_name');
    expect(dup?.message).toContain('orders');
    expect(dup?.entityRef?.kind).toBe('field');
  });
});

describe('validate (combined)', () => {
  it('returns structural + semantic diagnostics together', () => {
    const doc = docWith({
      datasets: [createDataset('orders', 'db.orders'), createDataset('orders', 'db.dup')],
      relationships: [
        { name: 'r', from: 'orders', to: 'nope', from_columns: ['a'], to_columns: ['b'] },
      ],
    });
    const diags = validate(doc);
    expect(diags.some((d) => d.code === 'duplicate_name')).toBe(true);
    expect(diags.some((d) => d.code === 'dangling_reference')).toBe(true);
  });
});

describe('validateOntologySemantics', () => {
  function ontologyDoc(overrides: Record<string, unknown> = {}) {
    return {
      version: '0.2.0.dev0',
      name: 'o',
      ontology: [
        { concept: { name: 'Airport', type: 'EntityType' }, relationships: [] },
        { concept: { name: 'Runway', type: 'EntityType' }, relationships: [] },
      ],
      ...overrides,
    };
  }

  it('passes a valid ontology document', () => {
    expect(validate(ontologyDoc())).toEqual([]);
  });

  it('flags duplicate concept names', () => {
    const doc = ontologyDoc({
      ontology: [
        { concept: { name: 'Dup', type: 'EntityType' } },
        { concept: { name: 'Dup', type: 'EntityType' } },
      ],
    });
    const diags = validate(doc);
    expect(diags.some((d) => d.code === 'duplicate_name' && d.entityRef?.kind === 'concept')).toBe(true);
  });

  it('rejects an invalid concept type structurally', () => {
    const doc = ontologyDoc({
      ontology: [{ concept: { name: 'X', type: 'Nope' } }],
    });
    expect(validate(doc).some((d) => d.code.startsWith('schema_'))).toBe(true);
  });

  it('flags duplicate relationship names on the same concept', () => {
    const doc = ontologyDoc({
      ontology: [
        {
          concept: { name: 'Airport', type: 'EntityType' },
          relationships: [
            { name: 'id', roles: [{ concept: 'String' }], verbalizes: ['{Airport} id {String}'] },
            { name: 'id', roles: [{ concept: 'String' }], verbalizes: ['{Airport} id {String}'] },
          ],
        },
      ],
    });
    const diags = validate(doc);
    expect(
      diags.some(
        (d) => d.code === 'duplicate_name' && d.entityRef?.kind === 'ontology-relationship',
      ),
    ).toBe(true);
  });

  it('does not flag roles referencing undeclared entity types (valid OSI)', () => {
    const doc = ontologyDoc({
      ontology: [
        {
          concept: { name: 'Airport', type: 'EntityType' },
          relationships: [
            { name: 'flights', roles: [{ concept: 'Flight' }], verbalizes: ['{Airport} flights {Flight}'] },
          ],
        },
      ],
    });
    expect(validate(doc)).toEqual([]);
  });

  it('flags a concept mapping that references an unknown concept', () => {
    const doc = ontologyDoc({
      ontology_mappings: [
        {
          semantic_model: { name: 'm', datasets: [] },
          concept_mappings: [{ concept: 'Ghost' }],
        },
      ],
    });
    const diags = validate(doc);
    expect(
      diags.some((d) => d.code === 'dangling_reference' && d.entityRef?.kind === 'concept-mapping'),
    ).toBe(true);
  });

  it('warns when a mapping expression does not resolve to a dataset field', () => {
    const doc = ontologyDoc({
      ontology_mappings: [
        {
          semantic_model: {
            name: 'm',
            datasets: [
              {
                name: 'runway',
                source: 'db.runway',
                fields: [
                  { name: 'id', expression: { dialects: [{ dialect: 'ANSI_SQL', expression: 'id' }] } },
                ],
              },
            ],
          },
          concept_mappings: [
            {
              concept: 'Airport',
              object_mappings: [{ expression: 'runway.ghost_field' }],
            },
          ],
        },
      ],
    });
    const diags = validate(doc);
    const warn = diags.find(
      (d) => d.severity === 'warning' && d.code === 'dangling_reference',
    );
    expect(warn?.message).toContain('runway.ghost_field');
    expect(warn?.path).toEqual([
      'ontology_mappings',
      0,
      'concept_mappings',
      0,
      'object_mappings',
      0,
      'expression',
    ]);
  });

  it('does not warn for a resolving reference or a raw SQL expression', () => {
    const doc = ontologyDoc({
      ontology_mappings: [
        {
          semantic_model: {
            name: 'm',
            datasets: [
              {
                name: 'runway',
                source: 'db.runway',
                fields: [
                  { name: 'id', expression: { dialects: [{ dialect: 'ANSI_SQL', expression: 'id' }] } },
                ],
              },
            ],
          },
          concept_mappings: [
            {
              concept: 'Airport',
              object_mappings: [{ expression: 'runway.id' }],
              link_mappings: [
                { object_mapping: { expression: 'CAST(id AS VARCHAR)' }, relationship: 'anything' },
              ],
            },
          ],
        },
      ],
    });
    expect(validate(doc).some((d) => d.severity === 'warning')).toBe(false);
  });
});
