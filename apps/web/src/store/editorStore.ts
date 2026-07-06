import {
  createConceptMapping,
  createDataset,
  createEmptyDocument,
  createEmptyOntologyDocument,
  createField,
  createMetric,
  createOntologyComponent,
  createOntologyRelationship,
  createRelationship,
  detectDocumentKind,
  mergeDataAssetOntology,
  validate,
  type AnyDraftDocument,
  type Concept,
  type ConceptMapping,
  type Dataset,
  type Diagnostic,
  type Field,
  type Metric,
  type OntologyComponent,
  type OntologyDocument,
  type OntologyRelationship,
  type OsiDocumentKind,
  type OsiFormat,
  type Relationship,
  type SemanticModel,
} from '@osi-editor/osi-schema';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/** What's currently selected in the navigator / graph / forms. */
export type Selection =
  | { kind: 'model' }
  | { kind: 'dataset'; datasetIndex: number }
  | { kind: 'field'; datasetIndex: number; fieldIndex: number }
  | { kind: 'metric'; metricIndex: number }
  | { kind: 'relationship'; relationshipIndex: number }
  // ---- ontology ----
  | { kind: 'ontology' }
  | { kind: 'concept'; componentIndex: number }
  | { kind: 'ontology-relationship'; componentIndex: number; relationshipIndex: number }
  | { kind: 'concept-mapping'; mapIndex: number; conceptMappingIndex: number }
  | null;

interface EditorState {
  doc: AnyDraftDocument | null;
  docKind: OsiDocumentKind;
  activeModelIndex: number;
  /** Which `ontology_mappings` entry's nested semantic model is active (ontology docs). */
  activeMapIndex: number;
  selection: Selection;
  dirty: boolean;
  fileName: string | null;
  previewFormat: OsiFormat;
  /** Whether the left navigator panel is collapsed (session UI state). */
  navigatorCollapsed: boolean;
  /** Whether the right source-preview panel is collapsed (session UI state). */
  sourcePreviewCollapsed: boolean;
  /** Whether the graph's right-hand selection-detail inspector is collapsed. */
  inspectorCollapsed: boolean;
  /**
   * Monotonic counter bumped only when a *new* document is loaded/created (not on
   * edits). Views key one-shot layout work off this so a freshly loaded document
   * re-arranges, while ordinary edits (which produce a new immer `doc` reference
   * every keystroke) do not. See {@link GraphView}'s auto-arrange reset.
   */
  docLoadId: number;

  // ---- lifecycle ----
  newModel: (name?: string) => void;
  newOntology: (name?: string) => void;
  loadDocument: (doc: AnyDraftDocument, fileName?: string) => void;
  /**
   * Merge a converted DataAsset ontology document into the active ontology
   * document without starting a new session: appends its components/metadata,
   * marks the doc dirty, and preserves selection/indices and `docLoadId`.
   */
  mergeOntologyComponents: (incoming: OntologyDocument) => void;
  markSaved: () => void;
  setPreviewFormat: (format: OsiFormat) => void;
  select: (selection: Selection) => void;
  setActiveMapIndex: (index: number) => void;

  // ---- layout ----
  toggleNavigatorCollapsed: () => void;
  toggleSourcePreviewCollapsed: () => void;
  toggleInspectorCollapsed: () => void;

  // ---- model ----
  updateModel: (patch: Partial<SemanticModel>) => void;

  // ---- datasets ----
  addDataset: () => number;
  updateDataset: (index: number, patch: Partial<Dataset>) => void;
  deleteDataset: (index: number) => void;

  // ---- fields ----
  addField: (datasetIndex: number) => number;
  updateField: (datasetIndex: number, fieldIndex: number, patch: Partial<Field>) => void;
  deleteField: (datasetIndex: number, fieldIndex: number) => void;

  // ---- metrics ----
  addMetric: () => number;
  updateMetric: (index: number, patch: Partial<Metric>) => void;
  deleteMetric: (index: number) => void;

