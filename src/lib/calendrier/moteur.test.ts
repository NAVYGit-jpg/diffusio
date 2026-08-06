import { describe, expect, it } from 'vitest';

import { type JourFerie, formaterISO, formaterJJMMAAAA, jour } from './dates';
import {
  type ElementPlanifiable,
  ajouterDelai,
  decouperPeriodes,
  genererLignes,
  nombreDeLignes,
} from './moteur';

/**
 * The two examples the specification uses as its reference (§5.3). If these
 * ever break, the product is wrong whatever else passes.
 */
describe('exemples de reference du cahier des charges', () => {
  it('mensuel, 10 jours : fin 31/01/2026 -> diffusion 10/02/2026', () => {
    const resultat = ajouterDelai(jour(2026, 1, 31), 10, 'CALENDAIRES');

    expect(formaterJJMMAAAA(resultat)).toBe('10/02/2026');
  });

  it('trimestriel, 10 jours : fin 31/03/2026 -> diffusion 10/04/2026', () => {
    const resultat = ajouterDelai(jour(2026, 3, 31), 10, 'CALENDAIRES');

    expect(formaterJJMMAAAA(resultat)).toBe('10/04/2026');
  });

  it('les memes delais en jours ouvres donnent bien les dates annoncees', () => {
    // Le cahier des charges precise que ce serait le 13/02 et le 14/04.
    expect(formaterJJMMAAAA(ajouterDelai(jour(2026, 1, 31), 10, 'OUVRES'))).toBe(
      '13/02/2026',
    );
    expect(formaterJJMMAAAA(ajouterDelai(jour(2026, 3, 31), 10, 'OUVRES'))).toBe(
      '14/04/2026',
    );
  });
});

describe('decouperPeriodes — mensuelle', () => {
  const periodes = decouperPeriodes('MENSUELLE', 2026);

  it('produit 12 periodes', () => {
    expect(periodes).toHaveLength(12);
  });

  it('couvre chaque mois du 1er au dernier jour', () => {
    expect(formaterISO(periodes[0].dateDebutCouverture)).toBe('2026-01-01');
    expect(formaterISO(periodes[0].dateFinCouverture)).toBe('2026-01-31');
    expect(formaterISO(periodes[11].dateDebutCouverture)).toBe('2026-12-01');
    expect(formaterISO(periodes[11].dateFinCouverture)).toBe('2026-12-31');
  });

  it('libelle les periodes en francais', () => {
    expect(periodes[0].libellePeriode).toBe('Janvier 2026');
    expect(periodes[7].libellePeriode).toBe('Août 2026');
    expect(periodes[11].libellePeriode).toBe('Décembre 2026');
  });

  it('gere fevrier d une annee bissextile', () => {
    const bissextile = decouperPeriodes('MENSUELLE', 2024);
    expect(formaterISO(bissextile[1].dateFinCouverture)).toBe('2024-02-29');
  });

  it('gere fevrier d une annee ordinaire', () => {
    expect(formaterISO(periodes[1].dateFinCouverture)).toBe('2026-02-28');
  });

  it('ne laisse aucun trou ni recouvrement entre les mois', () => {
    for (let index = 1; index < periodes.length; index += 1) {
      const veille = new Date(periodes[index].dateDebutCouverture.getTime());
      veille.setUTCDate(veille.getUTCDate() - 1);

      expect(formaterISO(veille)).toBe(
        formaterISO(periodes[index - 1].dateFinCouverture),
      );
    }
  });
});

describe('decouperPeriodes — trimestrielle', () => {
  const periodes = decouperPeriodes('TRIMESTRIELLE', 2026);

  it('produit 4 periodes libellees T1 a T4', () => {
    expect(periodes.map((p) => p.libellePeriode)).toEqual([
      'T1 2026',
      'T2 2026',
      'T3 2026',
      'T4 2026',
    ]);
  });

  it('couvre les bons mois', () => {
    expect(formaterISO(periodes[0].dateDebutCouverture)).toBe('2026-01-01');
    expect(formaterISO(periodes[0].dateFinCouverture)).toBe('2026-03-31');
    expect(formaterISO(periodes[1].dateFinCouverture)).toBe('2026-06-30');
    expect(formaterISO(periodes[2].dateFinCouverture)).toBe('2026-09-30');
    expect(formaterISO(periodes[3].dateFinCouverture)).toBe('2026-12-31');
  });
});

