import { type NodeProps } from '@xyflow/react';
import type { MetricRow } from './ontologyGraph.js';

/** Data carried by a metric node. */
export interface MetricNodeData {
  metric: MetricRow;
  [key: string]: unknown;
}

/**
 * Custom React Flow node for a semantic-model metric. Shows the metric name and,
 * when present, its description (muted). Metrics are not relationship endpoints,
 * so the node carries no connection handles; selecting it opens the metric form.
 */
export function MetricNode({ data, selected }: NodeProps) {
  const { metric } = data as MetricNodeData;

  return (
    <div
      className={`min-w-40 max-w-64 rounded border-l-4 border bg-surface px-3 py-2 text-content shadow-sm ${
        selected ? 'border-brand' : 'border-border border-l-amber-500'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-amber-500/10 px-1 font-mono text-[10px] font-bold uppercase text-amber-600">
          metric
        </span>
        <span className="flex-1 truncate text-sm font-medium">{metric.name}</span>
      </div>
      {metric.description && (
        <div className="mt-1 line-clamp-3 text-xs text-content/60">{metric.description}</div>
      )}
    </div>
  );
}
