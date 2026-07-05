import type { AnyDraftDocument, OntologyComponent } from '@osi-editor/osi-schema';
import type { Edge, XYPosition } from '@xyflow/react';
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

/**
 * Reconcile node positions across a model change. Returns a resolver that, for a
 * given id, reuses the previous (possibly user-dragged) position and falls back
 * to the grid slot for ids that did not exist before.
 */
export function reconcilePositions(
  prev: Array<{ id: string; position: XYPosition }>,
): (id: string, index: number) => XYPosition {
  const positions = new Map(prev.map((n) => [n.id, n.position]));
  return (id, index) => positions.get(id) ?? gridPosition(index);
}

/**
 * Bottom-lane grid layout for dataset nodes in the unified view, so datasets sit
 * below the ontology concepts (which use {@link gridPosition}).
 */
export function datasetLanePosition(index: number): XYPosition {
  const base = gridPosition(index);
  return { x: base.x, y: base.y + 420 };
}

/** Minimal shape of a semantic model needed to derive ERD edges. */
export interface SemanticModelLike {
  datasets: Array<{ name: string }>;
  relationships?: Array<{ from: string; to: string; name?: string }>;
}

/**
 * ERD edges: one directed edge per relationship whose `from` and `to` datasets
 * both exist as nodes. Every such relationship is included — none omitted.
 *
 * `nodeId` maps a dataset name to its React Flow node id; it defaults to the raw
 * name (the focused semantic view) and is overridden to {@link datasetNodeId} on
 * the unified canvas where dataset nodes are prefixed.
 */
export function buildSemanticEdges(
  model: SemanticModelLike,
  selection: Selection,
  nodeId: (name: string) => string = (name) => name,
): Edge[] {
  const names = new Set(model.datasets.map((d) => d.name));
  return (model.relationships ?? [])
    .map((rel, index) => ({ rel, index }))
    .filter(({ rel }) => names.has(rel.from) && names.has(rel.to))
    .map(({ rel, index }) => ({
      id: `rel-${index}`,
      source: nodeId(rel.from),
      target: nodeId(rel.to),
      label: rel.name,
      animated: true,
      selected: selection?.kind === 'relationship' && selection.relationshipIndex === index,
    }));
}

/** Concept names that exist as nodes in the current ontology graph. */
export function conceptNames(components: OntologyComponent[]): Set<string> {
  return new Set(
    components.map((c) => c?.concept?.name).filter((n): n is string => typeof n === 'string'),
  );
}

/**
 * Built-in value types (primitives). A relationship whose role points at one of
 * these is an *attribute* of the owning concept; a role pointing at anything else
 * is a reference to another concept and becomes a relationship edge — even when
 * that concept is only referenced, not declared (e.g. `Example_Flight`).
 */
export const PRIMITIVE_VALUE_TYPES = new Set([
  'String',
  'Text',
  'Float',
  'Double',
  'Decimal',
  'Integer',
  'Int',
  'Long',
  'Number',
  'Boolean',
  'Bool',
  'Date',
  'DateTime',
  'Time',
  'Timestamp',
  'UUID',
  'Binary',
  'Bytes',
]);

/** True when a role concept is a built-in value type (→ attribute, not a relationship). */
export function isValueType(concept: string | undefined): boolean {
  return typeof concept === 'string' && PRIMITIVE_VALUE_TYPES.has(concept);
}

/** An attribute sub-element of a concept: a relationship to a value type/primitive. */
export interface ConceptAttribute {
  /** Attribute (relationship) name. */
  name: string;
  /** The value type / primitive the attribute points at (first role concept). */
  valueType: string;
  /** Multiplicity of the underlying relationship, when declared. */
  multiplicity?: string;
  /** True when this attribute identifies the concept (per `concept.identify_by`). */
  isIdentity: boolean;
  /** True when this attribute is used as a foreign key in a relationship's `derived_by`. */
  isForeignKey: boolean;
  /** Index of the owning component in `components`. */
  componentIndex: number;
  /** Index of the relationship within the component. */
  relationshipIndex: number;
}

