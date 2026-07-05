import { z } from 'zod';

/**
 * Zod schemas + TypeScript types mirroring the vendored OSI core schema
 * (`vendor/osi-schema.json`, spec version 0.2.0.dev0).
 *
 * Design note: the vendored JSON Schema uses `additionalProperties: false`, but
 * this project deliberately relaxes that to `.passthrough()` so unknown/vendor
 * fields survive an import→export round trip (see design.md "Round-trip
 * fidelity"). Structural validation therefore focuses on required fields and
 * enum membership rather than rejecting unknown keys.
 */

export const OSI_SPEC_VERSION = '0.2.0.dev0';

/** Supported SQL and expression-language dialects (OSI `Dialect`). */
export const DIALECTS = [
  'ANSI_SQL',
  'SNOWFLAKE',
  'MDX',
  'TABLEAU',
  'DATABRICKS',
  'MAQL',
] as const;

export const DialectSchema = z.enum(DIALECTS);
export type Dialect = z.infer<typeof DialectSchema>;

/** `ai_context` — free-form string or a structured object. */
export const AIContextSchema = z.union([
  z.string(),
  z
    .object({
      instructions: z.string().optional(),
      synonyms: z.array(z.string()).optional(),
      examples: z.array(z.string()).optional(),
    })
    .passthrough(),
]);
export type AIContext = z.infer<typeof AIContextSchema>;

/** Vendor-specific extension bag: `data` is a JSON string, preserved verbatim. */
export const CustomExtensionSchema = z
  .object({
    vendor_name: z.string(),
    data: z.string(),
  })
  .passthrough();
export type CustomExtension = z.infer<typeof CustomExtensionSchema>;

/** A single dialect's expression string. */
export const DialectExpressionSchema = z
  .object({
    dialect: DialectSchema,
    expression: z.string(),
  })
  .passthrough();
export type DialectExpression = z.infer<typeof DialectExpressionSchema>;

/** Multi-dialect expression: at least one dialect entry. */
export const ExpressionSchema = z
  .object({
    dialects: z.array(DialectExpressionSchema).min(1),
  })
  .passthrough();
export type Expression = z.infer<typeof ExpressionSchema>;

export const DimensionSchema = z
  .object({
    is_time: z.boolean().optional(),
  })
  .passthrough();
export type Dimension = z.infer<typeof DimensionSchema>;

/** Row-level attribute within a dataset. Required: `name`, `expression`. */
export const FieldSchema = z
  .object({
    name: z.string(),
    expression: ExpressionSchema,
    dimension: DimensionSchema.optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    ai_context: AIContextSchema.optional(),
    custom_extensions: z.array(CustomExtensionSchema).optional(),
  })
  .passthrough();
export type Field = z.infer<typeof FieldSchema>;

/** Logical dataset (fact/dimension table). Required: `name`, `source`. */
export const DatasetSchema = z
  .object({
    name: z.string(),
    source: z.string(),
    primary_key: z.array(z.string()).optional(),
    unique_keys: z.array(z.array(z.string())).optional(),
    description: z.string().optional(),
    ai_context: AIContextSchema.optional(),
    fields: z.array(FieldSchema).optional(),
    custom_extensions: z.array(CustomExtensionSchema).optional(),
  })
  .passthrough();
export type Dataset = z.infer<typeof DatasetSchema>;

/**
 * Foreign-key relationship between datasets.
 * Required: `name`, `from`, `to`, `from_columns`, `to_columns`.
 */
export const RelationshipSchema = z
  .object({
    name: z.string(),
    from: z.string(),
    to: z.string(),
    from_columns: z.array(z.string()).min(1),
    to_columns: z.array(z.string()).min(1),
    ai_context: AIContextSchema.optional(),
    custom_extensions: z.array(CustomExtensionSchema).optional(),
  })
  .passthrough();
export type Relationship = z.infer<typeof RelationshipSchema>;

/** Quantitative measure. Required: `name`, `expression`. */
export const MetricSchema = z
  .object({
    name: z.string(),
    expression: ExpressionSchema,
    description: z.string().optional(),
    ai_context: AIContextSchema.optional(),
    custom_extensions: z.array(CustomExtensionSchema).optional(),
  })
  .passthrough();
export type Metric = z.infer<typeof MetricSchema>;

/** Top-level semantic model. Required: `name`, `datasets` (≥1). */
export const SemanticModelSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    ai_context: AIContextSchema.optional(),
    datasets: z.array(DatasetSchema).min(1),
    relationships: z.array(RelationshipSchema).optional(),
    metrics: z.array(MetricSchema).optional(),
    custom_extensions: z.array(CustomExtensionSchema).optional(),
  })
  .passthrough();
