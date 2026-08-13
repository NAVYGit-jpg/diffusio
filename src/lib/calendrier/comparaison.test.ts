import { describe, expect, it } from 'vitest';

import {
  type LigneCalculee,
  type LigneExistante,
  comparerCalendrier,
  estIntouchable,
  resumerComparaison,
} from './comparaison';
import { jour } from './dates';

function existante(
  modifications: Partial<LigneExistante> = {},
): LigneExistante {
  return {
    id: 'lig_1',
    elementType: 'PUBLICATION',
    elementId: 'pub_1',
    libellePeriode: 'Janvier 2026',
    dateDebutCouverture: jour(2026, 1, 1),
    dateFinCouverture: jour(2026, 1, 31),
    dateDiffusionPrevue: jour(2026, 2, 10),
    statut: 'PLANIFIE',
    modifieManuellement: false,
    ...modifications,
  };
}

function calculee(modifications: Partial<LigneCalculee> = {}): LigneCalculee {
  return {
    elementType: 'PUBLICATION',
    elementId: 'pub_1',
    libellePeriode: 'Janvier 2026',
    dateDebutCouverture: jour(2026, 1, 1),
    dateFinCouverture: jour(2026, 1, 31),
    dateDiffusionPrevue: jour(2026, 2, 10),
    ...modifications,
  };
}

/** Shorthand: the coverage of one month of 2026. */
function mois(numero: number, dernierJour: number) {
  return {
    dateDebutCouverture: jour(2026, numero, 1),
    dateFinCouverture: jour(2026, numero, dernierJour),
  };
}

describe('estIntouchable', () => {
  it('protege les lignes deja televersees ou mises en ligne', () => {
    expect(estIntouchable('TELEVERSE')).toBe(true);
    expect(estIntouchable('MIS_EN_LIGNE')).toBe(true);
  });

  it('laisse modifiables les autres statuts', () => {
    for (const statut of ['PLANIFIE', 'A_VENIR', 'EN_RETARD', 'ANNULE'] as const) {
      expect(estIntouchable(statut)).toBe(false);
    }
  });
});

describe('comparerCalendrier — appariement', () => {
  it('classe en inchangee une ligne identique', () => {
    const rapport = comparerCalendrier([existante()], [calculee()]);

    expect(rapport.inchangees).toHaveLength(1);
    expect(rapport.aModifier).toEqual([]);
    expect(rapport.aAjouter).toEqual([]);
  });

  it('classe en ajout une periode de couverture qui n existait pas', () => {
    const rapport = comparerCalendrier(
      [existante()],
      [calculee(), calculee({ libellePeriode: 'Février 2026', ...mois(2, 28) })],
    );

    expect(rapport.aAjouter).toHaveLength(1);
    expect(rapport.aAjouter[0].libellePeriode).toBe('Février 2026');
    expect(rapport.inchangees).toHaveLength(1);
  });

  it('identifie une ligne par sa periode couverte, pas par sa date de diffusion', () => {
    // C'est tout l'interet d'une mise a jour : la date de diffusion a bouge,
    // la ligne reste la meme.
    const rapport = comparerCalendrier(
      [existante({ dateDiffusionPrevue: jour(2026, 2, 10) })],
      [calculee({ dateDiffusionPrevue: jour(2026, 3, 15) })],
    );

    expect(rapport.aAjouter).toEqual([]);
    expect(rapport.orphelines).toEqual([]);
    expect(rapport.aModifier).toHaveLength(1);
  });

  it('identifie une ligne par ses dates, pas par son libelle', () => {
    // Le libelle est un texte derive des dates ; le reformuler ne doit pas
    // faire passer chaque ligne pour une nouvelle et dupliquer le calendrier.
    const rapport = comparerCalendrier(
      [existante({ libellePeriode: 'Janvier 2026' })],
      [calculee({ libellePeriode: 'janvier 2026' })],
    );

    expect(rapport.aAjouter).toEqual([]);
    expect(rapport.orphelines).toEqual([]);
    expect(rapport.aModifier).toHaveLength(1);
  });

  it('distingue deux periodes du meme element', () => {
    const rapport = comparerCalendrier(
      [existante({ ...mois(1, 31) })],
      [calculee({ ...mois(2, 28), libellePeriode: 'Février 2026' })],
    );

    expect(rapport.aAjouter).toHaveLength(1);
    expect(rapport.orphelines).toHaveLength(1);
  });

  it('ne confond pas deux elements couvrant la meme periode', () => {
    const rapport = comparerCalendrier(
      [existante({ elementId: 'pub_1' })],
      [calculee({ elementId: 'pub_2' })],
    );

    expect(rapport.aAjouter).toHaveLength(1);
    expect(rapport.orphelines).toHaveLength(1);
  });

  it('ne confond pas une publication et un indicateur de meme identifiant', () => {
    const rapport = comparerCalendrier(
      [existante({ elementType: 'PUBLICATION', elementId: 'x' })],
      [calculee({ elementType: 'INDICATEUR', elementId: 'x' })],
    );

    expect(rapport.aAjouter).toHaveLength(1);
    expect(rapport.orphelines).toHaveLength(1);
  });

  it('rattache la ligne a l element meme si sa periode est renommee', () => {
    // Renommer une publication ne change pas son identifiant : son calendrier
    // lui reste attache.
    const rapport = comparerCalendrier(
      [existante({ libellePeriode: 'T1 2026' })],
      [calculee({ libellePeriode: 'Premier trimestre 2026' })],
    );

    expect(rapport.aModifier).toHaveLength(1);
    expect(rapport.aAjouter).toEqual([]);
  });
});

