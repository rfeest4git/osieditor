import { PTag } from '@porsche-design-system/components-react';
import { ExportButton } from '../io/ExportButton.js';
import { ImportButton } from '../io/ImportButton.js';
import { ImportDataAssetButton } from '../io/ImportDataAssetButton.js';
import { ImportOutputPortButton } from '../io/ImportOutputPortButton.js';
import { NewModelButton } from '../io/NewModelButton.js';
import { NewOntologyButton } from '../io/NewOntologyButton.js';
import { getActiveModel, isOntologyDoc, useEditorStore } from '../../store/editorStore.js';

/** App header: brand, active file name + dirty indicator, and the I/O toolbar. */
export function Header() {
  const fileName = useEditorStore((s) => s.fileName);
  const dirty = useEditorStore((s) => s.dirty);
  // Ontology docs carry the name at the top level; semantic-model docs on the
  // active model — resolve whichever applies.
  const docName = useEditorStore((s) =>
    isOntologyDoc(s.doc)
      ? (s.doc as { name?: string }).name
      : getActiveModel(s.doc, s.activeModelIndex, s.activeMapIndex)?.name,
  );

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-2.5">
      <div className="flex items-baseline gap-3">
        <span className="text-base font-semibold tracking-tight text-brand">OSI Editor</span>
        {(fileName || docName) && (
          <span className="flex items-center gap-2 text-sm text-content-muted">
            {fileName ?? docName}
            {dirty && (
              <PTag variant="warning" compact={true}>
                Unsaved
              </PTag>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <NewModelButton variant="secondary" />
        <NewOntologyButton variant="secondary" />
        <ImportButton variant="secondary" />
        <ImportDataAssetButton variant="secondary" />
        <ImportOutputPortButton variant="secondary" />
        <ExportButton />
      </div>
    </header>
  );
}
