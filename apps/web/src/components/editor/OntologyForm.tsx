import type { Diagnostic } from '@osi-editor/osi-schema';
import { PButton, PButtonPure } from '@porsche-design-system/components-react';
import { getOntologyComponents, useEditorStore } from '../../store/editorStore.js';
import { TextField } from '../ui/TextField.js';
import { AiContextField } from './fields.js';
import { FormShell } from './FormShell.js';

/** Root ontology document form: name, description, ai_context, and its concepts. */
export function OntologyForm({ diagnostics: _diagnostics }: { diagnostics: Diagnostic[] }) {
  const doc = useEditorStore((s) => s.doc);
  const updateOntologyDoc = useEditorStore((s) => s.updateOntologyDoc);
  const addConcept = useEditorStore((s) => s.addConcept);
  const select = useEditorStore((s) => s.select);

  const meta = doc as { name?: string; description?: string; ai_context?: unknown } | null;
  const components = getOntologyComponents(doc);

  return (
    <FormShell title="Ontology" subtitle="An OSI ontology document.">
      <TextField
        label="Name"
        required
        value={meta?.name ?? ''}
        onChange={(name) => updateOntologyDoc({ name })}
      />
      <TextField
        label="Description"
        value={meta?.description ?? ''}
        onChange={(description) => updateOntologyDoc({ description: description || undefined })}
      />
      <AiContextField
        value={meta?.ai_context as never}
        onChange={(ai_context) => updateOntologyDoc({ ai_context })}
      />

      <section className="rounded-card border border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Concepts ({components.length})</h3>
          <PButton type="button" variant="secondary" icon="add" compact onClick={() => addConcept()}>
            Add concept
          </PButton>
        </div>
        <ul className="flex flex-col">
          {components.map((component, componentIndex) => (
            <li key={componentIndex}>
              <PButtonPure
                icon="arrow-right"
                alignLabel="start"
                stretch
                onClick={() => select({ kind: 'concept', componentIndex })}
              >
                {component.concept?.name || '(unnamed concept)'}
              </PButtonPure>
            </li>
          ))}
          {components.length === 0 && (
            <li className="text-xs text-content-muted">No concepts yet.</li>
          )}
        </ul>
      </section>
    </FormShell>
  );
}
