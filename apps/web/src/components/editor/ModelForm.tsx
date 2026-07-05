import type { SemanticModel } from '@osi-editor/osi-schema';
import { useEditorStore } from '../../store/editorStore.js';
import { TextField } from '../ui/TextField.js';
import { AiContextField } from './fields.js';
import { FormShell } from './FormShell.js';

/** Top-level model form: edit the semantic model's name, description, ai_context. */
export function ModelForm({ model }: { model: SemanticModel }) {
  const updateModel = useEditorStore((s) => s.updateModel);

  return (
    <FormShell title="Semantic model" subtitle="Top-level model metadata.">
      <TextField
        label="Name"
        required
        value={model.name}
        onChange={(name) => updateModel({ name })}
      />
      <TextField
        label="Description"
        value={model.description ?? ''}
        onChange={(description) => updateModel({ description: description || undefined })}
      />
      <AiContextField
        value={model.ai_context}
        onChange={(ai_context) => updateModel({ ai_context })}
      />
    </FormShell>
  );
}