describe('comparerCalendrier — aucune suppression', () => {
  it('conserve une ligne planifiee que le nouveau calcul ne produit plus', () => {
    // Regle explicite : regenerer n efface jamais. La ligne sort du calcul,
    // elle reste au calendrier.
    const rapport = comparerCalendrier([existante({ statut: 'PLANIFIE' })], []);

    expect(rapport.orphelines).toHaveLength(1);
    expect(rapport.conservees).toEqual([]);
  });

  it('conserve une ligne traitee que le nouveau calcul ne produit plus', () => {
    const rapport = comparerCalendrier([existante({ statut: 'MIS_EN_LIGNE' })], []);

    expect(rapport.conservees).toHaveLength(1);
    expect(rapport.orphelines).toEqual([]);
  });

  it('conserve une ligne en retard sortie du calcul', () => {
    const rapport = comparerCalendrier([existante({ statut: 'EN_RETARD' })], []);

    expect(rapport.orphelines).toHaveLength(1);
  });

  it('ne propose jamais de suppression, quelle que soit la situation', () => {
    const rapport = comparerCalendrier(
      [
        existante({ id: 'a', ...mois(1, 31) }),
        existante({ id: 'b', ...mois(2, 28), statut: 'TELEVERSE' }),
        existante({ id: 'c', ...mois(3, 31), statut: 'EN_RETARD' }),
      ],
      [],
    );

    expect(rapport).not.toHaveProperty('aSupprimer');
    expect(
      rapport.orphelines.length + rapport.conservees.length,
    ).toBe(3);
  });
});

describe('comparerCalendrier — lignes deja traitees', () => {
  it('conserve une ligne televersee dont la date changerait', () => {
    const rapport = comparerCalendrier(
      [existante({ statut: 'TELEVERSE' })],
      [calculee({ dateDiffusionPrevue: jour(2026, 2, 20) })],
    );

    expect(rapport.conservees).toHaveLength(1);
    expect(rapport.aModifier).toEqual([]);
  });

  it('conserve une ligne mise en ligne dont la date changerait', () => {
    const rapport = comparerCalendrier(
      [existante({ statut: 'MIS_EN_LIGNE' })],
      [calculee({ dateDiffusionPrevue: jour(2026, 2, 20) })],
    );

    expect(rapport.conservees).toHaveLength(1);
    expect(rapport.aModifier).toEqual([]);
  });

  it('protege une ligne traitee meme si elle fut modifiee a la main', () => {
    const rapport = comparerCalendrier(
      [existante({ statut: 'TELEVERSE', modifieManuellement: true })],
      [calculee({ dateDiffusionPrevue: jour(2026, 5, 5) })],
    );

    expect(rapport.conservees).toHaveLength(1);
    expect(rapport.aConfirmer).toEqual([]);
  });
});

