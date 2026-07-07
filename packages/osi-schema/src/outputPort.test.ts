import { describe, expect, it } from 'vitest';
import { mergeOutputPortIntoOntology, mergeOutputPortModel, OUTPUT_PORT_VENDOR, outputPortToSemanticModel } from './outputPort.js';
import { importOutputPortText } from './import.js';
import { detectOutputPort, OSI_SPEC_VERSION, type OntologyDocument, type OsiDocument, type OutputPortDocument } from './model.js';
import { validate } from './validation.js';

/**
 * Inline fixture mirroring the structure of
 * `samples/data_product/outputports/datasphere.yml`: two output ports, tables
 * with qualified names and typed fields (including temporal ones), plus a table
 * with no fields and a colliding table name to exercise uniquification.
 */
const fixture: OutputPortDocument = {
  version: '1.0.0',
  schemaVersion: '3.0.0',
  outputPorts: [
    {
      name: 'PVH Base @ Datasphere DEV',
      identifier: 'lx9782_53757107',
      description: 'PVH Consolidated Vehicle masterdata views in Datasphere DEV',
      platform: 'LX9782',
      tables: [
        {
          description: 'Consolidated master vehicle data table.',
          database: 'dev',
          schema: 'VEH_PVH_VEH_DATA_AS',
          table: 'DP_PVH_CONSOLIDATED_MASTER',
          identifier: '05094909',
          type: 'view',
          fields: [
            {
              name: 'VGUID',
              entityAttribute: 'VehicleConsolidatedMasterData.vguid',
              type: 'string',
            },
            { name: 'ORDER_CREATION_DATE', type: 'date' },
            { name: 'EVENT_TIMESTAMP', type: 'timestamp' },
            {
              name: 'IS_SYNTHETIC',
              filterRuleReference: 'filter_synthetic',
              type: 'bool',
            },
          ],
        },
        {
          description: 'Vehicle order type group info.',
          database: 'dev',
          schema: 'VEH_DATA_DOM_VEH_MS',
          table: 'GV_PVH_VEHICLE_GROUPS',
          identifier: 'c509c2dc',
          type: 'view',
        },
        {
          // Same table name as the first table → name must be uniquified.
          database: 'dev',
          schema: 'OTHER',
          table: 'DP_PVH_CONSOLIDATED_MASTER',
          fields: [{ name: 'ID', type: 'string' }],
        },
      ],
    },
    {
      name: 'PVH Base @ Datasphere PROD',
      identifier: 'lx9782_f15f90ab',
      description: 'PVH views in Datasphere PROD',
      platform: 'LX9782',
      tables: [
        {
          database: 'prod',
          schema: 'VEH_PVH_VEH_DATA_AS',
          table: 'DP_PVH_CONSOLIDATED_MASTER',
          fields: [{ name: 'VIN', type: 'string' }],
        },
      ],
    },
  ],
};

/** Parse the single `output-port` custom-extensions bag on an element, if any. */
function preserved(element: { custom_extensions?: { vendor_name: string; data: string }[] }) {
  const bag = element.custom_extensions?.find((e) => e.vendor_name === OUTPUT_PORT_VENDOR);
  return bag ? (JSON.parse(bag.data) as Record<string, unknown>) : undefined;
}

