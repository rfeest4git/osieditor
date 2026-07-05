import type { AnyDraftDocument, OntologyComponent } from '@osi-editor/osi-schema';
import type { Edge } from '@xyflow/react';
import type { Selection } from '../../store/editorStore.js';

/** Stable React Flow node id for a concept node. */
export function conceptNodeId(name: string): string {
  return `concept:${name}`;
}

/** Stable React Flow node id for a mapped dataset node. */
export function datasetNodeId(name: string): string {
  return `dataset:${name}`;
}

/** Simple grid layout used for initial node placement (mirrors the ERD view). */
export function gridPosition(index: number): { x: number; y: number } {
  return { x: (index % 4) * 240 + 40, y: Math.floor(index / 4) * 160 + 40 };
}

/** Concept names that exist as nodes in the current ontology graph. */
export function conceptNames(components: OntologyComponent[]): Set<string> {
  return new Set(
    components.map((c) => c?.concept?.name).filter((n): n is string => typeof n === 'string'),
  );
}

/**
 * Ontology-relationship edges: for each component's relationship, connect the
 * owning concept to the first role concept that also exists as a concept node.
 * Attribute-like roles (primitives such as String/Float) have no node and are
 * skipped so the graph stays readable.
 */
export function buildOntologyEdges(
  components: OntologyComponent[],
  selection: Selection,
): Edge[] {
  const known = conceptNames(components);
  const edges: Edge[] = [];
  components.forEach((comp, ci) => {
    const owner = comp?.concept?.name;
    if (!owner) return;
    (comp.relationships ?? []).forEach((rel, ri) => {
      const roles = rel?.roles ?? [];
      const target = roles
        .map((r) => r?.concept)
        .find((c): c is string => typeof c === 'string' && known.has(c));
      if (!target) return;
      const name = rel?.name ?? `relationship_${ri + 1}`;
      const label = rel?.multiplicity ? `${name} (${rel.multiplicity})` : name;
      edges.push({
        id: `orel-${ci}-${ri}`,
        source: conceptNodeId(owner),
        target: conceptNodeId(target),
        label,
        animated: true,
        selected:
          selection?.kind === 'ontology-relationship' &&
          selection.componentIndex === ci &&
          selection.relationshipIndex === ri,
      });
    });
  });
  return edges;
}

/** Recursively collect every `expression` string found within a mapping tree. */
function walkExpressions(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkExpressions(child, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.expression === 'string') out.push(obj.expression);
  for (const key of [
    'object_mappings',
    'object_mapping',
    'referent_mappings',
    'link_mappings',
    'children',
  ]) {
    if (key in obj) walkExpressions(obj[key], out);
  }
}

/** Extract the dataset name (token before the first `.`) from an expression. */
function datasetFromExpression(expression: string): string | undefined {
  const token = expression.split('.')[0]?.trim();
  if (!token || !/^[A-Za-z_]\w*$/.test(token)) return undefined;
  return token;
}

export interface MappingLink {
  concept: string;
  dataset: string;
}

export interface MappingLinks {
  datasetNames: string[];
  links: MappingLink[];
}

/**
 * Derive concept→dataset mapping links from `ontology_mappings[mapIndex]
 * .concept_mappings`. Only concepts present as nodes (in `known`) are linked.
 * Never throws: malformed data simply yields fewer links.
 */
export function buildMappingLinks(
  doc: AnyDraftDocument | null,
  mapIndex: number,
  known: Set<string>,
): MappingLinks {
  const result: MappingLinks = { datasetNames: [], links: [] };
  try {
    const ontDoc = doc as {
      ontology_mappings?: Array<{ concept_mappings?: unknown[] }>;
    } | null;
    const conceptMappings = ontDoc?.ontology_mappings?.[mapIndex]?.concept_mappings ?? [];
    const datasets = new Set<string>();
    for (const cm of conceptMappings) {
      const concept = (cm as { concept?: unknown })?.concept;
      if (typeof concept !== 'string' || !known.has(concept)) continue;
      const expressions: string[] = [];
      walkExpressions(cm, expressions);
      for (const expr of expressions) {
        const dataset = datasetFromExpression(expr);
        if (!dataset) continue;
        datasets.add(dataset);
        if (!result.links.some((l) => l.concept === concept && l.dataset === dataset)) {
          result.links.push({ concept, dataset });
        }
      }
    }
    result.datasetNames = [...datasets];
  } catch {
    /* never throw on malformed mapping data */
  }
  return result;
}
