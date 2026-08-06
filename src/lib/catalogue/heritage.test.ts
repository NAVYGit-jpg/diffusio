import { describe, expect, it } from 'vitest';

import {
  CHAMPS_HERITES,
  type ValeursPlanification,
  appliquerHeritage,
  heritageADiverge,
  nombreDeLignesParAn,
  validerPlanification,
} from './heritage';

function valeurs(
  modifications: Partial<ValeursPlanification> = {},
): ValeursPlanification {
  return {
    domaineId: 'dom_eco',
    periodicite: 'MENSUELLE',
    nombreAnneesPeriodicite: null,
    delaiJours: 10,
    delaiType: 'CALENDAIRES',
    reportSiWeekendOuFerie: false,
    ...modifications,
  };
}

describe('appliquerHeritage', () => {
  it('conserve la saisie pour un indicateur non affilie', () => {
    const saisie = valeurs({ delaiJours: 45 });

    expect(appliquerHeritage(saisie, null)).toEqual(saisie);
  });

  it('reprend toutes les valeurs de la publication pour un affilie', () => {
    const publication = valeurs({
      domaineId: 'dom_san',
      periodicite: 'TRIMESTRIELLE',
      delaiJours: 30,
      delaiType: 'OUVRES',
      reportSiWeekendOuFerie: true,
    });

    expect(appliquerHeritage(valeurs(), publication)).toEqual(publication);
  });

  it('ignore une saisie divergente envoyee malgre les champs grises', () => {
    // Les champs sont en lecture seule dans le formulaire, mais une requete
    // forgee pourrait porter autre chose : la publication doit gagner.
    const publication = valeurs({ delaiJours: 30, periodicite: 'ANNUELLE' });
    const saisieMalveillante = valeurs({ delaiJours: 1, periodicite: 'MENSUELLE' });

    const resultat = appliquerHeritage(saisieMalveillante, publication);

    expect(resultat.delaiJours).toBe(30);
    expect(resultat.periodicite).toBe('ANNUELLE');
  });

  it('transmet le nombre d annees d une publication pluriannuelle', () => {
    const publication = valeurs({
      periodicite: 'PLURIANNUELLE',
      nombreAnneesPeriodicite: 5,
    });

    expect(appliquerHeritage(valeurs(), publication).nombreAnneesPeriodicite).toBe(5);
  });

  it('couvre exactement les champs declares comme herites', () => {
    const publication = valeurs({
      domaineId: 'autre',
      periodicite: 'ANNUELLE',
      nombreAnneesPeriodicite: null,
      delaiJours: 99,
      delaiType: 'OUVRES',
      reportSiWeekendOuFerie: true,
    });

    const resultat = appliquerHeritage(valeurs(), publication);

    for (const champ of CHAMPS_HERITES) {
      expect(resultat[champ]).toBe(publication[champ]);
    }
  });
});

