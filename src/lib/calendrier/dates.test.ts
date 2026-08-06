import { describe, expect, it } from 'vitest';

import {
  type JourFerie,
  ajouterJours,
  dernierJourDuMois,
  estFerie,
  estJourOuvre,
  estWeekend,
  formaterISO,
  formaterJJMMAAAA,
  jour,
  normaliserJour,
  reporterAuJourOuvre,
} from './dates';

describe('jour et dernierJourDuMois', () => {
  it('construit un jour calendaire en UTC', () => {
    expect(formaterISO(jour(2026, 1, 31))).toBe('2026-01-31');
  });

  it('donne le dernier jour de chaque mois', () => {
    expect(formaterISO(dernierJourDuMois(2026, 1))).toBe('2026-01-31');
    expect(formaterISO(dernierJourDuMois(2026, 4))).toBe('2026-04-30');
    expect(formaterISO(dernierJourDuMois(2026, 12))).toBe('2026-12-31');
  });

  it('gere fevrier des annees bissextiles', () => {
    expect(formaterISO(dernierJourDuMois(2024, 2))).toBe('2024-02-29');
    expect(formaterISO(dernierJourDuMois(2026, 2))).toBe('2026-02-28');
  });

  it('applique la regle seculaire : 2100 n est pas bissextile', () => {
    // Divisible par 4 mais par 100 sans l'etre par 400.
    expect(formaterISO(dernierJourDuMois(2100, 2))).toBe('2100-02-28');
    expect(formaterISO(dernierJourDuMois(2000, 2))).toBe('2000-02-29');
    expect(formaterISO(dernierJourDuMois(2400, 2))).toBe('2400-02-29');
  });
});

describe('normaliserJour', () => {
  it('supprime la partie horaire', () => {
    const avecHeure = new Date('2026-01-31T18:45:12.000Z');
    expect(normaliserJour(avecHeure).toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});

describe('ajouterJours', () => {
  it('franchit un changement de mois', () => {
    expect(formaterISO(ajouterJours(jour(2026, 1, 31), 10))).toBe('2026-02-10');
  });

  it('franchit un changement d annee', () => {
    expect(formaterISO(ajouterJours(jour(2026, 12, 31), 10))).toBe('2027-01-10');
  });

  it('traverse un 29 fevrier', () => {
    expect(formaterISO(ajouterJours(jour(2024, 2, 28), 2))).toBe('2024-03-01');
  });

  it('accepte un ajout nul', () => {
    expect(formaterISO(ajouterJours(jour(2026, 3, 15), 0))).toBe('2026-03-15');
  });
});

describe('estWeekend', () => {
  it('reconnait samedi et dimanche', () => {
    // 07/02/2026 est un samedi, 08/02 un dimanche.
    expect(estWeekend(jour(2026, 2, 7))).toBe(true);
    expect(estWeekend(jour(2026, 2, 8))).toBe(true);
  });

  it('ne reconnait pas les jours de semaine', () => {
    expect(estWeekend(jour(2026, 2, 6))).toBe(false);
    expect(estWeekend(jour(2026, 2, 9))).toBe(false);
  });
});

describe('estFerie', () => {
  const feries: JourFerie[] = [
    { date: jour(2026, 1, 1), recurrentAnnuel: true },
    { date: jour(2026, 4, 6), recurrentAnnuel: false },
  ];

  it('reconnait un ferie a date fixe', () => {
    expect(estFerie(jour(2026, 4, 6), feries)).toBe(true);
  });

  it('ne propage pas un ferie non recurrent aux autres annees', () => {
    // Lundi de Paques : mobile, il ne tombe pas au meme jour chaque annee.
    expect(estFerie(jour(2027, 4, 6), feries)).toBe(false);
  });

  it('propage un ferie recurrent a toutes les annees', () => {
    expect(estFerie(jour(2030, 1, 1), feries)).toBe(true);
    expect(estFerie(jour(2019, 1, 1), feries)).toBe(true);
  });

  it('ignore la partie horaire de la date testee', () => {
    expect(estFerie(new Date('2026-04-06T15:00:00Z'), feries)).toBe(true);
  });

  it('rend faux avec une liste vide', () => {
    expect(estFerie(jour(2026, 1, 1), [])).toBe(false);
  });
});

describe('estJourOuvre', () => {
  const feries: JourFerie[] = [{ date: jour(2026, 5, 1), recurrentAnnuel: true }];

  it('exclut les week-ends', () => {
    expect(estJourOuvre(jour(2026, 2, 7), feries)).toBe(false);
  });

  it('exclut les jours feries', () => {
    // 01/05/2026 est un vendredi, donc ouvre s'il n'etait pas ferie.
    expect(estWeekend(jour(2026, 5, 1))).toBe(false);
    expect(estJourOuvre(jour(2026, 5, 1), feries)).toBe(false);
  });

  it('accepte un jour de semaine ordinaire', () => {
    expect(estJourOuvre(jour(2026, 2, 10), feries)).toBe(true);
  });
});

describe('reporterAuJourOuvre', () => {
  const feries: JourFerie[] = [{ date: jour(2026, 1, 1), recurrentAnnuel: true }];

  it('ne deplace pas un jour deja ouvre', () => {
    expect(formaterISO(reporterAuJourOuvre(jour(2026, 2, 10), feries))).toBe(
      '2026-02-10',
    );
  });

  it('reporte un samedi au lundi', () => {
    expect(formaterISO(reporterAuJourOuvre(jour(2026, 2, 7), feries))).toBe(
      '2026-02-09',
    );
  });

  it('reporte un dimanche au lundi', () => {
    expect(formaterISO(reporterAuJourOuvre(jour(2026, 2, 8), feries))).toBe(
      '2026-02-09',
    );
  });

  it('enjambe un ferie tombant un jour de semaine', () => {
    // 01/01/2026 est un jeudi ferie : on reporte au vendredi 2.
    expect(formaterISO(reporterAuJourOuvre(jour(2026, 1, 1), feries))).toBe(
      '2026-01-02',
    );
  });

  it('enjambe un ferie colle a un week-end', () => {
    const ferieVendredi: JourFerie[] = [
      { date: jour(2026, 5, 1), recurrentAnnuel: true },
    ];
    // Vendredi 1er mai ferie, samedi 2, dimanche 3 -> lundi 4.
    expect(formaterISO(reporterAuJourOuvre(jour(2026, 5, 1), ferieVendredi))).toBe(
      '2026-05-04',
    );
  });
});

describe('formaterJJMMAAAA', () => {
  it('formate comme attendu par les utilisateurs francais', () => {
    expect(formaterJJMMAAAA(jour(2026, 2, 10))).toBe('10/02/2026');
    expect(formaterJJMMAAAA(jour(2026, 12, 1))).toBe('01/12/2026');
  });
});
