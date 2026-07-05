import { PButton } from '@porsche-design-system/components-react';
import { getActiveModel, useEditorStore } from '../../store/editorStore.js';

/** Which canvas layer the toolbar is acting on. Mirrors GraphView's `layer` state. */
export type GraphLayer = 'unified' | 'semantic-model' | 'ontology';

/** A single contextual add action rendered as a button. */
export interface ToolbarAction {
  key: 'concept' | 'dataset' | 'metric' | 'relationship';
  label: string;
  disabled: boolean;
  /** Reason shown to assistive tech when the action is disabled. */
  hint?: string;
  run: () => void;
}

/** Zero-arg creators the toolbar can invoke; wrappers keep event args off the store. */
export interface ToolbarCreators {
  addConcept: () => void;
  addDataset: () => void;
  addMetric: () => void;
  addRelationship: () => void;
}

/**
 * Pure: the add actions a graph layer offers, given the active model state.
 * Concept actions apply to the ontology/unified layers; dataset/metric/relationship
 * actions apply where a semantic model is present. "Add relationship" needs two
 * datasets to have a distinct from/to (consistent with drag-to-connect).
 */
export function buildGraphToolbarActions(opts: {
  layer: GraphLayer;
  hasModel: boolean;
  datasetCount: number;
  creators: ToolbarCreators;
}): ToolbarAction[] {
  const { layer, hasModel, datasetCount, creators } = opts;
  const showConcept = layer === 'ontology' || layer === 'unified';
  const showSemantic = (layer === 'semantic-model' || layer === 'unified') && hasModel;

  const actions: ToolbarAction[] = [];
  if (showConcept) {
    actions.push({ key: 'concept', label: 'Add concept', disabled: false, run: creators.addConcept });
  }
  if (showSemantic) {
    actions.push({ key: 'dataset', label: 'Add dataset', disabled: false, run: creators.addDataset });
    actions.push({ key: 'metric', label: 'Add metric', disabled: false, run: creators.addMetric });
    actions.push({
      key: 'relationship',
      label: 'Add relationship',
      disabled: datasetCount < 2,
      hint: datasetCount < 2 ? 'Add two datasets to connect them' : undefined,
      run: creators.addRelationship,
    });
  }
  return actions;
}

/**
 * Persistent add toolbar overlaid on the graph canvas. Unlike the empty-state
 * button, it stays available once the graph is non-empty, so users can add
 * datasets, metrics, relationships, and concepts without leaving the graph.
 * Each action reuses a store creator that selects the new entity, opening its
 * detail form in the side panel (including metrics, which have no node).
 */
export function GraphToolbar({ layer }: { layer: GraphLayer }) {
  const doc = useEditorStore((s) => s.doc);
  const activeModelIndex = useEditorStore((s) => s.activeModelIndex);
  const activeMapIndex = useEditorStore((s) => s.activeMapIndex);
  const addConcept = useEditorStore((s) => s.addConcept);
  const addDataset = useEditorStore((s) => s.addDataset);
  const addMetric = useEditorStore((s) => s.addMetric);
  const addRelationship = useEditorStore((s) => s.addRelationship);

  const model = getActiveModel(doc, activeModelIndex, activeMapIndex);
  const actions = buildGraphToolbarActions({
    layer,
    hasModel: !!model,
    datasetCount: model?.datasets.length ?? 0,
    creators: {
      addConcept: () => addConcept(),
      addDataset: () => addDataset(),
      addMetric: () => addMetric(),
      addRelationship: () => addRelationship(),
    },
  });

  if (actions.length === 0) return null;

  return (
    <div className="absolute right-2 top-2 z-10 flex gap-2">
      {actions.map((action) => (
        <PButton
          key={action.key}
          type="button"
          compact
          icon="add"
          variant="secondary"
          disabled={action.disabled}
          onClick={action.run}
          aria={{ 'aria-label': action.hint ? `${action.label} — ${action.hint}` : action.label }}
        >
          {action.label}
        </PButton>
      ))}
    </div>
  );
}
