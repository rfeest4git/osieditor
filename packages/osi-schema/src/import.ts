import { detectFormat, parse, ParseError, type OsiFormat } from './io.js';
import {
  DraftDocumentSchema,
  DraftOntologyDocumentSchema,
  detectDocumentKind,
  type AnyOsiDocument,
  type OsiDocumentKind,
} from './model.js';
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
