import { describe, expect, it } from 'vitest';

import {
  type CandidatUtilisateur,
  PLAFOND_SUPER_ADMIN,
  estLeDernierSuperAdmin,
  libelleQuotaSuperAdmin,
  peutAjouterSuperAdmin,
  titulaireADemettre,
  validerCoherenceRole,
} from './regles';

function candidat(
  modifications: Partial<CandidatUtilisateur> = {},
): CandidatUtilisateur {
  return {
    role: 'POINT_FOCAL',
    structureId: 'str_a',
    emailSuperieur: 'chef@example.org',
    structuresAdmin: [],
    estTitulaire: false,
    ...modifications,
  };
}

/** Convenience: the list of faulty field names. */
function champs(erreurs: { champ: string }[]): string[] {
  return erreurs.map((erreur) => erreur.champ).sort();
}

describe('validerCoherenceRole — point focal', () => {
  it('accepte un point focal complet', () => {
    expect(validerCoherenceRole(candidat())).toEqual([]);
  });

  it('exige une structure', () => {
    expect(champs(validerCoherenceRole(candidat({ structureId: null })))).toEqual([
      'structureId',
    ]);
  });

  it("exige l'e-mail du superieur", () => {
    expect(
      champs(validerCoherenceRole(candidat({ emailSuperieur: null }))),
    ).toEqual(['emailSuperieur']);
  });

  it('accepte un point focal qui est son propre superieur', () => {
    // Cas explicitement prevu par le paragraphe 4.3.
    const erreurs = validerCoherenceRole(
      candidat({ emailSuperieur: 'pf@example.org' }),
    );

    expect(erreurs).toEqual([]);
  });

  it('accepte un point focal titulaire', () => {
    expect(validerCoherenceRole(candidat({ estTitulaire: true }))).toEqual([]);
  });

  it('refuse un point focal qui superviserait des structures', () => {
    expect(
      champs(validerCoherenceRole(candidat({ structuresAdmin: ['str_b'] }))),
    ).toEqual(['structuresAdmin']);
  });

  it('remonte toutes les erreurs en une seule fois', () => {
    const erreurs = validerCoherenceRole(
      candidat({ structureId: null, emailSuperieur: null }),
    );

    expect(champs(erreurs)).toEqual(['emailSuperieur', 'structureId']);
  });
});

describe('validerCoherenceRole — administrateurs', () => {
  it('accepte un admin affecte a au moins une structure', () => {
    const erreurs = validerCoherenceRole(
      candidat({
        role: 'ADMIN',
        structureId: null,
        emailSuperieur: null,
        structuresAdmin: ['str_a'],
      }),
    );

    expect(erreurs).toEqual([]);
  });

  it('refuse un admin sans aucune structure affectee', () => {
    // Un tel compte se connecterait sur une application entierement vide.
    const erreurs = validerCoherenceRole(
      candidat({
        role: 'ADMIN',
        structureId: null,
        emailSuperieur: null,
        structuresAdmin: [],
      }),
    );

    expect(champs(erreurs)).toEqual(['structuresAdmin']);
  });

  it('refuse un admin rattache a une structure', () => {
    const erreurs = validerCoherenceRole(
      candidat({ role: 'ADMIN', structureId: 'str_a', structuresAdmin: ['str_a'] }),
    );

    expect(champs(erreurs)).toEqual(['structureId']);
  });

  it('accepte un super admin sans rattachement ni affectation', () => {
    const erreurs = validerCoherenceRole(
      candidat({ role: 'SUPER_ADMIN', structureId: null, emailSuperieur: null }),
    );

    expect(erreurs).toEqual([]);
  });

  it('refuse un super admin avec des structures affectees', () => {
    const erreurs = validerCoherenceRole(
      candidat({
        role: 'SUPER_ADMIN',
        structureId: null,
        structuresAdmin: ['str_a'],
      }),
    );

    expect(champs(erreurs)).toEqual(['structuresAdmin']);
  });

  it('refuse un administrateur marque titulaire', () => {
    const erreurs = validerCoherenceRole(
      candidat({
        role: 'SUPER_ADMIN',
        structureId: null,
        estTitulaire: true,
      }),
    );

    expect(champs(erreurs)).toEqual(['estTitulaire']);
  });
});

describe('peutAjouterSuperAdmin', () => {
  const cinq = ['a', 'b', 'c', 'd', 'e'];

  it('autorise tant que le plafond n est pas atteint', () => {
    expect(peutAjouterSuperAdmin(['a', 'b', 'c', 'd'])).toBe(true);
  });

  it('refuse au-dela du plafond de 5', () => {
    expect(cinq).toHaveLength(PLAFOND_SUPER_ADMIN);
    expect(peutAjouterSuperAdmin(cinq)).toBe(false);
  });

  it('autorise la modification d un super admin existant au plafond', () => {
    // Sans exclusion de l'identifiant modifie, enregistrer le 5e compte
    // deja existant serait refuse a tort.
    expect(peutAjouterSuperAdmin(cinq, 'c')).toBe(true);
  });

  it('refuse la promotion d un tiers quand le plafond est atteint', () => {
    expect(peutAjouterSuperAdmin(cinq, 'inconnu')).toBe(false);
  });

  it('autorise la creation quand il n y en a aucun', () => {
    expect(peutAjouterSuperAdmin([])).toBe(true);
  });
});

describe('libelleQuotaSuperAdmin', () => {
  it('affiche le compteur demande au paragraphe 9.3', () => {
    expect(libelleQuotaSuperAdmin(3)).toBe('3 / 5 utilisés');
  });
});

describe('estLeDernierSuperAdmin', () => {
  it('detecte le dernier super admin actif', () => {
    expect(estLeDernierSuperAdmin(['seul'], 'seul')).toBe(true);
  });

  it("n'alerte pas s'il en reste d'autres", () => {
    expect(estLeDernierSuperAdmin(['a', 'b'], 'a')).toBe(false);
  });

  it("n'alerte pas pour un compte qui n'est pas super admin", () => {
    expect(estLeDernierSuperAdmin(['a'], 'autre')).toBe(false);
  });
});

describe('titulaireADemettre', () => {
  const equipe = [
    { id: 'pf1', estTitulaire: true },
    { id: 'pf2', estTitulaire: false },
  ];

  it('rend le titulaire actuel quand un autre est promu', () => {
    expect(titulaireADemettre(equipe, 'pf2', true)).toBe('pf1');
  });

  it('ne demet personne si le candidat est deja titulaire', () => {
    expect(titulaireADemettre(equipe, 'pf1', true)).toBeNull();
  });

  it('ne demet personne pour un simple suppleant', () => {
    expect(titulaireADemettre(equipe, 'pf2', false)).toBeNull();
  });

  it('ne demet personne dans une structure sans titulaire', () => {
    const sansTitulaire = [{ id: 'pf2', estTitulaire: false }];

    expect(titulaireADemettre(sansTitulaire, null, true)).toBeNull();
  });

  it('gere la creation d un titulaire, sans identifiant encore attribue', () => {
    expect(titulaireADemettre(equipe, null, true)).toBe('pf1');
  });
});
