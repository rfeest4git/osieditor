import { OSI_SPEC_VERSION, type CustomExtension, type Dataset, type Field, type OntologyDocument, type OsiDocument, type OutputPort, type OutputPortDocument, type OutputPortField, type OutputPortTable, type SemanticModel } from './model.js';
import { createDataset, createEmptyModel, createExpression, createField } from './factory.js';

/**
 * One-way conversion of a data product Output Port document into an OSI
 * semantic-model document (see design.md). Each output port becomes a
 * `SemanticModel`, each table becomes a `Dataset`, and each field becomes a
 * `Field`; Output Port metadata that has no native OSI field is preserved
 * verbatim in an `output-port` `custom_extensions` bag on the element it
 * describes.
 */

/** Vendor name used for the preserved Output Port metadata `custom_extensions` bag. */
export const OUTPUT_PORT_VENDOR = 'output-port';

/** Drop `undefined` values so a preserved-metadata bag stays compact. */
function pruneUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/** Wrap preserved metadata into a single `output-port` custom-extensions bag, or `undefined` when empty. */
function preservedExtensions(meta: Record<string, unknown>): CustomExtension[] | undefined {
  const pruned = pruneUndefined(meta);
  if (!Object.keys(pruned).length) return undefined;
  return [{ vendor_name: OUTPUT_PORT_VENDOR, data: JSON.stringify(pruned) }];
}

/** Compose a dataset `source` from the available `database`/`schema`/`table` parts. */
function composeSource(table: OutputPortTable): string {
  return [table.database, table.schema, table.table]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join('.');
}

/**
 * Derive a dataset name that does not collide with any name in `taken`. Appends a
 * `_N` suffix, incrementing until the name is unique, so no dataset is silently
 * overwritten (mirrors the DataAsset concept-name uniquification precedent).
 */
function uniqueDatasetName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  let candidate = `${base}_${n}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base}_${n}`;
  }
  return candidate;
}

/** Convert one Output Port field into an OSI dataset field. */
function fieldToField(source: OutputPortField): Field {
  const field = createField(source.name);
  // Seed an identity single-dialect expression from the column name so the
  // converted model satisfies the OSI schema; the user can edit it afterward.
  field.expression = createExpression(source.name);
  const type = source.type?.toLowerCase();
  if (type === 'date' || type === 'timestamp') {
    field.dimension = { is_time: true };
  }
  const extensions = preservedExtensions({
    type: source.type,
    entityAttribute: source.entityAttribute,
    filterRuleReference: source.filterRuleReference,
  });
  if (extensions) field.custom_extensions = extensions;
  return field;
}

/** Convert one Output Port table into an OSI dataset. */
function tableToDataset(table: OutputPortTable, name: string): Dataset {
  const dataset = createDataset(name, composeSource(table));
  if (table.description) dataset.description = table.description;
  dataset.fields = (table.fields ?? []).map(fieldToField);
  const extensions = preservedExtensions({
    identifier: table.identifier,
    database: table.database,
    schema: table.schema,
    type: table.type,
  });
  if (extensions) dataset.custom_extensions = extensions;
  return dataset;
}

/** Convert one output port into an OSI semantic model. */
function outputPortToModel(port: OutputPort): SemanticModel {
  const model = createEmptyModel(port.name);
  if (port.description) model.description = port.description;
  const taken = new Set<string>();
  model.datasets = (port.tables ?? []).map((table) => {
    const name = uniqueDatasetName(table.table, taken);
    taken.add(name);
    return tableToDataset(table, name);
  });
  const extensions = preservedExtensions({
    identifier: port.identifier,
    platform: port.platform,
  });
  if (extensions) model.custom_extensions = extensions;
  return model;
}

/**
 * Convert a data product Output Port document into an OSI semantic-model
 * document.
 *
 * - Each `outputPort` → one `SemanticModel` (`name`/`description` seeded from the
 *   port). Multiple ports produce multiple models; the first is the active model.
 * - Each `table` → one `Dataset`: `name` from the table name, `source` composed
 *   from `database`/`schema`/`table`, `description` preserved. Colliding dataset
 *   names within a model are uniquified.
 * - Each `field` → one `Field`: `name` from the column, an identity default
 *   expression, and `dimension.is_time = true` for `date`/`timestamp` types.
 * - Non-mappable metadata is preserved in `output-port` `custom_extensions` bags.
 */
