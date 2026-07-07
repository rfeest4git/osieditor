import { createEmptyDocument, createDataset } from '@osi-editor/osi-schema';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const app = createApp();

function post(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validModel = {
  version: '0.2.0.dev0',
  semantic_model: [
    {
      name: 'sales_model',
      datasets: [createDataset('orders', 'db.public.orders')],
    },
  ],
};

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('POST /api/import', () => {
  it('imports a valid JSON model', async () => {
    const res = await post('/api/import', {
      text: JSON.stringify(validModel),
      filename: 'sales.json',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.format).toBe('json');
    expect(body.document.semantic_model[0].name).toBe('sales_model');
    expect(body.diagnostics).toEqual([]);
  });

  it('imports a valid YAML model', async () => {
    const yaml = 'version: "0.2.0.dev0"\nsemantic_model:\n  - name: m\n    datasets:\n      - name: t\n        source: db.t\n';
    const res = await post('/api/import', { text: yaml, filename: 'm.yaml' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.format).toBe('yaml');
    expect(body.document.semantic_model[0].datasets[0].name).toBe('t');
  });

  it('returns 422 with a parse error on malformed input', async () => {
    const res = await post('/api/import', { text: '{not valid', filename: 'x.json' });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.parseError.format).toBe('json');
    expect(body.document).toBeUndefined();
  });

  it('returns diagnostics for a schema-invalid but parseable model', async () => {
    const bad = { version: '0.2.0.dev0', semantic_model: [{ name: 'm', datasets: [{ name: 'x' }] }] };
    const res = await post('/api/import', { text: JSON.stringify(bad), filename: 'x.json' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.diagnostics.length).toBeGreaterThan(0);
    expect(body.diagnostics.some((d: { code: string }) => d.code === 'required_field')).toBe(true);
  });

  it('rejects a malformed request envelope with 400', async () => {
    const res = await post('/api/import', { filename: 'x.json' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/import-data-asset', () => {
  const dataAsset = {
    schemaVersion: '3.0.1',
    name: 'Customer Orders',
    description: 'Retail data.',
    identifier: 'id-123',
    entities: {
      customer: {
        displayName: 'Customer',
        description: 'A buyer.',
        attributes: {
          customerId: { displayName: 'Customer ID', example: 'CUST-1' },
        },
      },
    },
  };

  it('converts a valid DataAsset into an ontology document', async () => {
    const res = await post('/api/import-data-asset', {
      text: JSON.stringify(dataAsset),
      filename: 'customer.json',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('ontology');
    expect(body.document.name).toBe('Customer Orders');
    expect(body.document.ontology.some((c: { concept: { name: string } }) => c.concept.name === 'Customer')).toBe(true);
    expect(body.diagnostics).toEqual([]);
  });

  it('returns 422 with a parse error on malformed input', async () => {
    const res = await post('/api/import-data-asset', { text: '{not valid', filename: 'x.json' });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.parseError.format).toBe('json');
    expect(body.document).toBeUndefined();
  });

  it('rejects a non-DataAsset document as unsupported', async () => {
    const res = await post('/api/import-data-asset', {
      text: JSON.stringify(validModel),
      filename: 'sales.json',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unsupported.kind).toBe('unknown');
    expect(body.document).toBeUndefined();
  });
});

describe('POST /api/import-output-port', () => {
  const outputPort = {
    version: '1.0.0',
    schemaVersion: '3.0.0',
    outputPorts: [
      {
        name: 'PVH Base @ Datasphere DEV',
        identifier: 'lx9782_1',
        platform: 'LX9782',
        tables: [
          {
            database: 'dev',
            schema: 'VEH_PVH',
            table: 'DP_PVH_CONSOLIDATED_MASTER',
            fields: [{ name: 'VGUID', type: 'string' }],
          },
        ],
      },
    ],
  };

  it('converts a valid Output Port into a semantic-model document', async () => {
    const res = await post('/api/import-output-port', {
      text: JSON.stringify(outputPort),
      filename: 'datasphere.json',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('semantic-model');
    expect(body.document.semantic_model[0].name).toBe('PVH Base @ Datasphere DEV');
    expect(body.document.semantic_model[0].datasets[0].source).toBe(
      'dev.VEH_PVH.DP_PVH_CONSOLIDATED_MASTER',
    );
    expect(body.diagnostics).toEqual([]);
  });

  it('returns 422 with a parse error on malformed input', async () => {
    const res = await post('/api/import-output-port', { text: '{not valid', filename: 'x.json' });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.parseError.format).toBe('json');
    expect(body.document).toBeUndefined();
  });

  it('rejects a non-Output-Port document as unsupported', async () => {
    const res = await post('/api/import-output-port', {
      text: JSON.stringify(validModel),
      filename: 'sales.json',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unsupported.kind).toBe('unknown');
    expect(body.document).toBeUndefined();
  });
});

describe('POST /api/export', () => {
  it('exports as JSON with download headers', async () => {
    const res = await post('/api/export', { model: validModel, format: 'json' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('content-disposition')).toContain('sales_model.json');
    expect(JSON.parse(await res.text())).toEqual(validModel);
  });

  it('exports as YAML with download headers', async () => {
    const res = await post('/api/export', { model: validModel, format: 'yaml' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/yaml');
    expect(res.headers.get('content-disposition')).toContain('sales_model.yaml');
    expect(await res.text()).toContain('name: sales_model');
  });

  it('rejects an invalid model with 400', async () => {
    const res = await post('/api/export', { model: { nope: true }, format: 'json' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/validate', () => {
  it('returns no diagnostics for a valid model', async () => {
    const res = await post('/api/validate', { model: validModel });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ diagnostics: [] });
  });

  it('returns diagnostics for a model with a dangling relationship', async () => {
    const model = {
      version: '0.2.0.dev0',
      semantic_model: [
        {
          name: 'm',
          datasets: [createDataset('orders', 'db.orders')],
          relationships: [
            { name: 'r', from: 'orders', to: 'ghost', from_columns: ['a'], to_columns: ['b'] },
          ],
        },
      ],
    };
    const res = await post('/api/validate', { model });
    const body = await res.json();
    expect(body.diagnostics.some((d: { code: string }) => d.code === 'dangling_reference')).toBe(true);
  });

  it('accepts an empty (new) model', async () => {
    const res = await post('/api/validate', { model: createEmptyDocument('fresh') });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ diagnostics: [] });
  });
});

describe('ontology documents', () => {
  const ontologyDoc = {
    version: '0.2.0.dev0',
    name: 'flights',
    ontology: [
      {
        concept: { name: 'Airport', type: 'EntityType', identify_by: ['airportid'] },
        relationships: [
          {
            name: 'airportid',
            roles: [{ concept: 'String' }],
            verbalizes: ['{Airport} airportId {String}'],
            multiplicity: 'ManyToOne',
          },
        ],
      },
    ],
    ontology_mappings: [
      {
        name: 'flights_map',
        semantic_model: { name: 'm', datasets: [createDataset('airport', 'db.airport')] },
        concept_mappings: [{ concept: 'Airport' }],
      },
    ],
  };

  it('imports an ontology document and reports kind "ontology"', async () => {
    const res = await post('/api/import', {
      text: JSON.stringify(ontologyDoc),
      filename: 'flights.json',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('ontology');
    expect(body.unsupported).toBeUndefined();
    expect(body.document.ontology[0].concept.name).toBe('Airport');
    expect(body.diagnostics).toEqual([]);
  });

  it('validates an ontology document', async () => {
    const res = await post('/api/validate', { model: ontologyDoc });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ diagnostics: [] });
  });

  it('flags a concept mapping that references an unknown concept', async () => {
    const bad = {
      ...ontologyDoc,
      ontology_mappings: [
        { ...ontologyDoc.ontology_mappings[0], concept_mappings: [{ concept: 'Ghost' }] },
      ],
    };
    const res = await post('/api/validate', { model: bad });
    const body = await res.json();
    expect(body.diagnostics.some((d: { code: string }) => d.code === 'dangling_reference')).toBe(
      true,
    );
  });

  it('exports an ontology document with a name-based filename', async () => {
    const res = await post('/api/export', { model: ontologyDoc, format: 'yaml' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain('flights.yaml');
    expect(await res.text()).toContain('ontology:');
  });
});
