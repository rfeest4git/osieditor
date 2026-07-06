import { PButton } from '@porsche-design-system/components-react';
import type { OntologyDocument } from '@osi-editor/osi-schema';
import { useRef, useState } from 'react';
import { importDataAsset, type ImportResponse } from '../../lib/api.js';
import { isOntologyDoc, useEditorStore } from '../../store/editorStore.js';
import { Button } from '../ui/Button.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { Modal } from '../ui/Modal.js';

interface PendingImport {
  response: ImportResponse;
  fileName: string;
}

/** Which apply path the user picked when a document was already loaded. */
type ApplyMode = 'replace' | 'add';

type Stage =
  | { kind: 'idle' }
  | { kind: 'parse-error'; message: string }
  | { kind: 'unsupported'; message: string }
  | { kind: 'choose-mode'; pending: PendingImport }
  | { kind: 'unsaved-confirm'; pending: PendingImport }
  | { kind: 'validation-confirm'; pending: PendingImport; mode: ApplyMode };

/**
 * DataAsset import control: opens a file picker for `.json`/`.yaml`/`.yml`, sends
 * the text to `/api/import-data-asset` (which converts a Collibra DataAsset into
 * an OSI ontology document), and applies the result — guarding unsaved work and
 * surfacing parse/validation/unsupported problems. Distinct from the OSI
 * `ImportButton` so the two flows are not conflated (task 5.2).
 */
export function ImportDataAssetButton({
  variant = 'secondary',
  children = 'Import Data Asset',
}: {
  variant?: 'primary' | 'secondary';
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const mergeOntologyComponents = useEditorStore((s) => s.mergeOntologyComponents);
  const doc = useEditorStore((s) => s.doc);
  const dirty = useEditorStore((s) => s.dirty);

  const apply = (pending: PendingImport, mode: ApplyMode) => {
    if (pending.response.document) {
      if (mode === 'add') {
        mergeOntologyComponents(pending.response.document as OntologyDocument);
      } else {
        loadDocument(pending.response.document, pending.fileName);
      }
    }
    setStage({ kind: 'idle' });
  };

  const proceed = (pending: PendingImport, mode: ApplyMode) => {
    const errors = pending.response.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) {
      setStage({ kind: 'validation-confirm', pending, mode });
    } else {
      apply(pending, mode);
    }
  };

  /** Route the "replace" path through the unsaved-changes guard when needed. */
  const replace = (pending: PendingImport) => {
    if (dirty) {
      setStage({ kind: 'unsaved-confirm', pending });
    } else {
      proceed(pending, 'replace');
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const response = await importDataAsset(text, file.name);
    if (response.parseError) {
      setStage({ kind: 'parse-error', message: response.parseError.message });
      return;
    }
    if (response.unsupported) {
      // Parsed fine, but it's not a Collibra DataAsset — reject clearly.
      setStage({ kind: 'unsupported', message: response.unsupported.message });
      return;
    }
    const pending: PendingImport = { response, fileName: file.name };
    if (isOntologyDoc(doc)) {
      // A compatible document is loaded — let the user replace it or add to it.
      setStage({ kind: 'choose-mode', pending });
    } else {
      // No ontology document loaded: keep the original replace-only behavior.
      replace(pending);
    }
  };

  return (
    <>
      <PButton
        type="button"
        variant={variant}
        icon="upload"
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </PButton>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.yaml,.yml,application/json,application/yaml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so selecting the same file again re-triggers onChange.
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />

      <ConfirmDialog
        open={stage.kind === 'parse-error'}
        heading="Could not parse file"
        message={
          <>
            The file is not valid JSON or YAML and was not imported. Your current model is
            unchanged.
            {stage.kind === 'parse-error' && (
              <pre className="mt-2 overflow-auto rounded bg-surface-sunken p-2 font-mono text-xs">
                {stage.message}
              </pre>
            )}
          </>
        }
        confirmLabel="Dismiss"
        cancelLabel="Close"
        onConfirm={() => setStage({ kind: 'idle' })}
        onCancel={() => setStage({ kind: 'idle' })}
      />

      <ConfirmDialog
        open={stage.kind === 'unsupported'}
        heading="Not a Data Asset"
        message={
          <>
            {stage.kind === 'unsupported' && stage.message} Your current model is unchanged.
          </>
        }
        confirmLabel="Dismiss"
        cancelLabel="Close"
        onConfirm={() => setStage({ kind: 'idle' })}
        onCancel={() => setStage({ kind: 'idle' })}
      />

      <ConfirmDialog
        open={stage.kind === 'unsaved-confirm'}
        heading="Discard unsaved changes?"
        message="You have unsaved changes. Importing a Data Asset will replace the current model."
        confirmLabel="Discard and import"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => stage.kind === 'unsaved-confirm' && proceed(stage.pending, 'replace')}
        onCancel={() => setStage({ kind: 'idle' })}
      />

      <ChooseModeDialog
        open={stage.kind === 'choose-mode'}
        onReplace={() => stage.kind === 'choose-mode' && replace(stage.pending)}
        onAdd={() => stage.kind === 'choose-mode' && proceed(stage.pending, 'add')}
        onCancel={() => setStage({ kind: 'idle' })}
      />

      <ConfirmDialog
        open={stage.kind === 'validation-confirm'}
        heading="Converted model has validation issues"
        message={
          stage.kind === 'validation-confirm' && (
            <>
              The Data Asset was converted but the result has validation issues (for example a
              missing required field). You can load it anyway to fix the issues, or cancel.
              <ul className="mt-2 max-h-48 list-disc overflow-auto pl-5 text-xs">
                {stage.pending.response.diagnostics
                  .filter((d) => d.severity === 'error')
                  .slice(0, 20)
                  .map((d, i) => (
                    <li key={i}>{d.message}</li>
                  ))}
              </ul>
            </>
          )
        }
        confirmLabel="Load anyway"
        cancelLabel="Cancel"
        onConfirm={() => stage.kind === 'validation-confirm' && apply(stage.pending, stage.mode)}
        onCancel={() => setStage({ kind: 'idle' })}
      />
    </>
  );
}

/**
 * Three-way choice shown when a compatible ontology document is already loaded:
 * replace the active model, add the DataAsset's entities to the current session,
 * or cancel. Built on the local `Modal` so it renders without PDS web components.
 */
function ChooseModeDialog({
  open,
  onReplace,
  onAdd,
  onCancel,
}: Readonly<{
  open: boolean;
  onReplace: () => void;
  onAdd: () => void;
  onCancel: () => void;
}>) {
  return (
    <Modal open={open} onClose={onCancel}>
      <h2 className="text-lg font-semibold text-content">Add to session or replace?</h2>
      <div className="mt-2 text-sm text-content-muted">
        A model is already loaded. You can add the Data Asset&apos;s entities to the current
        session, or replace the active model with the imported Data Asset.
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={onReplace}>
          Replace model
        </Button>
        <Button variant="primary" onClick={onAdd}>
          Add to session
        </Button>
      </div>
    </Modal>
  );
}
