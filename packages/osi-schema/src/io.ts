import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export type OsiFormat = 'json' | 'yaml';

/** Raw, un-validated parse result — an arbitrary JS value from the document. */
export type ParsedDocument = unknown;

export class ParseError extends Error {
  readonly format: OsiFormat;
  constructor(message: string, format: OsiFormat, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ParseError';
    this.format = format;
  }
}

/**
 * Determine whether a document is JSON or YAML.
 *
 * Extension wins when recognizable; otherwise content is sniffed — a body whose
 * first non-whitespace character is `{` or `[` is treated as JSON, everything
 * else as YAML (YAML is a JSON superset, so this is a safe default).
 */
export function detectFormat(filename: string | undefined, text: string): OsiFormat {
  const ext = filename?.toLowerCase().split('.').pop();
  if (ext === 'json') return 'json';
  if (ext === 'yaml' || ext === 'yml') return 'yaml';

  const firstChar = text.trimStart()[0];
  if (firstChar === '{' || firstChar === '[') return 'json';
  return 'yaml';
}

/** Parse document text into a raw JS value using the given (or detected) format. */
export function parse(text: string, format: OsiFormat): ParsedDocument {
  if (format === 'json') {
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new ParseError(
        `Invalid JSON: ${(err as Error).message}`,
        'json',
        { cause: err },
      );
    }
  }
  try {
    return parseYaml(text);
  } catch (err) {
    throw new ParseError(
      `Invalid YAML: ${(err as Error).message}`,
      'yaml',
      { cause: err },
    );
  }
}

/**
 * Serialize a model back to text in the chosen format.
 *
 * Because parsing keeps unknown keys (`.passthrough()` on the Zod schemas),
 * round-tripping preserves `custom_extensions`, `ai_context`, and any vendor
 * fields we do not otherwise edit.
 */
export function serialize(model: unknown, format: OsiFormat): string {
  if (format === 'json') {
    return `${JSON.stringify(model, null, 2)}\n`;
  }
  return stringifyYaml(model, { indent: 2, lineWidth: 0 });
}
