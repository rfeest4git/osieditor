import { PButton } from '@porsche-design-system/components-react';
import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';

/**
 * "New empty model" control. Produces a valid empty skeleton (task 5.4) and
 * guards unsaved changes with a confirm prompt (task 6.8).
 */
export function NewModelButton({
  variant = 'secondary',
  children = 'New model',
}: {
  variant?: 'primary' | 'secondary';
  children?: React.ReactNode;
}) {
  const newModel = useEditorStore((s) => s.newModel);
  const dirty = useEditorStore((s) => s.dirty);
  const hasDoc = useEditorStore((s) => s.doc !== null);
  const [confirming, setConfirming] = useState(false);

  const create = () => {
    newModel();
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
        message="You have unsaved changes. Creating a new model will discard them."
        confirmLabel="Discard and create"
        cancelLabel="Keep editing"
        destructive
        onConfirm={create}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
