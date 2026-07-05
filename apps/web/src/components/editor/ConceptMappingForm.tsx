import type {
  ConceptMapping,
  Diagnostic,
  LinkMapping,
  ObjectMapping,
  ReferentMapping,
} from '@osi-editor/osi-schema';
import { PButton, PButtonPure } from '@porsche-design-system/components-react';
import { useState } from 'react';
import { fieldErrors, type Path } from '../../lib/diagnostics.js';
import {
  composeMappingExpression,
  parseMappingExpression,
  type DatasetFields,
} from '../../lib/mapping.js';
import { useEditorStore } from '../../store/editorStore.js';
import { SelectField } from '../ui/SelectField.js';
import { TextField } from '../ui/TextField.js';
import { FormShell } from './FormShell.js';

/**
 * Concept mapping detail form: binds a concept to logical (semantic-model)
 * expressions through the nested `object_mappings` and `link_mappings` trees.
 * Expressions are edited with a guided Dataset → Field picker sourced from the
 * bound map's semantic model (with a raw-expression fallback), and relationship
 * references with a dropdown of the concept's ontology relationships.
 */
export function ConceptMappingForm({
  conceptMapping,
  mapIndex,
  conceptMappingIndex,
  conceptOptions,
  datasets,
  relationshipOptions,
  diagnostics,
}: {
  conceptMapping: ConceptMapping;
  mapIndex: number;
  conceptMappingIndex: number;
  conceptOptions: string[];
  datasets: DatasetFields[];
  relationshipOptions: string[];
  diagnostics: Diagnostic[];
}) {
  const updateConceptMapping = useEditorStore((s) => s.updateConceptMapping);
  const deleteConceptMapping = useEditorStore((s) => s.deleteConceptMapping);
  const basePath: Path = [
    'ontology_mappings',
    mapIndex,
    'concept_mappings',
    conceptMappingIndex,
  ];
  const errorAt = fieldErrors(diagnostics, basePath);

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

  const shared = { datasets, relationshipOptions, diagnostics };

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
            path={[...basePath, 'object_mappings', i]}
            {...shared}
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
            path={[...basePath, 'link_mappings', i]}
            {...shared}
            onChange={(next) => patch({ link_mappings: replaceAt(linkMappings, i, next) })}
            onRemove={() => patch({ link_mappings: removeAt(linkMappings, i) })}
          />
        ))}
        {linkMappings.length === 0 && <EmptyHint>No link mappings.</EmptyHint>}
      </TreeSection>
    </FormShell>
  );
}

/* ------------------------------- shared props ----------------------------- */

interface NodeContext {
  datasets: DatasetFields[];
  relationshipOptions: string[];
  diagnostics: Diagnostic[];
  path: Path;
}

/* --------------------------------- editors -------------------------------- */

function ObjectMappingEditor({
  value,
  onChange,
  onRemove,
  datasets,
  relationshipOptions,
  diagnostics,
  path,
}: NodeContext & {
  value: ObjectMapping;
  onChange: (next: ObjectMapping) => void;
  onRemove: () => void;
}) {
  const referents = value.referent_mappings ?? [];
  const errorAt = fieldErrors(diagnostics, path);
  return (
    <TreeNode label="Object mapping" onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Concept"
          value={value.concept ?? ''}
          onChange={(concept) => onChange({ ...value, concept: concept || undefined })}
        />
        <ExpressionField
          label="Expression"
          value={value.expression}
          datasets={datasets}
          error={errorAt('expression')}
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
            datasets={datasets}
            relationshipOptions={relationshipOptions}
            diagnostics={diagnostics}
            path={[...path, 'referent_mappings', i]}
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
  datasets,
  relationshipOptions,
  diagnostics,
  path,
}: NodeContext & {
  value: ReferentMapping;
  onChange: (next: ReferentMapping) => void;
  onRemove: () => void;
}) {
  const nested = value.referent_mappings ?? [];
  const errorAt = fieldErrors(diagnostics, path);
  return (
    <TreeNode label="Referent" onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-3">
        <RelationshipField
          value={value.relationship ?? ''}
          options={relationshipOptions}
          error={errorAt('relationship')}
          onChange={(relationship) => onChange({ ...value, relationship })}
        />
        <ExpressionField
          label="Expression"
          value={value.expression}
          datasets={datasets}
          error={errorAt('expression')}
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
            datasets={datasets}
            relationshipOptions={relationshipOptions}
            diagnostics={diagnostics}
            path={[...path, 'referent_mappings', i]}
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
  datasets,
  relationshipOptions,
  diagnostics,
  path,
}: NodeContext & {
  value: LinkMapping;
  onChange: (next: LinkMapping) => void;
  onRemove: () => void;
}) {
  const children = value.children ?? [];
  const errorAt = fieldErrors(diagnostics, path);
  return (
    <TreeNode label="Link" onRemove={onRemove}>
      <RelationshipField
        value={value.relationship ?? ''}
        options={relationshipOptions}
        error={errorAt('relationship')}
        onChange={(relationship) => onChange({ ...value, relationship: relationship || undefined })}
      />
      <div className="mt-2 rounded border border-border p-2">
        <p className="mb-1 text-xs font-semibold text-content-muted">Object mapping</p>
        <ObjectMappingEditor
          value={value.object_mapping ?? {}}
          datasets={datasets}
          relationshipOptions={relationshipOptions}
          diagnostics={diagnostics}
          path={[...path, 'object_mapping']}
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
            datasets={datasets}
            relationshipOptions={relationshipOptions}
            diagnostics={diagnostics}
            path={[...path, 'children', i]}
            onChange={(next) => onChange({ ...value, children: replaceAt(children, i, next) })}
            onRemove={() => onChange({ ...value, children: removeAt(children, i) })}
          />
        ))}
      </TreeSection>
    </TreeNode>
  );
}

