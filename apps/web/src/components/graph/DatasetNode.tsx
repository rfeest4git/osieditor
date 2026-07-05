import { PIcon } from '@porsche-design-system/components-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FieldRow } from './ontologyGraph.js';

/** Data carried by an expandable dataset node. */
export interface DatasetNodeData {
  label: string;
  /** Dataset description, always shown (muted) when present. */
  description?: string;
  fields: FieldRow[];
  expanded: boolean;
  onToggleExpand: () => void;
  onSelectField: (field: FieldRow) => void;
  [key: string]: unknown;
}

/**
 * Custom React Flow node for a semantic-model dataset. Collapsed, it shows the
 * dataset label plus a count affordance for its fields; expanded, it lists each
 * field (name → optional label/type detail) as a selectable row that opens the
 * field's detail form. Mirrors {@link ConceptNode} for datasets.
 */
export function DatasetNode({ data, selected }: NodeProps) {
  const { label, description, fields, expanded, onToggleExpand, onSelectField } =
    data as DatasetNodeData;
  const hasFields = fields.length > 0;

  return (
    <div
      // Teal left accent keys datasets to the semantic-model region and colour scheme.
      className={`min-w-40 rounded border border-l-4 bg-surface text-content shadow-sm ${
        selected ? 'border-brand' : 'border-border border-l-[#0d9488]'
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex-1 truncate text-sm font-medium">{label}</span>
        {hasFields && (
          <button
            type="button"
            // Toggle only; stop propagation so the canvas doesn't also select the node.
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="nodrag flex items-center gap-1 rounded px-1 text-xs text-content/70 hover:bg-surface-sunken"
            aria-label={expanded ? 'Collapse fields' : 'Expand fields'}
            aria-expanded={expanded}
          >
            <span>{fields.length}</span>
            <PIcon name={expanded ? 'arrow-head-up' : 'arrow-head-down'} size="x-small" />
          </button>
        )}
      </div>
      {description && (
        <div className="border-t border-border px-3 py-1.5 text-xs italic text-content/60">
          {description}
        </div>
      )}
      {expanded && hasFields && (
        <ul className="border-t border-border">
          {fields.map((field) => (
            <li key={`${field.datasetIndex}-${field.fieldIndex}`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectField(field);
                }}
                className="nodrag flex w-full items-center gap-2 px-3 py-1 text-left text-xs hover:bg-surface-sunken"
              >
                <span className="truncate font-medium">{field.name}</span>
                {field.detail && (
                  <span className="ml-auto truncate text-content/60">{field.detail}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
