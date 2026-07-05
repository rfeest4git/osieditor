import { z } from 'zod';
import {
  DraftDocumentSchema,
  DraftOntologyDocumentSchema,
  detectDocumentKind,
  type OntologyDocument,
  type OsiDocument,
} from './model.js';

export type Severity = 'error' | 'warning';

export type EntityKind =
  | 'document'
  | 'model'
  | 'dataset'
  | 'field'
  | 'metric'
  | 'relationship'
  | 'concept'
  | 'ontology-relationship'
  | 'concept-mapping';

/** Points a diagnostic at a specific entity so the UI can anchor it. */
export interface EntityRef {
  kind: EntityKind;
  /** The entity's `name`, when it has one. */
  name?: string;
  /** For fields: the owning dataset's name. */
  dataset?: string;
  /** For ontology relationships/mappings: the owning concept's name. */
  concept?: string;
  /** Index of the active semantic model within `semantic_model`. */
  modelIndex?: number;
}

export interface Diagnostic {
  severity: Severity;
  /** Stable machine code, e.g. `required_field`, `dangling_reference`. */
  code: string;
  message: string;
  /** JSON path into the document (array of keys/indices). */
  path: Array<string | number>;
  entityRef?: EntityRef;
}

/**
 * Structural validation via Zod: reports type errors, missing required fields,
 * and invalid enum values as `error` diagnostics. Uses the draft document schema
 * so an in-progress (dataset-less) model does not spuriously fail; per-entity
 * required fields (dataset name/source, field name/expression, …) are still
 * enforced.
 */
export function validateStructure(doc: unknown): Diagnostic[] {
  const schema =
    detectDocumentKind(doc) === 'ontology' ? DraftOntologyDocumentSchema : DraftDocumentSchema;
  const result = schema.safeParse(doc);
  if (result.success) return [];
  return result.error.issues.map((issue) => structuralDiagnostic(issue));
}

function structuralDiagnostic(issue: z.ZodIssue): Diagnostic {
  const isMissing = issue.code === 'invalid_type' && issue.received === 'undefined';
  const fieldName = issue.path.length ? String(issue.path[issue.path.length - 1]) : 'value';
  return {
    severity: 'error',
    code: isMissing ? 'required_field' : `schema_${issue.code}`,
    // Zod's default message for a missing field is a bare "Required"; make it
    // self-describing so diagnostics read well on their own.
    message: isMissing ? `Missing required field "${fieldName}".` : issue.message,
    path: [...issue.path],
    entityRef: entityRefFromPath(issue.path),
  };
}

/** Derive the best entity anchor from a JSON path like `semantic_model.0.datasets.2.name`. */
function entityRefFromPath(path: Array<string | number>): EntityRef | undefined {
  // Ontology-document paths.
  if (path[0] === 'ontology') {
    if (path.includes('relationships')) return { kind: 'ontology-relationship' };
    return { kind: 'concept' };
  }
  if (path[0] === 'ontology_mappings') {
    if (path.includes('concept_mappings')) return { kind: 'concept-mapping' };
    // Falls through to semantic-model handling for the nested model below.
  }
  const modelIndex = path[0] === 'semantic_model' && typeof path[1] === 'number' ? path[1] : undefined;
  if (path.includes('datasets')) {
    const di = path.indexOf('datasets');
    if (path[di + 3] === 'fields' || path.includes('fields')) {
      return { kind: 'field', modelIndex };
    }
    return { kind: 'dataset', modelIndex };
  }
  if (path.includes('metrics')) return { kind: 'metric', modelIndex };
  if (path.includes('relationships')) return { kind: 'relationship', modelIndex };
  if (modelIndex !== undefined) return { kind: 'model', modelIndex };
  return { kind: 'document' };
}

/**
 * Semantic validation: cross-entity rules Zod cannot express cleanly.
 * Runs over a parsed (not-necessarily-valid) document and checks each semantic
 * model for referential integrity, key arity, and name uniqueness.
 */
