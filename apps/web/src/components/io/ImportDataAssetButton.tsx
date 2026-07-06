import { PButton } from '@porsche-design-system/components-react';
import type { AnyDraftDocument } from '@osi-editor/osi-schema';
import { useRef, useState } from 'react';
import { importDataAsset, type ImportResponse } from '../../lib/api.js';
import { useEditorStore } from '../../store/editorStore.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';

interface PendingImport {
  response: ImportResponse;
  fileName: string;
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'parse-error'; message: string }
  | { kind: 'unsupported'; message: string }
  | { kind: 'unsaved-confirm'; pending: PendingImport }
  | { kind: 'validation-confirm'; pending: PendingImport };

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
  const dirty = useEditorStore((s) => s.dirty);

  const apply = (pending: PendingImport) => {
    if (pending.response.document) {
      loadDocument(pending.response.document as AnyDraftDocument, pending.fileName);
    }
    setStage({ kind: 'idle' });
  };

  const proceed = (pending: PendingImport) => {
    const errors = pending.response.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) {
      setStage({ kind: 'validation-confirm', pending });
    } else {
      apply(pending);
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
    if (dirty) {
      setStage({ kind: 'unsaved-confirm', pending });
    } else {
      proceed(pending);
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
        onConfirm={() => stage.kind === 'unsaved-confirm' && proceed(stage.pending)}
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
        onConfirm={() => stage.kind === 'validation-confirm' && apply(stage.pending)}
        onCancel={() => setStage({ kind: 'idle' })}
      />
    </>
  );
}
