import { describe, expect, it } from 'vitest';

import {
  type ColonneAttendue,
  analyserGrille,
  associerColonnes,
  detecterDoublons,
  ligneVide,
  normaliserEntete,
} from './analyse';

const COLONNES: ColonneAttendue[] = [
  { cle: 'nom', entetes: ['Nom'], obligatoire: true },
  { cle: 'code', entetes: ['Code'], obligatoire: true },
  { cle: 'description', entetes: ['Description'], obligatoire: false },
];

type LigneLue = { valeurs: Record<string, string>; ligne: number };

/** Accepts any row, echoing the values plus its line number. */
const validerToujours = (
  valeurs: Record<string, string>,
  ligne: number,
): { ok: true; valeur: LigneLue } => ({ ok: true, valeur: { valeurs, ligne } });

describe('normaliserEntete', () => {
  it('ignore la casse, les accents et les espaces superflus', () => {
    expect(normaliserEntete('  SIGLE  ')).toBe('sigle');
    expect(normaliserEntete('Périodicité')).toBe('periodicite');
    expect(normaliserEntete('DÉLAI')).toBe('delai');
  });

  it('ignore les marqueurs d obligation ajoutes a la main', () => {
    // Les gens ecrivent souvent « Nom* » ou « Nom : » dans leurs modeles.
    expect(normaliserEntete('Nom*')).toBe('nom');
    expect(normaliserEntete('Nom :')).toBe('nom');
  });

  it('ecrase les espaces multiples', () => {
    expect(normaliserEntete('Structure   parente')).toBe('structure parente');
  });

  it('gere les cellules vides ou absentes', () => {
    expect(normaliserEntete(null)).toBe('');
    expect(normaliserEntete(undefined)).toBe('');
  });
});

describe('ligneVide', () => {
  it('detecte une ligne entierement vide', () => {
    expect(ligneVide([null, undefined, '', '   '])).toBe(true);
  });

  it('ne considere pas vide une ligne avec une seule valeur', () => {
    expect(ligneVide([null, 'x', ''])).toBe(false);
  });

  it('traite le zero comme une valeur, pas comme du vide', () => {
    expect(ligneVide([0])).toBe(false);
  });
});

describe('associerColonnes', () => {
  it('retrouve les colonnes quel que soit leur ordre', () => {
    const { indices, manquantes } = associerColonnes(
      ['Code', 'Description', 'Nom'],
      COLONNES,
    );

    expect(manquantes).toEqual([]);
    expect(indices).toEqual({ code: 0, description: 1, nom: 2 });
  });

  it('signale uniquement les colonnes obligatoires absentes', () => {
    const { indices, manquantes } = associerColonnes(['Nom'], COLONNES);

    expect(manquantes).toEqual(['Code']);
    expect(indices.description).toBeUndefined();
  });

  it('accepte plusieurs libelles pour une meme colonne', () => {
    const colonnes: ColonneAttendue[] = [
      { cle: 'parent', entetes: ['Structure parente', 'Parent'], obligatoire: false },
    ];

    expect(associerColonnes(['Parent'], colonnes).indices.parent).toBe(0);
    expect(associerColonnes(['Structure parente'], colonnes).indices.parent).toBe(0);
  });
});

