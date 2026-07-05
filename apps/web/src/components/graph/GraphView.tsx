import { PButton } from '@porsche-design-system/components-react';
import { validate } from '@osi-editor/osi-schema';
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowState,
  ViewportPortal,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getActiveModel,
  getOntologyComponents,
  isOntologyDoc,
  useEditorStore,
} from '../../store/editorStore.js';
import { SelectionDetail } from '../editor/SelectionDetail.js';
import { ConceptNode } from './ConceptNode.js';
import { DatasetNode } from './DatasetNode.js';
import { GraphEmptyState } from './GraphEmptyState.js';
import { GraphToolbar } from './GraphToolbar.js';
import { MetricNode } from './MetricNode.js';
import {
  arrangeBoxes,
  buildMappingLinks,
  buildMetricRows,
  buildOntologyGraphModel,
  buildSemanticEdges,
  computeRegionRects,
  conceptNames,
  conceptNodeId,
  datasetFieldsById,
  datasetNodeId,
  gridPosition,
  layoutEstimatedBands,
  metricNodeId,
  type ConceptAttribute,
  type DomainNodeBounds,
  type EstimatedItem,
  type FieldRow,
  type LayoutBox,
  type RegionRect,
} from './ontologyGraph.js';

/** Custom node types for the ontology layer (expandable concept nodes). */
const ontologyNodeTypes = { concept: ConceptNode, dataset: DatasetNode, metric: MetricNode };
/** Custom node types for the semantic-model layer (dataset + metric nodes). */
const semanticNodeTypes = { dataset: DatasetNode, metric: MetricNode };

/**
 * Default edge routing: orthogonal `smoothstep` so connection lines run in clear
 * horizontal/vertical segments (with the generous band gutters) instead of bezier
 * curves that cut diagonally across nodes.
 */
const smoothEdges = { type: 'smoothstep' as const };

const noop = () => {};

/** Text of a dataset field row (name + optional detail), used to estimate node width. */
const fieldRowText = (f: FieldRow): string => (f.detail ? `${f.name} ${f.detail}` : f.name);
/** Text of a concept attribute row (name + value type), used to estimate node width. */
const attrRowText = (a: ConceptAttribute): string => `${a.name} ${a.valueType}`;

/** Band classifier for the semantic-model layer: datasets above metrics. */
const semanticBandOf = (n: Node): number => (n.type === 'metric' ? 1 : 0);
/** Band classifier for the ontology layer: concepts above mapped-datasets / ghosts. */
const ontologyBandOf = (n: Node): number =>
  n.type === 'concept' && !(n.data as { referenced?: boolean } | undefined)?.referenced ? 0 : 1;
/** Band classifier for the unified layer: concepts (+ ghosts) above datasets above metrics. */
const unifiedBandOf = (n: Node): number =>
  n.type === 'concept' ? 0 : n.type === 'metric' ? 2 : 1;

/** Build layout boxes from the nodes' real measured sizes (falls back to any known size). */
function measuredBoxes(nodes: Node[], bandOf: (n: Node) => number): LayoutBox[] {
  return nodes.map((n) => ({
    id: n.id,
    width: n.measured?.width ?? n.width ?? 200,
    height: n.measured?.height ?? n.height ?? 80,
    band: bandOf(n),
  }));
}

/** The two domains a node can belong to, each drawn as a labelled background region. */
type Domain = 'ontology' | 'semantic';

/** Which domain region a node belongs to. Concepts (incl. ghosts) are ontology; everything else semantic. */
const domainOf = (type: string | undefined): Domain =>
  type === 'concept' ? 'ontology' : 'semantic';

/** Label + colour for each domain's region box, keyed to the concept/dataset accents. */
const REGION_META: Record<Domain, { label: string; color: string }> = {
  ontology: { label: 'Ontology', color: '#2b56d4' },
  semantic: { label: 'Semantic model', color: '#0d9488' },
};

/**
 * Background region boxes: one tinted, labelled rectangle enclosing each domain's
 * nodes (Ontology = cobalt, Semantic model = teal). Subscribes to the live measured
 * node bounds via `useStore` so the boxes track drags and re-arranges, and renders
 * inside `<ViewportPortal>` so they pan/zoom with the canvas, behind the nodes.
 */