export interface OntologyGraphModel {
  /** Every concept-to-concept edge (one per resolving role). */
  edges: Edge[];
  /** Attribute sub-elements keyed by concept node id (`concept:<name>`). */
  attributesByConceptId: Map<string, ConceptAttribute[]>;
  /** Names referenced by relationships but not declared as concepts (ghost nodes). */
  referencedConcepts: Set<string>;
}

/**
 * Collect a component's foreign-key attribute names by scanning its relationships'
 * `derived_by` expressions for `<Owner>.<attr>` tokens (e.g.
 * `Example_Runway.airportid == Example_Airport.airportid` → `airportid`).
 */
function foreignKeyAttrs(comp: OntologyComponent, owner: string): Set<string> {
  const fks = new Set<string>();
  const pattern = new RegExp(`\\b${owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\w+)`, 'g');
  for (const rel of comp.relationships ?? []) {
    for (const expr of rel?.derived_by ?? []) {
      if (typeof expr !== 'string') continue;
      for (const match of expr.matchAll(pattern)) {
        if (match[1]) fks.add(match[1]);
      }
    }
  }
  return fks;
}

/**
 * Derive the full ontology graph from the components. Every relationship is
 * represented — none dropped:
 *
 * - A relationship whose roles resolve to concept nodes yields one edge per
 *   resolving role (owner → role concept). Edge ids encode the role index
 *   (`orel-<ci>-<ri>-<roleIndex>`) but all edges of a relationship resolve back
 *   to the same `relationshipIndex` for selection.
 * - A relationship with no concept-resolving role is an attribute of the owning
 *   concept and is collected as an unfoldable sub-element instead.
 */
export function buildOntologyGraphModel(
  components: OntologyComponent[],
  selection: Selection,
): OntologyGraphModel {
  const known = conceptNames(components);
  const edges: Edge[] = [];
  const attributesByConceptId = new Map<string, ConceptAttribute[]>();
  const referencedConcepts = new Set<string>();
  components.forEach((comp, ci) => {
    const owner = comp?.concept?.name;
    if (!owner) return;
    const ownerId = conceptNodeId(owner);
    const identifiers = new Set(comp?.concept?.identify_by ?? []);
    const fkAttrs = foreignKeyAttrs(comp, owner);
    (comp.relationships ?? []).forEach((rel, ri) => {
      const roles = rel?.roles ?? [];
      const name = rel?.name ?? `relationship_${ri + 1}`;
      const label = rel?.multiplicity ? `${name} (${rel.multiplicity})` : name;
      const selected =
        selection?.kind === 'ontology-relationship' &&
        selection.componentIndex === ci &&
        selection.relationshipIndex === ri;
      // A role that points at a value type is an attribute; anything else is a
      // reference to another concept and becomes a relationship edge — including
      // concepts that are only referenced, not declared (drawn as ghost nodes).
      let isRelationship = false;
      roles.forEach((role, roleIndex) => {
        const target = role?.concept;
        if (typeof target !== 'string' || isValueType(target)) return;
        isRelationship = true;
        if (!known.has(target)) referencedConcepts.add(target);
        edges.push({
          id: `orel-${ci}-${ri}-${roleIndex}`,
          source: ownerId,
          target: conceptNodeId(target),
          label,
          animated: true,
          selected,
        });
      });
      if (!isRelationship) {
        const list = attributesByConceptId.get(ownerId) ?? [];
        list.push({
          name,
          valueType: roles[0]?.concept ?? '',
          multiplicity: rel?.multiplicity,
          isIdentity: identifiers.has(name),
          isForeignKey: fkAttrs.has(name),
          componentIndex: ci,
          relationshipIndex: ri,
        });
        attributesByConceptId.set(ownerId, list);
      }
    });
  });
  return { edges, attributesByConceptId, referencedConcepts };
}

/**
 * Concept-to-concept edges only. Thin wrapper over {@link buildOntologyGraphModel}
 * for callers that don't need the attribute sub-elements.
 */
export function buildOntologyEdges(
  components: OntologyComponent[],
  selection: Selection,
): Edge[] {
  return buildOntologyGraphModel(components, selection).edges;
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
