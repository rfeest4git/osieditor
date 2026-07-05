/**
 * Helpers for the guided concept-mapping editor: composing and parsing the
 * ontology-layer `expression` string that binds a mapping node to a semantic-model
 * field. The OSI convention (see the reference `flights` model) is `dataset.field`,
 * e.g. `Example_Runway_example_runway.length`.
 */

/** A dataset and the names of the fields it exposes, for picker options. */
export interface DatasetFields {
  name: string;
  fields: string[];
}

/** Compose the `dataset.field` expression string, or `''` when incomplete. */
export function composeMappingExpression(dataset: string, field: string): string {
  return dataset && field ? `${dataset}.${field}` : '';
}

/**
 * Best-effort parse of a mapping `expression` back into a `{ dataset, field }`
 * selection. Returns `null` when the expression does not resolve to a known
 * dataset/field pair (e.g. a hand-written SQL expression), so callers fall back to
 * a raw-text input. Matching is exact against the provided datasets, so dataset or
 * field names containing dots do not cause a mis-parse.
 */
export function parseMappingExpression(
  expression: string | undefined,
  datasets: DatasetFields[],
): { dataset: string; field: string } | null {
  if (!expression) return null;
  for (const dataset of datasets) {
    for (const field of dataset.fields) {
      if (expression === `${dataset.name}.${field}`) {
        return { dataset: dataset.name, field };
      }
    }
  }
  return null;
}
