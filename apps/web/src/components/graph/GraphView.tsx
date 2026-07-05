import { PButton } from '@porsche-design-system/components-react';
import { validate } from '@osi-editor/osi-schema';
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getActiveModel,
  getOntologyComponents,
  isOntologyDoc,
  useEditorStore,
} from '../../store/editorStore.js';
import { SelectionDetail } from '../editor/SelectionDetail.js';
import { ConceptNode } from './ConceptNode.js';
import { GraphEmptyState } from './GraphEmptyState.js';
import { GraphToolbar } from './GraphToolbar.js';
import {
  buildMappingLinks,
  buildOntologyGraphModel,
  buildSemanticEdges,
  conceptNames,
  conceptNodeId,
  datasetLanePosition,
  datasetNodeId,
  gridPosition,
  reconcilePositions,
  type ConceptAttribute,
} from './ontologyGraph.js';

/** Custom node types for the ontology layer (expandable concept nodes). */
const ontologyNodeTypes = { concept: ConceptNode };

const noop = () => {};

/**
 * Ghost nodes for concepts that relationships reference but the document does not
 * declare (e.g. `Example_Flight`). Rendered dashed and non-selectable so every
 * relationship still has a target node to connect to.
 */
function referencedConceptNodes(
  referenced: Set<string>,
  positions: Map<string, Node['position']>,
  startIndex: number,
): Node[] {
  return [...referenced].map((name, i) => {
    const id = conceptNodeId(name);
    return {
      id,
      type: 'concept',
      position: positions.get(id) ?? gridPosition(startIndex + i),
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

  // Reconcile nodes from datasets, preserving user-dragged positions by name.
  useEffect(() => {
    if (!model) {
      setNodes([]);
      return;
    }
    setNodes((prev) => {
      const selectedDatasetName =
        selection?.kind === 'dataset' ? model.datasets[selection.datasetIndex]?.name : undefined;
      const positionFor = reconcilePositions(prev);
      return model.datasets.map((dataset, index) => ({
        id: dataset.name,
        position: positionFor(dataset.name, index),
        data: { label: dataset.name },
        selected: dataset.name === selectedDatasetName,
      }));
    });
  }, [model, selection]);

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
  // Collapsed concept node ids. Tracking *collapsed* (not expanded) makes concepts
  // default to expanded with no seeding. Keyed by stable `concept:<name>` id so the
  // set survives model reconciliation and view switches, like dragged positions.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggleExpand = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
      const nextNodes: Node[] = components.map((comp, index) => {
        const name = comp?.concept?.name ?? `concept_${index + 1}`;
        const id = conceptNodeId(name);
        const type = comp?.concept?.type;
        return {
          id,
          type: 'concept',
          position: positions.get(id) ?? gridPosition(index),
          data: {
            label: type ? `${name} (${type})` : name,
            attributes: ontModel.attributesByConceptId.get(id) ?? [],
            expanded: !collapsed.has(id),
            onToggleExpand: () => toggleExpand(id),
            onSelectAttribute: selectAttribute,
          },
          selected: selection?.kind === 'concept' && selection.componentIndex === index,
        };
      });
      let extraIndex = components.length;
      if (showMappings) {
        const known = conceptNames(components);
        const { datasetNames } = buildMappingLinks(doc, activeMapIndex, known);
        datasetNames.forEach((dsName, i) => {
          const id = datasetNodeId(dsName);
          nextNodes.push({
            id,
            position: positions.get(id) ?? gridPosition(components.length + i),
            data: { label: dsName },
            className: 'osi-mapped-dataset-node',
            style: {
              border: '1px dashed var(--p-color-border, #999)',
              borderRadius: 6,
              opacity: 0.85,
            },
          });
        });
        extraIndex += datasetNames.length;
      }
      nextNodes.push(
        ...referencedConceptNodes(ontModel.referencedConcepts, positions, extraIndex),
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

      const conceptNodes: Node[] = components.map((comp, index) => {
        const name = comp?.concept?.name ?? `concept_${index + 1}`;
        const id = conceptNodeId(name);
        const type = comp?.concept?.type;
        return {
          id,
          type: 'concept',
          position: positions.get(id) ?? gridPosition(index),
          data: {
            label: type ? `${name} (${type})` : name,
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
          position: positions.get(id) ?? datasetLanePosition(index),
          data: { label: dataset.name },
          selected: dataset.name === selectedDatasetName,
          style: {
            border: mapped.has(dataset.name)
              ? '1.5px solid var(--p-color-state-focus, #6d3ad6)'
              : '1px solid var(--color-border, #ccc)',
            borderRadius: 8,
            background: 'var(--color-surface, #fff)',
          },
        };
      });

      const ghostNodes = referencedConceptNodes(
        ontModel.referencedConcepts,
        positions,
        components.length,
      );

      return [...conceptNodes, ...ghostNodes, ...datasetNodes];
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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      fitView
    >
      <Background />
      <Controls />
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
      nodes={ontNodes}
      edges={ontEdges}
      nodeTypes={ontologyNodeTypes}
      onNodesChange={onOntNodesChange}
      onConnect={onOntConnect}
      onNodeClick={onOntNodeClick}
      onEdgeClick={onOntEdgeClick}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );

  const unifiedFlow = (
    <ReactFlow
      nodes={unifiedNodes}
      edges={unifiedEdges}
      nodeTypes={ontologyNodeTypes}
      onNodesChange={onUnifiedNodesChange}
      onConnect={onUnifiedConnect}
      onNodeClick={onUnifiedNodeClick}
      onEdgeClick={onUnifiedEdgeClick}
      fitView
    >
      <Background />
      <Controls />
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
