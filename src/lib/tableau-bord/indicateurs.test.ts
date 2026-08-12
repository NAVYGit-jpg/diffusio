import { describe, expect, it } from 'vitest';

import { jour } from '@/lib/calendrier/dates';
import {
  type LigneIndicateur,
  avancementAnnee,
  classementStructures,
  compteurs,
  estEchue,
  estRespectee,
  etatRetards,
  evolutionMensuelle,
  lignesComparables,
  prochainesEcheances,
  repartition,
  retardEnJours,
  statistiquesRetard,
  tauxRespect,
} from './indicateurs';

function ligne(modifications: Partial<LigneIndicateur> = {}): LigneIndicateur {
  return {
    id: Math.random().toString(36).slice(2),
    structureId: 'str-1',
    structureNom: 'Direction des Statistiques Sociales',
    domaine: 'Prix',
    periodicite: 'MENSUELLE',
    elementType: 'PUBLICATION',
    dateDiffusionPrevue: jour(2026, 2, 10),
    dateDiffusionReelle: null,
    statut: 'PLANIFIE',
    retardPublie: null,
    ...modifications,
  };
}

const AUJOURDHUI = jour(2026, 3, 1);

describe('estEchue', () => {
  it("ne considère pas comme échue une ligne attendue le jour même", () => {
    // Le point focal a jusqu'au soir : la date du jour n'est pas un retard.
    expect(estEchue(ligne({ dateDiffusionPrevue: jour(2026, 3, 1) }), AUJOURDHUI)).toBe(
      false,
    );
  });

  it('considère comme échue une ligne attendue la veille', () => {
    expect(estEchue(ligne({ dateDiffusionPrevue: jour(2026, 2, 28) }), AUJOURDHUI)).toBe(
      true,
    );
  });
});

describe('estRespectee', () => {
  it('accepte une mise en ligne le jour prévu, quelle que soit l’heure', () => {
    // dateDiffusionReelle est un instant, dateDiffusionPrevue un jour à minuit :
    // comparer les valeurs brutes ferait passer 10 h du matin pour un retard.
    const misEnLigneA10h = new Date(Date.UTC(2026, 1, 10, 10, 30));

    expect(
      estRespectee(
        ligne({
          dateDiffusionPrevue: jour(2026, 2, 10),
          dateDiffusionReelle: misEnLigneA10h,
        }),
      ),
    ).toBe(true);
  });

  it('accepte une mise en ligne en avance', () => {
    expect(
      estRespectee(ligne({ dateDiffusionReelle: jour(2026, 2, 3) })),
    ).toBe(true);
  });

  it('refuse une mise en ligne le lendemain', () => {
    expect(
      estRespectee(ligne({ dateDiffusionReelle: jour(2026, 2, 11) })),
    ).toBe(false);
  });

  it('refuse une ligne jamais mise en ligne', () => {
    expect(estRespectee(ligne({ dateDiffusionReelle: null }))).toBe(false);
  });
});

describe('tauxRespect', () => {
  it('calcule le taux sur les lignes comparables', () => {
    const resultat = tauxRespect(
      [
        ligne({ dateDiffusionReelle: jour(2026, 2, 10) }), // à l'heure
        ligne({ dateDiffusionReelle: jour(2026, 2, 12) }), // en retard
        ligne({ dateDiffusionReelle: null }), // échue, rien reçu
        ligne({ dateDiffusionReelle: jour(2026, 2, 9) }), // en avance
      ],
      AUJOURDHUI,
    );

    expect(resultat.base).toBe(4);
    expect(resultat.respectees).toBe(2);
    expect(resultat.taux).toBe(50);
  });

  it("retourne null plutôt que 0 % quand rien n'est encore comparable", () => {
    // 0 % se lirait comme un échec, alors qu'il n'y a rien à juger.
    const resultat = tauxRespect(
      [ligne({ dateDiffusionPrevue: jour(2026, 12, 1) })],
      AUJOURDHUI,
    );

    expect(resultat.base).toBe(0);
    expect(resultat.taux).toBeNull();
  });

  it('compte une publication en avance sur une échéance future', () => {
    // Sinon, bien faire ne changerait rien au taux.
    const resultat = tauxRespect(
      [
        ligne({
          dateDiffusionPrevue: jour(2026, 12, 1),
          dateDiffusionReelle: jour(2026, 2, 20),
        }),
      ],
      AUJOURDHUI,
    );

    expect(resultat.base).toBe(1);
    expect(resultat.taux).toBe(100);
  });

  it("n'est pas gonflé par un report de date", () => {
    // Le report vit dans Retard.prochaineDateDiffusion ; la date du calendrier
    // publié ne bouge pas, donc annoncer une nouvelle date ne répare rien.
    const resultat = tauxRespect(
      [ligne({ dateDiffusionPrevue: jour(2026, 2, 10), dateDiffusionReelle: null })],
      AUJOURDHUI,
    );

    expect(resultat.taux).toBe(0);
  });

  it('arrondit au dixième', () => {
    const resultat = tauxRespect(
      [
        ligne({ dateDiffusionReelle: jour(2026, 2, 10) }),
        ligne({ dateDiffusionReelle: null }),
        ligne({ dateDiffusionReelle: null }),
      ],
      AUJOURDHUI,
    );

    expect(resultat.taux).toBe(33.3);
  });
});

