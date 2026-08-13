import { describe, expect, it } from 'vitest';

import { jour } from './dates';
import {
  HORIZON_IMMINENT_JOURS,
  type LigneSelectionnable,
  estChargee,
  estChargeeIncompletement,
  estImminente,
  joursAvantEcheance,
  libelleEcheance,
  urgence,
} from './selection';

const AUJOURDHUI = jour(2026, 8, 13);

function ligne(
  modifications: Partial<LigneSelectionnable> = {},
): LigneSelectionnable {
  return {
    statut: 'PLANIFIE',
    dateDiffusionPrevue: jour(2026, 8, 20),
    dateDiffusionReelle: null,
    nombreFichiers: 0,
    nombreValeurs: 0,
    ...modifications,
  };
}

describe('joursAvantEcheance', () => {
  it('compte en jours calendaires', () => {
    expect(
      joursAvantEcheance({ dateDiffusionPrevue: jour(2026, 8, 20) }, AUJOURDHUI),
    ).toBe(7);
  });

  it("vaut 0 le jour de l'échéance, quelle que soit l'heure", () => {
    const cetAprem = new Date(Date.UTC(2026, 7, 13, 16, 30));

    expect(
      joursAvantEcheance({ dateDiffusionPrevue: jour(2026, 8, 13) }, cetAprem),
    ).toBe(0);
  });

  it('devient négatif une fois la date passée', () => {
    expect(
      joursAvantEcheance({ dateDiffusionPrevue: jour(2026, 8, 10) }, AUJOURDHUI),
    ).toBe(-3);
  });
});

describe('estImminente', () => {
  it('retient une échéance dans la fenêtre', () => {
    expect(estImminente(ligne({ dateDiffusionPrevue: jour(2026, 8, 20) }), AUJOURDHUI)).toBe(
      true,
    );
  });

  it("retient l'échéance du jour même", () => {
    expect(estImminente(ligne({ dateDiffusionPrevue: jour(2026, 8, 13) }), AUJOURDHUI)).toBe(
      true,
    );
  });

  it('retient le dernier jour de la fenêtre', () => {
    // 15 jours pile : la borne est incluse.
    expect(estImminente(ligne({ dateDiffusionPrevue: jour(2026, 8, 28) }), AUJOURDHUI)).toBe(
      true,
    );
  });

  it('écarte le lendemain de la fenêtre', () => {
    expect(estImminente(ligne({ dateDiffusionPrevue: jour(2026, 8, 29) }), AUJOURDHUI)).toBe(
      false,
    );
  });

  it('écarte une échéance déjà passée', () => {
    // Les retards ont leur propre écran ; les mélanger transformerait une liste
    // de « ce qui arrive » en arriéré qu'on ne traite pas de la même façon.
    expect(estImminente(ligne({ dateDiffusionPrevue: jour(2026, 8, 12) }), AUJOURDHUI)).toBe(
      false,
    );
  });

  it('écarte une ligne déjà livrée ou publiée', () => {
    expect(estImminente(ligne({ statut: 'TELEVERSE' }), AUJOURDHUI)).toBe(false);
    expect(estImminente(ligne({ statut: 'MIS_EN_LIGNE' }), AUJOURDHUI)).toBe(false);
  });

  it('écarte une ligne annulée', () => {
    expect(estImminente(ligne({ statut: 'ANNULE' }), AUJOURDHUI)).toBe(false);
  });

  it('écarte une ligne déjà diffusée en avance', () => {
    expect(
      estImminente(ligne({ dateDiffusionReelle: jour(2026, 8, 11) }), AUJOURDHUI),
    ).toBe(false);
  });

  it('accepte un horizon personnalisé', () => {
    expect(
      estImminente(ligne({ dateDiffusionPrevue: jour(2026, 8, 20) }), AUJOURDHUI, 5),
    ).toBe(false);
  });

  it('utilise 15 jours par défaut', () => {
    expect(HORIZON_IMMINENT_JOURS).toBe(15);
  });
});

describe('estChargee', () => {
  it('retient une ligne portant un fichier', () => {
    expect(estChargee(ligne({ nombreFichiers: 1 }))).toBe(true);
  });

  it('retient une ligne portant une valeur saisie', () => {
    expect(estChargee(ligne({ nombreValeurs: 1 }))).toBe(true);
  });

  it('retient une ligne livrée ou publiée', () => {
    expect(estChargee(ligne({ statut: 'TELEVERSE' }))).toBe(true);
    expect(estChargee(ligne({ statut: 'MIS_EN_LIGNE' }))).toBe(true);
  });

  it('écarte une ligne où rien n’a été déposé', () => {
    expect(estChargee(ligne())).toBe(false);
  });

  it('écarte une ligne annulée, même chargée', () => {
    expect(estChargee(ligne({ statut: 'ANNULE', nombreFichiers: 2 }))).toBe(false);
  });
});

describe('estChargeeIncompletement', () => {
  it('signale un dépôt commencé mais pas terminé', () => {
    // Le PDF est là, la justification manque : c'est exactement la ligne sur
    // laquelle quelqu'un doit revenir.
    expect(estChargeeIncompletement(ligne({ nombreFichiers: 1 }))).toBe(true);
  });

  it('ne signale rien pour une ligne livrée', () => {
    expect(
      estChargeeIncompletement(ligne({ statut: 'TELEVERSE', nombreFichiers: 1 })),
    ).toBe(false);
  });

  it('ne signale rien pour une ligne vide', () => {
    expect(estChargeeIncompletement(ligne())).toBe(false);
  });
});

describe('urgence', () => {
  it('gradue de l’échéance du jour au plus lointain', () => {
    expect(urgence(0)).toBe('aujourdhui');
    expect(urgence(2)).toBe('trois-jours');
    expect(urgence(6)).toBe('semaine');
    expect(urgence(12)).toBe('plus-tard');
  });
});

describe('libelleEcheance', () => {
  it('parle comme une personne', () => {
    expect(libelleEcheance(0)).toBe("aujourd'hui");
    expect(libelleEcheance(1)).toBe('demain');
    expect(libelleEcheance(5)).toBe('dans 5 jours');
  });
});