describe('decouperPeriodes — semestrielle', () => {
  const periodes = decouperPeriodes('SEMESTRIELLE', 2026);

  it('produit 2 periodes du 1er janvier au 30 juin, puis au 31 decembre', () => {
    expect(periodes).toHaveLength(2);
    expect(formaterISO(periodes[0].dateDebutCouverture)).toBe('2026-01-01');
    expect(formaterISO(periodes[0].dateFinCouverture)).toBe('2026-06-30');
    expect(formaterISO(periodes[1].dateDebutCouverture)).toBe('2026-07-01');
    expect(formaterISO(periodes[1].dateFinCouverture)).toBe('2026-12-31');
    expect(periodes.map((p) => p.libellePeriode)).toEqual(['S1 2026', 'S2 2026']);
  });
});

describe('decouperPeriodes — annuelle', () => {
  it('produit une periode couvrant l annee entiere', () => {
    const periodes = decouperPeriodes('ANNUELLE', 2026);

    expect(periodes).toHaveLength(1);
    expect(periodes[0].libellePeriode).toBe('2026');
    expect(formaterISO(periodes[0].dateDebutCouverture)).toBe('2026-01-01');
    expect(formaterISO(periodes[0].dateFinCouverture)).toBe('2026-12-31');
  });
});

describe('decouperPeriodes — pluriannuelle', () => {
  it('couvre du 1er janvier (Y-n+1) au 31 decembre Y', () => {
    const periodes = decouperPeriodes('PLURIANNUELLE', 2026, 5);

    expect(periodes).toHaveLength(1);
    expect(formaterISO(periodes[0].dateDebutCouverture)).toBe('2022-01-01');
    expect(formaterISO(periodes[0].dateFinCouverture)).toBe('2026-12-31');
    expect(periodes[0].libellePeriode).toBe('2022-2026');
  });

  it('produit une ligne quelle que soit l annee choisie (DEC-115)', () => {
    // L'annee retenue est celle selectionnee a la generation ; il n'y a pas
    // d'annee de production a calculer.
    for (const annee of [2025, 2026, 2027, 2030]) {
      expect(decouperPeriodes('PLURIANNUELLE', annee, 5)).toHaveLength(1);
    }
  });

  it('couvre deux annees pour une periodicite biennale', () => {
    const periodes = decouperPeriodes('PLURIANNUELLE', 2026, 2);

    expect(formaterISO(periodes[0].dateDebutCouverture)).toBe('2025-01-01');
    expect(periodes[0].libellePeriode).toBe('2025-2026');
  });

  it('ne produit rien si le nombre d annees manque ou est aberrant', () => {
    expect(decouperPeriodes('PLURIANNUELLE', 2026, null)).toEqual([]);
    expect(decouperPeriodes('PLURIANNUELLE', 2026, 1)).toEqual([]);
  });
});

describe('decouperPeriodes — ponctuelle', () => {
  it('ne genere rien automatiquement', () => {
    // La ligne unique est saisie a la main (paragraphe 5.2).
    expect(decouperPeriodes('PONCTUELLE', 2026)).toEqual([]);
  });
});

