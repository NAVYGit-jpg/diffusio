import { describe, expect, it } from 'vitest';

import { peutGererCeCompte, rolesAttribuables } from './permissions';

const SUPER = {
  id: 's', role: 'SUPER_ADMIN' as const,
  structureId: null, structuresAdmin: [] as string[],
};
const ADMIN = {
  id: 'a', role: 'ADMIN' as const,
  structureId: null, structuresAdmin: ['str-1', 'str-2'],
};
const FOCAL = {
  id: 'f', role: 'POINT_FOCAL' as const,
  structureId: 'str-1', structuresAdmin: [] as string[],
};

describe('peutGererCeCompte', () => {
  it('le super administrateur gere toute l’organisation', () => {
    expect(peutGererCeCompte(SUPER, { role: 'SUPER_ADMIN', structureId: null })).toBe(true);
    expect(peutGererCeCompte(SUPER, { role: 'ADMIN', structureId: null })).toBe(true);
    expect(peutGererCeCompte(SUPER, { role: 'POINT_FOCAL', structureId: 'str-9' })).toBe(true);
  });

  it('l’administrateur gere les points focaux de ses structures', () => {
    expect(peutGererCeCompte(ADMIN, { role: 'POINT_FOCAL', structureId: 'str-1' })).toBe(true);
    expect(peutGererCeCompte(ADMIN, { role: 'POINT_FOCAL', structureId: 'str-2' })).toBe(true);
  });

  it('mais pas ceux d’une structure qu’il ne supervise pas', () => {
    expect(peutGererCeCompte(ADMIN, { role: 'POINT_FOCAL', structureId: 'str-9' })).toBe(false);
  });

  it('ni un point focal sans structure', () => {
    expect(peutGererCeCompte(ADMIN, { role: 'POINT_FOCAL', structureId: null })).toBe(false);
  });

  it('ni ses pairs, ni le super administrateur', () => {
    // C'est la porte d'elevation de privileges : un administrateur qui pourrait
    // modifier un pair ou le compte central se donnerait ses propres droits.
    expect(peutGererCeCompte(ADMIN, { role: 'ADMIN', structureId: 'str-1' })).toBe(false);
    expect(peutGererCeCompte(ADMIN, { role: 'SUPER_ADMIN', structureId: 'str-1' })).toBe(false);
  });

  it('un point focal ne gere personne', () => {
    expect(peutGererCeCompte(FOCAL, { role: 'POINT_FOCAL', structureId: 'str-1' })).toBe(false);
  });
});

describe('rolesAttribuables', () => {
  it('le super administrateur attribue les trois roles', () => {
    expect(rolesAttribuables(SUPER)).toEqual(['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL']);
  });

  it('l’administrateur ne cree que des points focaux', () => {
    expect(rolesAttribuables(ADMIN)).toEqual(['POINT_FOCAL']);
  });

  it('un point focal n’attribue rien', () => {
    expect(rolesAttribuables(FOCAL)).toEqual([]);
  });
});
