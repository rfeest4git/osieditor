import { dataAssetToOntology, validate } from '@osi-editor/osi-schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveModel, getOntologyComponents, useEditorStore } from './editorStore.js';

function model() {
  const state = useEditorStore.getState();
  return getActiveModel(state.doc, state.activeModelIndex);
}

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.getState().newModel('test_model');
  });

  it('creates a valid empty model skeleton', () => {
    const state = useEditorStore.getState();
    expect((state.doc as { semantic_model?: Array<{ name?: string }> })?.semantic_model?.[0]?.name).toBe(
      'test_model',
    );
    expect(model()?.datasets).toEqual([]);
    expect(state.dirty).toBe(false);
    // An empty draft model has no validation errors.
    expect(validate(state.doc)).toEqual([]);
  });

  it('adds and updates a dataset, flagging dirty', () => {
    const index = useEditorStore.getState().addDataset();
    useEditorStore.getState().updateDataset(index, { name: 'orders', source: 'db.orders' });
    expect(model()?.datasets[index]).toMatchObject({ name: 'orders', source: 'db.orders' });
    expect(useEditorStore.getState().dirty).toBe(true);
  });

  it('adds a field to a dataset', () => {
    const di = useEditorStore.getState().addDataset();
    const fi = useEditorStore.getState().addField(di);
    useEditorStore.getState().updateField(di, fi, { name: 'total' });
    expect(model()?.datasets[di]?.fields?.[fi]?.name).toBe('total');
  });

  it('removes connected relationships when a dataset is deleted (graph consistency)', () => {
    const store = useEditorStore.getState();
    const a = store.addDataset();
    store.updateDataset(a, { name: 'a', source: 'db.a' });
    const b = store.addDataset();
    store.updateDataset(b, { name: 'b', source: 'db.b' });
    store.addRelationship({ from: 'a', to: 'b' });
    expect(model()?.relationships).toHaveLength(1);

    // Delete dataset "a" (index 0) → its relationship is dropped.
    useEditorStore.getState().deleteDataset(0);
    expect(model()?.relationships).toHaveLength(0);
  });

  it('tracks selection when adding entities', () => {
    const mi = useEditorStore.getState().addMetric();
    expect(useEditorStore.getState().selection).toEqual({ kind: 'metric', metricIndex: mi });
  });

  it('toggles the navigator and source-preview panels independently', () => {
    expect(useEditorStore.getState().navigatorCollapsed).toBe(false);
    expect(useEditorStore.getState().sourcePreviewCollapsed).toBe(false);

    useEditorStore.getState().toggleNavigatorCollapsed();
    expect(useEditorStore.getState().navigatorCollapsed).toBe(true);
    // Toggling one panel must not affect the other.
    expect(useEditorStore.getState().sourcePreviewCollapsed).toBe(false);

    useEditorStore.getState().toggleSourcePreviewCollapsed();
    expect(useEditorStore.getState().sourcePreviewCollapsed).toBe(true);
    expect(useEditorStore.getState().navigatorCollapsed).toBe(true);

    useEditorStore.getState().toggleNavigatorCollapsed();
    expect(useEditorStore.getState().navigatorCollapsed).toBe(false);
    expect(useEditorStore.getState().sourcePreviewCollapsed).toBe(true);
  });
});

