import { describe, expect, it } from 'vitest';

import { jour } from '@/lib/calendrier/dates';
import {
  type EtatRetard,
  decisionRelance,
  estTraitee,
  joursEntre,
  libelleJoursRestants,
  libelleRetard,
  passeEnRetard,
  rappelDuJour,
} from './planification';

const RAPPELS_PAR_DEFAUT = [15, 10, 5, 3, 1];

describe('joursEntre', () => {
  it('compte les jours pleins', () => {
    expect(joursEntre(jour(2026, 2, 1), jour(2026, 2, 11))).toBe(10);
  });

  it('rend un nombre negatif quand la date est passee', () => {
    expect(joursEntre(jour(2026, 2, 11), jour(2026, 2, 1))).toBe(-10);
  });

  it('franchit un changement de mois et une annee bissextile', () => {
    expect(joursEntre(jour(2024, 2, 28), jour(2024, 3, 1))).toBe(2);
  });

  it('ignore la partie horaire', () => {
    const matin = new Date('2026-02-01T06:00:00Z');
    const soir = new Date('2026-02-01T23:00:00Z');

    expect(joursEntre(matin, soir)).toBe(0);
  });
});

describe('rappelDuJour', () => {
  const base = {
    dateDiffusionPrevue: jour(2026, 2, 10),
    statut: 'PLANIFIE' as const,
    joursRappel: RAPPELS_PAR_DEFAUT,
  };

  it('declenche chacun des cinq rappels au bon jour', () => {
    const attendus: [number, string][] = [
      [15, 'RAPPEL_J15'],
      [10, 'RAPPEL_J10'],
      [5, 'RAPPEL_J5'],
      [3, 'RAPPEL_J3'],
      [1, 'RAPPEL_J1'],
    ];

    for (const [restants, type] of attendus) {
      const aujourdhui = jour(2026, 2, 10 - restants);
      const rappel = rappelDuJour({ ...base, aujourdhui });

      expect(rappel?.type).toBe(type);
      expect(rappel?.joursRestants).toBe(restants);
    }
  });

  it('ne declenche rien un jour intermediaire', () => {
    // J-14, J-11, J-4, J-2 : aucun rappel prevu.
    for (const restants of [14, 11, 7, 4, 2]) {
      expect(
        rappelDuJour({ ...base, aujourdhui: jour(2026, 2, 10 - restants) }),
      ).toBeNull();
    }
  });

  it('ne declenche rien le jour meme', () => {
    expect(rappelDuJour({ ...base, aujourdhui: jour(2026, 2, 10) })).toBeNull();
  });

  it('ne declenche rien apres la date', () => {
    // Passe la date, c'est la relance de retard qui prend le relais.
    expect(rappelDuJour({ ...base, aujourdhui: jour(2026, 2, 12) })).toBeNull();
  });

  it('se tait pour une ligne deja televersee', () => {
    expect(
      rappelDuJour({
        ...base,
        aujourdhui: jour(2026, 1, 26),
        statut: 'TELEVERSE',
      }),
    ).toBeNull();
  });

  it('se tait pour une ligne deja mise en ligne', () => {
    expect(
      rappelDuJour({
        ...base,
        aujourdhui: jour(2026, 1, 26),
        statut: 'MIS_EN_LIGNE',
      }),
    ).toBeNull();
  });

  it('respecte des jours de rappel personnalises', () => {
    const rappel = rappelDuJour({
      ...base,
      aujourdhui: jour(2026, 1, 21),
      joursRappel: [20, 7],
    });

    expect(rappel?.joursRestants).toBe(20);
    expect(rappel?.type).toBe('RAPPEL_J15');
  });

  it('attribue les rangs par ordre decroissant, quel que soit l ordre saisi', () => {
    // Le super admin peut saisir [3, 20, 7] : le rang doit rester stable.
    const premier = rappelDuJour({
      ...base,
      aujourdhui: jour(2026, 1, 21),
      joursRappel: [3, 20, 7],
    });
    const deuxieme = rappelDuJour({
      ...base,
      aujourdhui: jour(2026, 2, 3),
      joursRappel: [3, 20, 7],
    });

    expect(premier?.type).toBe('RAPPEL_J15');
    expect(deuxieme?.type).toBe('RAPPEL_J10');
  });

  it('ignore les valeurs aberrantes de la configuration', () => {
    expect(
      rappelDuJour({ ...base, aujourdhui: jour(2026, 2, 9), joursRappel: [0, -5, 1] }),
    ).not.toBeNull();
  });
});

describe('passeEnRetard', () => {
  const base = {
    dateDiffusionPrevue: jour(2026, 2, 10),
    statut: 'PLANIFIE' as const,
  };

  it('bascule le lendemain de la date', () => {
    expect(passeEnRetard({ ...base, aujourdhui: jour(2026, 2, 11) })).toBe(true);
  });

  it('ne bascule pas le jour meme', () => {
    // Le point focal a jusqu'a la fin de la journee annoncee.
    expect(passeEnRetard({ ...base, aujourdhui: jour(2026, 2, 10) })).toBe(false);
  });

  it('ne bascule pas une ligne deja traitee', () => {
    for (const statut of ['TELEVERSE', 'MIS_EN_LIGNE'] as const) {
      expect(
        passeEnRetard({ ...base, statut, aujourdhui: jour(2026, 3, 1) }),
      ).toBe(false);
    }
  });

  it('ne bascule pas une ligne annulee', () => {
    expect(
      passeEnRetard({ ...base, statut: 'ANNULE', aujourdhui: jour(2026, 3, 1) }),
    ).toBe(false);
  });

  it('ne rebascule pas une ligne deja en retard', () => {
    expect(
      passeEnRetard({ ...base, statut: 'EN_RETARD', aujourdhui: jour(2026, 3, 1) }),
    ).toBe(false);
  });
});

