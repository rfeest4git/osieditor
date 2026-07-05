import type { OsiFormat } from '@osi-editor/osi-schema';
import { PButton } from '@porsche-design-system/components-react';
import { useId, useState } from 'react';
import { exportModel } from '../../lib/api.js';
import { useEditorStore } from '../../store/editorStore.js';
import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';

/** Trigger a browser download of the given text. */
function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Export control: pick JSON or YAML, serialize via the API, and download it. */
export function ExportButton() {
  const doc = useEditorStore((s) => s.doc);
  const markSaved = useEditorStore((s) => s.markSaved);
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<OsiFormat>('yaml');
  const [busy, setBusy] = useState(false);
  const headingId = useId();

  const handleExport = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      const { text, filename } = await exportModel(doc, format);
      downloadText(text, filename, format === 'json' ? 'application/json' : 'application/yaml');
      markSaved();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PButton
        type="button"
        variant="secondary"
        icon="download"
        disabled={!doc}
        onClick={() => setOpen(true)}
      >
        Export
      </PButton>
      <Modal open={open} onClose={() => setOpen(false)} labelledById={headingId}>
        <h2 id={headingId} className="text-lg font-semibold text-content">
          Export model
        </h2>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium">Format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as OsiFormat)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-content"
          >
            <option value="yaml">YAML (.yaml)</option>
            <option value="json">JSON (.json)</option>
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} onClick={handleExport}>
            {busy ? 'Exporting…' : 'Download'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
