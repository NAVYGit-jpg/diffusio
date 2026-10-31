import { describe, expect, it } from 'vitest';

import { type ElementCatalogue, statistiquesCatalogue } from './statistiques';

function element(modifications: Partial<ElementCatalogue> = {}): ElementCatalogue {
  return {
    type: 'PUBLICATION',
    nom: 'Bulletin',
    structure: 'DSS',
    domaine: 'Prix',
    periodicite: 'MENSUELLE',
    delaiJours: 20,
    actif: true,
    ...modifications,
  };
}

describe('statistiquesCatalogue', () => {
  it('compte publications et indicateurs séparément', () => {
    const s = statistiquesCatalogue([
      element(),
      element({ type: 'INDICATEUR' }),
      element({ type: 'INDICATEUR' }),
    ]);

    expect(s).toMatchObject({ total: 3, publications: 1, indicateurs: 2 });
  });

  it('ne compte pas « sans domaine » comme un domaine couvert', () => {
    const s = statistiquesCatalogue([element(), element({ domaine: null })]);

    expect(s.domainesCouverts).toBe(1);
    expect(s.parDomaine.map((part) => part.libelle)).toContain('Sans domaine');
  });

  it('traduit la périodicité en libellé lisible', () => {
    const s = statistiquesCatalogue([element({ periodicite: 'TRIMESTRIELLE' })]);

    expect(s.parPeriodicite[0].libelle).toBe('Trimestrielle');
  });

  it('calcule le délai moyen, et rend null sur un catalogue vide', () => {
    expect(statistiquesCatalogue([element({ delaiJours: 10 }), element({ delaiJours: 25 })]).delaiMoyen).toBe(17.5);
    expect(statistiquesCatalogue([]).delaiMoyen).toBeNull();
  });

  it('classe les répartitions par effectif décroissant', () => {
    const s = statistiquesCatalogue([
      element({ structure: 'A' }),
      element({ structure: 'B' }),
      element({ structure: 'B' }),
    ]);

    expect(s.parStructure[0]).toEqual({ libelle: 'B', nombre: 2 });
  });
});
