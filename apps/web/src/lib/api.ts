import type {
  AnyDraftDocument,
  Diagnostic,
  OsiDocumentKind,
  OsiFormat,
} from '@osi-editor/osi-schema';

/** Response from `POST /api/import`. */
export interface ImportResponse {
  format: OsiFormat;
  /** Which OSI document kind was detected (`semantic-model` or `ontology`). */
  kind?: OsiDocumentKind;
  document?: AnyDraftDocument;
  diagnostics: Diagnostic[];
  parseError?: { message: string; format: OsiFormat };
  /** Set when the file parsed but is neither an OSI semantic-model nor ontology document. */
  unsupported?: { kind: 'unknown'; message: string };
}

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Import file text via the API. A 422 parse error is returned (not thrown). */
export async function importModel(
  text: string,
  filename?: string,
  format?: OsiFormat,
): Promise<ImportResponse> {
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename, format }),
  });
  if (res.status === 422 || res.ok) {
    return (await res.json()) as ImportResponse;
  }
  throw new ApiError(`Import failed (${res.status})`, res.status);
}

/** Import a Collibra DataAsset file text via the API, converting it one-way into
 * an OSI ontology document. A 422 parse error is returned (not thrown). */
export async function importDataAsset(
  text: string,
  fileName?: string,
  format?: OsiFormat,
): Promise<ImportResponse> {
  const res = await fetch('/api/import-data-asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename: fileName, format }),
  });
  if (res.status === 422 || res.ok) {
    return (await res.json()) as ImportResponse;
  }
  throw new ApiError(`DataAsset import failed (${res.status})`, res.status);
}

/** Export the model, returning the serialized text and a suggested filename. */
export async function exportModel(
  model: AnyDraftDocument,
  format: OsiFormat,
): Promise<{ text: string; filename: string }> {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, format }),
  });
  if (!res.ok) throw new ApiError(`Export failed (${res.status})`, res.status);
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `model.${format}`;
  return { text: await res.text(), filename };
}

/** Validate the model server-side, returning diagnostics. */
export async function validateModel(model: AnyDraftDocument): Promise<Diagnostic[]> {
  const res = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new ApiError(`Validation failed (${res.status})`, res.status);
  const body = (await res.json()) as { diagnostics: Diagnostic[] };
  return body.diagnostics;
}