describe('analyserGrille', () => {
  it('produit un enregistrement par ligne remplie', () => {
    const resultat = analyserGrille(
      [
        ['Nom', 'Code', 'Description'],
        ['Direction A', 'DIRA', 'Première'],
        ['Direction B', 'DIRB', ''],
      ],
      COLONNES,
      validerToujours,
    );

    expect(resultat.valides).toHaveLength(2);
    expect(resultat.erreurs).toEqual([]);
    expect(resultat.valides[0].ligne).toBe(2);
    expect(resultat.valides[0].valeurs.nom).toBe('Direction A');
  });

  it('numerote les erreurs comme le tableur, en-tete comprise', () => {
    // Une erreur annoncee « ligne 3 » doit se trouver ligne 3 dans Excel.
    const resultat = analyserGrille(
      [
        ['Nom', 'Code'],
        ['Direction A', 'DIRA'],
        ['', 'DIRB'],
      ],
      COLONNES,
      (valeurs, ligne) =>
        valeurs.nom === ''
          ? { ok: false, erreurs: [{ colonne: 'Nom', message: 'Nom manquant.' }] }
          : { ok: true, valeur: { valeurs, ligne } },
    );

    expect(resultat.erreurs).toEqual([
      { ligne: 3, colonne: 'Nom', message: 'Nom manquant.' },
    ]);
  });

  it('ignore les lignes vides sans les compter comme des erreurs', () => {
    const resultat = analyserGrille(
      [
        ['Nom', 'Code'],
        ['Direction A', 'DIRA'],
        ['', ''],
        [null, null],
        ['Direction B', 'DIRB'],
      ],
      COLONNES,
      validerToujours,
    );

    expect(resultat.valides).toHaveLength(2);
    expect(resultat.lignesIgnorees).toBe(2);
    expect(resultat.erreurs).toEqual([]);
  });

  it('remonte toutes les lignes fautives, pas seulement la premiere', () => {
    const resultat = analyserGrille(
      [
        ['Nom', 'Code'],
        ['', 'A'],
        ['', 'B'],
        ['', 'C'],
      ],
      COLONNES,
      () => ({ ok: false, erreurs: [{ message: 'Nom manquant.' }] }),
    );

    expect(resultat.erreurs.map((e) => e.ligne)).toEqual([2, 3, 4]);
  });

  it('refuse le fichier entier si une colonne obligatoire manque', () => {
    const resultat = analyserGrille(
      [
        ['Nom', 'Libellé'],
        ['Direction A', 'x'],
      ],
      COLONNES,
      validerToujours,
    );

    expect(resultat.colonnesManquantes).toEqual(['Code']);
    expect(resultat.valides).toEqual([]);
  });

  it('gere un fichier entierement vide', () => {
    const resultat = analyserGrille([], COLONNES, validerToujours);

    expect(resultat.colonnesManquantes).toEqual(['Nom', 'Code']);
    expect(resultat.valides).toEqual([]);
  });

  it('gere un fichier ne contenant que son en-tete', () => {
    const resultat = analyserGrille(
      [['Nom', 'Code']],
      COLONNES,
      validerToujours,
    );

    expect(resultat.valides).toEqual([]);
    expect(resultat.erreurs).toEqual([]);
    expect(resultat.colonnesManquantes).toEqual([]);
  });

  it('rend une chaine vide pour une colonne facultative absente', () => {
    const resultat = analyserGrille(
      [
        ['Nom', 'Code'],
        ['Direction A', 'DIRA'],
      ],
      COLONNES,
      validerToujours,
    );

    expect(resultat.valides[0].valeurs.description).toBe('');
  });
});

describe('detecterDoublons', () => {
  const elements = [
    { code: 'DIRA', ligne: 2 },
    { code: 'DIRB', ligne: 3 },
    { code: 'dira', ligne: 4 },
  ];

  it('detecte un doublon sans tenir compte de la casse', () => {
    const erreurs = detecterDoublons(
      elements,
      (e) => e.code,
      (e) => e.ligne,
      'Code',
    );

    expect(erreurs).toHaveLength(1);
    expect(erreurs[0].ligne).toBe(4);
    expect(erreurs[0].message).toContain('ligne 2');
  });

  it('ne signale rien quand tout est unique', () => {
    expect(
      detecterDoublons(
        [{ code: 'A', ligne: 2 }],
        (e) => e.code,
        (e) => e.ligne,
        'Code',
      ),
    ).toEqual([]);
  });

  it('ignore les valeurs vides, deja traitees par la validation', () => {
    const erreurs = detecterDoublons(
      [
        { code: '', ligne: 2 },
        { code: '', ligne: 3 },
      ],
      (e) => e.code,
      (e) => e.ligne,
      'Code',
    );

    expect(erreurs).toEqual([]);
  });
});
