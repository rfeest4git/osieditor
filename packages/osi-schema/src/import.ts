import { detectFormat, parse, ParseError, type OsiFormat } from './io.js';
import {
  DataAssetSchema,
  DraftDocumentSchema,
  DraftOntologyDocumentSchema,
  detectDataAsset,
  detectDocumentKind,
  type AnyOsiDocument,
  type DataAsset,
  type OsiDocumentKind,
} from './model.js';
import { dataAssetToOntology } from './dataAsset.js';
import { validate, type Diagnostic } from './validation.js';

export interface ImportResult {
  /** Detected/So used format. */
  format: OsiFormat;
  /**
   * Which OSI document kind this is — `semantic-model` (top-level
   * `semantic_model`) or `ontology` (top-level `ontology`). `undefined` when the
   * root is neither (see `unsupported`).
   */
  kind?: OsiDocumentKind;
  /**
   * The parsed & coerced document, present whenever the text parsed as
   * JSON/YAML — even if it has validation diagnostics. `undefined` only on a
   * hard parse error (see `parseError`).
   */
  document?: AnyOsiDocument;
  /** Structural + semantic diagnostics. */
  diagnostics: Diagnostic[];
  /** Set when the text could not be parsed at all. */
  parseError?: { message: string; format: OsiFormat };
  /**
   * Set when the text parsed fine but is not a document kind this editor can
   * open (neither a semantic-model nor an ontology document). Distinct from
   * `parseError` and from ordinary schema diagnostics so callers can show a
   * targeted message.
   */
  unsupported?: { kind: 'unknown'; message: string };
}

/**
 * Classify a parsed root the editor cannot open. Both OSI document kinds —
 * semantic-model (`semantic_model[]`) and ontology (`ontology[]`) — are
 * supported, so this only fires for roots that are neither.
 */
export function detectUnsupported(raw: unknown): ImportResult['unsupported'] {
  if (detectDocumentKind(raw)) return undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { kind: 'unknown', message: 'The file is not an OSI document.' };
  }
  return {
    kind: 'unknown',
    message:
      'This file has neither a top-level "semantic_model" nor "ontology". This editor opens OSI semantic-model documents and OSI ontology documents.',
  };
}

/**
 * Parse and validate document text into a normalized OSI document (either kind).
 *
 * A parse failure returns `{ parseError, diagnostics: [], document: undefined }`
 * without throwing, so callers (API, UI) can report it without discarding the
 * current model. A parseable-but-schema-invalid document still returns the
 * coerced `document` plus its diagnostics, enabling "load anyway / cancel".
 */
export function importText(text: string, filename?: string, format?: OsiFormat): ImportResult {
  const fmt = format ?? detectFormat(filename, text);
  let raw: unknown;
  try {
    raw = parse(text, fmt);
  } catch (err) {
    if (err instanceof ParseError) {
      return { format: fmt, diagnostics: [], parseError: { message: err.message, format: fmt } };
    }
    throw err;
  }

  const diagnostics = validate(raw);
  const unsupported = detectUnsupported(raw);
  const kind = detectDocumentKind(raw);
  // Coerce through the matching draft schema to produce a typed value; passthrough
  // preserves unknown keys. If coercion fails structurally, hand back the raw shape.
  const schema = kind === 'ontology' ? DraftOntologyDocumentSchema : DraftDocumentSchema;
  const parsed = schema.safeParse(raw);
  const document = (parsed.success ? parsed.data : raw) as AnyOsiDocument;
  return {
    format: fmt,
    document,
    diagnostics,
    ...(kind ? { kind } : {}),
    ...(unsupported ? { unsupported } : {}),
  };
}

/**
 * Map Zod issues from a `DataAssetSchema` check into `Diagnostic`s so missing
 * required DataAsset fields (e.g. an entity's `displayName`) surface with the
 * same "load anyway / cancel" UX as OSI import validation errors.
 */
function dataAssetDiagnostics(raw: unknown): Diagnostic[] {
  const result = DataAssetSchema.safeParse(raw);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const isMissing =
      issue.code === 'invalid_type' &&
      (issue as { received?: unknown }).received === 'undefined';
    const fieldName = issue.path.length ? String(issue.path.at(-1)) : 'value';
    return {
      severity: 'error' as const,
      code: isMissing ? 'required_field' : `schema_${issue.code}`,
      message: isMissing ? `Missing required field "${fieldName}".` : issue.message,
      path: [...issue.path],
    };
  });
}

/**
 * Parse a Collibra DataAsset document and convert it one-way into an OSI ontology
 * document. Mirrors `importText`'s contract: a parse failure returns
 * `{ parseError, ... }` without throwing; a non-DataAsset root returns
 * `{ unsupported, ... }` and no document; otherwise the converted ontology is
 * returned with any DataAsset/ontology validation diagnostics so callers can
 * offer "load anyway / cancel".
 */
export function importDataAssetText(
  text: string,
  filename?: string,
  format?: OsiFormat,
): ImportResult {
  const fmt = format ?? detectFormat(filename, text);
  let raw: unknown;
  try {
    raw = parse(text, fmt);
  } catch (err) {
    if (err instanceof ParseError) {
      return { format: fmt, diagnostics: [], parseError: { message: err.message, format: fmt } };
    }
    throw err;
  }

  if (!detectDataAsset(raw)) {
    return {
      format: fmt,
      diagnostics: [],
      unsupported: {
        kind: 'unknown',
        message:
          'This file is not a Collibra DataAsset. A DataAsset has a top-level "entities" map and a "schemaVersion".',
      },
    };
  }

  const document = dataAssetToOntology(raw as DataAsset);
  const diagnostics = [...dataAssetDiagnostics(raw), ...validate(document)];
  return { format: fmt, kind: 'ontology', document, diagnostics };
}