describe('ajouterDelai — jours calendaires', () => {
  it('additionne simplement les jours', () => {
    expect(formaterISO(ajouterDelai(jour(2026, 6, 30), 15, 'CALENDAIRES'))).toBe(
      '2026-07-15',
    );
  });

  it('accepte un delai nul', () => {
    expect(formaterISO(ajouterDelai(jour(2026, 6, 30), 0, 'CALENDAIRES'))).toBe(
      '2026-06-30',
    );
  });

  it('franchit la fin d annee', () => {
    expect(formaterISO(ajouterDelai(jour(2026, 12, 31), 10, 'CALENDAIRES'))).toBe(
      '2027-01-10',
    );
  });

  it('traverse un 29 fevrier', () => {
    expect(formaterISO(ajouterDelai(jour(2024, 2, 15), 20, 'CALENDAIRES'))).toBe(
      '2024-03-06',
    );
  });

  it('ignore week-ends et feries', () => {
    const feries: JourFerie[] = [{ date: jour(2026, 2, 5), recurrentAnnuel: false }];
    // 31/01 + 10 jours calendaires = 10/02, meme avec un ferie au milieu.
    expect(
      formaterISO(ajouterDelai(jour(2026, 1, 31), 10, 'CALENDAIRES', { joursFeries: feries })),
    ).toBe('2026-02-10');
  });
});

describe('ajouterDelai — jours ouvres', () => {
  it('saute les week-ends', () => {
    // Vendredi 06/02/2026 + 1 jour ouvre = lundi 09/02.
    expect(formaterISO(ajouterDelai(jour(2026, 2, 6), 1, 'OUVRES'))).toBe(
      '2026-02-09',
    );
  });

  it('saute les jours feries', () => {
    const feries: JourFerie[] = [{ date: jour(2026, 2, 9), recurrentAnnuel: false }];
    // Lundi 09/02 ferie : le 1er jour ouvre apres le vendredi 06 est le mardi 10.
    expect(
      formaterISO(ajouterDelai(jour(2026, 2, 6), 1, 'OUVRES', { joursFeries: feries })),
    ).toBe('2026-02-10');
  });

  it('un delai nul ne deplace pas la date, meme un samedi', () => {
    // Le point de depart est la fin de couverture, il n'est pas normalise.
    expect(formaterISO(ajouterDelai(jour(2026, 2, 7), 0, 'OUVRES'))).toBe(
      '2026-02-07',
    );
  });

  it('compte bien dix jours de travail et non dix jours de calendrier', () => {
    const calendaire = ajouterDelai(jour(2026, 1, 31), 10, 'CALENDAIRES');
    const ouvre = ajouterDelai(jour(2026, 1, 31), 10, 'OUVRES');

    expect(ouvre.getTime()).toBeGreaterThan(calendaire.getTime());
  });

  it('reste coherent sur un delai long', () => {
    // 20 jours ouvres a partir du vendredi 31/07/2026.
    expect(formaterISO(ajouterDelai(jour(2026, 7, 31), 20, 'OUVRES'))).toBe(
      '2026-08-28',
    );
  });
});

describe('ajouterDelai — report au jour ouvre', () => {
  it('reporte une date calendaire tombant un samedi', () => {
    // 31/01/2026 + 7 jours = samedi 07/02 -> lundi 09/02.
    expect(
      formaterISO(
        ajouterDelai(jour(2026, 1, 31), 7, 'CALENDAIRES', {
          reportSiWeekendOuFerie: true,
        }),
      ),
    ).toBe('2026-02-09');
  });

  it('ne deplace rien si la date tombe deja un jour ouvre', () => {
    expect(
      formaterISO(
        ajouterDelai(jour(2026, 1, 31), 10, 'CALENDAIRES', {
          reportSiWeekendOuFerie: true,
        }),
      ),
    ).toBe('2026-02-10');
  });

  it('reporte une date tombant un ferie recurrent', () => {
    const feries: JourFerie[] = [{ date: jour(2020, 1, 1), recurrentAnnuel: true }];
    // 31/12/2026 + 1 jour = 01/01/2027, ferie -> 04/01 (lundi).
    expect(
      formaterISO(
        ajouterDelai(jour(2026, 12, 31), 1, 'CALENDAIRES', {
          joursFeries: feries,
          reportSiWeekendOuFerie: true,
        }),
      ),
    ).toBe('2027-01-04');
  });

  it('ne change rien a un calcul en jours ouvres', () => {
    // Un calcul en jours ouvres atterrit deja sur un jour ouvre.
    const sansReport = ajouterDelai(jour(2026, 1, 31), 10, 'OUVRES');
    const avecReport = ajouterDelai(jour(2026, 1, 31), 10, 'OUVRES', {
      reportSiWeekendOuFerie: true,
    });

    expect(avecReport.getTime()).toBe(sansReport.getTime());
  });
});

