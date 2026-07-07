import { PButton } from '@porsche-design-system/components-react';
import type { AnyDraftDocument, OsiDocument } from '@osi-editor/osi-schema';
import { useRef, useState } from 'react';
import { importOutputPort, type ImportResponse } from '../../lib/api.js';
import { isOntologyDoc, isSemanticModelDoc, useEditorStore } from '../../store/editorStore.js';
import { Button } from '../ui/Button.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { Modal } from '../ui/Modal.js';

interface PendingImport {
  response: ImportResponse;
  fileName: string;
}

/** Which apply path the user picked when a semantic-model document was already loaded. */
type ApplyMode = 'replace' | 'add';

type Stage =
  | { kind: 'idle' }
  | { kind: 'parse-error'; message: string }
  | { kind: 'unsupported'; message: string }
  | { kind: 'choose-mode'; pending: PendingImport }
  | { kind: 'unsaved-confirm'; pending: PendingImport }
  | { kind: 'validation-confirm'; pending: PendingImport; mode: ApplyMode };

/**
 * Output Port import control: opens a file picker for `.json`/`.yaml`/`.yml`,
 * sends the text to `/api/import-output-port` (which converts a data product
 * Output Port into an OSI semantic-model document), and applies the result —
 * guarding unsaved work and surfacing parse/validation/unsupported problems.
 * When a document is already loaded — a semantic model, or an ontology whose
 * nested semantic model holds datasets — the user can replace it or add the
 * converted Output Port's datasets to it; otherwise the result is loaded as the
 * active model. Distinct from the OSI `ImportButton` and the
 * `ImportDataAssetButton` so the flows are not conflated.
 */
export function ImportOutputPortButton({
  variant = 'secondary',
  children = 'Import Outputport',
}: {
  variant?: 'primary' | 'secondary';
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const mergeSemanticModelDatasets = useEditorStore((s) => s.mergeSemanticModelDatasets);
  const doc = useEditorStore((s) => s.doc);
  const dirty = useEditorStore((s) => s.dirty);

  const apply = (pending: PendingImport, mode: ApplyMode) => {
    if (pending.response.document) {
      if (mode === 'add') {
        mergeSemanticModelDatasets(pending.response.document as OsiDocument);
      } else {
        loadDocument(pending.response.document as AnyDraftDocument, pending.fileName);
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
    const response = await importOutputPort(text, file.name);
    if (response.parseError) {
      setStage({ kind: 'parse-error', message: response.parseError.message });
      return;
    }
    if (response.unsupported) {
      // Parsed fine, but it's not an Output Port — reject clearly.
      setStage({ kind: 'unsupported', message: response.unsupported.message });
      return;
    }
    const pending: PendingImport = { response, fileName: file.name };
    if (isSemanticModelDoc(doc) || isOntologyDoc(doc)) {
      // A document that can hold datasets is loaded (a semantic model, or an
      // ontology whose nested semantic model holds datasets) — let the user
      // replace it or add the Output Port's datasets to it.
      setStage({ kind: 'choose-mode', pending });
    } else {
      // Nothing loaded: keep the original replace-only behavior.
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
        heading="Not an Output Port"
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
        message="You have unsaved changes. Importing an Output Port will replace the current model."
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
              The Output Port was converted but the result has validation issues (for example a
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
 * Choice shown when a document is already loaded: replace the current document,
 * add the Output Port's datasets to the current model, or cancel. For an
 * ontology document "add" appends the datasets to its nested semantic model,
 * keeping the ontology's concepts and mappings. Built on the local `Modal` so it
 * renders without PDS web components.
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
      <h2 className="text-lg font-semibold text-content">Add to model or replace?</h2>
      <div className="mt-2 text-sm text-content-muted">
        A document is already loaded. You can add the Output Port&apos;s datasets to the current
        model, or replace the current document with the imported Output Port.
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={onReplace}>
          Replace model
        </Button>
        <Button variant="primary" onClick={onAdd}>
          Add to model
        </Button>
      </div>
    </Modal>
  );
}