  // ---- relationships ----
  addRelationship: (partial?: Partial<Relationship> & { from: string; to: string }) => number;
  updateRelationship: (index: number, patch: Partial<Relationship>) => void;
  deleteRelationship: (index: number) => void;

  // ---- ontology: document meta ----
  updateOntologyDoc: (patch: { name?: string; description?: string; ai_context?: unknown }) => void;

  // ---- ontology: concepts ----
  addConcept: () => number;
  updateComponent: (componentIndex: number, patch: Partial<OntologyComponent>) => void;
  updateConcept: (componentIndex: number, patch: Partial<Concept>) => void;
  deleteConcept: (componentIndex: number) => void;

  // ---- ontology: relationships ----
  addOntologyRelationship: (
    componentIndex: number,
    options?: {
      targetConcept?: string;
      sourceField?: string;
      targetField?: string;
    },
  ) => number;
  updateOntologyRelationship: (
    componentIndex: number,
    relationshipIndex: number,
    patch: Partial<OntologyRelationship>,
  ) => void;
  deleteOntologyRelationship: (componentIndex: number, relationshipIndex: number) => void;

  // ---- ontology: concept mappings ----
  addConceptMapping: (mapIndex?: number) => number;
  updateConceptMapping: (
    mapIndex: number,
    conceptMappingIndex: number,
    patch: Partial<ConceptMapping>,
  ) => void;
  deleteConceptMapping: (mapIndex: number, conceptMappingIndex: number) => void;
}

/** True when the document is an OSI ontology document. */
export function isOntologyDoc(doc: AnyDraftDocument | null): boolean {
  return !!doc && 'ontology' in doc && Array.isArray((doc as { ontology?: unknown }).ontology);
}

/**
 * Read the active semantic model from a draft doc (or undefined). For an ontology
 * document the "active model" is the nested `ontology_mappings[activeMapIndex]
 * .semantic_model`, so the existing dataset/field/metric editors work on it too.
 */
export function getActiveModel(
  doc: AnyDraftDocument | null,
  activeModelIndex: number,
  activeMapIndex = 0,
): SemanticModel | undefined {
  if (!doc) return undefined;
  if (isOntologyDoc(doc)) {
    const ontDoc = doc as { ontology_mappings?: Array<{ semantic_model?: SemanticModel }> };
    return ontDoc.ontology_mappings?.[activeMapIndex]?.semantic_model;
  }
  const smDoc = doc as { semantic_model?: SemanticModel[] };
  return smDoc.semantic_model?.[activeModelIndex];
}

/** Read the ontology components of an ontology document (or []). */
export function getOntologyComponents(doc: AnyDraftDocument | null): OntologyComponent[] {
  if (!isOntologyDoc(doc)) return [];
  return (doc as { ontology?: OntologyComponent[] }).ontology ?? [];
}

/**
 * Datasets (with their field names) of the semantic model that a given ontology
 * map binds to. Powers the dataset/field pickers in the concept-mapping editor.
 */
export function getMapDatasetFields(
  doc: AnyDraftDocument | null,
  mapIndex: number,
): Array<{ name: string; fields: string[] }> {
  const model = getActiveModel(doc, 0, mapIndex);
  return (model?.datasets ?? []).map((dataset) => ({
    name: dataset.name,
    fields: (dataset.fields ?? []).map((field) => field.name),
  }));
}

/**
 * Names of the ontology relationships defined for a concept, for the relationship
 * pickers in the concept-mapping editor. Returns [] when the concept is unknown.
 */