describe('validerPlanification', () => {
  it('accepte une periodicite simple sans nombre d annees', () => {
    expect(validerPlanification(valeurs())).toEqual([]);
  });

  it('exige le nombre d annees pour une pluriannuelle', () => {
    const erreurs = validerPlanification(
      valeurs({ periodicite: 'PLURIANNUELLE', nombreAnneesPeriodicite: null }),
    );

    expect(erreurs.map((e) => e.champ)).toEqual(['nombreAnneesPeriodicite']);
  });

  it('refuse un nombre d annees inferieur a 2', () => {
    const erreurs = validerPlanification(
      valeurs({ periodicite: 'PLURIANNUELLE', nombreAnneesPeriodicite: 1 }),
    );

    expect(erreurs[0].message).toContain('supérieur ou égal à 2');
  });

  it('refuse un nombre d annees sur une periodicite non pluriannuelle', () => {
    const erreurs = validerPlanification(
      valeurs({ periodicite: 'ANNUELLE', nombreAnneesPeriodicite: 3 }),
    );

    expect(erreurs.map((e) => e.champ)).toEqual(['nombreAnneesPeriodicite']);
  });

  it('accepte un delai nul', () => {
    // Une publication mise en ligne le jour meme de la fin de periode.
    expect(validerPlanification(valeurs({ delaiJours: 0 }))).toEqual([]);
  });

  it('refuse un delai negatif', () => {
    const erreurs = validerPlanification(valeurs({ delaiJours: -1 }));

    expect(erreurs.map((e) => e.champ)).toEqual(['delaiJours']);
  });

  it('refuse un delai non entier', () => {
    const erreurs = validerPlanification(valeurs({ delaiJours: 10.5 }));

    expect(erreurs[0].message).toContain('entier');
  });

  it('refuse un delai aberrant', () => {
    expect(validerPlanification(valeurs({ delaiJours: 4000 }))).toHaveLength(1);
  });

  it('remonte les deux erreurs a la fois', () => {
    const erreurs = validerPlanification(
      valeurs({
        periodicite: 'PLURIANNUELLE',
        nombreAnneesPeriodicite: null,
        delaiJours: -5,
      }),
    );

    expect(erreurs.map((e) => e.champ).sort()).toEqual([
      'delaiJours',
      'nombreAnneesPeriodicite',
    ]);
  });
});

describe('heritageADiverge', () => {
  it('ne signale rien si les champs herites sont identiques', () => {
    expect(heritageADiverge(valeurs(), valeurs())).toBe(false);
  });

  it('detecte un changement de periodicite', () => {
    expect(
      heritageADiverge(valeurs(), valeurs({ periodicite: 'ANNUELLE' })),
    ).toBe(true);
  });

  it('detecte un changement de delai', () => {
    expect(heritageADiverge(valeurs(), valeurs({ delaiJours: 20 }))).toBe(true);
  });

  it('detecte un changement de domaine', () => {
    expect(heritageADiverge(valeurs(), valeurs({ domaineId: 'autre' }))).toBe(true);
  });

  it('detecte un changement de type de delai', () => {
    expect(heritageADiverge(valeurs(), valeurs({ delaiType: 'OUVRES' }))).toBe(true);
  });
});

describe('nombreDeLignesParAn', () => {
  it('applique le decoupage du tableau du paragraphe 5.2', () => {
    expect(nombreDeLignesParAn('MENSUELLE', null, 2026)).toBe(12);
    expect(nombreDeLignesParAn('TRIMESTRIELLE', null, 2026)).toBe(4);
    expect(nombreDeLignesParAn('SEMESTRIELLE', null, 2026)).toBe(2);
    expect(nombreDeLignesParAn('ANNUELLE', null, 2026)).toBe(1);
  });

  it('ne genere aucune ligne automatique pour une ponctuelle', () => {
    // La ligne unique est saisie a la main (paragraphe 5.2).
    expect(nombreDeLignesParAn('PONCTUELLE', null, 2026)).toBe(0);
  });

  it('produit une ligne pluriannuelle pour l annee choisie, quelle qu elle soit', () => {
    // DEC-115 : l'annee retenue est celle selectionnee a la generation, il n'y
    // a pas d'annee de production a calculer. Le nombre d'annees ne sert qu'a
    // determiner la periode couverte.
    expect(nombreDeLignesParAn('PLURIANNUELLE', 5, 2025)).toBe(1);
    expect(nombreDeLignesParAn('PLURIANNUELLE', 5, 2026)).toBe(1);
    expect(nombreDeLignesParAn('PLURIANNUELLE', 5, 2030)).toBe(1);
  });

  it('ne genere rien pour une pluriannuelle mal renseignee', () => {
    expect(nombreDeLignesParAn('PLURIANNUELLE', null, 2026)).toBe(0);
    expect(nombreDeLignesParAn('PLURIANNUELLE', 1, 2026)).toBe(0);
  });
});