function BandRegions() {
  const rects = useStore(regionSelector, regionsEqual);
  if (rects.length === 0) return null;
  return (
    <ViewportPortal>
      {rects.map((r) => {
        const meta = REGION_META[r.domain as Domain] ?? REGION_META.semantic;
        return (
          <div
            key={r.domain}
            style={{
              position: 'absolute',
              transform: `translate(${r.x}px, ${r.y}px)`,
              width: r.width,
              height: r.height,
              // Behind the nodes and edges; never intercepts pointer events.
              zIndex: -1,
              pointerEvents: 'none',
              borderRadius: 16,
              border: `1px solid ${meta.color}59`,
              background: `${meta.color}0f`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 6,
                left: 14,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: meta.color,
              }}
            >
              {meta.label}
            </span>
          </div>
        );
      })}
    </ViewportPortal>
  );
}

/** Derive region rectangles from the store's measured node bounds. */
function regionSelector(state: ReactFlowState): RegionRect[] {
  const bounds: DomainNodeBounds[] = [];
  state.nodeLookup.forEach((n) => {
    const width = n.measured?.width ?? 0;
    const height = n.measured?.height ?? 0;
    bounds.push({
      domain: domainOf(n.type),
      x: n.internals.positionAbsolute.x,
      y: n.internals.positionAbsolute.y,
      width,
      height,
    });
  });
  return computeRegionRects(bounds);
}