export type SemanticModel = z.infer<typeof SemanticModelSchema>;

/** OSI document envelope: `version` + one or more semantic models. */
export const OsiDocumentSchema = z
  .object({
    version: z.string(),
    semantic_model: z.array(SemanticModelSchema),
    custom_extensions: z.array(CustomExtensionSchema).optional(),
  })
  .passthrough();
export type OsiDocument = z.infer<typeof OsiDocumentSchema>;

/**
 * Editor-facing variant used while authoring: the strict schema requires
 * `datasets` to be non-empty, but a freshly created model legitimately starts
 * empty. This relaxed schema is used for in-progress editing; export/import
 * still round-trips through the strict `OsiDocumentSchema` for validation.
 */
export const DraftSemanticModelSchema = SemanticModelSchema.extend({
  datasets: z.array(DatasetSchema),
});

export const DraftDocumentSchema = OsiDocumentSchema.extend({
  semantic_model: z.array(DraftSemanticModelSchema),
});
export type DraftDocument = z.infer<typeof DraftDocumentSchema>;

/* -------------------------------------------------------------------------- *
 * Ontology layer
 *
 * The OSI **ontology document** is a distinct top-level document kind from the
 * semantic-model document above (mirrors vendored `ontology-schema.json`, spec
 * `0.2.0.dev0`). Its shape is `{ version, name, description?, ai_context?,
 * ontology[], ontology_mappings? }`, where each `ontology_mappings` entry nests
 * a full `semantic_model` — there is NO top-level `semantic_model`.
 *
 * Note: the ontology layer's `Expression` is a plain ANSI-SQL **string**, not
 * the multi-dialect `ExpressionSchema` object used by the semantic-model layer.
 * -------------------------------------------------------------------------- */

/** A concept is either an entity type or a value type. */
export const CONCEPT_TYPES = ['EntityType', 'ValueType'] as const;
export const ConceptTypeSchema = z.enum(CONCEPT_TYPES);
export type ConceptType = z.infer<typeof ConceptTypeSchema>;

/** Ontology relationship multiplicity. */
export const MULTIPLICITIES = ['ManyToOne', 'OneToOne'] as const;
export const MultiplicitySchema = z.enum(MULTIPLICITIES);
export type Multiplicity = z.infer<typeof MultiplicitySchema>;

/** Ontology-layer expression: a plain ANSI-SQL string. */
export const OntologyExpressionSchema = z.string();

/** A concept in the ontology. Required: `name`, `type`. */
export const ConceptSchema = z
  .object({
    name: z.string(),
    type: ConceptTypeSchema,
    description: z.string().optional(),
    extends: z.array(z.string()).optional(),
    derived_by: z.array(OntologyExpressionSchema).optional(),
    identify_by: z.array(z.string()).optional(),
    requires: z.array(OntologyExpressionSchema).optional(),
  })
  .passthrough();
export type Concept = z.infer<typeof ConceptSchema>;

/** A concept playing a role in an ontology relationship. Required: `concept`. */
export const RoleSchema = z
  .object({
    concept: z.string(),
    name: z.string().optional(),
  })
  .passthrough();
export type Role = z.infer<typeof RoleSchema>;

/**
 * Ontology relationship (distinct from the semantic-model FK `Relationship`).
 * Required: `name`, `verbalizes`.
 */
export const OntologyRelationshipSchema = z
  .object({
    name: z.string(),
    verbalizes: z.array(z.string()),
    description: z.string().optional(),
    roles: z.array(RoleSchema).optional(),
    multiplicity: MultiplicitySchema.optional(),
    derived_by: z.array(OntologyExpressionSchema).optional(),
  })
  .passthrough();
export type OntologyRelationship = z.infer<typeof OntologyRelationshipSchema>;

/**
 * One ontology component: a single concept plus the relationships keyed
 * primarily by that concept. Required: `concept`.
 */
export const OntologyComponentSchema = z
  .object({
    concept: ConceptSchema,
    description: z.string().optional(),
    relationships: z.array(OntologyRelationshipSchema).optional(),
  })
  .passthrough();
export type OntologyComponent = z.infer<typeof OntologyComponentSchema>;

/**
 * Maps logical constructs to a referent relationship. Self-recursive via
 * `referent_mappings`, so declared with an explicit type + `z.lazy`.
 * Required: `relationship`.
 */