export function getConceptRelationshipNames(
  doc: AnyDraftDocument | null,
  conceptName: string | undefined,
): string[] {
  if (!conceptName) return [];
  const component = getOntologyComponents(doc).find((c) => c.concept?.name === conceptName);
  return (component?.relationships ?? [])
    .map((rel) => rel.name)
    .filter((n): n is string => typeof n === 'string');
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => {
    /** Run a mutation against the active semantic model and flag the doc dirty. */
    const mutateModel = (fn: (model: SemanticModel) => void) =>
      set((state) => {
        const model = getActiveModel(state.doc, state.activeModelIndex, state.activeMapIndex);
        if (!model) return;
        fn(model);
        state.dirty = true;
      });

    /** Run a mutation against the ontology document (components) and flag dirty. */
    const mutateOntology = (fn: (components: OntologyComponent[]) => void) =>
      set((state) => {
        if (!isOntologyDoc(state.doc)) return;
        const ontDoc = state.doc as { ontology?: OntologyComponent[] };
        ontDoc.ontology ??= [];
        fn(ontDoc.ontology);
        state.dirty = true;
      });

    /** Run a mutation against an ontology map's concept_mappings and flag dirty. */
    const mutateConceptMappings = (mapIndex: number, fn: (mappings: ConceptMapping[]) => void) =>
      set((state) => {
        if (!isOntologyDoc(state.doc)) return;
        const ontDoc = state.doc as {
          ontology_mappings?: Array<{ concept_mappings?: ConceptMapping[] }>;
        };
        const map = ontDoc.ontology_mappings?.[mapIndex];
        if (!map) return;
        map.concept_mappings ??= [];
        fn(map.concept_mappings);
        state.dirty = true;
      });

    return {
      doc: null,
      docKind: 'semantic-model',
      activeModelIndex: 0,
      activeMapIndex: 0,
      selection: null,
      dirty: false,
      fileName: null,
      previewFormat: 'yaml',
      navigatorCollapsed: false,
      sourcePreviewCollapsed: false,
      inspectorCollapsed: false,
      docLoadId: 0,

      newModel: (name = 'untitled_model') =>
        set((state) => {
          state.doc = createEmptyDocument(name) as AnyDraftDocument;
          state.docKind = 'semantic-model';
          state.activeModelIndex = 0;
          state.activeMapIndex = 0;
          state.selection = { kind: 'model' };
          state.dirty = false;
          state.fileName = null;
          state.docLoadId += 1;
        }),

      newOntology: (name = 'untitled_ontology') =>
        set((state) => {
          state.doc = createEmptyOntologyDocument(name) as AnyDraftDocument;
          state.docKind = 'ontology';
          state.activeModelIndex = 0;
          state.activeMapIndex = 0;
          state.selection = { kind: 'ontology' };
          state.dirty = false;
          state.fileName = null;
          state.docLoadId += 1;
        }),

      loadDocument: (doc, fileName) =>
        set((state) => {
          const kind = detectDocumentKind(doc) ?? 'semantic-model';
          state.doc = doc;
          state.docKind = kind;
          state.activeModelIndex = 0;
          state.activeMapIndex = 0;
          state.selection = kind === 'ontology' ? { kind: 'ontology' } : { kind: 'model' };
          state.dirty = false;
          state.fileName = fileName ?? null;
          state.docLoadId += 1;
        }),

      markSaved: () =>
        set((state) => {
          state.dirty = false;
        }),

      mergeOntologyComponents: (incoming) => {
        const current = get().doc;
        if (!current || !isOntologyDoc(current)) return;
        // Merge against a plain snapshot (not an immer draft) so the helper's
        // spreads/reads produce a clean document, then replace the active doc.
        const merged = mergeDataAssetOntology(current, incoming);
        set((state) => {
          state.doc = merged;
          state.dirty = true;
        });
      },

      setPreviewFormat: (format) =>
        set((state) => {
          state.previewFormat = format;
        }),

      toggleNavigatorCollapsed: () =>
        set((state) => {
          state.navigatorCollapsed = !state.navigatorCollapsed;
        }),

      toggleSourcePreviewCollapsed: () =>
        set((state) => {
          state.sourcePreviewCollapsed = !state.sourcePreviewCollapsed;
        }),

      toggleInspectorCollapsed: () =>
        set((state) => {
          state.inspectorCollapsed = !state.inspectorCollapsed;
        }),

      select: (selection) =>
        set((state) => {
          state.selection = selection;
        }),

      setActiveMapIndex: (index) =>
        set((state) => {
          state.activeMapIndex = index;
        }),

      updateModel: (patch) =>
        mutateModel((model) => {
          Object.assign(model, patch);
        }),

      addDataset: () => {
        let newIndex = -1;
        mutateModel((model) => {
          model.datasets.push(createDataset(`dataset_${model.datasets.length + 1}`));
          newIndex = model.datasets.length - 1;
        });
        set((state) => {
          if (newIndex >= 0) state.selection = { kind: 'dataset', datasetIndex: newIndex };
        });
        return newIndex;
      },

      updateDataset: (index, patch) =>
        mutateModel((model) => {
          const dataset = model.datasets[index];
          if (dataset) Object.assign(dataset, patch);
        }),

      deleteDataset: (index) => {
        mutateModel((model) => {
          const removed = model.datasets[index];
          model.datasets.splice(index, 1);
          // Keep the model consistent: drop relationships touching the dataset.
          if (removed && model.relationships) {
            model.relationships = model.relationships.filter(
              (rel) => rel.from !== removed.name && rel.to !== removed.name,
            );
          }
        });
        set((state) => {
          state.selection = isOntologyDoc(state.doc) ? { kind: 'ontology' } : { kind: 'model' };
        });
      },

      addField: (datasetIndex) => {
        let newIndex = -1;
        mutateModel((model) => {
          const dataset = model.datasets[datasetIndex];
          if (!dataset) return;
          dataset.fields ??= [];
          dataset.fields.push(createField(`field_${dataset.fields.length + 1}`));
          newIndex = dataset.fields.length - 1;
        });
        set((state) => {
          if (newIndex >= 0) state.selection = { kind: 'field', datasetIndex, fieldIndex: newIndex };
        });
        return newIndex;
      },

      updateField: (datasetIndex, fieldIndex, patch) =>
        mutateModel((model) => {
          const field = model.datasets[datasetIndex]?.fields?.[fieldIndex];
          if (field) Object.assign(field, patch);
        }),

      deleteField: (datasetIndex, fieldIndex) => {
        mutateModel((model) => {
          model.datasets[datasetIndex]?.fields?.splice(fieldIndex, 1);
        });
        set((state) => {
          state.selection = { kind: 'dataset', datasetIndex };
        });
      },

      addMetric: () => {
        let newIndex = -1;
        mutateModel((model) => {
          model.metrics ??= [];
          model.metrics.push(createMetric(`metric_${model.metrics.length + 1}`));
          newIndex = model.metrics.length - 1;
        });
        set((state) => {
          if (newIndex >= 0) state.selection = { kind: 'metric', metricIndex: newIndex };
        });
        return newIndex;
      },

      updateMetric: (index, patch) =>
        mutateModel((model) => {
          const metric = model.metrics?.[index];
          if (metric) Object.assign(metric, patch);
        }),

      deleteMetric: (index) => {
        mutateModel((model) => {
          model.metrics?.splice(index, 1);
        });
        set((state) => {
          state.selection = isOntologyDoc(state.doc) ? { kind: 'ontology' } : { kind: 'model' };
        });
      },

      addRelationship: (partial) => {
        let newIndex = -1;
        mutateModel((model) => {
          model.relationships ??= [];
          const from = partial?.from ?? model.datasets[0]?.name ?? '';
          const to = partial?.to ?? model.datasets[1]?.name ?? model.datasets[0]?.name ?? '';
          model.relationships.push({ ...createRelationship(from, to), ...partial });
          newIndex = model.relationships.length - 1;
        });
        set((state) => {
          if (newIndex >= 0)
            state.selection = { kind: 'relationship', relationshipIndex: newIndex };
        });
        return newIndex;
      },

      updateRelationship: (index, patch) =>
        mutateModel((model) => {
          const rel = model.relationships?.[index];
          if (rel) Object.assign(rel, patch);
        }),

      deleteRelationship: (index) => {
        mutateModel((model) => {
          model.relationships?.splice(index, 1);
        });
        set((state) => {
          state.selection = isOntologyDoc(state.doc) ? { kind: 'ontology' } : { kind: 'model' };
        });
      },

      // ---- ontology: document meta ----
      updateOntologyDoc: (patch) =>
        set((state) => {
          const doc = state.doc;
          if (!doc || !isOntologyDoc(doc)) return;
          Object.assign(doc, patch);
          state.dirty = true;
        }),

      // ---- ontology: concepts ----
      addConcept: () => {
        let newIndex = -1;
        mutateOntology((components) => {
          components.push(createOntologyComponent(`Concept_${components.length + 1}`));
          newIndex = components.length - 1;
        });
        set((state) => {
          if (newIndex >= 0) state.selection = { kind: 'concept', componentIndex: newIndex };
        });
        return newIndex;
      },

      updateComponent: (componentIndex, patch) =>
        mutateOntology((components) => {
          const component = components[componentIndex];
          if (component) Object.assign(component, patch);
        }),

      updateConcept: (componentIndex, patch) =>
        mutateOntology((components) => {
          const component = components[componentIndex];
          if (component?.concept) Object.assign(component.concept, patch);
        }),

      deleteConcept: (componentIndex) => {
        mutateOntology((components) => {
          components.splice(componentIndex, 1);
        });
        set((state) => {
          state.selection = { kind: 'ontology' };
        });
      },

      // ---- ontology: relationships ----
      addOntologyRelationship: (componentIndex, options) => {
        let newIndex = -1;
        mutateOntology((components) => {
          const component = components[componentIndex];
          if (!component) return;
          component.relationships ??= [];
          const owner = component.concept?.name ?? 'Concept';
          const target = options?.targetConcept;
          if (target) {
            const name = `${owner}_${target}`;
            const derivedBy =
              options?.sourceField && options?.targetField
                ? `${owner}.${options.sourceField} == ${target}.${options.targetField}`
                : undefined;
            component.relationships.push(
              createOntologyRelationship(name, owner, target, derivedBy),
            );
          } else {
            component.relationships.push(
              createOntologyRelationship(
                `relationship_${component.relationships.length + 1}`,
                owner,
              ),
            );
          }
          newIndex = component.relationships.length - 1;
        });
        set((state) => {
          if (newIndex >= 0)
            state.selection = {
              kind: 'ontology-relationship',
              componentIndex,
              relationshipIndex: newIndex,
            };
        });
        return newIndex;
      },

      updateOntologyRelationship: (componentIndex, relationshipIndex, patch) =>
        mutateOntology((components) => {
          const rel = components[componentIndex]?.relationships?.[relationshipIndex];
          if (rel) Object.assign(rel, patch);
        }),

      deleteOntologyRelationship: (componentIndex, relationshipIndex) => {
        mutateOntology((components) => {
          components[componentIndex]?.relationships?.splice(relationshipIndex, 1);
        });
        set((state) => {
          state.selection = { kind: 'concept', componentIndex };
        });
      },

      // ---- ontology: concept mappings ----
      addConceptMapping: (mapIndex = 0) => {
        let newIndex = -1;
        mutateConceptMappings(mapIndex, (mappings) => {
          mappings.push(createConceptMapping());
          newIndex = mappings.length - 1;
        });
        set((state) => {
          if (newIndex >= 0)
            state.selection = { kind: 'concept-mapping', mapIndex, conceptMappingIndex: newIndex };
        });
        return newIndex;
      },

      updateConceptMapping: (mapIndex, conceptMappingIndex, patch) =>
        mutateConceptMappings(mapIndex, (mappings) => {
          const cm = mappings[conceptMappingIndex];
          if (cm) Object.assign(cm, patch);
        }),

      deleteConceptMapping: (mapIndex, conceptMappingIndex) => {
        mutateConceptMappings(mapIndex, (mappings) => {
          mappings.splice(conceptMappingIndex, 1);
        });
        set((state) => {
          state.selection = { kind: 'ontology' };
        });
      },
    };
  }),
);

/** Selector: live diagnostics for the whole document (memoization done by callers). */
export function selectDiagnostics(state: EditorState): Diagnostic[] {
  return state.doc ? validate(state.doc) : [];
}