describe('outputPortToSemanticModel', () => {
  const doc = outputPortToSemanticModel(fixture);

  it('converts each output port into a semantic model, first one active', () => {
    expect(doc.version).toBeTruthy();
    expect(doc.semantic_model).toHaveLength(2);
    expect(doc.semantic_model[0].name).toBe('PVH Base @ Datasphere DEV');
    expect(doc.semantic_model[0].description).toContain('Datasphere DEV');
    expect(doc.semantic_model[1].name).toBe('PVH Base @ Datasphere PROD');
  });

  it('converts tables to datasets with a source composed from database.schema.table', () => {
    const [dataset] = doc.semantic_model[0].datasets;
    expect(dataset.name).toBe('DP_PVH_CONSOLIDATED_MASTER');
    expect(dataset.source).toBe('dev.VEH_PVH_VEH_DATA_AS.DP_PVH_CONSOLIDATED_MASTER');
    expect(dataset.description).toContain('Consolidated master');
  });

  it('converts fields with a seeded identity expression referencing the column', () => {
    const field = doc.semantic_model[0].datasets[0].fields?.find((f) => f.name === 'VGUID');
    expect(field?.expression.dialects[0].expression).toBe('VGUID');
  });

  it('marks date and timestamp fields as time dimensions', () => {
    const fields = doc.semantic_model[0].datasets[0].fields ?? [];
    expect(fields.find((f) => f.name === 'ORDER_CREATION_DATE')?.dimension?.is_time).toBe(true);
    expect(fields.find((f) => f.name === 'EVENT_TIMESTAMP')?.dimension?.is_time).toBe(true);
    expect(fields.find((f) => f.name === 'VGUID')?.dimension?.is_time).toBeUndefined();
  });

  it('produces a dataset with an empty field list for a table without fields', () => {
    const dataset = doc.semantic_model[0].datasets.find((d) => d.name === 'GV_PVH_VEHICLE_GROUPS');
    expect(dataset?.fields).toEqual([]);
  });

  it('uniquifies colliding dataset names within a model', () => {
    const names = doc.semantic_model[0].datasets.map((d) => d.name);
    expect(names).toContain('DP_PVH_CONSOLIDATED_MASTER');
    expect(names).toContain('DP_PVH_CONSOLIDATED_MASTER_2');
    expect(new Set(names).size).toBe(names.length);
  });

  it('preserves non-mappable model, dataset, and field metadata', () => {
    const model = doc.semantic_model[0];
    expect(preserved(model)).toEqual({ identifier: 'lx9782_53757107', platform: 'LX9782' });

    const dataset = model.datasets[0];
    expect(preserved(dataset)).toEqual({
      identifier: '05094909',
      database: 'dev',
      schema: 'VEH_PVH_VEH_DATA_AS',
      type: 'view',
    });

    const field = dataset.fields?.find((f) => f.name === 'VGUID');
    expect(preserved(field!)).toEqual({
      type: 'string',
      entityAttribute: 'VehicleConsolidatedMasterData.vguid',
    });

    const synthetic = dataset.fields?.find((f) => f.name === 'IS_SYNTHETIC');
    expect(preserved(synthetic!)).toEqual({
      type: 'bool',
      filterRuleReference: 'filter_synthetic',
    });
  });
});

describe('detectOutputPort', () => {
  it('recognizes a document with outputPorts and schemaVersion', () => {
    expect(detectOutputPort(fixture)).toBe(true);
  });

  it('rejects non-Output-Port shapes', () => {
    expect(detectOutputPort({ semantic_model: [] })).toBe(false);
    expect(detectOutputPort({ entities: {}, schemaVersion: '3.0.1' })).toBe(false);
    expect(detectOutputPort({ outputPorts: [] })).toBe(false);
    expect(detectOutputPort([])).toBe(false);
    expect(detectOutputPort(null)).toBe(false);
    expect(detectOutputPort('nope')).toBe(false);
  });
});

describe('importOutputPortText', () => {
  it('converts a valid Output Port YAML into a semantic-model document', () => {
    const yaml =
      'schemaVersion: "3.0.0"\noutputPorts:\n  - name: Port A\n    tables:\n      - table: orders\n        database: db\n        schema: public\n        fields:\n          - name: id\n            type: string\n';
    const result = importOutputPortText(yaml, 'port.yaml');
    expect(result.parseError).toBeUndefined();
    expect(result.unsupported).toBeUndefined();
    expect(result.kind).toBe('semantic-model');
    const doc = result.document as { semantic_model: { datasets: { source: string }[] }[] };
    expect(doc.semantic_model[0].datasets[0].source).toBe('db.public.orders');
  });

  it('returns a parse error on malformed input', () => {
    const result = importOutputPortText('{not valid', 'x.json');
    expect(result.parseError).toBeDefined();
    expect(result.document).toBeUndefined();
  });

  it('returns unsupported for a non-Output-Port document', () => {
    const result = importOutputPortText(
      JSON.stringify({ version: '0.2.0.dev0', semantic_model: [] }),
      'x.json',
    );
    expect(result.unsupported?.kind).toBe('unknown');
    expect(result.document).toBeUndefined();
  });
});

