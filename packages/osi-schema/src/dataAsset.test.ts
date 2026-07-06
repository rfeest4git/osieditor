import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dataAssetToOntology, DATA_ASSET_VENDOR, toConceptName } from './dataAsset.js';
import { importDataAssetText } from './import.js';
import { parse } from './io.js';
import { type DataAsset, type OntologyDocument } from './model.js';
import { validate } from './validation.js';

const fixturePath = fileURLToPath(
  new URL('../test/fixtures/customer_orders_data_asset.yaml', import.meta.url),
);
const fixtureYaml = readFileSync(fixturePath, 'utf8');
const fixture = parse(fixtureYaml, 'yaml') as DataAsset;

describe('toConceptName', () => {
  it('produces a schema-valid PascalCase concept name', () => {
    expect(toConceptName('customer')).toBe('Customer');
    expect(toConceptName('customerId')).toBe('CustomerId');
    expect(toConceptName('email address')).toBe('EmailAddress');
    expect(toConceptName('order-status')).toBe('OrderStatus');
  });

  it('guarantees an uppercase-letter leader', () => {
    expect(toConceptName('123abc')).toMatch(/^[A-Z][a-zA-Z0-9_-]*$/);
    expect(toConceptName('')).toBe('Concept');
  });
});

describe('dataAssetToOntology', () => {
  const ontology = dataAssetToOntology(fixture);

  it('converts each entity to an EntityType concept and nothing else', () => {
    // Only entities become concepts; attributes are relationships, not concepts.
    expect(ontology.ontology).toHaveLength(2);
    const names = ontology.ontology.map((c) => c.concept.name).sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(['Customer', 'Order']);
    expect(ontology.ontology.every((c) => c.concept.type === 'EntityType')).toBe(true);
    const customer = ontology.ontology.find((c) => c.concept.name === 'Customer');
    expect(customer?.concept.description).toContain('Customer');
  });

  it('converts each attribute to a ManyToOne relationship to a predefined String value type', () => {
    const customer = ontology.ontology.find((c) => c.concept.name === 'Customer');
    const rel = customer?.relationships?.find((r) => r.name === 'emailAddress');
    expect(rel?.multiplicity).toBe('ManyToOne');
    expect(rel?.roles).toEqual([{ concept: 'String' }]);
    expect(rel?.verbalizes?.[0]).toBe('{Customer} emailAddress {String}');
    // The attribute's description is retained on the relationship.
    expect(rel?.description).toContain('Primary contact email');
  });

  it('adds one relationship per attribute on the owning entity', () => {
    const customer = ontology.ontology.find((c) => c.concept.name === 'Customer');
    const order = ontology.ontology.find((c) => c.concept.name === 'Order');
    expect(customer?.relationships?.map((r) => r.name).sort((a, b) => a.localeCompare(b))).toEqual([
      'customerId',
      'emailAddress',
    ]);
    expect(order?.relationships?.map((r) => r.name).sort((a, b) => a.localeCompare(b))).toEqual([
      'orderId',
      'status',
    ]);
  });

  it('seeds document name and description from the DataAsset', () => {
    expect(ontology.name).toBe('Customer Orders');
    expect(ontology.description).toBe('Core customer and order data for the retail domain.');
  });

  it('preserves non-mappable metadata in a collibra-data-asset custom_extensions bag', () => {
    const bag = ontology.custom_extensions?.find((e) => e.vendor_name === DATA_ASSET_VENDOR);
    expect(bag).toBeDefined();
    const preserved: Record<string, unknown> = JSON.parse(bag!.data);
    expect(preserved.identifier).toBe('b3d1f2a0-1c2d-4e5f-8a9b-0c1d2e3f4a5b');
    expect(preserved.dataOwner).toBe('data.team@example.com');
    expect(preserved.schemaVersion).toBe('3.0.1');
    const entities = preserved.entities as Record<string, { classification?: string }>;
    expect(entities.customer.classification).toBe('Confidential');
  });

  it('produces a valid, editable ontology document', () => {
    expect(validate(ontology)).toEqual([]);
    expect(ontology.version).toBe('0.2.0.dev0');
    expect(ontology.ontology_mappings).toHaveLength(1);
  });

  it('uses a declared attribute type when present, else String', () => {
    const asset = dataAssetToOntology({
      schemaVersion: '3.0.1',
      name: 'Typed',
      entities: {
        widget: {
          displayName: 'Widget',
          attributes: {
            weight: { displayName: 'Weight', type: 'Float' },
            label: { displayName: 'Label' },
          },
        },
      },
    });
    const widget = asset.ontology.find((c) => c.concept.name === 'Widget');
    expect(widget?.relationships?.find((r) => r.name === 'weight')?.roles).toEqual([
      { concept: 'Float' },
    ]);
    expect(widget?.relationships?.find((r) => r.name === 'label')?.roles).toEqual([
      { concept: 'String' },
    ]);
  });
});

describe('importDataAssetText', () => {
  it('converts a valid DataAsset into an ontology document', () => {
    const result = importDataAssetText(fixtureYaml, 'customer_orders_data_asset.yaml');
    expect(result.parseError).toBeUndefined();
    expect(result.unsupported).toBeUndefined();
    expect(result.kind).toBe('ontology');
    expect((result.document as OntologyDocument).name).toBe('Customer Orders');
    expect(result.diagnostics).toEqual([]);
  });

  it('returns a parse error for malformed input without a document', () => {
    const result = importDataAssetText('entities: [unterminated', 'broken.yaml');
    expect(result.parseError).toBeDefined();
    expect(result.document).toBeUndefined();
  });

  it('rejects a non-DataAsset document as unsupported', () => {
    const osiOntology = JSON.stringify({ version: '0.2.0.dev0', name: 'x', ontology: [] });
    const result = importDataAssetText(osiOntology, 'ontology.json');
    expect(result.unsupported?.kind).toBe('unknown');
    expect(result.document).toBeUndefined();
  });

  it('reports validation diagnostics when a required field is missing', () => {
    const missing = JSON.stringify({
      schemaVersion: '3.0.1',
      entities: { customer: { description: 'no display name' } },
    });
    const result = importDataAssetText(missing, 'missing.json');
    expect(result.unsupported).toBeUndefined();
    expect(result.document).toBeDefined();
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((d) => d.code === 'required_field')).toBe(true);
  });

  it('accepts real-world DataAsset shapes without spurious errors', () => {
    // Object `classification` and non-string `example` values (number/date) are
    // valid in real DataAsset 3.x files and must not produce diagnostics.
    const asset = JSON.stringify({
      schemaVersion: '3.0.0',
      name: 'Vehicle Data',
      entities: {
        vehicle: {
          displayName: 'Vehicle',
          classification: {
            securityClassification: 'confidential',
            containsPersonallyIdentifiableInformation: true,
          },
          attributes: {
            modelYear: { displayName: 'Model Year', example: 2014 },
            vin: { displayName: 'VIN', example: 'WP0ZZZ99ZCS700232' },
            builtOn: { displayName: 'Built On', example: '1999-11-04' },
          },
        },
      },
    });
    const result = importDataAssetText(asset, 'vehicle.json');
    expect(result.parseError).toBeUndefined();
    expect(result.unsupported).toBeUndefined();
    expect(result.diagnostics).toEqual([]);
    expect((result.document as OntologyDocument).name).toBe('Vehicle Data');
  });
});
