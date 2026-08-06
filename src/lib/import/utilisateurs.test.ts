import { describe, expect, it } from 'vitest';

import {
  analyserImportUtilisateurs,
  decouperCodes,
  estVrai,
  normaliserRole,
} from './utilisateurs';

const ENTETE = [
  'Prénoms',
  'Nom',
  'Adresse e-mail',
  'Profil',
  'Code structure',
  'E-mail du supérieur',
  'Structures supervisées',
  'Titulaire',
];

const CONTEXTE = {
  emailsExistants: [] as string[],
  codesStructures: ['DSD', 'DSS'],
  superAdminsActifs: 1,
};

/** One valid point focal row. */
function pointFocal(
  email = 'awa.kone@example.org',
  code = 'DSD',
): (string | null)[] {
  return ['Awa', 'Kone', email, 'Point focal', code, 'chef@example.org', '', ''];
}

describe('normaliserRole', () => {
  it('accepte les libelles affiches dans l interface', () => {
    expect(normaliserRole('Point focal')).toBe('POINT_FOCAL');
    expect(normaliserRole('Administrateur')).toBe('ADMIN');
    expect(normaliserRole('Super administrateur')).toBe('SUPER_ADMIN');
  });

  it('accepte les valeurs techniques et ignore casse et accents', () => {
    expect(normaliserRole('POINT_FOCAL')).toBe('POINT_FOCAL');
    expect(normaliserRole('  administrateur  ')).toBe('ADMIN');
    expect(normaliserRole('Super-Administrateur')).toBe('SUPER_ADMIN');
  });

  it('rend null sur un profil inconnu', () => {
    expect(normaliserRole('Directeur')).toBeNull();
    expect(normaliserRole('')).toBeNull();
  });
});

describe('estVrai', () => {
  it('reconnait les facons courantes de dire oui', () => {
    for (const valeur of ['oui', 'OUI', 'x', 'X', '1', 'vrai', 'true', 'Yes']) {
      expect(estVrai(valeur)).toBe(true);
    }
  });

  it('traite le vide et « non » comme faux', () => {
    expect(estVrai('')).toBe(false);
    expect(estVrai('non')).toBe(false);
    expect(estVrai('0')).toBe(false);
  });
});

describe('decouperCodes', () => {
  it('accepte le point-virgule comme la virgule', () => {
    expect(decouperCodes('DSD;DSS')).toEqual(['DSD', 'DSS']);
    expect(decouperCodes('DSD, DSS')).toEqual(['DSD', 'DSS']);
  });

  it('ignore les separateurs superflus et les espaces', () => {
    expect(decouperCodes(' dsd ;; , dss ; ')).toEqual(['DSD', 'DSS']);
  });

  it('rend une liste vide pour une cellule vide', () => {
    expect(decouperCodes('')).toEqual([]);
  });
});