describe('retardEnJours', () => {
  it('mesure une ligne livrée en retard par rapport à sa livraison', () => {
    expect(
      retardEnJours(ligne({ dateDiffusionReelle: jour(2026, 2, 15) }), AUJOURDHUI),
    ).toBe(5);
  });

  it("mesure une ligne jamais livrée par rapport à aujourd'hui", () => {
    // Le compteur continue de tourner tant que rien n'arrive.
    expect(retardEnJours(ligne({ dateDiffusionReelle: null }), AUJOURDHUI)).toBe(19);
  });

  it('retourne 0 pour une ligne à l’heure ou à venir', () => {
    expect(
      retardEnJours(ligne({ dateDiffusionReelle: jour(2026, 2, 10) }), AUJOURDHUI),
    ).toBe(0);
    expect(
      retardEnJours(ligne({ dateDiffusionPrevue: jour(2026, 6, 1) }), AUJOURDHUI),
    ).toBe(0);
  });
});

describe('statistiquesRetard', () => {
  it('calcule moyenne et maximum sur les seules lignes en retard', () => {
    const resultat = statistiquesRetard(
      [
        ligne({ dateDiffusionReelle: jour(2026, 2, 12) }), // 2 jours
        ligne({ dateDiffusionReelle: jour(2026, 2, 20) }), // 10 jours
        ligne({ dateDiffusionReelle: jour(2026, 2, 10) }), // à l'heure
      ],
      AUJOURDHUI,
    );

    expect(resultat.nombre).toBe(2);
    expect(resultat.moyen).toBe(6);
    expect(resultat.maximum).toBe(10);
  });

  it('retourne null sans aucun retard', () => {
    const resultat = statistiquesRetard(
      [ligne({ dateDiffusionReelle: jour(2026, 2, 10) })],
      AUJOURDHUI,
    );

    expect(resultat).toEqual({ nombre: 0, moyen: null, maximum: null });
  });
});

describe('prochainesEcheances', () => {
  it('compte des fenêtres cumulatives', () => {
    const resultat = prochainesEcheances(
      [
        ligne({ dateDiffusionPrevue: jour(2026, 3, 5) }), // J+4
        ligne({ dateDiffusionPrevue: jour(2026, 3, 12) }), // J+11
        ligne({ dateDiffusionPrevue: jour(2026, 3, 25) }), // J+24
        ligne({ dateDiffusionPrevue: jour(2026, 5, 1) }), // hors fenêtre
      ],
      AUJOURDHUI,
    );

    expect(resultat).toEqual({ j7: 1, j15: 2, j30: 3 });
  });

  it('ignore les lignes déjà mises en ligne', () => {
    const resultat = prochainesEcheances(
      [
        ligne({
          dateDiffusionPrevue: jour(2026, 3, 5),
          dateDiffusionReelle: jour(2026, 3, 1),
        }),
      ],
      AUJOURDHUI,
    );

    expect(resultat.j7).toBe(0);
  });

  it('ignore les lignes déjà échues', () => {
    // Elles relèvent des retards, pas des échéances à venir.
    const resultat = prochainesEcheances(
      [ligne({ dateDiffusionPrevue: jour(2026, 2, 10) })],
      AUJOURDHUI,
    );

    expect(resultat.j30).toBe(0);
  });
});

