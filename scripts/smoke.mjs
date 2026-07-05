#!/usr/bin/env node
// Runtime smoke test for the OSI Editor API: import → edit → export → round-trip.
// Point BASE at a running server (the Docker container on :8080, or the bundled
// API on :3001). Exits non-zero on the first failed assertion.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE ?? 'http://localhost:8080';
const fixture = fileURLToPath(
  new URL('../packages/osi-schema/test/fixtures/tpcds_semantic_model.yaml', import.meta.url),
);
const yaml = readFileSync(fixture, 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('SMOKE FAIL:', msg);
    process.exit(1);
  }
  console.log('  ok -', msg);
}

const j = (r) => r.json();

assert((await fetch(`${BASE}/health`).then(j)).status === 'ok', 'health check');

const imported = await fetch(`${BASE}/api/import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: yaml, filename: 'tpcds_semantic_model.yaml' }),
}).then(j);
assert(imported.format === 'yaml', 'import detected YAML');
assert(imported.diagnostics.length === 0, 'imported model is valid (0 diagnostics)');
assert(
  imported.document.semantic_model[0].name === 'tpcds_retail_model',
  'imported model name preserved',
);
const datasetCount = imported.document.semantic_model[0].datasets.length;

const edited = structuredClone(imported.document);
edited.semantic_model[0].datasets.push({ name: 'smoke_added', source: 'db.smoke' });

const exportRes = await fetch(`${BASE}/api/export`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: edited, format: 'json' }),
});
assert(exportRes.status === 200, 'export returned 200');
assert(
  exportRes.headers.get('content-disposition')?.includes('tpcds_retail_model.json'),
  'export filename derived from model name',
);
const exportedDoc = JSON.parse(await exportRes.text());
assert(
  exportedDoc.semantic_model[0].datasets.length === datasetCount + 1,
  'edit persisted through export (dataset added)',
);

const yamlOut = await fetch(`${BASE}/api/export`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: imported.document, format: 'yaml' }),
}).then((r) => r.text());
const reimported = await fetch(`${BASE}/api/import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: yamlOut, filename: 'roundtrip.yaml' }),
}).then(j);
assert(reimported.diagnostics.length === 0, 'round-trip re-import valid');
assert(
  JSON.stringify(reimported.document) === JSON.stringify(imported.document),
  'round-trip preserves the model exactly',
);

console.log('\nSMOKE PASS — import → edit → export → round-trip all verified.');
