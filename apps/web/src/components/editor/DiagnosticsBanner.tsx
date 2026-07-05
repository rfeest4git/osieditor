import type { Diagnostic } from '@osi-editor/osi-schema';
import { PBanner } from '@porsche-design-system/components-react';
import { useState } from 'react';
import type { Selection } from '../../store/editorStore.js';
import { useEditorStore } from '../../store/editorStore.js';

/** Map a diagnostic's JSON path to an editor selection, when possible. */
function pathToSelection(path: Array<string | number>): Selection {
  if (path[0] !== 'semantic_model') return null;
  const di = path.indexOf('datasets');
  if (di !== -1 && typeof path[di + 1] === 'number') {
    const datasetIndex = path[di + 1] as number;
    const fi = path.indexOf('fields');
    if (fi !== -1 && typeof path[fi + 1] === 'number') {
      return { kind: 'field', datasetIndex, fieldIndex: path[fi + 1] as number };
    }
    return { kind: 'dataset', datasetIndex };
  }
  const mi = path.indexOf('metrics');
  if (mi !== -1 && typeof path[mi + 1] === 'number') {
    return { kind: 'metric', metricIndex: path[mi + 1] as number };
  }
  const ri = path.indexOf('relationships');
  if (ri !== -1 && typeof path[ri + 1] === 'number') {
    return { kind: 'relationship', relationshipIndex: path[ri + 1] as number };
  }
  return { kind: 'model' };
}

/**
 * A dismissible banner summarizing model-level diagnostics (duplicate names,
 * dangling references, missing required fields). Each item selects its entity.
 */
export function DiagnosticsBanner({ diagnostics }: { diagnostics: Diagnostic[] }) {
  const select = useEditorStore((s) => s.select);
  const [dismissed, setDismissed] = useState(false);

  const errors = diagnostics.filter((d) => d.severity === 'error');
  if (errors.length === 0 || dismissed) return null;

  return (
    <div className="border-b border-border">
      <PBanner state="error" open onDismiss={() => setDismissed(true)}>
        <span slot="title">
          {errors.length} validation {errors.length === 1 ? 'issue' : 'issues'}
        </span>
        <span slot="description">
          <ul className="flex flex-col gap-0.5">
            {errors.slice(0, 12).map((d, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="text-left underline decoration-dotted hover:no-underline"
                  onClick={() => {
                    setDismissed(false);
                    select(pathToSelection(d.path));
                  }}
                >
                  {d.message}
                </button>
              </li>
            ))}
            {errors.length > 12 && <li>…and {errors.length - 12} more.</li>}
          </ul>
        </span>
      </PBanner>
    </div>
  );
}