/* ------------------------------- guided fields ---------------------------- */

/**
 * Edits a mapping `expression` as a guided Dataset → Field pair (composing the
 * `dataset.field` string), with a toggle to a raw-text input for custom
 * expressions no field pair produces. Defaults to raw when the current value does
 * not resolve to a known field, or when the map has no datasets yet.
 */
function ExpressionField({
  label,
  value,
  datasets,
  error,
  onChange,
}: {
  label: string;
  value: string | undefined;
  datasets: DatasetFields[];
  error?: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseMappingExpression(value, datasets);
  const [raw, setRaw] = useState<boolean>(
    (!!value && !parsed) || datasets.length === 0,
  );
  const [dataset, setDataset] = useState<string>(parsed?.dataset ?? '');
  const [field, setField] = useState<string>(parsed?.field ?? '');

  if (raw) {
    return (
      <div className="flex flex-col gap-1">
        <TextField
          label={label}
          value={value ?? ''}
          placeholder="dataset.field"
          error={error}
          onChange={onChange}
        />
        {datasets.length > 0 && (
          <ModeToggle label="Use dataset/field pickers" onClick={() => setRaw(false)} />
        )}
      </div>
    );
  }

  const datasetOptions = datasets.map((d) => ({ value: d.name, label: d.name }));
  const fieldOptions = (datasets.find((d) => d.name === dataset)?.fields ?? []).map((f) => ({
    value: f,
    label: f,
  }));

  return (
    <div className="flex flex-col gap-1">
      <SelectField
        label={`${label} · dataset`}
        value={dataset}
        options={datasetOptions}
        error={error}
        onChange={(d) => {
          setDataset(d);
          setField('');
          onChange(composeMappingExpression(d, ''));
        }}
      />
      <SelectField
        label="Field"
        value={field}
        options={fieldOptions}
        disabled={!dataset}
        onChange={(f) => {
          setField(f);
          onChange(composeMappingExpression(dataset, f));
        }}
      />
      <ModeToggle label="Enter a raw expression" onClick={() => setRaw(true)} />
    </div>
  );
}

/**
 * Selects a relationship reference from the mapped concept's ontology
 * relationships, keeping any current value that is not among them (so existing
 * documents never lose data).
 */
function RelationshipField({
  value,
  options,
  error,
  onChange,
}: {
  value: string;
  options: string[];
  error?: string;
  onChange: (value: string) => void;
}) {
  const choices = [
    ...(value && !options.includes(value) ? [value] : []),
    ...options,
  ].map((r) => ({ value: r, label: r }));
  return (
    <SelectField
      label="Relationship"
      value={value}
      options={choices}
      error={error}
      onChange={onChange}
    />
  );
}

function ModeToggle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="self-start text-xs text-content-muted underline hover:text-content"
      onClick={onClick}
    >
      {label}
    </button>
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