describe('decisionRelance — sans justification', () => {
  const base = {
    dateDiffusionPrevue: jour(2026, 2, 10),
    statut: 'EN_RETARD' as const,
    retard: null,
    frequenceJours: 2,
  };

  it('ne relance pas avant la date', () => {
    expect(decisionRelance({ ...base, aujourdhui: jour(2026, 2, 9) }).relancer).toBe(
      false,
    );
  });

  it('ne relance pas le jour meme', () => {
    expect(decisionRelance({ ...base, aujourdhui: jour(2026, 2, 10) }).relancer).toBe(
      false,
    );
  });

  it('relance un jour sur deux a partir du lendemain', () => {
    const attendus: [number, boolean][] = [
      [11, false],
      [12, true],
      [13, false],
      [14, true],
      [15, false],
      [16, true],
    ];

    for (const [jourDuMois, attendu] of attendus) {
      expect(
        decisionRelance({ ...base, aujourdhui: jour(2026, 2, jourDuMois) }).relancer,
      ).toBe(attendu);
    }
  });

  it('compte correctement les jours de retard', () => {
    expect(
      decisionRelance({ ...base, aujourdhui: jour(2026, 2, 20) }).joursDeRetard,
    ).toBe(10);
  });

  it('respecte une frequence personnalisee', () => {
    for (const jourDuMois of [13, 16, 19]) {
      expect(
        decisionRelance({
          ...base,
          frequenceJours: 3,
          aujourdhui: jour(2026, 2, jourDuMois),
        }).relancer,
      ).toBe(true);
    }
  });

  it('se tait des que la ligne est televersee', () => {
    expect(
      decisionRelance({
        ...base,
        statut: 'TELEVERSE',
        aujourdhui: jour(2026, 2, 12),
      }).relancer,
    ).toBe(false);
  });
});

describe('decisionRelance — justification et report', () => {
  function retard(modifications: Partial<EtatRetard> = {}): EtatRetard {
    return {
      relancesSuspendues: true,
      prochaineDateDiffusion: jour(2026, 3, 10),
      publie: false,
      ...modifications,
    };
  }

  const base = {
    dateDiffusionPrevue: jour(2026, 2, 10),
    statut: 'EN_RETARD' as const,
    frequenceJours: 2,
  };

  it('cesse les relances des qu une prochaine date est annoncee', () => {
    // Sans suspension, le 20/02 aurait declenche une relance.
    expect(
      decisionRelance({ ...base, retard: retard(), aujourdhui: jour(2026, 2, 20) })
        .relancer,
    ).toBe(false);
  });

  it('ne relance pas non plus le jour de la nouvelle date', () => {
    expect(
      decisionRelance({ ...base, retard: retard(), aujourdhui: jour(2026, 3, 10) })
        .relancer,
    ).toBe(false);
  });

  it('ne reprend pas le lendemain de la nouvelle date', () => {
    // Le paragraphe 8.2 impose une reprise deux jours apres, pas le lendemain.
    expect(
      decisionRelance({ ...base, retard: retard(), aujourdhui: jour(2026, 3, 11) })
        .relancer,
    ).toBe(false);
  });

  it('reprend exactement deux jours apres la nouvelle date', () => {
    expect(
      decisionRelance({ ...base, retard: retard(), aujourdhui: jour(2026, 3, 12) })
        .relancer,
    ).toBe(true);
  });

  it('poursuit ensuite au rythme habituel', () => {
    const attendus: [number, boolean][] = [
      [12, true],
      [13, false],
      [14, true],
      [15, false],
      [16, true],
    ];

    for (const jourDuMois of attendus) {
      expect(
        decisionRelance({
          ...base,
          retard: retard(),
          aujourdhui: jour(2026, 3, jourDuMois[0]),
        }).relancer,
      ).toBe(jourDuMois[1]);
    }
  });

  it('compte le retard par rapport a la date annoncee, pas a l initiale', () => {
    const decision = decisionRelance({
      ...base,
      retard: retard(),
      aujourdhui: jour(2026, 3, 20),
    });

    expect(decision.joursDeRetard).toBe(10);
    expect(decision.dateDeReference.getTime()).toBe(jour(2026, 3, 10).getTime());
  });

  it('ne relance plus une ligne signalee comme publiee', () => {
    expect(
      decisionRelance({
        ...base,
        retard: retard({ publie: true }),
        aujourdhui: jour(2026, 3, 20),
      }).relancer,
    ).toBe(false);
  });

  it('reste muet si la suspension n annonce aucune date', () => {
    // Cas degrade : sans date annoncee, il n'y a rien sur quoi reprendre.
    expect(
      decisionRelance({
        ...base,
        retard: retard({ prochaineDateDiffusion: null }),
        aujourdhui: jour(2026, 3, 20),
      }).relancer,
    ).toBe(false);
  });
});

describe('libelles', () => {
  it('dit « demain » plutot que « dans 1 jours »', () => {
    expect(libelleJoursRestants(1)).toBe('demain');
    expect(libelleJoursRestants(15)).toBe('dans 15 jours');
  });

  it('accorde le singulier du retard', () => {
    expect(libelleRetard(1)).toBe('depuis 1 jour');
    expect(libelleRetard(4)).toBe('depuis 4 jours');
  });
});

describe('estTraitee', () => {
  it('reconnait les statuts qui arretent toute relance', () => {
    expect(estTraitee('TELEVERSE')).toBe(true);
    expect(estTraitee('MIS_EN_LIGNE')).toBe(true);
    expect(estTraitee('PLANIFIE')).toBe(false);
    expect(estTraitee('EN_RETARD')).toBe(false);
  });
});
