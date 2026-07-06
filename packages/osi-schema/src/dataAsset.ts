import { OSI_SPEC_VERSION, type CustomExtension, type DataAsset, type DataAssetAttribute, type OntologyComponent, type OntologyDocument, type OntologyRelationship } from './model.js';
import { createOntologyMap } from './factory.js';

/**
 * One-way conversion of a Collibra DataAsset document into an OSI ontology
 * document (see design.md). Entities become `EntityType` concepts, attributes
 * become `ValueType` concepts linked to their owning entity by a `ManyToOne`
 * ontology relationship, and DataAsset metadata that has no native OSI field is
 * preserved verbatim in a `collibra-data-asset` `custom_extensions` bag.
 */

/** Vendor name used for the preserved DataAsset metadata `custom_extensions` bag. */
export const DATA_ASSET_VENDOR = 'collibra-data-asset';

/**
 * Derive a valid OSI concept name (matching `^[A-Z][a-zA-Z0-9_-]*$`) from an
 * arbitrary DataAsset key: split on camelCase and non-alphanumeric boundaries,
 * PascalCase each part, and guarantee an uppercase-letter leader.
 */
export function toConceptName(key: string): string {
  const parts = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const pascal = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  if (!pascal) return 'Concept';
  // Ensure the first character is an uppercase letter as the schema requires.
  return /^[A-Z]/.test(pascal) ? pascal : `C${pascal}`;
}

/** Predefined ontology value type used when an attribute declares no explicit type. */
export const DEFAULT_VALUE_TYPE = 'String';

/**
 * Resolve the ontology value type for an attribute. DataAssets rarely carry an
 * explicit type, so default to the predefined `String` value type; when a type
 * is declared (`type`/`dataType`/`valueType`), normalize it to a concept name.
 */
export function attributeValueType(attr: DataAssetAttribute): string {
  const raw = attr as Record<string, unknown>;
  const declared = raw.type ?? raw.dataType ?? raw.valueType;
  if (typeof declared === 'string' && declared.trim()) return toConceptName(declared);
  return DEFAULT_VALUE_TYPE;
}

/** Combine a display name and description into a single concept description. */
function joinDescription(displayName?: string, description?: string): string | undefined {
  const parts = [displayName, description].map((p) => p?.trim()).filter(Boolean);
  return parts.length ? parts.join(' — ') : undefined;
}

/** Drop `undefined` values so the preserved-metadata bag stays compact. */
function pruneUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Collect DataAsset fields that have no native OSI home into a plain object,
 * ready to be JSON-encoded into a `custom_extensions` bag.
 */
function collectPreservedMetadata(dataAsset: DataAsset): Record<string, unknown> {
  const raw = dataAsset as Record<string, unknown>;
  const entities = dataAsset.entities ?? {};

  const entityMeta: Record<string, unknown> = {};
  for (const [entityKey, entity] of Object.entries(entities)) {
    const attributeMeta: Record<string, unknown> = {};
    for (const [attrKey, attr] of Object.entries(entity?.attributes ?? {})) {
      const meta = pruneUndefined({
        example: attr?.example,
        additionalInformation: attr?.additionalInformation,
        predefinedValues: attr?.predefinedValues,
      });
      if (Object.keys(meta).length) attributeMeta[attrKey] = meta;
    }
    const meta = pruneUndefined({
      classification: entity?.classification,
      tags: entity?.tags,
      attributes: Object.keys(attributeMeta).length ? attributeMeta : undefined,
    });
    if (Object.keys(meta).length) entityMeta[entityKey] = meta;
  }

  return pruneUndefined({
    identifier: raw.identifier,
    schemaVersion: raw.schemaVersion,
    dataOwner: raw.dataOwner,
    originApplication: raw.originApplication,
    responsibilities: raw.responsibilities,
    tags: raw.tags,
    entities: Object.keys(entityMeta).length ? entityMeta : undefined,
  });
}

/**
 * Convert a Collibra DataAsset document into an OSI ontology document.
 *
 * - Each entity → an `EntityType` concept `OntologyComponent`.
 * - Each attribute → a `ManyToOne` `OntologyRelationship` on the owning entity
 *   component, whose single role targets a predefined value type (`String` by
 *   default, or the attribute's declared type) with a generated `verbalizes`
 *   template. Attributes do NOT become their own concepts.
 * - Document `name`/`description` are seeded from the DataAsset; a single empty
 *   ontology map keeps the nested semantic model immediately editable.
 * - Non-mappable DataAsset metadata is preserved in a `custom_extensions` bag.
 */
export function dataAssetToOntology(dataAsset: DataAsset): OntologyDocument {
  const entities = dataAsset.entities ?? {};
  const components: OntologyComponent[] = [];

  for (const [entityKey, entity] of Object.entries(entities)) {
    const entityName = toConceptName(entityKey);
    const relationships: OntologyRelationship[] = [];

    for (const [attrKey, attr] of Object.entries(entity?.attributes ?? {})) {
      const valueType = attributeValueType(attr);
      const description = joinDescription(attr?.displayName, attr?.description);
      relationships.push({
        name: attrKey,
        roles: [{ concept: valueType }],
        verbalizes: [`{${entityName}} ${attrKey} {${valueType}}`],
        multiplicity: 'ManyToOne',
        ...(description ? { description } : {}),
      });
    }

    components.push({
      concept: {
        name: entityName,
        type: 'EntityType',
        ...(joinDescription(entity?.displayName, entity?.description)
          ? { description: joinDescription(entity?.displayName, entity?.description) }
          : {}),
      },
      relationships,
    });
  }

  const preserved = collectPreservedMetadata(dataAsset);
  const customExtensions: CustomExtension[] | undefined = Object.keys(preserved).length
    ? [{ vendor_name: DATA_ASSET_VENDOR, data: JSON.stringify(preserved) }]
    : undefined;

  const name = dataAsset.name?.trim() || 'imported_data_asset';

  return {
    version: OSI_SPEC_VERSION,
    name,
    ...(dataAsset.description ? { description: dataAsset.description } : {}),
    ontology: components,
    ontology_mappings: [createOntologyMap(`${name}_map`)],
    ...(customExtensions ? { custom_extensions: customExtensions } : {}),
  };
}