/** Value-equality for the region-rect list so `useStore` only re-renders on real geometry changes. */
function regionsEqual(a: RegionRect[], b: RegionRect[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((r, i) => {
    const o = b[i]!;
    return (
      r.domain === o.domain &&
      r.x === o.x &&
      r.y === o.y &&
      r.width === o.width &&
      r.height === o.height
    );
  });
}

/**
 * In-canvas "Arrange" control. Lives inside `<ReactFlow>` so it can read each
 * node's real *measured* size and repack them into non-overlapping bands — the
 * reliable fix the estimated initial layout can only approximate. Also runs the
 * arrange once, automatically, the first time a layer's nodes are measured; after
 * that it never overrides the user's positions (tracked per layer via
 * `arrangedLayers`) — the button re-runs it on demand.
 */
function ArrangeControl({
  bandOf,
  setNodes,
  layerKey,
  arrangedLayers,
}: {
  bandOf: (n: Node) => number;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  layerKey: string;
  arrangedLayers: RefObject<Set<string>>;
}) {
  const { getNodes, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const arrange = useCallback(() => {
    const positions = arrangeBoxes(measuredBoxes(getNodes(), bandOf));
    if (positions.size === 0) return;
    setNodes((prev) =>
      prev.map((n) => {
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    );
    // Reframe after the DOM settles so the freshly arranged graph is in view.
    requestAnimationFrame(() => fitView({ duration: 200 }));
  }, [getNodes, bandOf, setNodes, fitView]);

  useEffect(() => {
    if (!nodesInitialized || arrangedLayers.current.has(layerKey)) return;
    if (getNodes().length === 0) return;
    arrangedLayers.current.add(layerKey);
    arrange();
  }, [nodesInitialized, layerKey, arrangedLayers, getNodes, arrange]);

  return (
    <Panel position="top-right">
      <PButton type="button" compact icon="none" variant="secondary" onClick={arrange}>
        Arrange
      </PButton>
    </Panel>
  );
}

/**
 * Ghost nodes for concepts that relationships reference but the document does not
 * declare (e.g. `Example_Flight`). Rendered dashed and non-selectable so every
 * relationship still has a target node to connect to.
 */
function referencedConceptNodes(
  referenced: Set<string>,
  positions: Map<string, Node['position']>,
  computed: Map<string, Node['position']>,
  startIndex: number,
): Node[] {
  return [...referenced].map((name, i) => {
    const id = conceptNodeId(name);
    return {
      id,
      type: 'concept',
      position: positions.get(id) ?? computed.get(id) ?? gridPosition(startIndex + i),
      selectable: false,
      data: {
        label: name,
        attributes: [],
        expanded: false,
        referenced: true,
        onToggleExpand: noop,
        onSelectAttribute: noop,
      },
    };
  });
}

/**
 * ERD-style graph (React Flow): dataset nodes and relationship edges derived
 * from the store. Supports drag-to-connect to create relationships (7.3) and
 * two-way selection sync with the detail form (7.4). Because nodes/edges are
 * derived from the model, deleting a dataset removes its node and edges (7.5).
 *
 * For ontology documents a second layer renders concept nodes and ontology
 * relationships, with an optional overlay of concept→dataset mapping links.
 */
export function GraphView() {
  const doc = useEditorStore((s) => s.doc);
  const activeModelIndex = useEditorStore((s) => s.activeModelIndex);
  const activeMapIndex = useEditorStore((s) => s.activeMapIndex);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const addRelationship = useEditorStore((s) => s.addRelationship);
  const addOntologyRelationship = useEditorStore((s) => s.addOntologyRelationship);
  // Bumped only on new-document load/create (not edits). Used to re-enable the
  // one-shot measured auto-arrange for a freshly loaded doc's nodes.
  const docLoadId = useEditorStore((s) => s.docLoadId);

  // Expand/collapse state shared by concept and dataset nodes across all layers.
  // Tracking *collapsed* (not expanded) makes nodes default to expanded with no
  // seeding. Keyed by stable node id (`concept:<name>` / `dataset:<name>`) so the
  // set survives model reconciliation and view switches, like dragged positions.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  // Layers whose nodes have already been auto-arranged (measured) once. Persists
  // across layer switches so switching back never re-arranges over the user's
  // manual positions; the "Arrange" button re-runs it explicitly.
  const arrangedLayers = useRef<Set<string>>(new Set());
  // A genuinely new document (load/create) has no user-placed nodes, so let its
  // nodes auto-arrange once again. Keyed on docLoadId — NOT `doc`, which immer
  // replaces on every edit (that would clobber drags on each keystroke).
  useEffect(() => {
    arrangedLayers.current = new Set();
  }, [docLoadId]);
  const toggleExpand = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectField = useCallback(
    (field: FieldRow) =>
      select({ kind: 'field', datasetIndex: field.datasetIndex, fieldIndex: field.fieldIndex }),
    [select],
  );

  const isOnt = isOntologyDoc(doc);
  const model = getActiveModel(doc, activeModelIndex, activeMapIndex);
  const components = getOntologyComponents(doc);
  const diagnostics = useMemo(() => (doc ? validate(doc) : []), [doc]);

  const [layer, setLayer] = useState<'unified' | 'semantic-model' | 'ontology'>(() =>
    isOnt ? 'unified' : 'semantic-model',
  );
  const [showMappings, setShowMappings] = useState(false);

  // ---- semantic-model layer (unchanged from the ERD view) ----
  const [nodes, setNodes] = useState<Node[]>([]);

  // Reconcile nodes from datasets (with field rows) plus metric nodes, preserving
  // user-dragged positions by id. Dataset expand state is keyed by `datasetNodeId`
  // so it persists across reconciliation and layer switches, like dragged positions.
  useEffect(() => {
    if (!model) {
      setNodes([]);
      return;
    }
    setNodes((prev) => {
      const positions = new Map(prev.map((n) => [n.id, n.position]));
      const selectedDatasetName =
        selection?.kind === 'dataset' ? model.datasets[selection.datasetIndex]?.name : undefined;
      const fieldsById = datasetFieldsById(model);
      const metricRows = buildMetricRows(model);
      // Size-aware bands: datasets (sized by their expanded field rows) above a
      // metric band. Only supplies positions for ids without a remembered one; the
      // measured "Arrange" action tightens this once real node sizes are known.
      const computed = layoutEstimatedBands([
        model.datasets.map((dataset): EstimatedItem => {
          const fields = fieldsById.get(dataset.name) ?? [];
          const expanded = !collapsed.has(datasetNodeId(dataset.name));
          return {
            id: dataset.name,
            rows: (expanded ? fields.length : 0) + (dataset.description ? 2 : 0),
            texts: [dataset.name, dataset.description ?? '', ...(expanded ? fields.map(fieldRowText) : [])],
          };
        }),
        metricRows.map((metric): EstimatedItem => ({
          id: metricNodeId(metric.name),
          rows: metric.description ? 2 : 0,
          texts: [metric.name],
        })),
      ]);
      const datasetNodes: Node[] = model.datasets.map((dataset, index) => {
        const expandKey = datasetNodeId(dataset.name);
        return {
          id: dataset.name,
          type: 'dataset',
          position: positions.get(dataset.name) ?? computed.get(dataset.name) ?? gridPosition(index),
          data: {
            label: dataset.name,
            description: dataset.description,
            fields: fieldsById.get(dataset.name) ?? [],
            expanded: !collapsed.has(expandKey),
            onToggleExpand: () => toggleExpand(expandKey),
            onSelectField: selectField,
          },
          selected: dataset.name === selectedDatasetName,
        };
      });
      const metricNodes: Node[] = metricRows.map((metric, index) => {
        const id = metricNodeId(metric.name);
        return {
          id,
          type: 'metric',
          position: positions.get(id) ?? computed.get(id) ?? gridPosition(index),
          data: { metric },
          selected: selection?.kind === 'metric' && selection.metricIndex === metric.metricIndex,
        };
      });
      return [...datasetNodes, ...metricNodes];
    });
  }, [model, selection, collapsed, toggleExpand, selectField]);

  const edges = useMemo<Edge[]>(
    () => (model ? buildSemanticEdges(model, selection) : []),
    [model, selection],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // Creates the relationship and selects it; the detail panel then prompts
      // for its key columns (task 7.3).
      addRelationship({ from: connection.source, to: connection.target });
    },
    [addRelationship],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.id.startsWith('metric:')) {
        const name = node.id.slice('metric:'.length);
        const metricIndex = model?.metrics?.findIndex((m) => m.name === name) ?? -1;
        if (metricIndex >= 0) select({ kind: 'metric', metricIndex });
        return;
      }
      const datasetIndex = model?.datasets.findIndex((d) => d.name === node.id) ?? -1;
      if (datasetIndex >= 0) select({ kind: 'dataset', datasetIndex });
    },
    [model, select],
  );

  const onEdgeClick = useCallback(
    (_: unknown, edge: Edge) => {
      const relationshipIndex = Number(edge.id.replace('rel-', ''));
      if (!Number.isNaN(relationshipIndex)) select({ kind: 'relationship', relationshipIndex });
    },
    [select],
  );

  // ---- ontology layer ----
  const [ontNodes, setOntNodes] = useState<Node[]>([]);

  const selectAttribute = useCallback(
    (attr: ConceptAttribute) => {
      select({
        kind: 'ontology-relationship',
        componentIndex: attr.componentIndex,
        relationshipIndex: attr.relationshipIndex,
      });
    },
    [select],
  );

  // Full ontology graph: every relationship becomes either an edge (roles that
  // resolve to concepts) or an attribute sub-element (roles to value types).
  const ontModel = useMemo(
    () =>
      isOnt
        ? buildOntologyGraphModel(components, selection)
        : {
            edges: [],
            attributesByConceptId: new Map<string, ConceptAttribute[]>(),
            referencedConcepts: new Set<string>(),
          },
    [isOnt, components, selection],
  );

  // Reconcile concept nodes (and, when requested, mapped dataset nodes),
  // preserving user-dragged positions by id.
  useEffect(() => {
    if (!isOnt) {
      setOntNodes([]);
      return;
    }
    setOntNodes((prev) => {
      const positions = new Map(prev.map((n) => [n.id, n.position]));
      const known = conceptNames(components);
      const mappedNames = showMappings
        ? buildMappingLinks(doc, activeMapIndex, known).datasetNames
        : [];
      // Concepts (sized by their attribute rows) form the top band; mapped
      // datasets and ghost concepts sit in a band below, clear of the concepts.
      const computed = layoutEstimatedBands([
        components.map((comp, index): EstimatedItem => {
          const name = comp?.concept?.name ?? `concept_${index + 1}`;
          const id = conceptNodeId(name);
          const type = comp?.concept?.type;
          const description = comp?.concept?.description ?? comp?.description;
          const attrs = ontModel.attributesByConceptId.get(id) ?? [];
          const expanded = !collapsed.has(id);
          return {
            id,
            rows: (expanded ? attrs.length : 0) + (description ? 2 : 0),
            texts: [
              type ? `${name} (${type})` : name,
              description ?? '',
              ...(expanded ? attrs.map(attrRowText) : []),
            ],
          };
        }),
        [
          ...mappedNames.map((n): EstimatedItem => ({ id: datasetNodeId(n), texts: [n] })),
          ...[...ontModel.referencedConcepts].map((n): EstimatedItem => ({
            id: conceptNodeId(n),
            texts: [n],
          })),
        ],
      ]);

      const nextNodes: Node[] = components.map((comp, index) => {
        const name = comp?.concept?.name ?? `concept_${index + 1}`;
        const id = conceptNodeId(name);
        const type = comp?.concept?.type;
        return {
          id,
          type: 'concept',
          position: positions.get(id) ?? computed.get(id) ?? gridPosition(index),
          data: {
            label: type ? `${name} (${type})` : name,
            description: comp?.concept?.description ?? comp?.description,
            attributes: ontModel.attributesByConceptId.get(id) ?? [],
            expanded: !collapsed.has(id),
            onToggleExpand: () => toggleExpand(id),
            onSelectAttribute: selectAttribute,
          },
          selected: selection?.kind === 'concept' && selection.componentIndex === index,
        };
      });
      let extraIndex = components.length;
      mappedNames.forEach((dsName, i) => {
        const id = datasetNodeId(dsName);
        nextNodes.push({
          id,
          position: positions.get(id) ?? computed.get(id) ?? gridPosition(components.length + i),
          data: { label: dsName },
          className: 'osi-mapped-dataset-node',
          style: {
            border: '1px dashed var(--p-color-border, #999)',
            borderRadius: 6,
            opacity: 0.85,
          },
        });
      });
      extraIndex += mappedNames.length;
      nextNodes.push(
        ...referencedConceptNodes(ontModel.referencedConcepts, positions, computed, extraIndex),
      );
      return nextNodes;
    });
  }, [
    isOnt,
    components,
    selection,
    showMappings,
    doc,
    activeMapIndex,
    ontModel,
    collapsed,
    toggleExpand,
    selectAttribute,
  ]);

  const ontEdges = useMemo<Edge[]>(() => {
    if (!isOnt) return [];
    const conceptEdges = ontModel.edges;
    if (!showMappings) return conceptEdges;
    const known = conceptNames(components);
    const { links } = buildMappingLinks(doc, activeMapIndex, known);
    const mapEdges: Edge[] = links.map((link, i) => ({
      id: `map-${i}-${link.dataset}`,
      source: conceptNodeId(link.concept),
      target: datasetNodeId(link.dataset),
      label: 'maps to',
      animated: false,
      style: { strokeDasharray: '6 4' },
    }));
    return [...conceptEdges, ...mapEdges];
  }, [isOnt, ontModel, components, showMappings, doc, activeMapIndex]);

  const onOntNodesChange = useCallback((changes: NodeChange[]) => {
    setOntNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const onOntConnect = useCallback(
    (connection: Connection) => {
      const source = connection.source ?? '';
      const prefix = 'concept:';
      if (!source.startsWith(prefix)) return;
      const sourceName = source.slice(prefix.length);
      const componentIndex = components.findIndex((c) => c?.concept?.name === sourceName);
      // Creates the ontology relationship and selects it for editing (roles are
      // filled in via the detail panel).
      if (componentIndex >= 0) addOntologyRelationship(componentIndex);
    },
    [components, addOntologyRelationship],
  );

  const onOntNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const prefix = 'concept:';
      if (!node.id.startsWith(prefix)) return;
      const name = node.id.slice(prefix.length);
      const componentIndex = components.findIndex((c) => c?.concept?.name === name);
      if (componentIndex >= 0) select({ kind: 'concept', componentIndex });
    },
    [components, select],
  );

  const onOntEdgeClick = useCallback(
    (_: unknown, edge: Edge) => {
      const match = /^orel-(\d+)-(\d+)-\d+$/.exec(edge.id);
      if (!match) return;
      select({
        kind: 'ontology-relationship',
        componentIndex: Number(match[1]),
        relationshipIndex: Number(match[2]),
      });
    },
    [select],
  );

  // ---- unified layer (ontology linked to semantics, in one canvas) ----
  const [unifiedNodes, setUnifiedNodes] = useState<Node[]>([]);

  // Concept nodes (top lane) + every dataset node (bottom lane). Concept ids are
  // `concept:<name>`, dataset ids `dataset:<name>`, so the two never collide and
  // positions/collapse state persist by id across reconciliation and switches.
  useEffect(() => {
    if (!isOnt) {
      setUnifiedNodes([]);
      return;
    }
    setUnifiedNodes((prev) => {
      const positions = new Map(prev.map((n) => [n.id, n.position]));
      const known = conceptNames(components);
      const { datasetNames } = buildMappingLinks(doc, activeMapIndex, known);
      const mapped = new Set(datasetNames);

      const fieldsById = model
        ? datasetFieldsById(model, datasetNodeId)
        : new Map<string, FieldRow[]>();
      const metricRows = buildMetricRows(model ?? { metrics: [] });

      // Three flexing bands: concepts (+ ghost concepts) above datasets above
      // metrics, each band shelf-packed by node size so a tall/wide node in one
      // band never overlaps an adjacent band. Only fills ids without a remembered
      // position; the measured "Arrange" action tightens it with real sizes.
      const computed = layoutEstimatedBands([
        [
          ...components.map((comp, index): EstimatedItem => {
            const name = comp?.concept?.name ?? `concept_${index + 1}`;
            const id = conceptNodeId(name);
            const type = comp?.concept?.type;
            const description = comp?.concept?.description ?? comp?.description;
            const attrs = ontModel.attributesByConceptId.get(id) ?? [];
            const expanded = !collapsed.has(id);
            return {
              id,
              rows: (expanded ? attrs.length : 0) + (description ? 2 : 0),
              texts: [
                type ? `${name} (${type})` : name,
                description ?? '',
                ...(expanded ? attrs.map(attrRowText) : []),
              ],
            };
          }),
          ...[...ontModel.referencedConcepts].map((n): EstimatedItem => ({
            id: conceptNodeId(n),
            texts: [n],
          })),
        ],
        (model?.datasets ?? []).map((dataset): EstimatedItem => {
          const id = datasetNodeId(dataset.name);
          const fields = fieldsById.get(id) ?? [];
          const expanded = !collapsed.has(id);
          return {
            id,
            rows: (expanded ? fields.length : 0) + (dataset.description ? 2 : 0),
            texts: [
              dataset.name,
              dataset.description ?? '',
              ...(expanded ? fields.map(fieldRowText) : []),
            ],
          };
        }),
        metricRows.map((metric): EstimatedItem => ({
          id: metricNodeId(metric.name),
          rows: metric.description ? 2 : 0,
          texts: [metric.name],
        })),
      ]);

      const conceptNodes: Node[] = components.map((comp, index) => {
        const name = comp?.concept?.name ?? `concept_${index + 1}`;
        const id = conceptNodeId(name);
        const type = comp?.concept?.type;
        return {
          id,
          type: 'concept',
          position: positions.get(id) ?? computed.get(id) ?? gridPosition(index),
          data: {
            label: type ? `${name} (${type})` : name,
            description: comp?.concept?.description ?? comp?.description,
            attributes: ontModel.attributesByConceptId.get(id) ?? [],
            expanded: !collapsed.has(id),
            onToggleExpand: () => toggleExpand(id),
            onSelectAttribute: selectAttribute,
          },
          selected: selection?.kind === 'concept' && selection.componentIndex === index,
        };
      });

      const selectedDatasetName =
        selection?.kind === 'dataset' ? model?.datasets[selection.datasetIndex]?.name : undefined;
      const datasetNodes: Node[] = (model?.datasets ?? []).map((dataset, index) => {
        const id = datasetNodeId(dataset.name);
        return {
          id,
          type: 'dataset',
          position: positions.get(id) ?? computed.get(id) ?? gridPosition(index),
          data: {
            label: dataset.name,
            description: dataset.description,
            fields: fieldsById.get(id) ?? [],
            expanded: !collapsed.has(id),
            onToggleExpand: () => toggleExpand(id),
            onSelectField: selectField,
          },
          selected: dataset.name === selectedDatasetName,
          // Ring (outline, not border) marks a dataset that a concept maps to,
          // without conflicting with the custom node's own border.
          style: mapped.has(dataset.name)
            ? { outline: '2px solid var(--p-color-state-focus, #6d3ad6)', borderRadius: 8 }
            : undefined,
        };
      });

      const metricNodes: Node[] = metricRows.map((metric, index) => {
        const id = metricNodeId(metric.name);
        return {
          id,
          type: 'metric',
          position: positions.get(id) ?? computed.get(id) ?? gridPosition(index),
          data: { metric },
          selected: selection?.kind === 'metric' && selection.metricIndex === metric.metricIndex,
        };
      });

      const ghostNodes = referencedConceptNodes(
        ontModel.referencedConcepts,
        positions,
        computed,
        components.length,
      );

      return [...conceptNodes, ...ghostNodes, ...datasetNodes, ...metricNodes];
    });
  }, [
    isOnt,
    components,
    model,
    selection,
    doc,
    activeMapIndex,
    ontModel,
    collapsed,
    toggleExpand,
    selectAttribute,
    selectField,
  ]);

  // All three connection kinds at once, visually distinct: ontology relationships
  // (solid cobalt), concept→dataset mappings (violet dotted), dataset joins (grey
  // dashed).
  const unifiedEdges = useMemo<Edge[]>(() => {
    if (!isOnt) return [];
    const ontologyEdges = ontModel.edges.map((e) => ({
      ...e,
      style: { stroke: '#2b56d4', strokeWidth: 2 },
    }));
    const known = conceptNames(components);
    const { links } = buildMappingLinks(doc, activeMapIndex, known);
    const mapEdges: Edge[] = links.map((link, i) => ({
      id: `map-${i}-${link.dataset}`,
      source: conceptNodeId(link.concept),
      target: datasetNodeId(link.dataset),
      label: 'maps to',
      animated: false,
      style: { stroke: '#6d3ad6', strokeWidth: 2, strokeDasharray: '2 5' },
    }));
    const joinEdges: Edge[] = (
      model ? buildSemanticEdges(model, selection, datasetNodeId) : []
    ).map((e) => ({
      ...e,
      animated: false,
      style: { stroke: '#8a97a8', strokeWidth: 2, strokeDasharray: '6 5' },
    }));
    return [...joinEdges, ...mapEdges, ...ontologyEdges];
  }, [isOnt, ontModel, components, doc, activeMapIndex, model, selection]);

  const onUnifiedNodesChange = useCallback((changes: NodeChange[]) => {
    setUnifiedNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const onUnifiedConnect = useCallback(
    (connection: Connection) => {
      const source = connection.source ?? '';
      const target = connection.target ?? '';
      if (source.startsWith('concept:') && target.startsWith('concept:')) {
        const sourceName = source.slice('concept:'.length);
        const componentIndex = components.findIndex((c) => c?.concept?.name === sourceName);
        if (componentIndex >= 0) addOntologyRelationship(componentIndex);
      } else if (source.startsWith('dataset:') && target.startsWith('dataset:')) {
        addRelationship({
          from: source.slice('dataset:'.length),
          to: target.slice('dataset:'.length),
        });
      }
    },
    [components, addOntologyRelationship, addRelationship],
  );

  const onUnifiedNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.id.startsWith('concept:')) {
        const name = node.id.slice('concept:'.length);
        const componentIndex = components.findIndex((c) => c?.concept?.name === name);
        if (componentIndex >= 0) select({ kind: 'concept', componentIndex });
      } else if (node.id.startsWith('dataset:')) {
        const name = node.id.slice('dataset:'.length);
        const datasetIndex = model?.datasets.findIndex((d) => d.name === name) ?? -1;
        if (datasetIndex >= 0) select({ kind: 'dataset', datasetIndex });
      } else if (node.id.startsWith('metric:')) {
        const name = node.id.slice('metric:'.length);
        const metricIndex = model?.metrics?.findIndex((m) => m.name === name) ?? -1;
        if (metricIndex >= 0) select({ kind: 'metric', metricIndex });
      }
    },
    [components, model, select],
  );

  const onUnifiedEdgeClick = useCallback(
    (_: unknown, edge: Edge) => {
      const ont = /^orel-(\d+)-(\d+)-\d+$/.exec(edge.id);
      if (ont) {
        select({
          kind: 'ontology-relationship',
          componentIndex: Number(ont[1]),
          relationshipIndex: Number(ont[2]),
        });
        return;
      }
      const join = /^rel-(\d+)$/.exec(edge.id);
      if (join) select({ kind: 'relationship', relationshipIndex: Number(join[1]) });
    },
    [select],
  );

  const semanticFlow = (
    // `key` forces a remount per layer so returning to a visited layer re-fits the
    // viewport (the fitView-on-init prop only fires on mount); node positions live
    // in parent state keyed by id, so they survive the remount.
    <ReactFlow
      key="semantic"
      nodes={nodes}
      edges={edges}
      nodeTypes={semanticNodeTypes}
      defaultEdgeOptions={smoothEdges}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      fitView
    >
      <Background />
      <Controls />
      <BandRegions />
      <ArrangeControl
        bandOf={semanticBandOf}
        setNodes={setNodes}
        layerKey="semantic"
        arrangedLayers={arrangedLayers}
      />
    </ReactFlow>
  );

  // Non-ontology documents: preserve the existing ERD behavior verbatim.
  if (!isOnt) {
    if (!model) return null;
    if (model.datasets.length === 0) return <GraphEmptyState />;
    return (
      <div className="flex h-full min-h-0">
        <div className="relative min-w-0 flex-1">
          <GraphToolbar layer="semantic-model" />
          {semanticFlow}
        </div>
        <aside className="w-96 shrink-0 overflow-auto border-l border-border bg-surface">
          <SelectionDetail diagnostics={diagnostics} />
        </aside>
      </div>
    );
  }

  const ontologyFlow = (
    <ReactFlow
      key="ontology"
      nodes={ontNodes}
      edges={ontEdges}
      nodeTypes={ontologyNodeTypes}
      defaultEdgeOptions={smoothEdges}
      onNodesChange={onOntNodesChange}
      onConnect={onOntConnect}
      onNodeClick={onOntNodeClick}
      onEdgeClick={onOntEdgeClick}
      fitView
    >
      <Background />
      <Controls />
      <BandRegions />
      <ArrangeControl
        bandOf={ontologyBandOf}
        setNodes={setOntNodes}
        layerKey="ontology"
        arrangedLayers={arrangedLayers}
      />
    </ReactFlow>
  );

  const unifiedFlow = (
    <ReactFlow
      key="unified"
      nodes={unifiedNodes}
      edges={unifiedEdges}
      nodeTypes={ontologyNodeTypes}
      defaultEdgeOptions={smoothEdges}
      onNodesChange={onUnifiedNodesChange}
      onConnect={onUnifiedConnect}
      onNodeClick={onUnifiedNodeClick}
      onEdgeClick={onUnifiedEdgeClick}
      fitView
    >
      <Background />
      <Controls />
      <BandRegions />
      <ArrangeControl
        bandOf={unifiedBandOf}
        setNodes={setUnifiedNodes}
        layerKey="unified"
        arrangedLayers={arrangedLayers}
      />
    </ReactFlow>
  );

  // Ontology documents: layer toggle overlaid on the canvas.
  const hasConcepts = components.length > 0;
  const hasDatasets = !!model && model.datasets.length > 0;
  const unifiedContent =
    hasConcepts || hasDatasets ? unifiedFlow : <GraphEmptyState mode="ontology" />;
  const ontologyContent = hasConcepts ? ontologyFlow : <GraphEmptyState mode="ontology" />;
  const semanticContent = hasDatasets ? semanticFlow : <GraphEmptyState mode="semantic-model" />;
  const currentContent =
    layer === 'unified' ? unifiedContent : layer === 'ontology' ? ontologyContent : semanticContent;

  return (
    <div className="flex h-full min-h-0">
      <div className="relative min-w-0 flex-1">
        <div className="absolute left-2 top-2 z-10 flex gap-2">
          <PButton
            type="button"
            compact
            icon="none"
            variant={layer === 'unified' ? 'primary' : 'secondary'}
            onClick={() => setLayer('unified')}
          >
            Unified
          </PButton>
          <PButton
            type="button"
            compact
            icon="none"
            variant={layer === 'ontology' ? 'primary' : 'secondary'}
            onClick={() => setLayer('ontology')}
          >
            Ontology
          </PButton>
          <PButton
            type="button"
            compact
            icon="none"
            variant={layer === 'semantic-model' ? 'primary' : 'secondary'}
            onClick={() => setLayer('semantic-model')}
          >
            Semantic model
          </PButton>
          {layer === 'ontology' && (
            <PButton
              type="button"
              compact
              icon="none"
              variant={showMappings ? 'primary' : 'secondary'}
              onClick={() => setShowMappings((v) => !v)}
            >
              Show mappings
            </PButton>
          )}
        </div>
        <GraphToolbar layer={layer} />
        {currentContent}
      </div>
      <aside className="w-96 shrink-0 overflow-auto border-l border-border bg-surface">
        <SelectionDetail diagnostics={diagnostics} />
      </aside>
    </div>
  );
}
