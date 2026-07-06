import { PIcon } from '@porsche-design-system/components-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { fieldHandleId, type ConceptAttribute } from './ontologyGraph.js';

/** Data carried by an expandable concept node. */
export interface ConceptNodeData {
  label: string;
  /** Concept description, always shown (muted) when present. */
  description?: string;
  attributes: ConceptAttribute[];
  expanded: boolean;
  /** True for a concept referenced by a relationship but not declared (ghost node). */
  referenced?: boolean;
  onToggleExpand: () => void;
  onSelectAttribute: (attr: ConceptAttribute) => void;
  [key: string]: unknown;
}

/**
 * Custom React Flow node for an ontology concept. Collapsed, it shows the
 * concept label plus a count affordance for its attributes; expanded, it lists
 * each attribute (name → value type) as a selectable row that opens the
 * underlying ontology relationship in the detail form.
 */
export function ConceptNode({ data, selected }: NodeProps) {
  const { label, description, attributes, expanded, referenced, onToggleExpand, onSelectAttribute } =
    data as ConceptNodeData;
  const hasAttributes = attributes.length > 0;

  // A referenced-but-not-declared concept: a dashed placeholder with no attributes.
  if (referenced) {
    return (
      <div className="min-w-40 rounded border border-dashed border-border bg-surface/60 px-3 py-2 text-content shadow-sm">
        <Handle type="target" position={Position.Left} />
        <div className="truncate text-sm font-medium">{label}</div>
        <div className="text-[10px] italic text-content/50">referenced — not declared</div>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  return (
    <div
      // Cobalt left accent keys concepts to their ontology-relationship edges.
      className={`min-w-40 max-w-[320px] rounded border border-l-4 bg-surface text-content shadow-sm ${
        selected ? 'border-brand' : 'border-border border-l-[#2b56d4]'
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex-1 truncate text-sm font-medium">{label}</span>
        {hasAttributes && (
          <button
            type="button"
            // Toggle only; stop propagation so the canvas doesn't also select the node.
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="nodrag flex items-center gap-1 rounded px-1 text-xs text-content/70 hover:bg-surface-sunken"
            aria-label={expanded ? 'Collapse attributes' : 'Expand attributes'}
            aria-expanded={expanded}
          >
            <span>{attributes.length}</span>
            <PIcon name={expanded ? 'arrow-head-up' : 'arrow-head-down'} size="x-small" />
          </button>
        )}
      </div>
      {description && (
        <div className="border-t border-border px-3 py-1.5 text-xs italic text-content/60 whitespace-normal break-words">
          {description}
        </div>
      )}
      {expanded && hasAttributes && (
        <ul className="border-t border-border">
          {attributes.map((attr) => (
            <li
              key={`${attr.componentIndex}-${attr.relationshipIndex}`}
              className="relative"
            >
              {/* Per-field connect handles so a drag can start/end on a specific
                  field; the namespaced `field:` id lets onOntConnect recover it. */}
              <Handle
                type="target"
                position={Position.Left}
                id={fieldHandleId(attr.name)}
                className="!h-2 !w-2 !border !border-border !bg-surface-sunken"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAttribute(attr);
                }}
                className="nodrag flex w-full items-center gap-2 px-3 py-1 text-left text-xs hover:bg-surface-sunken"
              >
                <span className="truncate font-medium">{attr.name}</span>
                {attr.isIdentity && (
                  <span className="rounded bg-brand/10 px-1 font-mono text-[10px] font-bold text-brand">
                    ID
                  </span>
                )}
                {attr.isForeignKey && (
                  <span className="rounded bg-teal-500/10 px-1 font-mono text-[10px] font-bold text-teal-600">
                    FK
                  </span>
                )}
                {attr.valueType && (
                  <span className="ml-auto truncate text-content/60">{attr.valueType}</span>
                )}
              </button>
              <Handle
                type="source"
                position={Position.Right}
                id={fieldHandleId(attr.name)}
                className="!h-2 !w-2 !border !border-border !bg-surface-sunken"
              />
            </li>
          ))}
        </ul>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
