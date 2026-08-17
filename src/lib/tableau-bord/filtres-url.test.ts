import { describe, expect, it } from 'vitest';

import { jour } from '@/lib/calendrier/dates';
import {
  adresseTableauDeBord,
  anneeParDefaut,
  anneesProposees,
  lireAnnee,
  lireFiltres,
  lireMois,
  lireParametre,
  lireParametres,
} from './filtres-url';

describe('lireParametre', () => {
  it('lit une valeur simple', () => {
    expect(lireParametre({ structure: 'str-1' }, 'structure')).toBe('str-1');
  });

  it('retient la première valeur quand la clé est répétée', () => {
    expect(lireParametre({ structure: ['a', 'b'] }, 'structure')).toBe('a');
  });

  it('traite une valeur vide comme absente', () => {
    // « ?structure= » signifie « pas de filtre », pas « structure nommée "" ».
    expect(lireParametre({ structure: '' }, 'structure')).toBeNull();
    expect(lireParametre({ structure: '   ' }, 'structure')).toBeNull();
  });

  it('retourne null pour une clé absente', () => {
    expect(lireParametre({}, 'structure')).toBeNull();
  });
});

describe('lireAnnee', () => {
  it("retombe sur l'année par défaut quand le paramètre est absent", () => {
    // Number(null) vaut 0, et Number.isInteger(0) est vrai : sans ce garde-fou
    // le tableau de bord travaillait sur « l'année 0 ».
    expect(lireAnnee({}, 2026)).toBe(2026);
  });

  it('lit une année valide', () => {
    expect(lireAnnee({ annee: '2027' }, 2026)).toBe(2027);
  });

  it('refuse une année hors de la plage proposée', () => {
    expect(lireAnnee({ annee: '1998' }, 2026)).toBe(2026);
    expect(lireAnnee({ annee: '3000' }, 2026)).toBe(2026);
    expect(lireAnnee({ annee: '0' }, 2026)).toBe(2026);
  });

  it('refuse une saisie qui n’est pas un entier', () => {
    expect(lireAnnee({ annee: 'abc' }, 2026)).toBe(2026);
    expect(lireAnnee({ annee: '2026,5' }, 2026)).toBe(2026);
    expect(lireAnnee({ annee: '2026.5' }, 2026)).toBe(2026);
  });
});

describe('anneeParDefaut', () => {
  it("propose l'année en cours", () => {
    expect(anneeParDefaut(jour(2027, 5, 12))).toBe(2027);
  });

  it('ramène une année trop ancienne dans la plage', () => {
    // Le calendrier ne descend pas sous 2026 (DEC-108).
    expect(anneeParDefaut(jour(2020, 1, 1))).toBe(2026);
  });
});

describe('lireParametres', () => {
  it('lit une clé répétée', () => {
    expect(lireParametres({ domaine: ['a', 'b'] }, 'domaine')).toEqual(['a', 'b']);
  });

  it('lit une liste séparée par des virgules', () => {
    // Une adresse retapée à la main ou raccourcie par un client de messagerie
    // peut arriver sous l'une ou l'autre forme.
    expect(lireParametres({ domaine: 'a,b' }, 'domaine')).toEqual(['a', 'b']);
  });

  it('supprime les doublons et les valeurs vides', () => {
    expect(lireParametres({ domaine: ['a', '', 'a', ' b '] }, 'domaine')).toEqual([
      'a',
      'b',
    ]);
  });

  it('retourne une liste vide pour une clé absente', () => {
    expect(lireParametres({}, 'domaine')).toEqual([]);
  });
});

describe('lireMois', () => {
  it('accepte plusieurs mois, en clés répétées ou en liste', () => {
    expect(lireMois({ mois: ['3', '5'] })).toEqual([3, 5]);
    expect(lireMois({ mois: '3,5' })).toEqual([3, 5]);
  });

  it('classe par ordre chronologique quel que soit l’ordre des clics', () => {
    // Les jetons et l'adresse doivent se lire de janvier à décembre.
    expect(lireMois({ mois: ['11', '2', '7'] })).toEqual([2, 7, 11]);
  });

  it('ne garde qu’une fois un mois coché deux fois', () => {
    expect(lireMois({ mois: ['4', '4'] })).toEqual([4]);
  });

  it('écarte ce qui n’est pas un mois plutôt que de le ramener dans l’année', () => {
    // 0 et 13 sont des fautes de frappe : les transformer en janvier ou en
    // decembre repondrait a une question que personne n'a posee.
    expect(lireMois({ mois: ['0', '13', '-1', '2.5', 'mars', ''] })).toEqual([]);
  });

  it('garde les mois valides d’une liste partiellement fautive', () => {
    expect(lireMois({ mois: ['3', '13', '6'] })).toEqual([3, 6]);
  });

  it('ne pose aucun filtre en l’absence de la clé', () => {
    expect(lireMois({})).toEqual([]);
  });
});

