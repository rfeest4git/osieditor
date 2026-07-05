import type { ConceptMapping, Diagnostic, OntologyComponent } from '@osi-editor/osi-schema';
import { CONCEPT_TYPES } from '@osi-editor/osi-schema';
import { PButton, PButtonPure } from '@porsche-design-system/components-react';
import { useState } from 'react';
import { fieldErrors } from '../../lib/diagnostics.js';
import {
  getOntologyComponents,
  useEditorStore,
} from '../../store/editorStore.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { SelectField } from '../ui/SelectField.js';
import { TextField } from '../ui/TextField.js';
import { CsvField } from './fields.js';
import { FormShell } from './FormShell.js';

/** Concept detail form: an ontology entity type or value type and its relationships. */
export function ConceptForm({
  component,
  componentIndex,
  diagnostics,
}: {
  component: OntologyComponent;
  componentIndex: number;
  diagnostics: Diagnostic[];
}) {
  const updateConcept = useEditorStore((s) => s.updateConcept);
  const deleteConcept = useEditorStore((s) => s.deleteConcept);
  const addOntologyRelationship = useEditorStore((s) => s.addOntologyRelationship);
  const select = useEditorStore((s) => s.select);
  // Detect whether this concept is referenced elsewhere, to gate deletion.
  const references = useEditorStore((s) => {
    const name = component.concept?.name;
    if (!name) return 0;
    let count = 0;
    for (const c of getOntologyComponents(s.doc)) {
      if (c === component) continue;
      for (const rel of c.relationships ?? []) {
        for (const role of rel.roles ?? []) if (role.concept === name) count++;
      }
    }
    const maps =
      (s.doc as { ontology_mappings?: Array<{ concept_mappings?: ConceptMapping[] }> })
        ?.ontology_mappings ?? [];
    for (const m of maps) {
      for (const cm of m.concept_mappings ?? []) if (cm.concept === name) count++;
    }
    return count;
  });
  const [confirming, setConfirming] = useState(false);
  const errorAt = fieldErrors(diagnostics, ['ontology', componentIndex, 'concept']);

  const concept = component.concept;

  const requestDelete = () => {
    if (references > 0) setConfirming(true);
    else deleteConcept(componentIndex);
  };

  return (
    <FormShell
      title="Concept"
      subtitle="An ontology entity type or value type."
      onDelete={requestDelete}
    >
      <TextField
        label="Name"
        required
        value={concept.name}
        error={errorAt('name')}
        onChange={(name) => updateConcept(componentIndex, { name })}
      />
      <SelectField
        label="Type"
        value={concept.type}
        options={CONCEPT_TYPES.map((type) => ({ value: type, label: type }))}
        error={errorAt('type')}
        onChange={(type) => updateConcept(componentIndex, { type: type as (typeof CONCEPT_TYPES)[number] })}
      />
      <TextField
        label="Description"
        value={concept.description ?? ''}
        onChange={(description) =>
          updateConcept(componentIndex, { description: description || undefined })
        }
      />
      <CsvField
        label="Identify by"
        value={concept.identify_by}
        onChange={(identify_by) =>
          updateConcept(componentIndex, {
            identify_by: identify_by.length ? identify_by : undefined,
          })
        }
      />
      <CsvField
        label="Extends"
        value={concept.extends}
        placeholder="OtherConcept"
        onChange={(extendsList) =>
          updateConcept(componentIndex, { extends: extendsList.length ? extendsList : undefined })
        }
      />
      <CsvField
        label="Derived by (expressions)"
        value={concept.derived_by}
        onChange={(derived_by) =>
          updateConcept(componentIndex, { derived_by: derived_by.length ? derived_by : undefined })
        }
      />
      <CsvField
        label="Requires (constraints)"
        value={concept.requires}
        onChange={(requires) =>
          updateConcept(componentIndex, { requires: requires.length ? requires : undefined })
        }
      />

      <section className="rounded-card border border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Relationships ({component.relationships?.length ?? 0})
          </h3>
          <PButton
            type="button"
            variant="secondary"
            icon="add"
            compact
            onClick={() => addOntologyRelationship(componentIndex)}
          >
            Add relationship
          </PButton>
        </div>
        <ul className="flex flex-col">
          {(component.relationships ?? []).map((relationship, ri) => (
            <li key={ri}>
              <PButtonPure
                icon="arrow-right"
                alignLabel="start"
                stretch
                onClick={() =>
                  select({ kind: 'ontology-relationship', componentIndex, relationshipIndex: ri })
                }
              >
                {relationship.name || '(unnamed relationship)'}
              </PButtonPure>
            </li>
          ))}
          {(component.relationships?.length ?? 0) === 0 && (
            <li className="text-xs text-content-muted">No relationships yet.</li>
          )}
        </ul>
      </section>

      <ConfirmDialog
        open={confirming}
        heading="Delete referenced concept?"
        message={`"${concept.name}" is referenced by ${references} relationship role(s) or concept mapping(s). Deleting it will leave those references dangling.`}
        confirmLabel="Delete anyway"
        cancelLabel="Keep concept"
        destructive
        onConfirm={() => {
          setConfirming(false);
          deleteConcept(componentIndex);
        }}
        onCancel={() => setConfirming(false)}
      />
    </FormShell>
  );
}
