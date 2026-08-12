import { describe, expect, it } from 'vitest';

import { jour } from '@/lib/calendrier/dates';
import {
  anneeParDefaut,
  anneesProposees,
  lireAnnee,
  lireFiltres,
  lireParametre,
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

describe('lireFiltres', () => {
  it('lit les quatre filtres ensemble', () => {
    expect(
      lireFiltres(
        {
          annee: '2027',
          structure: 'str-1',
          domaine: 'dom-1',
          periodicite: 'MENSUELLE',
        },
        jour(2026, 3, 1),
      ),
    ).toEqual({
      annee: 2027,
      structureId: 'str-1',
      domaineId: 'dom-1',
      periodicite: 'MENSUELLE',
    });
  });

  it('ne pose aucun filtre sur une adresse nue', () => {
    expect(lireFiltres({}, jour(2026, 3, 1))).toEqual({
      annee: 2026,
      structureId: null,
      domaineId: null,
      periodicite: null,
    });
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
