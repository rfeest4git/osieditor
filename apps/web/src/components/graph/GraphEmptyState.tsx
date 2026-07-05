import { PButton, PText } from '@porsche-design-system/components-react';
import { useEditorStore } from '../../store/editorStore.js';

/** Empty state for the graph when there is nothing to render yet (task 7.2). */
export function GraphEmptyState({
  mode = 'semantic-model',
}: {
  mode?: 'semantic-model' | 'ontology';
} = {}) {
  const addDataset = useEditorStore((s) => s.addDataset);
  const addConcept = useEditorStore((s) => s.addConcept);

  if (mode === 'ontology') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <PText color="contrast-medium">
            This ontology has no concepts yet. Add a concept to start building the graph.
          </PText>
          <PButton type="button" variant="primary" icon="add" onClick={() => addConcept()}>
            Add concept
          </PButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <PText color="contrast-medium">
          This model has no datasets yet. Add a dataset to start building the relationship graph.
        </PText>
        <PButton type="button" variant="primary" icon="add" onClick={() => addDataset()}>
          Add dataset
        </PButton>
      </div>
    </div>
  );
}
