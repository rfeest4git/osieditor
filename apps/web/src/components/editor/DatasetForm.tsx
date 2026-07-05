import type { Dataset, Diagnostic } from '@osi-editor/osi-schema';
import { PButton, PButtonPure } from '@porsche-design-system/components-react';
import { fieldErrors } from '../../lib/diagnostics.js';
import { useEditorStore } from '../../store/editorStore.js';
import { TextField } from '../ui/TextField.js';
import { AiContextField, CsvField } from './fields.js';
import { FormShell } from './FormShell.js';

/** Dataset detail form (task 6.2): name, source, keys, description, ai_context. */
export function DatasetForm({
  dataset,
  datasetIndex,
  modelIndex,
  diagnostics,
}: {
  dataset: Dataset;
  datasetIndex: number;
  modelIndex: number;
  diagnostics: Diagnostic[];
}) {
  const updateDataset = useEditorStore((s) => s.updateDataset);
  const deleteDataset = useEditorStore((s) => s.deleteDataset);
  const addField = useEditorStore((s) => s.addField);
  const select = useEditorStore((s) => s.select);
  const errorAt = fieldErrors(diagnostics, ['semantic_model', modelIndex, 'datasets', datasetIndex]);

  return (
    <FormShell
      title="Dataset"
      subtitle="A logical fact or dimension table."
      onDelete={() => deleteDataset(datasetIndex)}
    >
      <TextField
        label="Name"
        required
        value={dataset.name}
        error={errorAt('name')}
        onChange={(name) => updateDataset(datasetIndex, { name })}
      />
      <TextField
        label="Source"
        required
        placeholder="database.schema.table"
        value={dataset.source}
        error={errorAt('source')}
        onChange={(source) => updateDataset(datasetIndex, { source })}
      />
      <CsvField
        label="Primary key columns"
        value={dataset.primary_key}
        onChange={(primary_key) =>
          updateDataset(datasetIndex, { primary_key: primary_key.length ? primary_key : undefined })
        }
      />
      <TextField
        label="Description"
        value={dataset.description ?? ''}
        onChange={(description) =>
          updateDataset(datasetIndex, { description: description || undefined })
        }
      />
      <AiContextField
        value={dataset.ai_context}
        onChange={(ai_context) => updateDataset(datasetIndex, { ai_context })}
      />

      <section className="rounded-card border border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Fields ({dataset.fields?.length ?? 0})</h3>
          <PButton
            type="button"
            variant="secondary"
            icon="add"
            compact
            onClick={() => addField(datasetIndex)}
          >
            Add field
          </PButton>
        </div>
        <ul className="flex flex-col">
          {(dataset.fields ?? []).map((field, fi) => (
            <li key={fi}>
              <PButtonPure
                icon="arrow-right"
                alignLabel="start"
                stretch
                onClick={() => select({ kind: 'field', datasetIndex, fieldIndex: fi })}
              >
                {field.name || '(unnamed field)'}
              </PButtonPure>
            </li>
          ))}
          {(dataset.fields?.length ?? 0) === 0 && (
            <li className="text-xs text-content-muted">No fields yet.</li>
          )}
        </ul>
      </section>
    </FormShell>
  );
}
