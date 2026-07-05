import type { ConceptMapping, Diagnostic, OntologyComponent } from '@osi-editor/osi-schema';
import { PText } from '@porsche-design-system/components-react';
import {
  getActiveModel,
  getOntologyComponents,
  useEditorStore,
} from '../../store/editorStore.js';
import { ConceptForm } from './ConceptForm.js';
import { ConceptMappingForm } from './ConceptMappingForm.js';
import { DatasetForm } from './DatasetForm.js';
import { FieldForm } from './FieldForm.js';
import { MetricForm } from './MetricForm.js';
import { ModelForm } from './ModelForm.js';
import { OntologyForm } from './OntologyForm.js';
import { OntologyRelationshipForm } from './OntologyRelationshipForm.js';
import { RelationshipForm } from './RelationshipForm.js';

/** Renders the detail form for the current selection. Shared by the editor pane
 *  and the graph's side panel so selection drives a single form implementation. */
export function SelectionDetail({ diagnostics }: { diagnostics: Diagnostic[] }) {
  const doc = useEditorStore((s) => s.doc);
  const activeModelIndex = useEditorStore((s) => s.activeModelIndex);
  const activeMapIndex = useEditorStore((s) => s.activeMapIndex);
  const selection = useEditorStore((s) => s.selection);
  const model = getActiveModel(doc, activeModelIndex, activeMapIndex);

  const components = getOntologyComponents(doc);
  const conceptOptions = components
    .map((c) => c.concept?.name)
    .filter((n): n is string => typeof n === 'string');

  // ---- ontology selections (do not require a semantic model) ----
  if (selection) {
    switch (selection.kind) {
      case 'ontology':
        return <OntologyForm diagnostics={diagnostics} />;
      case 'concept': {
        const component: OntologyComponent | undefined = components[selection.componentIndex];
        if (!component) return null;
        return (
          <ConceptForm
            component={component}
            componentIndex={selection.componentIndex}
            diagnostics={diagnostics}
          />
        );
      }
      case 'ontology-relationship': {
        const relationship =
          components[selection.componentIndex]?.relationships?.[selection.relationshipIndex];
        if (!relationship) return null;
        return (
          <OntologyRelationshipForm
            relationship={relationship}
            componentIndex={selection.componentIndex}
            relationshipIndex={selection.relationshipIndex}
            conceptOptions={conceptOptions}
            diagnostics={diagnostics}
          />
        );
      }
      case 'concept-mapping': {
        const maps = (doc as { ontology_mappings?: Array<{ concept_mappings?: ConceptMapping[] }> })
          .ontology_mappings;
        const conceptMapping =
          maps?.[selection.mapIndex]?.concept_mappings?.[selection.conceptMappingIndex];
        if (!conceptMapping) return null;
        return (
          <ConceptMappingForm
            conceptMapping={conceptMapping}
            mapIndex={selection.mapIndex}
            conceptMappingIndex={selection.conceptMappingIndex}
            conceptOptions={conceptOptions}
            diagnostics={diagnostics}
          />
        );
      }
    }
  }

  if (!model || !selection) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <PText color="contrast-medium">Select an entity to edit it.</PText>
      </div>
    );
  }

  switch (selection.kind) {
    case 'model':
      return <ModelForm model={model} />;
    case 'dataset': {
      const dataset = model.datasets[selection.datasetIndex];
      if (!dataset) return null;
      return (
        <DatasetForm
          dataset={dataset}
          datasetIndex={selection.datasetIndex}
          modelIndex={activeModelIndex}
          diagnostics={diagnostics}
        />
      );
    }
    case 'field': {
      const field = model.datasets[selection.datasetIndex]?.fields?.[selection.fieldIndex];
      if (!field) return null;
      return (
        <FieldForm
          field={field}
          datasetIndex={selection.datasetIndex}
          fieldIndex={selection.fieldIndex}
          modelIndex={activeModelIndex}
          diagnostics={diagnostics}
        />
      );
    }
    case 'metric': {
      const metric = model.metrics?.[selection.metricIndex];
      if (!metric) return null;
      return (
        <MetricForm
          metric={metric}
          metricIndex={selection.metricIndex}
          modelIndex={activeModelIndex}
          diagnostics={diagnostics}
        />
      );
    }
    case 'relationship': {
      const relationship = model.relationships?.[selection.relationshipIndex];
      if (!relationship) return null;
      return (
        <RelationshipForm
          relationship={relationship}
          relationshipIndex={selection.relationshipIndex}
          modelIndex={activeModelIndex}
          model={model}
          diagnostics={diagnostics}
        />
      );
    }
    default:
      return null;
  }
}
