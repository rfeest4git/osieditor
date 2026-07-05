import {
  OSI_SPEC_VERSION,
  type Concept,
  type ConceptMapping,
  type Dataset,
  type Expression,
  type Field,
  type Metric,
  type OntologyComponent,
  type OntologyDocument,
  type OntologyMap,
  type OntologyRelationship,
  type OsiDocument,
  type Relationship,
  type SemanticModel,
} from './model.js';

/** A valid, empty semantic model skeleton (no datasets yet) ready for editing. */
export function createEmptyModel(name = 'untitled_model'): SemanticModel {
  return {
    name,
    datasets: [],
    relationships: [],
    metrics: [],
  };
}

/** A document envelope wrapping a single empty model. */
export function createEmptyDocument(name = 'untitled_model'): OsiDocument {
  return {
    version: OSI_SPEC_VERSION,
    semantic_model: [createEmptyModel(name)],
  };
}

/** A minimal single-dialect expression, used as a default when adding entities. */
export function createExpression(expression = '', dialect = 'ANSI_SQL' as const): Expression {
  return { dialects: [{ dialect, expression }] };
}

export function createDataset(name = 'new_dataset', source = ''): Dataset {
  return { name, source, fields: [] };
}

export function createField(name = 'new_field'): Field {
  return { name, expression: createExpression() };
}

export function createMetric(name = 'new_metric'): Metric {
  return { name, expression: createExpression() };
}

export function createRelationship(from: string, to: string): Relationship {
  return {
    name: `${from}_to_${to}`,
    from,
    to,
    from_columns: [],
    to_columns: [],
  };
}

/* ---------------------------------- ontology --------------------------------- */

/** A concept with the minimum required fields. Defaults to an `EntityType`. */
export function createConcept(name = 'NewConcept'): Concept {
  return { name, type: 'EntityType' };
}

/**
 * An ontology relationship. `verbalizes` is required by the schema, so seed a
 * template from the owning concept + relationship name.
 */
export function createOntologyRelationship(
  name = 'new_relationship',
  ownerConcept = 'NewConcept',
  roleConcept = 'String',
): OntologyRelationship {
  return {
    name,
    roles: [{ concept: roleConcept }],
    verbalizes: [`{${ownerConcept}} ${name} {${roleConcept}}`],
    multiplicity: 'ManyToOne',
  };
}

/** An ontology component wrapping a fresh concept. */
export function createOntologyComponent(name = 'NewConcept'): OntologyComponent {
  return { concept: createConcept(name), relationships: [] };
}

/** A concept mapping shell for the given concept name. */
export function createConceptMapping(concept = 'NewConcept'): ConceptMapping {
  return { concept, object_mappings: [], link_mappings: [] };
}

/** An ontology map wrapping an empty nested semantic model. */
export function createOntologyMap(name = 'new_map'): OntologyMap {
  return {
    name,
    semantic_model: createEmptyModel(`${name}_model`),
    concept_mappings: [],
  };
}

/**
 * An ontology document ready for editing: no concepts yet, and a single empty
 * ontology map so the nested semantic model is immediately editable.
 */
export function createEmptyOntologyDocument(name = 'untitled_ontology'): OntologyDocument {
  return {
    version: OSI_SPEC_VERSION,
    name,
    ontology: [],
    ontology_mappings: [createOntologyMap(`${name}_map`)],
  };
}