export function validateSemantics(doc: OsiDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const models = Array.isArray(doc?.semantic_model) ? doc.semantic_model : [];

  models.forEach((model, modelIndex) => {
    const base = ['semantic_model', modelIndex] as const;
    const datasetNames = new Set<string>();
    const datasets = model.datasets ?? [];

    // Unique dataset names + unique field names within each dataset.
    const seenDatasetNames = new Map<string, number>();
    datasets.forEach((dataset, di) => {
      datasetNames.add(dataset.name);
      const priorCount = seenDatasetNames.get(dataset.name) ?? 0;
      if (priorCount > 0) {
        diagnostics.push({
          severity: 'error',
          code: 'duplicate_name',
          message: `Duplicate dataset name "${dataset.name}".`,
          path: [...base, 'datasets', di, 'name'],
          entityRef: { kind: 'dataset', name: dataset.name, modelIndex },
        });
      }
      seenDatasetNames.set(dataset.name, priorCount + 1);

      const seenFieldNames = new Map<string, number>();
      (dataset.fields ?? []).forEach((field, fi) => {
        const prior = seenFieldNames.get(field.name) ?? 0;
        if (prior > 0) {
          diagnostics.push({
            severity: 'error',
            code: 'duplicate_name',
            message: `Duplicate field name "${field.name}" in dataset "${dataset.name}".`,
            path: [...base, 'datasets', di, 'fields', fi, 'name'],
            entityRef: { kind: 'field', name: field.name, dataset: dataset.name, modelIndex },
          });
        }
        seenFieldNames.set(field.name, prior + 1);
      });
    });

    // Unique metric names.
    const seenMetricNames = new Map<string, number>();
    (model.metrics ?? []).forEach((metric, mi) => {
      const prior = seenMetricNames.get(metric.name) ?? 0;
      if (prior > 0) {
        diagnostics.push({
          severity: 'error',
          code: 'duplicate_name',
          message: `Duplicate metric name "${metric.name}".`,
          path: [...base, 'metrics', mi, 'name'],
          entityRef: { kind: 'metric', name: metric.name, modelIndex },
        });
      }
      seenMetricNames.set(metric.name, prior + 1);
    });

    // Relationships: referential integrity + key arity + unique names.
    const seenRelNames = new Map<string, number>();
    (model.relationships ?? []).forEach((rel, ri) => {
      const relPath = [...base, 'relationships', ri];
      const ref: EntityRef = { kind: 'relationship', name: rel.name, modelIndex };

      const prior = seenRelNames.get(rel.name) ?? 0;
      if (prior > 0) {
        diagnostics.push({
          severity: 'error',
          code: 'duplicate_name',
          message: `Duplicate relationship name "${rel.name}".`,
          path: [...relPath, 'name'],
          entityRef: ref,
        });
      }
      seenRelNames.set(rel.name, prior + 1);

      if (!datasetNames.has(rel.from)) {
        diagnostics.push({
          severity: 'error',
          code: 'dangling_reference',
          message: `Relationship "${rel.name}" references unknown "from" dataset "${rel.from}".`,
          path: [...relPath, 'from'],
          entityRef: ref,
        });
      }
      if (!datasetNames.has(rel.to)) {
        diagnostics.push({
          severity: 'error',
          code: 'dangling_reference',
          message: `Relationship "${rel.name}" references unknown "to" dataset "${rel.to}".`,
          path: [...relPath, 'to'],
          entityRef: ref,
        });
      }

      const fromLen = rel.from_columns?.length ?? 0;
      const toLen = rel.to_columns?.length ?? 0;
      if (fromLen !== toLen) {
        diagnostics.push({
          severity: 'error',
          code: 'key_arity_mismatch',
          message: `Relationship "${rel.name}" has ${fromLen} from_columns but ${toLen} to_columns.`,
          path: [...relPath, 'from_columns'],
          entityRef: ref,
        });
      }
    });
  });

  return diagnostics;
}

/**
 * Semantic validation for ontology documents: concept-name uniqueness, role
 * concept resolution, and concept-mapping reference integrity — the cross-entity
 * rules Zod cannot express cleanly.
 */
export function validateOntologySemantics(doc: OntologyDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const components = Array.isArray(doc?.ontology) ? doc.ontology : [];

  // Collect declared concept names (for reference checks) and flag duplicates.
  const conceptNames = new Set<string>();
  const seenConceptNames = new Map<string, number>();
  components.forEach((component, ci) => {
    const name = component?.concept?.name;
    if (typeof name !== 'string') return;
    const prior = seenConceptNames.get(name) ?? 0;
    if (prior > 0) {
      diagnostics.push({
        severity: 'error',
        code: 'duplicate_name',
        message: `Duplicate concept name "${name}".`,
        path: ['ontology', ci, 'concept', 'name'],
        entityRef: { kind: 'concept', name },
      });
    }
    seenConceptNames.set(name, prior + 1);
    conceptNames.add(name);
  });

  // Per-component relationship checks: duplicate relationship names on a concept.
  // Note: role `concept` references are intentionally NOT resolved — valid OSI
  // ontologies (e.g. the reference flights model) reference entity types that are
  // not declared in the same document's `ontology` array, so resolution would
  // produce false positives.
  components.forEach((component, ci) => {
    const ownerName = component?.concept?.name;
    const seenRelNames = new Map<string, number>();
    (component?.relationships ?? []).forEach((rel, ri) => {
      const relPath = ['ontology', ci, 'relationships', ri] as Array<string | number>;
      const ref: EntityRef = { kind: 'ontology-relationship', name: rel?.name, concept: ownerName };

      const prior = seenRelNames.get(rel?.name) ?? 0;
      if (rel?.name && prior > 0) {
        diagnostics.push({
          severity: 'error',
          code: 'duplicate_name',
          message: `Duplicate relationship name "${rel.name}" on concept "${ownerName}".`,
          path: [...relPath, 'name'],
          entityRef: ref,
        });
      }
      if (rel?.name) seenRelNames.set(rel.name, prior + 1);
    });
  });

  // Concept mappings must reference a declared concept.
  (doc?.ontology_mappings ?? []).forEach((map, mi) => {
    (map?.concept_mappings ?? []).forEach((cm, cmi) => {
      if (cm?.concept && !conceptNames.has(cm.concept)) {
        diagnostics.push({
          severity: 'error',
          code: 'dangling_reference',
          message: `Concept mapping references unknown concept "${cm.concept}".`,
          path: ['ontology_mappings', mi, 'concept_mappings', cmi, 'concept'],
          entityRef: { kind: 'concept-mapping', name: cm.concept },
        });
      }
    });
  });

  return diagnostics;
}

/**
 * Full validation: structural (Zod) first, then semantic checks on whatever
 * parsed shape we have. Dispatches on the document kind. Returns a single flat,
 * ordered list.
 */
export function validate(doc: unknown): Diagnostic[] {
  const structural = validateStructure(doc);
  if (!doc || typeof doc !== 'object') return structural;
  const semantic =
    detectDocumentKind(doc) === 'ontology'
      ? validateOntologySemantics(doc as OntologyDocument)
      : validateSemantics(doc as OsiDocument);
  return [...structural, ...semantic];
}
