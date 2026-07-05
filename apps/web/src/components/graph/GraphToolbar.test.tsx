import { describe, expect, it, vi } from 'vitest';
import { buildGraphToolbarActions, type ToolbarCreators } from './GraphToolbar.js';

function creators(): ToolbarCreators {
  return {
    addConcept: vi.fn(),
    addDataset: vi.fn(),
    addMetric: vi.fn(),
    addRelationship: vi.fn(),
  };
}

const keys = (opts: Parameters<typeof buildGraphToolbarActions>[0]) =>
  buildGraphToolbarActions(opts).map((a) => a.key);

describe('buildGraphToolbarActions', () => {
  it('shows dataset/metric/relationship on the semantic-model layer', () => {
    expect(keys({ layer: 'semantic-model', hasModel: true, datasetCount: 2, creators: creators() })).toEqual(
      ['dataset', 'metric', 'relationship'],
    );
  });

  it('shows only the concept action on the ontology layer', () => {
    expect(keys({ layer: 'ontology', hasModel: true, datasetCount: 5, creators: creators() })).toEqual([
      'concept',
    ]);
  });

  it('shows concept + semantic actions on the unified layer', () => {
    expect(keys({ layer: 'unified', hasModel: true, datasetCount: 3, creators: creators() })).toEqual([
      'concept',
      'dataset',
      'metric',
      'relationship',
    ]);
  });

  it('omits semantic actions when there is no active model', () => {
    expect(keys({ layer: 'semantic-model', hasModel: false, datasetCount: 0, creators: creators() })).toEqual(
      [],
    );
    expect(keys({ layer: 'unified', hasModel: false, datasetCount: 0, creators: creators() })).toEqual([
      'concept',
    ]);
  });

  it('disables Add relationship with fewer than two datasets, enables it with two or more', () => {
    const rel = (datasetCount: number) =>
      buildGraphToolbarActions({ layer: 'semantic-model', hasModel: true, datasetCount, creators: creators() }).find(
        (a) => a.key === 'relationship',
      );

    expect(rel(0)?.disabled).toBe(true);
    expect(rel(1)?.disabled).toBe(true);
    expect(rel(1)?.hint).toBeTruthy();
    expect(rel(2)?.disabled).toBe(false);
    expect(rel(2)?.hint).toBeUndefined();
  });

  it('routes each action to its matching store creator', () => {
    const c = creators();
    const actions = buildGraphToolbarActions({ layer: 'unified', hasModel: true, datasetCount: 2, creators: c });
    const run = (key: string) => actions.find((a) => a.key === key)?.run();

    run('concept');
    run('dataset');
    run('metric');
    run('relationship');

    expect(c.addConcept).toHaveBeenCalledOnce();
    expect(c.addDataset).toHaveBeenCalledOnce();
    expect(c.addMetric).toHaveBeenCalledOnce();
    expect(c.addRelationship).toHaveBeenCalledOnce();
  });
});
