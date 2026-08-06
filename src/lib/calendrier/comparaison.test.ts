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

describe('comparerCalendrier', () => {
  it('classe en inchangee une ligne identique', () => {
    const rapport = comparerCalendrier([existante()], [calculee()]);

    expect(rapport.inchangees).toHaveLength(1);
    expect(rapport.aModifier).toEqual([]);
    expect(rapport.aAjouter).toEqual([]);
  });

  it('classe en ajout une periode qui n existait pas', () => {
    const rapport = comparerCalendrier(
      [],
      [calculee({ libellePeriode: 'Février 2026' })],
    );

    expect(rapport.aAjouter).toHaveLength(1);
    expect(rapport.aAjouter[0].libellePeriode).toBe('Février 2026');
  });

  it('classe en modification une date recalculee', () => {
    const rapport = comparerCalendrier(
      [existante()],
      [calculee({ dateDiffusionPrevue: jour(2026, 2, 20) })],
    );

    expect(rapport.aModifier).toHaveLength(1);
    expect(rapport.aModifier[0].existante.id).toBe('lig_1');
    expect(rapport.inchangees).toEqual([]);
  });

  it('identifie une ligne par son element et sa periode, pas par sa date', () => {
    // C'est tout l'interet d'une mise a jour : la date a bouge, la ligne reste.
    const rapport = comparerCalendrier(
      [existante({ dateDiffusionPrevue: jour(2026, 2, 10) })],
      [calculee({ dateDiffusionPrevue: jour(2026, 3, 15) })],
    );

    expect(rapport.aAjouter).toEqual([]);
    expect(rapport.aSupprimer).toEqual([]);
    expect(rapport.aModifier).toHaveLength(1);
  });

  it('ne confond pas deux elements ayant la meme periode', () => {
    const rapport = comparerCalendrier(
      [existante({ elementId: 'pub_1' })],
      [calculee({ elementId: 'pub_2' })],
    );

    expect(rapport.aAjouter).toHaveLength(1);
    expect(rapport.aSupprimer).toHaveLength(1);
  });

  it('ne confond pas une publication et un indicateur de meme identifiant', () => {
    const rapport = comparerCalendrier(
      [existante({ elementType: 'PUBLICATION', elementId: 'x' })],
      [calculee({ elementType: 'INDICATEUR', elementId: 'x' })],
    );

    expect(rapport.aAjouter).toHaveLength(1);
    expect(rapport.aSupprimer).toHaveLength(1);
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

  it('conserve une ligne traitee que le nouveau calcul ne produit plus', () => {
    // Changement de periodicite : la periode disparait, mais le travail fait
    // ne doit pas etre efface (paragraphe 14).
    const rapport = comparerCalendrier([existante({ statut: 'MIS_EN_LIGNE' })], []);

    expect(rapport.conservees).toHaveLength(1);
    expect(rapport.aSupprimer).toEqual([]);
  });

  it('supprime en revanche une ligne planifiee devenue sans objet', () => {
    const rapport = comparerCalendrier([existante({ statut: 'PLANIFIE' })], []);

    expect(rapport.aSupprimer).toHaveLength(1);
    expect(rapport.conservees).toEqual([]);
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
    existante({ id: 'a', libellePeriode: 'Janvier 2026', statut: 'MIS_EN_LIGNE' }),
    existante({ id: 'b', libellePeriode: 'Février 2026' }),
    existante({
      id: 'c',
      libellePeriode: 'Mars 2026',
      modifieManuellement: true,
      dateDiffusionPrevue: jour(2026, 4, 15),
    }),
    existante({ id: 'd', libellePeriode: 'Avril 2026' }),
  ];

  const calculees: LigneCalculee[] = [
    calculee({ libellePeriode: 'Janvier 2026', dateDiffusionPrevue: jour(2026, 2, 20) }),
    calculee({ libellePeriode: 'Février 2026' }),
    calculee({ libellePeriode: 'Mars 2026', dateDiffusionPrevue: jour(2026, 4, 10) }),
    calculee({ libellePeriode: 'Mai 2026', dateDiffusionPrevue: jour(2026, 6, 10) }),
  ];

  const rapport = comparerCalendrier(existantes, calculees);

  it('repartit chaque ligne dans une seule categorie', () => {
    expect(rapport.conservees.map((l) => l.id)).toEqual(['a']);
    expect(rapport.inchangees.map((l) => l.id)).toEqual(['b']);
    expect(rapport.aConfirmer.map((l) => l.existante.id)).toEqual(['c']);
    expect(rapport.aSupprimer.map((l) => l.id)).toEqual(['d']);
    expect(rapport.aAjouter.map((l) => l.libellePeriode)).toEqual(['Mai 2026']);
  });

  it('ne perd ni ne duplique aucune ligne existante', () => {
    const traitees =
      rapport.conservees.length +
      rapport.inchangees.length +
      rapport.aModifier.length +
      rapport.aConfirmer.length +
      rapport.aSupprimer.length;

    expect(traitees).toBe(existantes.length);
  });
});

describe('resumerComparaison', () => {
  it('reprend la formulation attendue par le cahier des charges', () => {
    const rapport = comparerCalendrier(
      [
        existante({ id: 'a', statut: 'TELEVERSE' }),
        existante({ id: 'b', libellePeriode: 'Février 2026', statut: 'TELEVERSE' }),
        existante({ id: 'c', libellePeriode: 'Mars 2026', statut: 'MIS_EN_LIGNE' }),
      ],
      [
        calculee({ dateDiffusionPrevue: jour(2026, 3, 1) }),
        calculee({ libellePeriode: 'Février 2026' }),
        calculee({ libellePeriode: 'Mars 2026' }),
      ],
    );

    expect(resumerComparaison(rapport)).toContain(
      '3 ligne(s) conservée(s) car déjà traitée(s)',
    );
  });

  it('annonce explicitement l absence de changement', () => {
    expect(resumerComparaison(comparerCalendrier([], []))).toEqual([
      'Aucun changement',
    ]);
  });
});
