import type { Diagnostic, Field } from '@osi-editor/osi-schema';
import { fieldErrors } from '../../lib/diagnostics.js';
import { useEditorStore } from '../../store/editorStore.js';
import { TextField } from '../ui/TextField.js';
import { AiContextField } from './fields.js';
import { ExpressionEditor } from './ExpressionEditor.js';
import { FormShell } from './FormShell.js';

/** Field detail form (task 6.3): name, expression (multi-dialect), label, description. */
export function FieldForm({
  field,
  datasetIndex,
  fieldIndex,
  modelIndex,
  diagnostics,
}: {
  field: Field;
  datasetIndex: number;
  fieldIndex: number;
  modelIndex: number;
  diagnostics: Diagnostic[];
}) {
  const updateField = useEditorStore((s) => s.updateField);
  const deleteField = useEditorStore((s) => s.deleteField);
  const prefix = ['semantic_model', modelIndex, 'datasets', datasetIndex, 'fields', fieldIndex];
  const errorAt = fieldErrors(diagnostics, prefix);

  return (
    <FormShell
      title="Field"
      subtitle="A row-level attribute for grouping, filtering, or metrics."
      onDelete={() => deleteField(datasetIndex, fieldIndex)}
    >
      <TextField
        label="Name"
        required
        value={field.name}
        error={errorAt('name')}
        onChange={(name) => updateField(datasetIndex, fieldIndex, { name })}
      />
      <ExpressionEditor
        value={field.expression}
        error={errorAt('expression')}
        onChange={(expression) => updateField(datasetIndex, fieldIndex, { expression })}
      />
      <TextField
        label="Label"
        value={field.label ?? ''}
        onChange={(label) => updateField(datasetIndex, fieldIndex, { label: label || undefined })}
      />
      <TextField
        label="Description"
        value={field.description ?? ''}
        onChange={(description) =>
          updateField(datasetIndex, fieldIndex, { description: description || undefined })
        }
      />
      <AiContextField
        value={field.ai_context}
        onChange={(ai_context) => updateField(datasetIndex, fieldIndex, { ai_context })}
      />
    </FormShell>
  );
}
