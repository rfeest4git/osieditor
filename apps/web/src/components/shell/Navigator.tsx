import type { ConceptMapping } from '@osi-editor/osi-schema';
import { PButtonPure, PIcon } from '@porsche-design-system/components-react';
import type { ComponentProps } from 'react';
import {
  getActiveModel,
  getOntologyComponents,
  isOntologyDoc,
  useEditorStore,
  type Selection,
} from '../../store/editorStore.js';

type IconName = ComponentProps<typeof PIcon>['name'];

function sameSelection(a: Selection, b: Selection): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Navigator sidebar. For a semantic-model document it shows the active model's
 * datasets (with fields), metrics, and relationships. For an ontology document
 * it additionally shows the ontology's concepts (with their relationships) and
 * concept mappings above the (nested) semantic model. Clicking a node selects it.
 */
export function Navigator() {
  const doc = useEditorStore((s) => s.doc);
  const activeModelIndex = useEditorStore((s) => s.activeModelIndex);
  const activeMapIndex = useEditorStore((s) => s.activeMapIndex);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const addDataset = useEditorStore((s) => s.addDataset);
  const addMetric = useEditorStore((s) => s.addMetric);
  const addRelationship = useEditorStore((s) => s.addRelationship);
  const addConcept = useEditorStore((s) => s.addConcept);
  const addOntologyRelationship = useEditorStore((s) => s.addOntologyRelationship);
  const addConceptMapping = useEditorStore((s) => s.addConceptMapping);

  const ontology = isOntologyDoc(doc);
  const components = getOntologyComponents(doc);
  const conceptMappings =
    (doc as { ontology_mappings?: Array<{ concept_mappings?: ConceptMapping[] }> })
      ?.ontology_mappings?.[activeMapIndex]?.concept_mappings ?? [];

  const model = getActiveModel(doc, activeModelIndex, activeMapIndex);
  if (!ontology && !model) {
    return <div className="p-4 text-sm text-content-muted">No document loaded.</div>;
  }

  return (
    <nav className="flex flex-col gap-1 p-2 text-sm">
      {ontology && (
        <>
          <TreeRow
            icon="menu-lines"
            label="Ontology"
            depth={0}
            active={sameSelection(selection, { kind: 'ontology' })}
            onClick={() => select({ kind: 'ontology' })}
            bold
          />

          <GroupHeader label="Concepts" count={components.length} onAdd={addConcept} />
          {components.map((component, ci) => (
            <div key={ci}>
              <TreeRow
                icon="grid"
                label={component.concept?.name || '(unnamed concept)'}
                depth={1}
                active={sameSelection(selection, { kind: 'concept', componentIndex: ci })}
                onClick={() => select({ kind: 'concept', componentIndex: ci })}
              />
              {(component.relationships ?? []).map((rel, ri) => (
                <TreeRow
                  key={ri}
                  icon="share"
                  label={rel.name || '(unnamed)'}
                  depth={2}
                  active={sameSelection(selection, {
                    kind: 'ontology-relationship',
                    componentIndex: ci,
                    relationshipIndex: ri,
                  })}
                  onClick={() =>
                    select({
                      kind: 'ontology-relationship',
                      componentIndex: ci,
                      relationshipIndex: ri,
                    })
                  }
                />
              ))}
              <button
                type="button"
                onClick={() => addOntologyRelationship(ci)}
                style={{ paddingLeft: `${2 * 16 + 8}px` }}
                className="flex w-full items-center gap-2 rounded py-1 pr-2 text-left text-xs text-content-muted transition-colors hover:bg-surface-sunken"
              >
                <PIcon name="add" size="x-small" />
                <span>Add relationship</span>
              </button>
            </div>
          ))}

          <GroupHeader
            label="Concept mappings"
            count={conceptMappings.length}
            onAdd={() => addConceptMapping(activeMapIndex)}
          />
          {conceptMappings.map((cm, cmi) => (
            <TreeRow
              key={cmi}
              icon="map"
              label={cm.concept || '(unmapped)'}
              depth={1}
              active={sameSelection(selection, {
                kind: 'concept-mapping',
                mapIndex: activeMapIndex,
                conceptMappingIndex: cmi,
              })}
              onClick={() =>
                select({
                  kind: 'concept-mapping',
                  mapIndex: activeMapIndex,
                  conceptMappingIndex: cmi,
                })
              }
            />
          ))}

          <div className="mt-3 px-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
            Semantic model
          </div>
        </>
      )}

      {model && (
        <>
      <TreeRow
        icon="menu-lines"
        label={model.name || '(unnamed model)'}
        depth={0}
        active={sameSelection(selection, { kind: 'model' })}
        onClick={() => select({ kind: 'model' })}
        bold
      />

      <GroupHeader label="Datasets" count={model.datasets.length} onAdd={addDataset} />
      {model.datasets.map((dataset, di) => (
        <div key={di}>
          <TreeRow
            icon="grid"
            label={dataset.name || '(unnamed)'}
            depth={1}
            active={sameSelection(selection, { kind: 'dataset', datasetIndex: di })}
            onClick={() => select({ kind: 'dataset', datasetIndex: di })}
          />
          {(dataset.fields ?? []).map((field, fi) => (
            <TreeRow
              key={fi}
              icon="list"
              label={field.name || '(unnamed)'}
              depth={2}
              active={sameSelection(selection, {
                kind: 'field',
                datasetIndex: di,
                fieldIndex: fi,
              })}
              onClick={() => select({ kind: 'field', datasetIndex: di, fieldIndex: fi })}
            />
          ))}
        </div>
      ))}

      <GroupHeader label="Metrics" count={model.metrics?.length ?? 0} onAdd={addMetric} />
      {(model.metrics ?? []).map((metric, mi) => (
        <TreeRow
          key={mi}
          icon="chart"
          label={metric.name || '(unnamed)'}
          depth={1}
          active={sameSelection(selection, { kind: 'metric', metricIndex: mi })}
          onClick={() => select({ kind: 'metric', metricIndex: mi })}
        />
      ))}

      <GroupHeader
        label="Relationships"
        count={model.relationships?.length ?? 0}
        onAdd={model.datasets.length >= 1 ? () => addRelationship() : undefined}
      />
      {(model.relationships ?? []).map((rel, ri) => (
        <TreeRow
          key={ri}
          icon="share"
          label={rel.name || `${rel.from} → ${rel.to}`}
          depth={1}
          active={sameSelection(selection, { kind: 'relationship', relationshipIndex: ri })}
          onClick={() => select({ kind: 'relationship', relationshipIndex: ri })}
        />
      ))}
        </>
      )}
    </nav>
  );
}

function GroupHeader({
  label,
  count,
  onAdd,
}: {
  label: string;
  count: number;
  onAdd?: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between px-2 py-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-content-muted">
        {label} ({count})
      </span>
      {onAdd && (
        <PButtonPure icon="add" hideLabel onClick={onAdd} aria={{ 'aria-label': `Add ${label}` }}>
          Add {label}
        </PButtonPure>
      )}
    </div>
  );
}

function TreeRow({
  icon,
  label,
  depth,
  active,
  onClick,
  bold,
}: {
  icon: IconName;
  label: string;
  depth: number;
  active: boolean;
  onClick: () => void;
  bold?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      className={`flex w-full items-center gap-2 rounded py-1 pr-2 text-left transition-colors ${
        active ? 'bg-brand/10 text-brand' : 'text-content hover:bg-surface-sunken'
      } ${bold ? 'font-semibold' : ''}`}
    >
      <PIcon name={icon} size="x-small" />
      <span className="truncate">{label}</span>
    </button>
  );
}
