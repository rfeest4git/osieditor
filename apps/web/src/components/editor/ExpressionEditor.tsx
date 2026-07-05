import { DIALECTS, type Dialect, type Expression } from '@osi-editor/osi-schema';
import { PButton, PButtonPure } from '@porsche-design-system/components-react';
import { SelectField } from '../ui/SelectField.js';
import { TextField } from '../ui/TextField.js';

const dialectOptions = DIALECTS.map((d) => ({ value: d, label: d }));

/**
 * Editor for a multi-dialect OSI `Expression`: a list of `{ dialect, expression }`
 * rows the user can add to and remove from (tasks 6.3, 6.4). At least one row is
 * required by the schema, so removing the last row is disabled.
 */
export function ExpressionEditor({
  value,
  onChange,
  error,
}: {
  value: Expression;
  onChange: (next: Expression) => void;
  error?: string;
}) {
  const dialects = value.dialects ?? [];

  const update = (index: number, patch: Partial<{ dialect: Dialect; expression: string }>) => {
    const next = dialects.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange({ ...value, dialects: next });
  };

  const addRow = () => {
    onChange({ ...value, dialects: [...dialects, { dialect: 'ANSI_SQL', expression: '' }] });
  };

  const removeRow = (index: number) => {
    onChange({ ...value, dialects: dialects.filter((_, i) => i !== index) });
  };

  return (
    <fieldset className="rounded-card border border-border p-3">
      <legend className="px-1 text-sm font-medium">Expression (per dialect)</legend>
      <div className="flex flex-col gap-3">
        {dialects.map((row, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="w-40 shrink-0">
              <SelectField
                label="Dialect"
                hideLabel
                value={row.dialect}
                options={dialectOptions}
                onChange={(dialect) => update(index, { dialect: dialect as Dialect })}
              />
            </div>
            <div className="flex-1">
              <TextField
                label="Expression"
                hideLabel
                placeholder="e.g. SUM(amount)"
                value={row.expression}
                onChange={(expression) => update(index, { expression })}
              />
            </div>
            <PButtonPure
              icon="delete"
              hideLabel
              disabled={dialects.length <= 1}
              onClick={() => removeRow(index)}
              aria={{ 'aria-label': 'Remove dialect' }}
            >
              Remove
            </PButtonPure>
          </div>
        ))}
        {error && <p className="text-xs text-danger">{error}</p>}
        <div>
          <PButton type="button" variant="secondary" icon="add" compact onClick={addRow}>
            Add dialect
          </PButton>
        </div>
      </div>
    </fieldset>
  );
}