describe('lireFiltres', () => {
  it('lit les six filtres ensemble', () => {
    expect(
      lireFiltres(
        {
          annee: '2027',
          mois: ['1', '2', '3'],
          structure: ['str-1', 'str-2'],
          domaine: 'dom-1',
          periodicite: ['MENSUELLE', 'ANNUELLE'],
          type: 'PUBLICATION',
        },
        jour(2026, 3, 1),
      ),
    ).toEqual({
      annee: 2027,
      mois: [1, 2, 3],
      structureIds: ['str-1', 'str-2'],
      domaineIds: ['dom-1'],
      periodicites: ['MENSUELLE', 'ANNUELLE'],
      typesElement: ['PUBLICATION'],
    });
  });

  it('ne pose aucun filtre sur une adresse nue', () => {
    // Listes vides : « tout », jamais « rien ».
    expect(lireFiltres({}, jour(2026, 3, 1))).toEqual({
      annee: 2026,
      mois: [],
      structureIds: [],
      domaineIds: [],
      periodicites: [],
      typesElement: [],
    });
  });

  it('écarte un type de produit inconnu', () => {
    // Le laisser passer ferait remonter une requête sans aucun résultat.
    const filtres = lireFiltres(
      { type: ['PUBLICATION', 'AUTRE_CHOSE'] },
      jour(2026, 3, 1),
    );

    expect(filtres.typesElement).toEqual(['PUBLICATION']);
  });
});

describe('adresseTableauDeBord', () => {
  it('répète la clé pour chaque valeur choisie', () => {
    const adresse = adresseTableauDeBord({
      annee: 2026,
      mois: [],
      structureIds: ['a', 'b'],
      domaineIds: [],
      periodicites: [],
      typesElement: ['INDICATEUR'],
    });

    expect(adresse).toBe(
      '/tableau-de-bord?annee=2026&structure=a&structure=b&type=INDICATEUR',
    );
  });

  it('écrit les mois en clés répétées', () => {
    expect(
      adresseTableauDeBord({
        annee: 2026,
        mois: [1, 2, 3],
        structureIds: [],
        domaineIds: [],
        periodicites: [],
        typesElement: [],
      }),
    ).toBe('/tableau-de-bord?annee=2026&mois=1&mois=2&mois=3');
  });

  it('fait l’aller-retour sans rien perdre', () => {
    const depart = {
      annee: 2027,
      mois: [4, 9],
      structureIds: ['s1', 's2'],
      domaineIds: ['d1'],
      periodicites: ['MENSUELLE'],
      typesElement: ['PUBLICATION' as const],
    };

    const parametres = Object.fromEntries(
      [...new URLSearchParams(adresseTableauDeBord(depart).split('?')[1])].reduce(
        (accumulateur, [cle, valeur]) => {
          const existant = accumulateur.get(cle);
          accumulateur.set(cle, existant ? [...existant, valeur] : [valeur]);

          return accumulateur;
        },
        new Map<string, string[]>(),
      ),
    );

    expect(lireFiltres(parametres, jour(2026, 3, 1))).toEqual(depart);
  });
});

describe('anneesProposees', () => {
  it('classe de la plus récente à la plus ancienne', () => {
    expect(anneesProposees([2026, 2028, 2027], 2026)).toEqual([2028, 2027, 2026]);
  });

  it('ajoute l’année sélectionnée si elle n’a pas encore de calendrier', () => {
    // Sinon la liste déroulante ne pourrait pas afficher sa propre valeur.
    expect(anneesProposees([2026], 2029)).toEqual([2029, 2026]);
  });

  it('ne produit aucun doublon', () => {
    expect(anneesProposees([2026, 2026], 2026)).toEqual([2026]);
  });

  it('écarte une année aberrante venue de la base', () => {
    expect(anneesProposees([0, 1970, 2026], 2026)).toEqual([2026]);
  });
});