describe('analyserImportUtilisateurs', () => {
  it('accepte un fichier correct', () => {
    const rapport = analyserImportUtilisateurs(
      [ENTETE, pointFocal()],
      CONTEXTE,
    );

    expect(rapport.erreurs).toEqual([]);
    expect(rapport.aCreer).toHaveLength(1);
    expect(rapport.aCreer[0].role).toBe('POINT_FOCAL');
    expect(rapport.aCreer[0].codeStructure).toBe('DSD');
  });

  it('signale un code structure inconnu', () => {
    const rapport = analyserImportUtilisateurs(
      [ENTETE, pointFocal('awa@example.org', 'FANTOME')],
      CONTEXTE,
    );

    expect(rapport.erreurs[0].colonne).toBe('Code structure');
    expect(rapport.erreurs[0].message).toContain('FANTOME');
  });

  it('applique les regles metier du paragraphe 4.3', () => {
    // Point focal sans structure ni e-mail de superieur.
    const rapport = analyserImportUtilisateurs(
      [ENTETE, ['Awa', 'Kone', 'awa@example.org', 'Point focal', '', '', '', '']],
      CONTEXTE,
    );

    const colonnes = rapport.erreurs.map((e) => e.colonne).sort();
    expect(colonnes).toEqual(['Code structure', 'E-mail du supérieur']);
  });

  it('accepte un administrateur avec plusieurs structures supervisees', () => {
    const rapport = analyserImportUtilisateurs(
      [
        ENTETE,
        ['Ali', 'Traore', 'ali@example.org', 'Administrateur', '', '', 'DSD;DSS', ''],
      ],
      CONTEXTE,
    );

    expect(rapport.erreurs).toEqual([]);
    expect(rapport.aCreer[0].codesStructuresSupervisees).toEqual(['DSD', 'DSS']);
  });

  it('refuse un administrateur sans structure supervisee', () => {
    const rapport = analyserImportUtilisateurs(
      [ENTETE, ['Ali', 'Traore', 'ali@example.org', 'Administrateur', '', '', '', '']],
      CONTEXTE,
    );

    expect(rapport.erreurs[0].colonne).toBe('Structures supervisées');
  });

  it('detecte un e-mail en double dans le fichier', () => {
    const rapport = analyserImportUtilisateurs(
      [ENTETE, pointFocal('awa@example.org'), pointFocal('AWA@example.org')],
      CONTEXTE,
    );

    expect(rapport.erreurs).toHaveLength(1);
    expect(rapport.erreurs[0].ligne).toBe(3);
    expect(rapport.erreurs[0].colonne).toBe('Adresse e-mail');
  });

  it('ignore les comptes deja enregistres au lieu de les recreer', () => {
    const rapport = analyserImportUtilisateurs(
      [ENTETE, pointFocal('deja@example.org')],
      { ...CONTEXTE, emailsExistants: ['deja@example.org'] },
    );

    expect(rapport.dejaExistants).toEqual(['deja@example.org']);
    expect(rapport.aCreer).toEqual([]);
  });

  it('applique le plafond de 5 super admins sur l ensemble du fichier', () => {
    // 1 deja actif + 5 dans le fichier = 6 : les deux derniers sont refuses.
    const lignes = [1, 2, 3, 4, 5].map((n) => [
      'Super',
      `Admin${n}`,
      `super${n}@example.org`,
      'Super administrateur',
      '',
      '',
      '',
      '',
    ]);

    const rapport = analyserImportUtilisateurs([ENTETE, ...lignes], CONTEXTE);

    expect(rapport.erreurs).toHaveLength(1);
    expect(rapport.erreurs[0].ligne).toBe(6);
    expect(rapport.erreurs[0].message).toContain('Plafond de 5');
  });

  it('accepte exactement le nombre de super admins restants', () => {
    const lignes = [1, 2, 3, 4].map((n) => [
      'Super',
      `Admin${n}`,
      `super${n}@example.org`,
      'Super administrateur',
      '',
      '',
      '',
      '',
    ]);

    const rapport = analyserImportUtilisateurs([ENTETE, ...lignes], CONTEXTE);

    expect(rapport.erreurs).toEqual([]);
    expect(rapport.aCreer).toHaveLength(4);
  });

  it('reconnait les en-tetes alternatifs', () => {
    const rapport = analyserImportUtilisateurs(
      [
        ['Prénom', 'Nom', 'Email', 'Rôle', 'Structure', 'Supérieur'],
        ['Awa', 'Kone', 'awa@example.org', 'Point focal', 'DSD', 'chef@example.org'],
      ],
      CONTEXTE,
    );

    expect(rapport.colonnesManquantes).toEqual([]);
    expect(rapport.erreurs).toEqual([]);
  });

  it('refuse le fichier si une colonne obligatoire manque', () => {
    const rapport = analyserImportUtilisateurs(
      [
        ['Prénoms', 'Nom', 'Adresse e-mail'],
        ['Awa', 'Kone', 'awa@example.org'],
      ],
      CONTEXTE,
    );

    expect(rapport.colonnesManquantes).toEqual(['Profil']);
  });

  it('marque un point focal titulaire', () => {
    const rapport = analyserImportUtilisateurs(
      [
        ENTETE,
        ['Awa', 'Kone', 'awa@example.org', 'Point focal', 'DSD', 'chef@example.org', '', 'oui'],
      ],
      CONTEXTE,
    );

    expect(rapport.aCreer[0].estTitulaire).toBe(true);
  });
});