describe('mergeOutputPortModel', () => {
  // A target model with two datasets and a model-level output-port metadata bag.
  const target: OsiDocument = outputPortToSemanticModel({
    schemaVersion: '3.0.0',
    outputPorts: [
      {
        name: 'Target Port',
        identifier: 'target-1',
        platform: 'TGT',
        tables: [
          { table: 'orders', database: 'db', schema: 'public', fields: [{ name: 'id', type: 'string' }] },
          { table: 'customers', database: 'db', schema: 'public', fields: [{ name: 'cid', type: 'string' }] },
        ],
      },
    ],
  });

  it('appends the incoming datasets to the active model while retaining existing ones', () => {
    const incoming = outputPortToSemanticModel({
      schemaVersion: '3.0.0',
      outputPorts: [
        {
          name: 'Incoming Port',
          tables: [{ table: 'products', database: 'db', schema: 'public', fields: [{ name: 'sku', type: 'string' }] }],
        },
      ],
    });
    const merged = mergeOutputPortModel(target, incoming);
    expect(merged.semantic_model[0].datasets.map((d) => d.name)).toEqual([
      'orders',
      'customers',
      'products',
    ]);
    // `target` is not mutated and the merged document stays valid/editable.
    expect(target.semantic_model[0].datasets).toHaveLength(2);
    expect(validate(merged)).toEqual([]);
  });

  it('adds the datasets from every port of a multi-port incoming file', () => {
    const incoming = outputPortToSemanticModel({
      schemaVersion: '3.0.0',
      outputPorts: [
        { name: 'Port One', tables: [{ table: 'a', database: 'db', schema: 's', fields: [{ name: 'x', type: 'string' }] }] },
        { name: 'Port Two', tables: [{ table: 'b', database: 'db', schema: 's', fields: [{ name: 'y', type: 'string' }] }] },
      ],
    });
    const merged = mergeOutputPortModel(target, incoming);
    expect(merged.semantic_model[0].datasets.map((d) => d.name)).toEqual([
      'orders',
      'customers',
      'a',
      'b',
    ]);
    // All incoming ports are flattened into the single active model.
    expect(merged.semantic_model).toHaveLength(1);
  });

  it('uniquifies dataset names that collide with existing or in-batch datasets', () => {
    const incoming = outputPortToSemanticModel({
      schemaVersion: '3.0.0',
      outputPorts: [
        { name: 'P1', tables: [{ table: 'orders', database: 'db', schema: 'other', fields: [{ name: 'id', type: 'string' }] }] },
        { name: 'P2', tables: [{ table: 'orders', database: 'db', schema: 'more', fields: [{ name: 'id', type: 'string' }] }] },
      ],
    });
    const merged = mergeOutputPortModel(target, incoming);
    const names = merged.semantic_model[0].datasets.map((d) => d.name);
    expect(names).toEqual(['orders', 'customers', 'orders_2', 'orders_3']);
    expect(new Set(names).size).toBe(names.length);
    // The pre-existing `orders` dataset is left untouched.
    expect(merged.semantic_model[0].datasets.find((d) => d.name === 'orders')?.source).toBe(
      'db.public.orders',
    );
  });

  it('keeps non-colliding dataset names unchanged', () => {
    const incoming = outputPortToSemanticModel({
      schemaVersion: '3.0.0',
      outputPorts: [
        { name: 'P', tables: [{ table: 'shipments', database: 'db', schema: 's', fields: [{ name: 'sid', type: 'string' }] }] },
      ],
    });
    const merged = mergeOutputPortModel(target, incoming);
    expect(merged.semantic_model[0].datasets.map((d) => d.name)).toEqual([
      'orders',
      'customers',
      'shipments',
    ]);
  });

  it('accumulates model-level and dataset-level output-port metadata across merges', () => {
    const incoming = outputPortToSemanticModel({
      schemaVersion: '3.0.0',
      outputPorts: [
        {
          name: 'Incoming Port',
          identifier: 'incoming-1',
          platform: 'INC',
          tables: [
            {
              table: 'products',
              database: 'wh',
              schema: 'public',
              identifier: 'p-1',
              type: 'view',
              fields: [{ name: 'sku', type: 'string' }],
            },
          ],
        },
      ],
    });
    const merged = mergeOutputPortModel(target, incoming);
    const model = merged.semantic_model[0];
    // Port-level bags from both the target and the incoming import are retained.
    const identifiers = (model.custom_extensions ?? [])
      .filter((e) => e.vendor_name === OUTPUT_PORT_VENDOR)
      .map((e) => (JSON.parse(e.data) as { identifier?: string }).identifier);
    expect(identifiers).toEqual(['target-1', 'incoming-1']);
    // The added dataset keeps its own preserved metadata bag.
    const products = model.datasets.find((d) => d.name === 'products');
    expect(preserved(products!)).toEqual({
      identifier: 'p-1',
      database: 'wh',
      schema: 'public',
      type: 'view',
    });
  });
});