describe('comparerCalendrier — lignes modifiees a la main', () => {
  it('demande confirmation avant d ecraser une date saisie manuellement', () => {
    const rapport = comparerCalendrier(
      [existante({ modifieManuellement: true })],
      [calculee({ dateDiffusionPrevue: jour(2026, 2, 25) })],
    );

    expect(rapport.aConfirmer).toHaveLength(1);
    expect(rapport.aModifier).toEqual([]);
  });

  it('ne demande rien si la date manuelle correspond deja au calcul', () => {
    const rapport = comparerCalendrier(
      [existante({ modifieManuellement: true })],
      [calculee()],
    );

    expect(rapport.aConfirmer).toEqual([]);
    expect(rapport.inchangees).toHaveLength(1);
  });
});

describe('comparerCalendrier — scenario complet', () => {
  const existantes: LigneExistante[] = [
    existante({
      id: 'a',
      libellePeriode: 'Janvier 2026',
      ...mois(1, 31),
      statut: 'MIS_EN_LIGNE',
    }),
    existante({ id: 'b', libellePeriode: 'Février 2026', ...mois(2, 28) }),
    existante({
      id: 'c',
      libellePeriode: 'Mars 2026',
      ...mois(3, 31),
      modifieManuellement: true,
      dateDiffusionPrevue: jour(2026, 4, 15),
    }),
    existante({ id: 'd', libellePeriode: 'Avril 2026', ...mois(4, 30) }),
  ];

  const calculees: LigneCalculee[] = [
    calculee({
      libellePeriode: 'Janvier 2026',
      ...mois(1, 31),
      dateDiffusionPrevue: jour(2026, 2, 20),
    }),
    calculee({ libellePeriode: 'Février 2026', ...mois(2, 28), dateDiffusionPrevue: jour(2026, 3, 10) }),
    calculee({
      libellePeriode: 'Mars 2026',
      ...mois(3, 31),
      dateDiffusionPrevue: jour(2026, 4, 10),
    }),
    calculee({
      libellePeriode: 'Mai 2026',
      ...mois(5, 31),
      dateDiffusionPrevue: jour(2026, 6, 10),
    }),
  ];

  const rapport = comparerCalendrier(existantes, calculees);

  it('repartit chaque ligne dans une seule categorie', () => {
    expect(rapport.conservees.map((l) => l.id)).toEqual(['a']);
    expect(rapport.aModifier.map((l) => l.existante.id)).toEqual(['b']);
    expect(rapport.aConfirmer.map((l) => l.existante.id)).toEqual(['c']);
    expect(rapport.orphelines.map((l) => l.id)).toEqual(['d']);
    expect(rapport.aAjouter.map((l) => l.libellePeriode)).toEqual(['Mai 2026']);
  });

  it('ne perd ni ne duplique aucune ligne existante', () => {
    const traitees =
      rapport.conservees.length +
      rapport.inchangees.length +
      rapport.aModifier.length +
      rapport.aConfirmer.length +
      rapport.orphelines.length;

    expect(traitees).toBe(existantes.length);
  });
});

describe('resumerComparaison', () => {
  it('annonce les lignes conservees car deja traitees', () => {
    const rapport = comparerCalendrier(
      [
        existante({ id: 'a', ...mois(1, 31), statut: 'TELEVERSE' }),
        existante({ id: 'b', ...mois(2, 28), statut: 'TELEVERSE' }),
        existante({ id: 'c', ...mois(3, 31), statut: 'MIS_EN_LIGNE' }),
      ],
      [
        calculee({ ...mois(1, 31), dateDiffusionPrevue: jour(2026, 3, 1) }),
        calculee({ ...mois(2, 28) }),
        calculee({ ...mois(3, 31) }),
      ],
    );

    expect(resumerComparaison(rapport)).toContain(
      '3 ligne(s) conservée(s) car déjà traitée(s)',
    );
  });

  it('annonce les lignes gardees hors du calcul, sans parler de suppression', () => {
    const rapport = comparerCalendrier([existante()], []);
    const resume = resumerComparaison(rapport);

    expect(resume).toContain('1 ligne(s) conservée(s) hors de ce calcul');
    expect(resume.join(' ')).not.toContain('supprim');
  });

  it('annonce explicitement l absence de changement', () => {
    expect(resumerComparaison(comparerCalendrier([], []))).toEqual([
      'Aucun changement',
    ]);
  });
});
