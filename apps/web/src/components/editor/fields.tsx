import type { AIContext } from '@osi-editor/osi-schema';
import { TextArea } from '../ui/TextArea.js';
import { TextField } from '../ui/TextField.js';

/** Edit a comma-separated list of identifiers (e.g. a composite key). */
export function CsvField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string[] | undefined;
  onChange: (next: string[]) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <TextField
      label={label}
      value={(value ?? []).join(', ')}
      placeholder={placeholder ?? 'col_a, col_b'}
      error={error}
      onChange={(raw) =>
        onChange(
          raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
      }
    />
  );
}

/**
 * Edit `ai_context`, which the OSI schema allows to be either a plain string or
 * a structured object. Objects are edited as raw JSON to preserve fidelity for
 * shapes we don't have a structured form for.
 */
export function AiContextField({
  value,
  onChange,
}: {
  value: AIContext | undefined;
  onChange: (next: AIContext | undefined) => void;
}) {
  const isObject = value !== undefined && typeof value === 'object';
  const text = value === undefined ? '' : isObject ? JSON.stringify(value, null, 2) : value;

  return (
    <TextArea
      label={isObject ? 'AI context (JSON)' : 'AI context'}
      value={text}
      placeholder="Guidance for AI tools…"
      onChange={(raw) => {
        if (raw.trim() === '') {
          onChange(undefined);
          return;
        }
        if (isObject) {
          try {
            onChange(JSON.parse(raw) as AIContext);
          } catch {
            // Keep the raw text as a string until it parses as valid JSON.
            onChange(raw);
          }
        } else {
          onChange(raw);
        }
      }}
    />
  );
}