describe('mergeOutputPortIntoOntology', () => {
  // The nested semantic model an ontology map starts with: one dataset plus a
  // model-level output-port metadata bag.
  const seed = outputPortToSemanticModel({
    schemaVersion: '3.0.0',
    outputPorts: [
      {
        name: 'Ontology Base',
        identifier: 'ont-base-1',
        platform: 'ONT',
        tables: [
          { table: 'orders', database: 'db', schema: 'public', fields: [{ name: 'id', type: 'string' }] },
        ],
      },
    ],
  }).semantic_model[0];

  /** A minimal ontology: one concept, one map binding a nested model + mapping. */
  function makeOntology(): OntologyDocument {
    return {
      version: OSI_SPEC_VERSION,
      name: 'Sales Ontology',
      ontology: [{ concept: { name: 'Customer', type: 'EntityType' }, relationships: [] }],
      ontology_mappings: [
        {
          name: 'sales_map',
          semantic_model: {
            name: seed.name,
            datasets: seed.datasets,
            custom_extensions: seed.custom_extensions,
          },
          concept_mappings: [{ concept: 'Customer', object_mappings: [], link_mappings: [] }],
        },
      ],
    };
  }

  const incomingProducts = () =>
    outputPortToSemanticModel({
      schemaVersion: '3.0.0',
      outputPorts: [
        {
          name: 'Incoming Port',
          identifier: 'incoming-1',
          platform: 'INC',
          tables: [
            { table: 'products', database: 'wh', schema: 'public', identifier: 'p-1', type: 'view', fields: [{ name: 'sku', type: 'string' }] },
          ],
        },
      ],
    });

  it('appends the datasets to the nested model, keeping the ontology concepts and mappings', () => {
    const ontology = makeOntology();
    const merged = mergeOutputPortIntoOntology(ontology, incomingProducts());
    const model = merged.ontology_mappings![0].semantic_model;
    expect((model.datasets ?? []).map((d) => d.name)).toEqual(['orders', 'products']);
    // The ontology's concepts and concept mappings are left intact.
    expect(merged.ontology.map((c) => c.concept?.name)).toEqual(['Customer']);
    expect(merged.ontology_mappings![0].concept_mappings.map((m) => m.concept)).toEqual(['Customer']);
    // `target` is not mutated and the merged document stays valid/editable.
    expect(ontology.ontology_mappings![0].semantic_model.datasets).toHaveLength(1);
    expect(validate(merged)).toEqual([]);
  });

  it('uniquifies datasets that collide with the nested model', () => {
    const incoming = outputPortToSemanticModel({
      schemaVersion: '3.0.0',
      outputPorts: [
        { name: 'P', tables: [{ table: 'orders', database: 'db', schema: 'other', fields: [{ name: 'id', type: 'string' }] }] },
      ],
    });
    const merged = mergeOutputPortIntoOntology(makeOntology(), incoming);
    const names = (merged.ontology_mappings![0].semantic_model.datasets ?? []).map((d) => d.name);
    expect(names).toEqual(['orders', 'orders_2']);
  });

  it('accumulates the incoming port-level metadata on the nested model', () => {
    const merged = mergeOutputPortIntoOntology(makeOntology(), incomingProducts());
    const model = merged.ontology_mappings![0].semantic_model;
    const identifiers = (model.custom_extensions ?? [])
      .filter((e) => e.vendor_name === OUTPUT_PORT_VENDOR)
      .map((e) => (JSON.parse(e.data) as { identifier?: string }).identifier);
    expect(identifiers).toEqual(['ont-base-1', 'incoming-1']);
  });

  it('targets the requested map index and leaves the other maps untouched', () => {
    const ontology = makeOntology();
    ontology.ontology_mappings!.push({
      name: 'second_map',
      semantic_model: { name: 'second_model', datasets: [] },
      concept_mappings: [],
    });
    const incoming = outputPortToSemanticModel({
      schemaVersion: '3.0.0',
      outputPorts: [
        { name: 'P', tables: [{ table: 'extra', database: 'db', schema: 's', fields: [{ name: 'e', type: 'string' }] }] },
      ],
    });
    const merged = mergeOutputPortIntoOntology(ontology, incoming, 1);
    expect((merged.ontology_mappings![0].semantic_model.datasets ?? []).map((d) => d.name)).toEqual([
      'orders',
    ]);
    expect((merged.ontology_mappings![1].semantic_model.datasets ?? []).map((d) => d.name)).toEqual([
      'extra',
    ]);
  });

  it('returns the target unchanged when it has no mapping at the given index', () => {
    const ontology: OntologyDocument = {
      version: OSI_SPEC_VERSION,
      name: 'No Maps',
      ontology: [{ concept: { name: 'Thing', type: 'EntityType' }, relationships: [] }],
    };
    expect(mergeOutputPortIntoOntology(ontology, incomingProducts())).toBe(ontology);
  });
});