describe('repartition', () => {
  it('trie par effectif décroissant', () => {
    const parts = repartition(
      [
        ligne({ domaine: 'Prix' }),
        ligne({ domaine: 'Emploi' }),
        ligne({ domaine: 'Emploi' }),
      ],
      (l) => l.domaine ?? 'Non renseigné',
    );

    expect(parts).toEqual([
      { libelle: 'Emploi', nombre: 2 },
      { libelle: 'Prix', nombre: 1 },
    ]);
  });

  it('départage les ex æquo par ordre alphabétique', () => {
    // Sans cela, l'ordre changerait d'un affichage à l'autre.
    const parts = repartition(
      [ligne({ domaine: 'Santé' }), ligne({ domaine: 'Agriculture' })],
      (l) => l.domaine ?? '',
    );

    expect(parts.map((p) => p.libelle)).toEqual(['Agriculture', 'Santé']);
  });
});

describe('evolutionMensuelle', () => {
  it('produit toujours douze points', () => {
    expect(evolutionMensuelle([], 2026, AUJOURDHUI)).toHaveLength(12);
  });

  it('rattache une ligne au mois où elle était attendue', () => {
    // Et non au mois où elle a été publiée.
    const courbe = evolutionMensuelle(
      [
        ligne({
          dateDiffusionPrevue: jour(2026, 2, 10),
          dateDiffusionReelle: jour(2026, 3, 20),
        }),
      ],
      2026,
      AUJOURDHUI,
    );

    expect(courbe[1].base).toBe(1);
    expect(courbe[1].taux).toBe(0);
    expect(courbe[2].base).toBe(0);
  });

  it('laisse null un mois sans rien à publier', () => {
    // Un 0 dessinerait un effondrement là où il n'y avait rien à faire.
    const courbe = evolutionMensuelle([], 2026, AUJOURDHUI);

    expect(courbe.every((point) => point.taux === null)).toBe(true);
  });

  it('ignore une autre année', () => {
    const courbe = evolutionMensuelle(
      [ligne({ dateDiffusionPrevue: jour(2025, 2, 10) })],
      2026,
      AUJOURDHUI,
    );

    expect(courbe[1].base).toBe(0);
  });
});

describe('classementStructures', () => {
  it('classe par taux décroissant', () => {
    const rangs = classementStructures(
      [
        ligne({
          structureId: 'a',
          structureNom: 'Structure A',
          dateDiffusionReelle: null,
        }),
        ligne({
          structureId: 'b',
          structureNom: 'Structure B',
          dateDiffusionReelle: jour(2026, 2, 10),
        }),
      ],
      AUJOURDHUI,
    );

    expect(rangs.map((r) => r.structureNom)).toEqual([
      'Structure B',
      'Structure A',
    ]);
    expect(rangs[0].taux).toBe(100);
    expect(rangs[1].taux).toBe(0);
  });

  it('renvoie en fin de liste une structure non mesurable', () => {
    // Elle n'est pas la meilleure : elle n'a simplement rien d'échu.
    const rangs = classementStructures(
      [
        ligne({
          structureId: 'a',
          structureNom: 'Sans échéance',
          dateDiffusionPrevue: jour(2026, 12, 1),
        }),
        ligne({
          structureId: 'b',
          structureNom: 'Mesurable',
          dateDiffusionReelle: jour(2026, 2, 12),
        }),
      ],
      AUJOURDHUI,
    );

    expect(rangs[0].structureNom).toBe('Mesurable');
    expect(rangs[1].taux).toBeNull();
  });

  it('compte les retards de chaque structure', () => {
    const rangs = classementStructures(
      [
        ligne({ structureId: 'a', dateDiffusionReelle: null }),
        ligne({ structureId: 'a', dateDiffusionReelle: jour(2026, 2, 10) }),
      ],
      AUJOURDHUI,
    );

    expect(rangs[0].retards).toBe(1);
  });
});