describe('editor store — ontology documents', () => {
  beforeEach(() => {
    useEditorStore.getState().newOntology('test_ontology');
  });

  it('creates an empty ontology document with a nested map and no concepts', () => {
    const state = useEditorStore.getState();
    expect(state.docKind).toBe('ontology');
    expect((state.doc as { name?: string }).name).toBe('test_ontology');
    expect(
      getActiveModel(state.doc, state.activeModelIndex, state.activeMapIndex)?.datasets,
    ).toEqual([]);
    expect(validate(state.doc)).toEqual([]);
    expect(state.selection).toEqual({ kind: 'ontology' });
  });

  it('adds a concept and updates it, flagging dirty', () => {
    const ci = useEditorStore.getState().addConcept();
    useEditorStore.getState().updateConcept(ci, { name: 'Airport', type: 'EntityType' });
    const doc = useEditorStore.getState().doc as {
      ontology?: Array<{ concept?: { name?: string } }>;
    };
    expect(doc.ontology?.[ci]?.concept?.name).toBe('Airport');
    expect(useEditorStore.getState().selection).toEqual({ kind: 'concept', componentIndex: ci });
    expect(useEditorStore.getState().dirty).toBe(true);
  });

  it('adds and edits an ontology relationship on a concept', () => {
    const ci = useEditorStore.getState().addConcept();
    const ri = useEditorStore.getState().addOntologyRelationship(ci);
    useEditorStore
      .getState()
      .updateOntologyRelationship(ci, ri, { name: 'runways', multiplicity: 'ManyToOne' });
    const doc = useEditorStore.getState().doc as {
      ontology?: Array<{ relationships?: Array<{ name?: string; multiplicity?: string }> }>;
    };
    expect(doc.ontology?.[ci]?.relationships?.[ri]).toMatchObject({
      name: 'runways',
      multiplicity: 'ManyToOne',
    });
  });

  it('seeds a pre-populated relationship when a target concept and fields are given', () => {
    const source = useEditorStore.getState().addConcept();
    useEditorStore.getState().updateConcept(source, { name: 'Vehicle', type: 'EntityType' });
    const ri = useEditorStore.getState().addOntologyRelationship(source, {
      targetConcept: 'Owner',
      sourceField: 'vin',
      targetField: 'vin',
    });
    const doc = useEditorStore.getState().doc as {
      ontology?: Array<{
        relationships?: Array<{
          name?: string;
          roles?: Array<{ concept?: string }>;
          verbalizes?: string[];
          multiplicity?: string;
          derived_by?: string[];
        }>;
      }>;
    };
    expect(doc.ontology?.[source]?.relationships?.[ri]).toMatchObject({
      name: 'Vehicle_Owner',
      roles: [{ concept: 'Owner' }],
      verbalizes: ['{Vehicle} Vehicle_Owner {Owner}'],
      multiplicity: 'ManyToOne',
      derived_by: ['Vehicle.vin == Owner.vin'],
    });
    expect(useEditorStore.getState().selection).toEqual({
      kind: 'ontology-relationship',
      componentIndex: source,
      relationshipIndex: ri,
    });
    expect(useEditorStore.getState().dirty).toBe(true);
  });

  it('seeds a target-role relationship without a join for body-to-body drags', () => {
    const source = useEditorStore.getState().addConcept();
    useEditorStore.getState().updateConcept(source, { name: 'Vehicle', type: 'EntityType' });
    const ri = useEditorStore
      .getState()
      .addOntologyRelationship(source, { targetConcept: 'Owner' });
    const doc = useEditorStore.getState().doc as {
      ontology?: Array<{
        relationships?: Array<{ derived_by?: string[]; roles?: Array<{ concept?: string }> }>;
      }>;
    };
    const rel = doc.ontology?.[source]?.relationships?.[ri];
    expect(rel?.roles).toEqual([{ concept: 'Owner' }]);
    expect(rel?.derived_by).toBeUndefined();
  });

  it('adds a concept mapping to the active map', () => {
    const cmi = useEditorStore.getState().addConceptMapping(0);
    useEditorStore.getState().updateConceptMapping(0, cmi, { concept: 'Airport' });
    const doc = useEditorStore.getState().doc as {
      ontology_mappings?: Array<{ concept_mappings?: Array<{ concept?: string }> }>;
    };
    expect(doc.ontology_mappings?.[0]?.concept_mappings?.[cmi]?.concept).toBe('Airport');
    expect(useEditorStore.getState().selection).toEqual({
      kind: 'concept-mapping',
      mapIndex: 0,
      conceptMappingIndex: cmi,
    });
  });

  it('edits the nested semantic model via the existing dataset actions', () => {
    const di = useEditorStore.getState().addDataset();
    useEditorStore.getState().updateDataset(di, { name: 'flights', source: 'db.flights' });
    const state = useEditorStore.getState();
    const model = getActiveModel(state.doc, state.activeModelIndex, state.activeMapIndex);
    expect(model?.datasets[di]).toMatchObject({ name: 'flights', source: 'db.flights' });
  });

  it('deletes a concept and returns selection to the ontology root', () => {
    const ci = useEditorStore.getState().addConcept();
    useEditorStore.getState().deleteConcept(ci);
    const doc = useEditorStore.getState().doc as { ontology?: unknown[] };
    expect(doc.ontology?.length).toBe(0);
    expect(useEditorStore.getState().selection).toEqual({ kind: 'ontology' });
  });

  it('merges a DataAsset into the session, preserving identity and selection', () => {
    const first = dataAssetToOntology({
      schemaVersion: '3.0.1',
      name: 'First',
      entities: { customer: { displayName: 'Customer', attributes: { email: { displayName: 'Email' } } } },
    });
    useEditorStore.getState().loadDocument(first);
    const loadId = useEditorStore.getState().docLoadId;
    useEditorStore.getState().select({ kind: 'concept', componentIndex: 0 });

    const second = dataAssetToOntology({
      schemaVersion: '3.0.1',
      name: 'Second',
      entities: { order: { displayName: 'Order', attributes: { total: { displayName: 'Total' } } } },
    });
    useEditorStore.getState().mergeOntologyComponents(second);

    const state = useEditorStore.getState();
    const names = getOntologyComponents(state.doc)
      .map((c) => c.concept.name)
      .sort((a, b) => a.localeCompare(b));
    // Prior entity retained and new entity added.
    expect(names).toEqual(['Customer', 'Order']);
    // Selection is preserved and the session identity (docLoadId) is unchanged.
    expect(state.selection).toEqual({ kind: 'concept', componentIndex: 0 });
    expect(state.docLoadId).toBe(loadId);
    expect(state.dirty).toBe(true);
  });
});