export interface ReferentMapping {
  relationship: string;
  expression?: string;
  referent_mappings?: ReferentMapping[];
}
export const ReferentMappingSchema: z.ZodType<ReferentMapping> = z.lazy(() =>
  z
    .object({
      relationship: z.string(),
      expression: OntologyExpressionSchema.optional(),
      referent_mappings: z.array(ReferentMappingSchema).optional(),
    })
    .passthrough(),
);

/** Identifies objects of a concept via logical expressions. No required fields. */
export const ObjectMappingSchema = z
  .object({
    concept: z.string().optional(),
    expression: OntologyExpressionSchema.optional(),
    referent_mappings: z.array(ReferentMappingSchema).optional(),
  })
  .passthrough();
export type ObjectMapping = z.infer<typeof ObjectMappingSchema>;

/**
 * Maps a logical schema to the links of an ontology relationship. Self-recursive
 * via `children`. Required: `object_mapping`.
 */
export interface LinkMapping {
  object_mapping: ObjectMapping;
  relationship?: string;
  children?: LinkMapping[];
}
export const LinkMappingSchema: z.ZodType<LinkMapping> = z.lazy(() =>
  z
    .object({
      object_mapping: ObjectMappingSchema,
      relationship: z.string().optional(),
      children: z.array(LinkMappingSchema).optional(),
    })
    .passthrough(),
);

/** Maps logical constructs to a concept and its relationships. Required: `concept`. */
export const ConceptMappingSchema = z
  .object({
    concept: z.string(),
    object_mappings: z.array(ObjectMappingSchema).optional(),
    link_mappings: z.array(LinkMappingSchema).optional(),
  })
  .passthrough();
export type ConceptMapping = z.infer<typeof ConceptMappingSchema>;

/**
 * A map from one logical (semantic) model to the ontology.
 * Required: `semantic_model`, `concept_mappings`.
 */
export const OntologyMapSchema = z
  .object({
    semantic_model: SemanticModelSchema,
    concept_mappings: z.array(ConceptMappingSchema),
    name: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();
export type OntologyMap = z.infer<typeof OntologyMapSchema>;

/**
 * OSI ontology document. Required: `version`, `name`, `ontology` (≥1).
 *
 * Explicit interface + `z.ZodType` annotation: the fully-inferred document type
 * embeds the recursive mapping trees and is too large for TS to serialize into
 * the emitted `.d.ts` (TS7056) without it.
 */
export interface OntologyDocument {
  version: string;
  name: string;
  ontology: OntologyComponent[];
  description?: string;
  ai_context?: AIContext;
  ontology_mappings?: OntologyMap[];
  custom_extensions?: CustomExtension[];
}
export const OntologyDocumentSchema: z.ZodType<OntologyDocument> = z
  .object({
    version: z.string(),
    name: z.string(),
    ontology: z.array(OntologyComponentSchema).min(1),
    description: z.string().optional(),
    ai_context: AIContextSchema.optional(),
    ontology_mappings: z.array(OntologyMapSchema).optional(),
    custom_extensions: z.array(CustomExtensionSchema).optional(),
  })
  .passthrough();

/**
 * Editor-facing variant: a freshly created ontology legitimately starts with no
 * components and its maps' nested models start empty, so relax those minimums.
 */
export const DraftOntologyMapSchema = OntologyMapSchema.extend({
  semantic_model: DraftSemanticModelSchema,
  concept_mappings: z.array(ConceptMappingSchema),
});
export interface DraftOntologyDocument extends Omit<OntologyDocument, 'ontology'> {
  ontology: OntologyComponent[];
}
export const DraftOntologyDocumentSchema: z.ZodType<DraftOntologyDocument> = z
  .object({
    version: z.string(),
    name: z.string(),
    ontology: z.array(OntologyComponentSchema),
    description: z.string().optional(),
    ai_context: AIContextSchema.optional(),
    ontology_mappings: z.array(DraftOntologyMapSchema).optional(),
    custom_extensions: z.array(CustomExtensionSchema).optional(),
  })
  .passthrough();

/** Either OSI document kind the editor can hold. */
export type AnyOsiDocument = OsiDocument | OntologyDocument;
export type AnyDraftDocument = DraftDocument | DraftOntologyDocument;

/** Discriminates a parsed root by its top-level shape. */
export type OsiDocumentKind = 'semantic-model' | 'ontology';

/**
 * Classify a parsed root as a semantic-model document, an ontology document, or
 * `undefined` when it is neither. `ontology` wins if both keys are present.
 */
export function detectDocumentKind(raw: unknown): OsiDocumentKind | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.ontology)) return 'ontology';
  if (Array.isArray(obj.semantic_model)) return 'semantic-model';
  return undefined;
}