describe('genererLignes', () => {
  function element(
    modifications: Partial<ElementPlanifiable> = {},
  ): ElementPlanifiable {
    return {
      periodicite: 'MENSUELLE',
      nombreAnneesPeriodicite: null,
      delaiJours: 10,
      delaiType: 'CALENDAIRES',
      reportSiWeekendOuFerie: false,
      ...modifications,
    };
  }

  it('produit le calendrier mensuel complet de l exemple du cahier des charges', () => {
    const lignes = genererLignes(element(), 2026);

    expect(lignes).toHaveLength(12);
    expect(formaterJJMMAAAA(lignes[0].dateDiffusionPrevue)).toBe('10/02/2026');
    expect(formaterJJMMAAAA(lignes[1].dateDiffusionPrevue)).toBe('10/03/2026');
    expect(formaterJJMMAAAA(lignes[11].dateDiffusionPrevue)).toBe('10/01/2027');
  });

  it('produit le calendrier trimestriel de l exemple du cahier des charges', () => {
    const lignes = genererLignes(element({ periodicite: 'TRIMESTRIELLE' }), 2026);

    expect(lignes.map((l) => formaterJJMMAAAA(l.dateDiffusionPrevue))).toEqual([
      '10/04/2026',
      '10/07/2026',
      '10/10/2026',
      '10/01/2027',
    ]);
  });

  it('la derniere ligne de l annee se diffuse l annee suivante', () => {
    // Consequence normale d'un delai : a signaler dans l'interface.
    const lignes = genererLignes(element(), 2026);

    expect(lignes[11].dateDiffusionPrevue.getUTCFullYear()).toBe(2027);
  });

  it('ne genere rien pour une ponctuelle', () => {
    expect(genererLignes(element({ periodicite: 'PONCTUELLE' }), 2026)).toEqual([]);
  });

  it('genere une ligne pluriannuelle avec sa periode de couverture', () => {
    const lignes = genererLignes(
      element({ periodicite: 'PLURIANNUELLE', nombreAnneesPeriodicite: 5, delaiJours: 90 }),
      2026,
    );

    expect(lignes).toHaveLength(1);
    expect(formaterISO(lignes[0].dateDebutCouverture)).toBe('2022-01-01');
    expect(formaterJJMMAAAA(lignes[0].dateDiffusionPrevue)).toBe('31/03/2027');
  });

  it('applique feries et report a toutes les lignes', () => {
    const feries: JourFerie[] = [{ date: jour(2020, 5, 1), recurrentAnnuel: true }];
    const lignes = genererLignes(
      element({ delaiJours: 0, reportSiWeekendOuFerie: true }),
      2026,
      feries,
    );

    // Avril se termine le jeudi 30 ; delai nul, mais aucun report attendu.
    expect(formaterJJMMAAAA(lignes[3].dateDiffusionPrevue)).toBe('30/04/2026');
    // Mai se termine le dimanche 31 -> reporte au lundi 01/06.
    expect(formaterJJMMAAAA(lignes[4].dateDiffusionPrevue)).toBe('01/06/2026');
  });
});

describe('nombreDeLignes', () => {
  it('annonce exactement ce que la generation produira', () => {
    const cas: [Parameters<typeof nombreDeLignes>[0], number | null, number][] = [
      ['MENSUELLE', null, 12],
      ['TRIMESTRIELLE', null, 4],
      ['SEMESTRIELLE', null, 2],
      ['ANNUELLE', null, 1],
      ['PLURIANNUELLE', 5, 1],
      ['PLURIANNUELLE', null, 0],
      ['PONCTUELLE', null, 0],
    ];

    for (const [periodicite, annees, attendu] of cas) {
      expect(nombreDeLignes(periodicite, annees, 2026)).toBe(attendu);
      expect(decouperPeriodes(periodicite, 2026, annees)).toHaveLength(attendu);
    }
  });
});
