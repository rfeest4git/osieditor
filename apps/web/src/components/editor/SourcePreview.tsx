import { serialize } from '@osi-editor/osi-schema';
import { PButtonPure } from '@porsche-design-system/components-react';
import { useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore.js';

/** Live JSON/YAML source preview of the current model (task 6.7). */
export function SourcePreview({ onCollapse }: Readonly<{ onCollapse?: () => void }>) {
  const doc = useEditorStore((s) => s.doc);
  const previewFormat = useEditorStore((s) => s.previewFormat);
  const setPreviewFormat = useEditorStore((s) => s.setPreviewFormat);

  const source = useMemo(() => {
    if (!doc) return '';
    try {
      return serialize(doc, previewFormat);
    } catch (err) {
      return `# Unable to serialize: ${(err as Error).message}`;
    }
  }, [doc, previewFormat]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-muted">
          Source preview
        </span>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border text-xs">
            {(['yaml', 'json'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => setPreviewFormat(format)}
                className={`px-2.5 py-1 uppercase transition-colors ${
                  previewFormat === format
                    ? 'bg-brand text-white'
                    : 'bg-surface text-content-muted hover:bg-surface-raised'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
          {onCollapse && (
            <PButtonPure
              icon="arrow-head-right"
              hideLabel={true}
              onClick={onCollapse}
              aria-label="Collapse source preview"
              title="Collapse source preview"
            >
              Collapse source preview
            </PButtonPure>
          )}
        </div>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed text-content">
        {source}
      </pre>
    </div>
  );
}
