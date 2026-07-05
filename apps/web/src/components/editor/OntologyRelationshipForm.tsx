import type { Diagnostic, OntologyRelationship, Role } from '@osi-editor/osi-schema';
import { MULTIPLICITIES } from '@osi-editor/osi-schema';
import { PButton, PButtonPure } from '@porsche-design-system/components-react';
import { fieldErrors } from '../../lib/diagnostics.js';
import { useEditorStore } from '../../store/editorStore.js';
import { SelectField } from '../ui/SelectField.js';
import { TextField } from '../ui/TextField.js';
import { CsvField } from './fields.js';
import { FormShell } from './FormShell.js';

const PRIMITIVE_CONCEPTS = [
  'String',
  'Integer',
  'Float',
  'Double',
  'Boolean',
  'Date',
  'Timestamp',
];

/** Ontology relationship detail form: a named, verbalized relationship between concepts. */
export function OntologyRelationshipForm({
  relationship,
  componentIndex,
  relationshipIndex,
  conceptOptions,
  diagnostics,
}: {
  relationship: OntologyRelationship;
  componentIndex: number;
  relationshipIndex: number;
  conceptOptions: string[];
  diagnostics: Diagnostic[];
}) {
  const updateOntologyRelationship = useEditorStore((s) => s.updateOntologyRelationship);
  const deleteOntologyRelationship = useEditorStore((s) => s.deleteOntologyRelationship);
  const prefix = ['ontology', componentIndex, 'relationships', relationshipIndex];
  const errorAt = fieldErrors(diagnostics, prefix);

  const roles = relationship.roles ?? [];
  const verbalizes = relationship.verbalizes ?? [];

  const setRole = (index: number, patch: Partial<Role>) => {
    const next = roles.map((role, i) => (i === index ? { ...role, ...patch } : role));
    updateOntologyRelationship(componentIndex, relationshipIndex, { roles: next });
  };

  const removeRole = (index: number) => {
    const next = roles.filter((_, i) => i !== index);
    updateOntologyRelationship(componentIndex, relationshipIndex, { roles: next });
  };

  const addRole = () => {
    const next = [...roles, { concept: conceptOptions[0] ?? 'String' }];
    updateOntologyRelationship(componentIndex, relationshipIndex, { roles: next });
  };

  const setVerbalization = (index: number, value: string) => {
    const next = verbalizes.map((entry, i) => (i === index ? value : entry));
    updateOntologyRelationship(componentIndex, relationshipIndex, { verbalizes: next });
  };

  const removeVerbalization = (index: number) => {
    const next = verbalizes.filter((_, i) => i !== index);
    updateOntologyRelationship(componentIndex, relationshipIndex, { verbalizes: next });
  };

  const addVerbalization = () => {
    updateOntologyRelationship(componentIndex, relationshipIndex, {
      verbalizes: [...verbalizes, ''],
    });
  };

  const conceptOptionsFor = (current: string) =>
    Array.from(new Set([...conceptOptions, ...PRIMITIVE_CONCEPTS, current])).map((name) => ({
      value: name,
      label: name,
    }));

  return (
    <FormShell
      title="Ontology relationship"
      subtitle="A named, verbalized relationship between concepts."
      onDelete={() => deleteOntologyRelationship(componentIndex, relationshipIndex)}
    >
      <TextField
        label="Name"
        required
        value={relationship.name}
        error={errorAt('name')}
        onChange={(name) => updateOntologyRelationship(componentIndex, relationshipIndex, { name })}
      />
      <SelectField
        label="Multiplicity"
        value={relationship.multiplicity ?? ''}
        options={[
          { value: '', label: '(none)' },
          ...MULTIPLICITIES.map((m) => ({ value: m, label: m })),
        ]}
        error={errorAt('multiplicity')}
        onChange={(value) =>
          updateOntologyRelationship(componentIndex, relationshipIndex, {
            multiplicity: value ? (value as (typeof MULTIPLICITIES)[number]) : undefined,
          })
        }
      />

      <section className="rounded-card border border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Roles ({roles.length})</h3>
          <PButton type="button" variant="secondary" icon="add" compact onClick={addRole}>
            Add role
          </PButton>
        </div>
        <ul className="flex flex-col gap-3">
          {roles.map((role, i) => (
            <li key={i} className="flex items-end gap-2">
              <div className="grid flex-1 grid-cols-2 gap-4">
                <SelectField
                  label="Concept"
                  value={role.concept}
                  options={conceptOptionsFor(role.concept)}
                  onChange={(concept) => setRole(i, { concept })}
                />
                <TextField
                  label="Role name"
                  value={role.name ?? ''}
                  onChange={(name) => setRole(i, { name: name || undefined })}
                />
              </div>
              <PButtonPure icon="delete" hideLabel onClick={() => removeRole(i)}>
                Remove role
              </PButtonPure>
            </li>
          ))}
          {roles.length === 0 && <li className="text-xs text-content-muted">No roles yet.</li>}
        </ul>
      </section>

      <section className="rounded-card border border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Verbalizations ({verbalizes.length})</h3>
          <PButton type="button" variant="secondary" icon="add" compact onClick={addVerbalization}>
            Add verbalization
          </PButton>
        </div>
        <ul className="flex flex-col gap-3">
          {verbalizes.map((entry, i) => (
            <li key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <TextField
                  label={`Verbalization ${i + 1}`}
                  hideLabel
                  value={entry}
                  placeholder="{Concept} relationship {Other}"
                  onChange={(value) => setVerbalization(i, value)}
                />
              </div>
              <PButtonPure icon="delete" hideLabel onClick={() => removeVerbalization(i)}>
                Remove verbalization
              </PButtonPure>
            </li>
          ))}
          {verbalizes.length === 0 && (
            <li className="text-xs text-content-muted">No verbalizations yet.</li>
          )}
        </ul>
      </section>

      <CsvField
        label="Derived by (join expressions)"
        value={relationship.derived_by}
        onChange={(derived_by) =>
          updateOntologyRelationship(componentIndex, relationshipIndex, {
            derived_by: derived_by.length ? derived_by : undefined,
          })
        }
      />
    </FormShell>
  );
}
