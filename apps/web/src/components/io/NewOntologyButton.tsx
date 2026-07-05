import { PButton } from '@porsche-design-system/components-react';
import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';

/**
 * "New ontology" control. Produces an empty OSI ontology document (no concepts
 * yet, one empty ontology map) and guards unsaved changes with a confirm prompt.
 */
export function NewOntologyButton({
  variant = 'secondary',
  children = 'New ontology',
}: {
  variant?: 'primary' | 'secondary';
  children?: React.ReactNode;
}) {
  const newOntology = useEditorStore((s) => s.newOntology);
  const dirty = useEditorStore((s) => s.dirty);
  const hasDoc = useEditorStore((s) => s.doc !== null);
  const [confirming, setConfirming] = useState(false);

  const create = () => {
    newOntology();
    setConfirming(false);
  };

  return (
    <>
      <PButton
        type="button"
        variant={variant}
        icon="add"
        onClick={() => (dirty && hasDoc ? setConfirming(true) : create())}
      >
        {children}
      </PButton>
      <ConfirmDialog
        open={confirming}
        heading="Discard unsaved changes?"
        message="You have unsaved changes. Creating a new ontology will discard them."
        confirmLabel="Discard and create"
        cancelLabel="Keep editing"
        destructive
        onConfirm={create}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