/**
 * Derive a concept name that does not collide with any name in `taken`. Because
 * `base` already satisfies `^[A-Z][a-zA-Z0-9_-]*$`, appending a `_N` suffix keeps
 * the result schema-valid. Increments `N` until the name is unique.
 */
function uniqueConceptName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  let candidate = `${base}_${n}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base}_${n}`;
  }
  return candidate;
}

/**
 * Return a copy of `component` with its concept renamed and every `verbalizes`
 * template that references the old concept name (embedded as `{OldName}`)
 * rewritten to the new name, leaving unrelated text untouched.
 */
function renameComponentConcept(
  component: OntologyComponent,
  oldName: string,
  newName: string,
): OntologyComponent {
  const oldToken = `{${oldName}}`;
  const newToken = `{${newName}}`;
  return {
    ...component,
    concept: { ...component.concept, name: newName },
    ...(component.relationships
      ? {
          relationships: component.relationships.map((rel) => ({
            ...rel,
            ...(rel.verbalizes
              ? { verbalizes: rel.verbalizes.map((v) => v.split(oldToken).join(newToken)) }
              : {}),
          })),
        }
      : {}),
  };
}

/**
 * Combine the preserved DataAsset metadata carried in two `collibra-data-asset`
 * `custom_extensions` bags into a single JSON string. Metadata is namespaced
 * under a `dataAssets` array so combining is additive and never overwrites
 * earlier entries. Returns `undefined` when neither bag carries data.
 */
function mergeCollibraMetadata(
  targetData: string | undefined,
  incomingData: string | undefined,
): string | undefined {
  const list: unknown[] = [];
  const push = (data: string | undefined) => {
    if (!data) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;
    const bag = parsed as { dataAssets?: unknown };
    if (Array.isArray(bag.dataAssets)) {
      list.push(...bag.dataAssets);
    } else if (Object.keys(parsed).length) {
      list.push(parsed);
    }
  };
  push(targetData);
  push(incomingData);
  if (!list.length) return undefined;
  return JSON.stringify({ dataAssets: list });
}

/**
 * Combine the `custom_extensions` arrays of two ontology documents: accumulate
 * the `collibra-data-asset` preserved-metadata bags (see
 * {@link mergeCollibraMetadata}) and carry through any other vendors' bags from
 * both documents unchanged.
 */
function mergeCustomExtensions(
  targetExt: CustomExtension[] | undefined,
  incomingExt: CustomExtension[] | undefined,
): CustomExtension[] | undefined {
  const targetBag = targetExt?.find((e) => e.vendor_name === DATA_ASSET_VENDOR);
  const incomingBag = incomingExt?.find((e) => e.vendor_name === DATA_ASSET_VENDOR);
  const others = [
    ...(targetExt ?? []).filter((e) => e.vendor_name !== DATA_ASSET_VENDOR),
    ...(incomingExt ?? []).filter((e) => e.vendor_name !== DATA_ASSET_VENDOR),
  ];
  const mergedData = mergeCollibraMetadata(targetBag?.data, incomingBag?.data);
  const result: CustomExtension[] = [];
  if (mergedData !== undefined) {
    result.push({ vendor_name: DATA_ASSET_VENDOR, data: mergedData });
  }
  result.push(...others);
  return result.length ? result : undefined;
}

/**
 * Merge a freshly converted DataAsset ontology (`incoming`) into an existing
 * ontology document (`target`), returning a new document. The incoming
 * `OntologyComponent`s are appended to the target's components; when an incoming
 * concept name collides with a name already present, the incoming concept is
 * uniquified (`Customer` → `Customer_2`) and its relationship `verbalizes`
 * templates are rewritten to the new name (the existing concept is left
 * untouched). Preserved `collibra-data-asset` metadata from both documents is
 * accumulated so nothing from an earlier import is discarded.
 */
export function mergeDataAssetOntology(
  target: OntologyDocument,
  incoming: OntologyDocument,
): OntologyDocument {
  const targetComponents = target.ontology ?? [];
  const taken = new Set(targetComponents.map((c) => c.concept.name));

  const appended: OntologyComponent[] = [];
  for (const component of incoming.ontology ?? []) {
    const originalName = component.concept.name;
    const uniqueName = uniqueConceptName(originalName, taken);
    taken.add(uniqueName);
    appended.push(
      uniqueName === originalName
        ? component
        : renameComponentConcept(component, originalName, uniqueName),
    );
  }

  const mergedExtensions = mergeCustomExtensions(target.custom_extensions, incoming.custom_extensions);

  const result: OntologyDocument = {
    ...target,
    ontology: [...targetComponents, ...appended],
  };
  if (mergedExtensions) {
    result.custom_extensions = mergedExtensions;
  } else {
    delete result.custom_extensions;
  }
  return result;
}