export function outputPortToSemanticModel(doc: OutputPortDocument): OsiDocument {
  const models = (doc.outputPorts ?? []).map(outputPortToModel);
  return {
    version: OSI_SPEC_VERSION,
    semantic_model: models,
  };
}

/**
 * Append every dataset of every semantic model in `incoming` into a single
 * `activeModel`, returning a NEW model (no mutation of `activeModel`).
 *
 * A dataset whose name collides with one already in `activeModel`, or with
 * another dataset added in the same merge, is uniquified with a `_N` suffix
 * (reusing {@link uniqueDatasetName}) so nothing is silently overwritten; each
 * dataset keeps its own `output-port` metadata bag. Every incoming model-level
 * `output-port` bag is appended to the model's `custom_extensions` so port-level
 * metadata from every merged import is retained.
 */
export function appendOutputPortDatasets(
  activeModel: SemanticModel,
  incoming: OsiDocument,
): SemanticModel {
  const taken = new Set((activeModel.datasets ?? []).map((d) => d.name));
  const appendedDatasets: Dataset[] = [];
  const appendedExtensions: CustomExtension[] = [];

  for (const model of incoming.semantic_model ?? []) {
    for (const dataset of model.datasets ?? []) {
      const name = uniqueDatasetName(dataset.name, taken);
      taken.add(name);
      appendedDatasets.push(name === dataset.name ? dataset : { ...dataset, name });
    }
    // Preserve each incoming port's model-level `output-port` metadata bag.
    for (const ext of model.custom_extensions ?? []) {
      if (ext.vendor_name === OUTPUT_PORT_VENDOR) appendedExtensions.push(ext);
    }
  }

  const merged: SemanticModel = {
    ...activeModel,
    datasets: [...(activeModel.datasets ?? []), ...appendedDatasets],
  };
  if (appendedExtensions.length) {
    merged.custom_extensions = [...(activeModel.custom_extensions ?? []), ...appendedExtensions];
  }
  return merged;
}

/**
 * Merge a freshly converted Output Port semantic-model document (`incoming`)
 * into an existing semantic-model document (`target`), returning a NEW document
 * (no mutation of `target`).
 *
 * Every dataset of every incoming semantic model is appended to the target's
 * first (active) semantic model — the only model the editor renders — so a
 * multi-port file adds all its tables at once. See {@link appendOutputPortDatasets}
 * for collision handling and metadata accumulation.
 */
export function mergeOutputPortModel(target: OsiDocument, incoming: OsiDocument): OsiDocument {
  const targetModels = target.semantic_model ?? [];
  const activeModel = targetModels[0];
  // Nothing to merge into (the store guard ensures an active model exists);
  // fall back to the incoming document unchanged.
  if (!activeModel) return incoming;

  const mergedActive = appendOutputPortDatasets(activeModel, incoming);
  return {
    ...target,
    semantic_model: [mergedActive, ...targetModels.slice(1)],
  };
}

/**
 * Merge a freshly converted Output Port semantic-model document (`incoming`)
 * into an ontology document (`target`) by appending its datasets to the
 * ontology's active nested semantic model
 * (`ontology_mappings[mapIndex].semantic_model`), returning a NEW document (no
 * mutation of `target`). This lets an Output Port's tables be added to an
 * ontology without discarding its concepts, relationships, or concept mappings.
 * Collision handling and metadata accumulation match {@link mergeOutputPortModel}
 * (see {@link appendOutputPortDatasets}). When `target` has no mapping at
 * `mapIndex` there is nowhere to add datasets, so it is returned unchanged.
 */
export function mergeOutputPortIntoOntology(
  target: OntologyDocument,
  incoming: OsiDocument,
  mapIndex = 0,
): OntologyDocument {
  const maps = target.ontology_mappings ?? [];
  const activeMap = maps[mapIndex];
  if (!activeMap) return target;

  const mergedModel = appendOutputPortDatasets(activeMap.semantic_model, incoming);
  const mergedMaps = maps.map((map, i) =>
    i === mapIndex ? { ...map, semantic_model: mergedModel } : map,
  );
  return { ...target, ontology_mappings: mergedMaps };
}
