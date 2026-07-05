import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectUnsupported, importText } from './import.js';
import { parse, serialize } from './io.js';
import { validate } from './validation.js';

const tpcdsPath = fileURLToPath(
  new URL('../test/fixtures/tpcds_semantic_model.yaml', import.meta.url),
);
const tpcdsYaml = readFileSync(tpcdsPath, 'utf8');

const flightsPath = fileURLToPath(new URL('../test/fixtures/flights.yaml', import.meta.url));
const flightsYaml = readFileSync(flightsPath, 'utf8');

describe('round-trip fidelity (TPC-DS example)', () => {
  it('imports the vendored TPC-DS model without parse errors', () => {
    const result = importText(tpcdsYaml, 'tpcds_semantic_model.yaml');
    expect(result.parseError).toBeUndefined();
    expect(result.document?.version).toBe('0.2.0.dev0');
    expect(result.document?.semantic_model[0]?.name).toBe('tpcds_retail_model');
  });

  it('is semantically valid per OSI rules', () => {
    const { document } = importText(tpcdsYaml, 'tpcds_semantic_model.yaml');
    expect(validate(document)).toEqual([]);
  });

  it('import → export (YAML) → re-parse is structurally identical', () => {
    const original = parse(tpcdsYaml, 'yaml');
    const { document } = importText(tpcdsYaml, 'tpcds_semantic_model.yaml');
    const reparsed = parse(serialize(document, 'yaml'), 'yaml');
    expect(reparsed).toEqual(original);
  });

  it('import → export (JSON) → re-parse is structurally identical', () => {
    const original = parse(tpcdsYaml, 'yaml');
    const { document } = importText(tpcdsYaml, 'tpcds_semantic_model.yaml');
    const reparsed = parse(serialize(document, 'json'), 'json');
    expect(reparsed).toEqual(original);
  });

  it('preserves custom_extensions and ai_context across the round trip', () => {
    const model = {
      version: '0.2.0.dev0',
      semantic_model: [
        {
          name: 'm',
          ai_context: { instructions: 'be careful', synonyms: ['sales'] },
          datasets: [
            {
              name: 'orders',
              source: 'db.orders',
              ai_context: 'the orders table',
              custom_extensions: [{ vendor_name: 'SNOWFLAKE', data: '{"warehouse":"WH"}' }],
              fields: [
                {
                  name: 'id',
                  expression: { dialects: [{ dialect: 'ANSI_SQL', expression: 'id' }] },
                },
              ],
            },
          ],
          custom_extensions: [{ vendor_name: 'DBT', data: '{"project":"x"}' }],
        },
      ],
    };
    const { document } = importText(JSON.stringify(model), 'm.json');
    expect(parse(serialize(document, 'yaml'), 'yaml')).toEqual(model);
    expect(parse(serialize(document, 'json'), 'json')).toEqual(model);
  });
});

describe('round-trip fidelity (flights ontology example)', () => {
  it('imports the vendored flights ontology as an ontology document', () => {
    const result = importText(flightsYaml, 'flights.yaml');
    expect(result.parseError).toBeUndefined();
    expect(result.kind).toBe('ontology');
    expect(result.unsupported).toBeUndefined();
    const doc = result.document as { name?: string; ontology?: unknown[] };
    expect(doc.name).toBe('flights');
    expect(doc.ontology?.length).toBe(3);
  });

  it('is semantically valid per OSI rules', () => {
    const { document } = importText(flightsYaml, 'flights.yaml');
    expect(validate(document)).toEqual([]);
  });

  it('import → export (YAML) → re-parse is structurally identical', () => {
    const original = parse(flightsYaml, 'yaml');
    const { document } = importText(flightsYaml, 'flights.yaml');
    const reparsed = parse(serialize(document, 'yaml'), 'yaml');
    expect(reparsed).toEqual(original);
  });

  it('import → export (JSON) → re-parse is structurally identical', () => {
    const original = parse(flightsYaml, 'yaml');
    const { document } = importText(flightsYaml, 'flights.yaml');
    const reparsed = parse(serialize(document, 'json'), 'json');
    expect(reparsed).toEqual(original);
  });

  it('preserves the nested semantic_model and concept_mappings trees', () => {
    const { document } = importText(flightsYaml, 'flights.yaml');
    const doc = document as {
      ontology_mappings?: Array<{
        semantic_model?: { datasets?: unknown[] };
        concept_mappings?: unknown[];
      }>;
    };
    const map = doc.ontology_mappings?.[0];
    expect(map?.semantic_model?.datasets?.length).toBeGreaterThan(0);
    expect(map?.concept_mappings?.length).toBeGreaterThan(0);
  });
});

describe('document kind detection', () => {
  it('accepts a semantic-model document (not unsupported)', () => {
    const doc = { version: '0.2.0.dev0', semantic_model: [{ name: 'm', datasets: [] }] };
    expect(detectUnsupported(doc)).toBeUndefined();
  });

  it('accepts an OSI ontology document (now supported)', () => {
    const ontology = { version: '0.2.0.dev0', name: 'flights', ontology: [{ concept: { name: 'X', type: 'EntityType' } }] };
    expect(detectUnsupported(ontology)).toBeUndefined();
  });

  it('importText classifies an ontology document as kind "ontology"', () => {
    const yaml = 'version: 0.2.0.dev0\nname: flights\nontology:\n  - concept:\n      name: X\n      type: EntityType\n';
    const result = importText(yaml, 'flights.yaml');
    expect(result.parseError).toBeUndefined();
    expect(result.kind).toBe('ontology');
    expect(result.unsupported).toBeUndefined();
  });

  it('flags an object with neither semantic_model nor ontology as unknown', () => {
    expect(detectUnsupported({ foo: 1 })?.kind).toBe('unknown');
  });
});
