import { zValidator } from '@hono/zod-validator';
import {
  DraftDocumentSchema,
  DraftOntologyDocumentSchema,
  importDataAssetText,
  importOutputPortText,
  importText,
  serialize,
  validate,
  type AnyDraftDocument,
  type OsiFormat,
} from '@osi-editor/osi-schema';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

const formatSchema = z.enum(['json', 'yaml']);

// Accept either OSI document kind: a semantic-model document or an ontology
// document. The ontology schema is checked first so an ontology doc (which has
// no top-level `semantic_model`) is not mis-validated against the model schema.
const anyDocumentSchema = z.union([DraftOntologyDocumentSchema, DraftDocumentSchema]);

const importRequestSchema = z.object({
  text: z.string(),
  filename: z.string().optional(),
  format: formatSchema.optional(),
});

const exportRequestSchema = z.object({
  model: anyDocumentSchema,
  format: formatSchema,
});

const validateRequestSchema = z.object({
  model: anyDocumentSchema,
});

const CONTENT_TYPES: Record<OsiFormat, string> = {
  json: 'application/json',
  yaml: 'application/yaml',
};

function modelFilename(model: AnyDraftDocument, format: OsiFormat): string {
  const ext = format === 'yaml' ? 'yaml' : 'json';
  const m = model as {
    name?: string;
    ontology?: unknown;
    semantic_model?: Array<{ name?: string }>;
  };
  const isOntology = Array.isArray(m.ontology);
  const base =
    (isOntology ? m.name?.trim() : m.semantic_model?.[0]?.name?.trim()) ||
    (isOntology ? 'ontology' : 'semantic_model');
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `${safe}.${ext}`;
}

/** Build the Hono app. Exported (no server binding) so tests can call it directly. */
export function createApp() {
  const app = new Hono();

  app.use('/api/*', cors());

  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Parse + validate an uploaded JSON/YAML payload → normalized model + diagnostics.
  app.post('/api/import', zValidator('json', importRequestSchema), (c) => {
    const { text, filename, format } = c.req.valid('json');
    const result = importText(text, filename, format);
    if (result.parseError) {
      return c.json(
        { format: result.format, parseError: result.parseError, diagnostics: [] },
        422,
      );
    }
    return c.json({
      format: result.format,
      document: result.document,
      diagnostics: result.diagnostics,
      ...(result.kind ? { kind: result.kind } : {}),
      ...(result.unsupported ? { unsupported: result.unsupported } : {}),
    });
  });

  // Parse a Collibra DataAsset payload and convert it one-way into an OSI
  // ontology document. Mirrors /api/import's response contract.
  app.post('/api/import-data-asset', zValidator('json', importRequestSchema), (c) => {
    const { text, filename, format } = c.req.valid('json');
    const result = importDataAssetText(text, filename, format);
    if (result.parseError) {
      return c.json(
        { format: result.format, parseError: result.parseError, diagnostics: [] },
        422,
      );
    }
    return c.json({
      format: result.format,
      document: result.document,
      diagnostics: result.diagnostics,
      ...(result.kind ? { kind: result.kind } : {}),
      ...(result.unsupported ? { unsupported: result.unsupported } : {}),
    });
  });

  // Parse a data product Output Port payload and convert it one-way into an OSI
  // semantic-model document. Mirrors /api/import's response contract.
  app.post('/api/import-output-port', zValidator('json', importRequestSchema), (c) => {
    const { text, filename, format } = c.req.valid('json');
    const result = importOutputPortText(text, filename, format);
    if (result.parseError) {
      return c.json(
        { format: result.format, parseError: result.parseError, diagnostics: [] },
        422,
      );
    }
    return c.json({
      format: result.format,
      document: result.document,
      diagnostics: result.diagnostics,
      ...(result.kind ? { kind: result.kind } : {}),
      ...(result.unsupported ? { unsupported: result.unsupported } : {}),
    });
  });

  // Model + format → serialized text, with download-friendly headers.
  app.post('/api/export', zValidator('json', exportRequestSchema), (c) => {
    const { model, format } = c.req.valid('json');
    const text = serialize(model, format);
    const filename = modelFilename(model, format);
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': `${CONTENT_TYPES[format]}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  });

  // Model → diagnostics.
  app.post('/api/validate', zValidator('json', validateRequestSchema), (c) => {
    const { model } = c.req.valid('json');
    return c.json({ diagnostics: validate(model) });
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
