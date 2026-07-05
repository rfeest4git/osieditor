import type {
  ConceptMapping,
  Diagnostic,
  LinkMapping,
  ObjectMapping,
  ReferentMapping,
} from '@osi-editor/osi-schema';
import { PButton, PButtonPure } from '@porsche-design-system/components-react';
import { fieldErrors } from '../../lib/diagnostics.js';
import { useEditorStore } from '../../store/editorStore.js';
import { SelectField } from '../ui/SelectField.js';
import { TextField } from '../ui/TextField.js';
import { FormShell } from './FormShell.js';

/**
 * Concept mapping detail form: binds a concept to logical (semantic-model)
 * expressions through the nested `object_mappings` and `link_mappings` trees.
 * The trees are edited structurally — add/remove/edit of referent and child
 * nodes — rather than as raw JSON.
 */
export function ConceptMappingForm({
  conceptMapping,
  mapIndex,
  conceptMappingIndex,
  conceptOptions,
  diagnostics,
}: {
  conceptMapping: ConceptMapping;
  mapIndex: number;
  conceptMappingIndex: number;
  conceptOptions: string[];
  diagnostics: Diagnostic[];
}) {
  const updateConceptMapping = useEditorStore((s) => s.updateConceptMapping);
  const deleteConceptMapping = useEditorStore((s) => s.deleteConceptMapping);
  const errorAt = fieldErrors(diagnostics, [
    'ontology_mappings',
    mapIndex,
    'concept_mappings',
    conceptMappingIndex,
  ]);

  const patch = (p: Partial<ConceptMapping>) =>
    updateConceptMapping(mapIndex, conceptMappingIndex, p);

  const objectMappings = conceptMapping.object_mappings ?? [];
  const linkMappings = conceptMapping.link_mappings ?? [];

  const conceptChoices = [
    ...(conceptMapping.concept && !conceptOptions.includes(conceptMapping.concept)
      ? [conceptMapping.concept]
      : []),
    ...conceptOptions,
  ].map((c) => ({ value: c, label: c }));

  return (
    <FormShell
      title="Concept mapping"
      subtitle="Binds a concept to logical-model expressions."
      onDelete={() => deleteConceptMapping(mapIndex, conceptMappingIndex)}
    >
      <SelectField
        label="Concept"
        value={conceptMapping.concept}
        options={conceptChoices}
        error={errorAt('concept')}
        onChange={(concept) => patch({ concept })}
      />

      <TreeSection
        title="Object mappings"
        count={objectMappings.length}
        onAdd={() => patch({ object_mappings: [...objectMappings, {}] })}
      >
        {objectMappings.map((om, i) => (
          <ObjectMappingEditor
            key={i}
            value={om}
            onChange={(next) =>
              patch({ object_mappings: replaceAt(objectMappings, i, next) })
            }
            onRemove={() => patch({ object_mappings: removeAt(objectMappings, i) })}
          />
        ))}
        {objectMappings.length === 0 && <EmptyHint>No object mappings.</EmptyHint>}
      </TreeSection>

      <TreeSection
        title="Link mappings"
        count={linkMappings.length}
        onAdd={() => patch({ link_mappings: [...linkMappings, { object_mapping: {} }] })}
      >
        {linkMappings.map((lm, i) => (
          <LinkMappingEditor
            key={i}
            value={lm}
            onChange={(next) => patch({ link_mappings: replaceAt(linkMappings, i, next) })}
            onRemove={() => patch({ link_mappings: removeAt(linkMappings, i) })}
          />
        ))}
        {linkMappings.length === 0 && <EmptyHint>No link mappings.</EmptyHint>}
      </TreeSection>
    </FormShell>
  );
}

/* --------------------------------- editors -------------------------------- */

