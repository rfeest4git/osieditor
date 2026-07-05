import type { Diagnostic, Relationship, SemanticModel } from '@osi-editor/osi-schema';
import { fieldErrors } from '../../lib/diagnostics.js';
import { useEditorStore } from '../../store/editorStore.js';
import { SelectField } from '../ui/SelectField.js';
import { TextField } from '../ui/TextField.js';
import { CsvField } from './fields.js';
import { FormShell } from './FormShell.js';

/** Relationship detail form (task 6.5): from/to datasets and key-column mapping. */
export function RelationshipForm({
  relationship,
  relationshipIndex,
  modelIndex,
  model,
  diagnostics,
}: {
  relationship: Relationship;
  relationshipIndex: number;
  modelIndex: number;
  model: SemanticModel;
  diagnostics: Diagnostic[];
}) {
  const updateRelationship = useEditorStore((s) => s.updateRelationship);
  const deleteRelationship = useEditorStore((s) => s.deleteRelationship);
  const prefix = ['semantic_model', modelIndex, 'relationships', relationshipIndex];
  const errorAt = fieldErrors(diagnostics, prefix);

  const datasetOptions = model.datasets.map((d) => ({ value: d.name, label: d.name }));

  return (
    <FormShell
      title="Relationship"
      subtitle="A foreign-key relationship between two datasets."
      onDelete={() => deleteRelationship(relationshipIndex)}
    >
      <TextField
        label="Name"
        required
        value={relationship.name}
        error={errorAt('name')}
        onChange={(name) => updateRelationship(relationshipIndex, { name })}
      />
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="From (many side)"
          value={relationship.from}
          options={datasetOptions}
          error={errorAt('from')}
          onChange={(from) => updateRelationship(relationshipIndex, { from })}
        />
        <SelectField
          label="To (one side)"
          value={relationship.to}
          options={datasetOptions}
          error={errorAt('to')}
          onChange={(to) => updateRelationship(relationshipIndex, { to })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <CsvField
          label="From columns"
          value={relationship.from_columns}
          error={errorAt('from_columns')}
          onChange={(from_columns) => updateRelationship(relationshipIndex, { from_columns })}
        />
        <CsvField
          label="To columns"
          value={relationship.to_columns}
          error={errorAt('to_columns')}
          onChange={(to_columns) => updateRelationship(relationshipIndex, { to_columns })}
        />
      </div>
      <p className="text-xs text-content-muted">
        From and To column lists must have the same number of entries.
      </p>
    </FormShell>
  );
}
