import type { Diagnostic, Metric } from '@osi-editor/osi-schema';
import { fieldErrors } from '../../lib/diagnostics.js';
import { useEditorStore } from '../../store/editorStore.js';
import { TextField } from '../ui/TextField.js';
import { AiContextField } from './fields.js';
import { ExpressionEditor } from './ExpressionEditor.js';
import { FormShell } from './FormShell.js';

/** Metric detail form (task 6.4): name, multi-dialect expression, description. */
export function MetricForm({
  metric,
  metricIndex,
  modelIndex,
  diagnostics,
}: {
  metric: Metric;
  metricIndex: number;
  modelIndex: number;
  diagnostics: Diagnostic[];
}) {
  const updateMetric = useEditorStore((s) => s.updateMetric);
  const deleteMetric = useEditorStore((s) => s.deleteMetric);
  const errorAt = fieldErrors(diagnostics, ['semantic_model', modelIndex, 'metrics', metricIndex]);

  return (
    <FormShell
      title="Metric"
      subtitle="A quantitative measure spanning datasets."
      onDelete={() => deleteMetric(metricIndex)}
    >
      <TextField
        label="Name"
        required
        value={metric.name}
        error={errorAt('name')}
        onChange={(name) => updateMetric(metricIndex, { name })}
      />
      <ExpressionEditor
        value={metric.expression}
        error={errorAt('expression')}
        onChange={(expression) => updateMetric(metricIndex, { expression })}
      />
      <TextField
        label="Description"
        value={metric.description ?? ''}
        onChange={(description) =>
          updateMetric(metricIndex, { description: description || undefined })
        }
      />
      <AiContextField
        value={metric.ai_context}
        onChange={(ai_context) => updateMetric(metricIndex, { ai_context })}
      />
    </FormShell>
  );
}
