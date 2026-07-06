import { describe, expect, it } from 'vitest';
import { createOntologyRelationship } from './factory.js';
import { OntologyRelationshipSchema } from './model.js';

describe('createOntologyRelationship', () => {
  it('seeds a relationship without a derived_by join by default', () => {
    const rel = createOntologyRelationship('Vehicle_Owner', 'Vehicle', 'Owner');
    expect(rel.roles).toEqual([{ concept: 'Owner' }]);
    expect(rel.verbalizes).toEqual(['{Vehicle} Vehicle_Owner {Owner}']);
    expect(rel.multiplicity).toBe('ManyToOne');
    expect(rel.derived_by).toBeUndefined();
    expect(OntologyRelationshipSchema.safeParse(rel).success).toBe(true);
  });

  it('seeds a derived_by join when provided', () => {
    const rel = createOntologyRelationship(
      'Vehicle_Owner',
      'Vehicle',
      'Owner',
      'Vehicle.vin == Owner.vin',
    );
    expect(rel.roles).toEqual([{ concept: 'Owner' }]);
    expect(rel.verbalizes).toEqual(['{Vehicle} Vehicle_Owner {Owner}']);
    expect(rel.multiplicity).toBe('ManyToOne');
    expect(rel.derived_by).toEqual(['Vehicle.vin == Owner.vin']);
    expect(OntologyRelationshipSchema.safeParse(rel).success).toBe(true);
  });
});