describe('etatRetards', () => {
  it('sépare les retards publiés des retards non publiés', () => {
    const etat = etatRetards(
      [
        ligne({ dateDiffusionReelle: jour(2026, 2, 20) }), // publié en retard
        ligne({ dateDiffusionReelle: null }), // toujours manquant
        ligne({ dateDiffusionReelle: null }), // toujours manquant
        ligne({ dateDiffusionReelle: jour(2026, 2, 10) }), // à l'heure
      ],
      AUJOURDHUI,
    );

    expect(etat).toEqual({
      total: 3,
      publieesApresEcheance: 1,
      nonPubliees: 2,
    });
  });
});

describe('lignesComparables', () => {
  it('écarte les lignes annulées', () => {
    // Une ligne retirée du calendrier n'est ni un succès ni un échec.
    const lignes = lignesComparables([
      ligne({ statut: 'ANNULE' }),
      ligne({ statut: 'PLANIFIE' }),
    ]);

    expect(lignes).toHaveLength(1);
  });
});

describe('compteurs', () => {
  const aVenir = jour(2026, 9, 10);

  it('répartit les lignes en cinq catégories exclusives', () => {
    const resultat = compteurs(
      [
        ligne({ statut: 'PLANIFIE', dateDiffusionPrevue: aVenir }),
        ligne({ statut: 'A_VENIR', dateDiffusionPrevue: aVenir }),
        ligne({ statut: 'TELEVERSE', dateDiffusionPrevue: aVenir }),
        ligne({
          statut: 'MIS_EN_LIGNE',
          dateDiffusionReelle: jour(2026, 2, 10),
        }),
        ligne({ statut: 'PLANIFIE', dateDiffusionPrevue: jour(2026, 1, 10) }),
        ligne({ statut: 'ANNULE', dateDiffusionPrevue: jour(2026, 1, 10) }),
      ],
      AUJOURDHUI,
    );

    expect(resultat).toEqual({
      total: 5,
      planifiees: 2,
      televersees: 1,
      misesEnLigne: 1,
      enRetard: 1,
      annulees: 1,
    });

    // Les quatre catégories hors annulées reconstituent le total : le
    // graphique de répartition ne peut donc pas compter une ligne deux fois.
    expect(
      resultat.planifiees +
        resultat.televersees +
        resultat.misesEnLigne +
        resultat.enRetard,
    ).toBe(resultat.total);
  });

  it('compte comme en retard une échéance passée restée au statut PLANIFIE', () => {
    // Le statut EN_RETARD n'est écrit que par la tâche nocturne : s'y fier
    // afficherait « aucun retard » sur une installation où elle n'a pas tourné.
    const resultat = compteurs(
      [ligne({ statut: 'PLANIFIE', dateDiffusionPrevue: jour(2026, 1, 10) })],
      AUJOURDHUI,
    );

    expect(resultat.enRetard).toBe(1);
    expect(resultat.planifiees).toBe(0);
  });

  it('compte comme en retard un fichier téléversé mais non mis en ligne', () => {
    // Le fichier est arrivé, la publication n'est pas sortie : elle est en retard.
    const resultat = compteurs(
      [ligne({ statut: 'TELEVERSE', dateDiffusionPrevue: jour(2026, 1, 10) })],
      AUJOURDHUI,
    );

    expect(resultat.enRetard).toBe(1);
    expect(resultat.televersees).toBe(0);
  });

  it('ne compte pas en retard une ligne mise en ligne, même tardivement', () => {
    const resultat = compteurs(
      [
        ligne({
          statut: 'MIS_EN_LIGNE',
          dateDiffusionPrevue: jour(2026, 1, 10),
          dateDiffusionReelle: jour(2026, 2, 20),
        }),
      ],
      AUJOURDHUI,
    );

    expect(resultat.misesEnLigne).toBe(1);
    expect(resultat.enRetard).toBe(0);
  });
});

describe('avancementAnnee', () => {
  it('mesure la part déjà mise en ligne', () => {
    expect(
      avancementAnnee([
        ligne({ dateDiffusionReelle: jour(2026, 2, 10) }),
        ligne({ dateDiffusionReelle: null }),
        ligne({ dateDiffusionReelle: null }),
        ligne({ dateDiffusionReelle: null }),
      ]),
    ).toBe(25);
  });

  it('vaut 0 sans aucune ligne, sans diviser par zéro', () => {
    expect(avancementAnnee([])).toBe(0);
  });
});
