import { validate } from '@osi-editor/osi-schema';
import { useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore.js';
import { DiagnosticsBanner } from './DiagnosticsBanner.js';
import { SelectionDetail } from './SelectionDetail.js';

/**
 * Center editor pane: a banner of model-level diagnostics over the detail form
 * for the current selection. Diagnostics recompute from the live document
 * (task 6.6).
 */
export function EditorPane() {
  const doc = useEditorStore((s) => s.doc);
  const diagnostics = useMemo(() => (doc ? validate(doc) : []), [doc]);

  return (
    <div className="flex h-full flex-col">
      <DiagnosticsBanner diagnostics={diagnostics} />
      <div className="min-h-0 flex-1 overflow-auto">
        <SelectionDetail diagnostics={diagnostics} />
      </div>
    </div>
  );
}
