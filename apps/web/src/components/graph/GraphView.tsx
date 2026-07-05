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
import { GraphEmptyState } from './GraphEmptyState.js';
import {
  buildMappingLinks,
  buildOntologyEdges,
  conceptNames,
  conceptNodeId,
  datasetNodeId,
  gridPosition,
} from './ontologyGraph.js';

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

  const [layer, setLayer] = useState<'semantic-model' | 'ontology'>(() =>
    isOnt ? 'ontology' : 'semantic-model',
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
      const positions = new Map(prev.map((n) => [n.id, n.position]));
      const selectedDatasetName =
        selection?.kind === 'dataset' ? model.datasets[selection.datasetIndex]?.name : undefined;
      return model.datasets.map((dataset, index) => ({
        id: dataset.name,
        position: positions.get(dataset.name) ?? gridPosition(index),
        data: { label: dataset.name },
        selected: dataset.name === selectedDatasetName,
      }));
    });
  }, [model, selection]);

  const edges = useMemo<Edge[]>(() => {
    if (!model) return [];
    const names = new Set(model.datasets.map((d) => d.name));
    return (model.relationships ?? [])
      .map((rel, index) => ({ rel, index }))
      .filter(({ rel }) => names.has(rel.from) && names.has(rel.to))
      .map(({ rel, index }) => ({
        id: `rel-${index}`,
        source: rel.from,
        target: rel.to,
        label: rel.name,
        animated: true,
        selected: selection?.kind === 'relationship' && selection.relationshipIndex === index,
      }));
  }, [model, selection]);

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
          position: positions.get(id) ?? gridPosition(index),
          data: { label: type ? `${name} (${type})` : name },
          selected: selection?.kind === 'concept' && selection.componentIndex === index,
        };
      });
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
      }
      return nextNodes;
    });
  }, [isOnt, components, selection, showMappings, doc, activeMapIndex]);

  const ontEdges = useMemo<Edge[]>(() => {
    if (!isOnt) return [];
    const conceptEdges = buildOntologyEdges(components, selection);
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
  }, [isOnt, components, selection, showMappings, doc, activeMapIndex]);

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
      const match = /^orel-(\d+)-(\d+)$/.exec(edge.id);
      if (!match) return;
      select({
        kind: 'ontology-relationship',
        componentIndex: Number(match[1]),
        relationshipIndex: Number(match[2]),
      });
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
        <div className="min-w-0 flex-1">{semanticFlow}</div>
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

  // Ontology documents: layer toggle overlaid on the canvas.
  const ontologyContent =
    components.length > 0 ? ontologyFlow : <GraphEmptyState mode="ontology" />;
  const semanticContent =
    model && model.datasets.length > 0 ? semanticFlow : <GraphEmptyState mode="semantic-model" />;

  return (
    <div className="flex h-full min-h-0">
      <div className="relative min-w-0 flex-1">
        <div className="absolute left-2 top-2 z-10 flex gap-2">
          <PButton
            type="button"
            compact
            icon="none"
            variant={layer === 'semantic-model' ? 'primary' : 'secondary'}
            onClick={() => setLayer('semantic-model')}
          >
            Semantic model
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
        {layer === 'ontology' ? ontologyContent : semanticContent}
      </div>
      <aside className="w-96 shrink-0 overflow-auto border-l border-border bg-surface">
        <SelectionDetail diagnostics={diagnostics} />
      </aside>
    </div>
  );
}