function ObjectMappingEditor({
  value,
  onChange,
  onRemove,
}: {
  value: ObjectMapping;
  onChange: (next: ObjectMapping) => void;
  onRemove: () => void;
}) {
  const referents = value.referent_mappings ?? [];
  return (
    <TreeNode label="Object mapping" onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Concept"
          value={value.concept ?? ''}
          onChange={(concept) => onChange({ ...value, concept: concept || undefined })}
        />
        <TextField
          label="Expression"
          value={value.expression ?? ''}
          placeholder="dataset.column"
          onChange={(expression) => onChange({ ...value, expression: expression || undefined })}
        />
      </div>
      <TreeSection
        title="Referent mappings"
        count={referents.length}
        onAdd={() => onChange({ ...value, referent_mappings: [...referents, { relationship: '' }] })}
      >
        {referents.map((rm, i) => (
          <ReferentMappingEditor
            key={i}
            value={rm}
            onChange={(next) =>
              onChange({ ...value, referent_mappings: replaceAt(referents, i, next) })
            }
            onRemove={() =>
              onChange({ ...value, referent_mappings: removeAt(referents, i) })
            }
          />
        ))}
      </TreeSection>
    </TreeNode>
  );
}

function ReferentMappingEditor({
  value,
  onChange,
  onRemove,
}: {
  value: ReferentMapping;
  onChange: (next: ReferentMapping) => void;
  onRemove: () => void;
}) {
  const nested = value.referent_mappings ?? [];
  return (
    <TreeNode label="Referent" onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Relationship"
          value={value.relationship ?? ''}
          onChange={(relationship) => onChange({ ...value, relationship })}
        />
        <TextField
          label="Expression"
          value={value.expression ?? ''}
          placeholder="dataset.column"
          onChange={(expression) => onChange({ ...value, expression: expression || undefined })}
        />
      </div>
      <TreeSection
        title="Nested referents"
        count={nested.length}
        onAdd={() =>
          onChange({ ...value, referent_mappings: [...nested, { relationship: '' }] })
        }
      >
        {nested.map((rm, i) => (
          <ReferentMappingEditor
            key={i}
            value={rm}
            onChange={(next) => onChange({ ...value, referent_mappings: replaceAt(nested, i, next) })}
            onRemove={() => onChange({ ...value, referent_mappings: removeAt(nested, i) })}
          />
        ))}
      </TreeSection>
    </TreeNode>
  );
}

function LinkMappingEditor({
  value,
  onChange,
  onRemove,
}: {
  value: LinkMapping;
  onChange: (next: LinkMapping) => void;
  onRemove: () => void;
}) {
  const children = value.children ?? [];
  return (
    <TreeNode label="Link" onRemove={onRemove}>
      <TextField
        label="Relationship"
        value={value.relationship ?? ''}
        onChange={(relationship) => onChange({ ...value, relationship: relationship || undefined })}
      />
      <div className="mt-2 rounded border border-border p-2">
        <p className="mb-1 text-xs font-semibold text-content-muted">Object mapping</p>
        <ObjectMappingEditor
          value={value.object_mapping ?? {}}
          onChange={(object_mapping) => onChange({ ...value, object_mapping })}
          onRemove={() => onChange({ ...value, object_mapping: {} })}
        />
      </div>
      <TreeSection
        title="Children"
        count={children.length}
        onAdd={() => onChange({ ...value, children: [...children, { object_mapping: {} }] })}
      >
        {children.map((lm, i) => (
          <LinkMappingEditor
            key={i}
            value={lm}
            onChange={(next) => onChange({ ...value, children: replaceAt(children, i, next) })}
            onRemove={() => onChange({ ...value, children: removeAt(children, i) })}
          />
        ))}
      </TreeSection>
    </TreeNode>
  );
}

/* ------------------------------ presentation ------------------------------ */

function TreeSection({
  title,
  count,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {title} ({count})
        </h3>
        <PButton type="button" variant="secondary" icon="add" compact onClick={onAdd}>
          Add
        </PButton>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function TreeNode({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-border bg-surface-sunken/40 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-content-muted">
          {label}
        </span>
        <PButtonPure icon="delete" hideLabel onClick={onRemove} aria={{ 'aria-label': `Remove ${label}` }}>
          Remove
        </PButtonPure>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-content-muted">{children}</p>;
}

/* -------------------------------- helpers --------------------------------- */

function replaceAt<T>(arr: T[], index: number, next: T): T[] {
  const copy = arr.slice();
  copy[index] = next;
  return copy;
}

function removeAt<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index);
}
