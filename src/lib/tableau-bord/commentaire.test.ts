import { describe, expect, it } from 'vitest';

import {
  type DonneesCommentaire,
  commentaireEnTexte,
  redigerCommentaire,
} from './commentaire';

function donnees(
  modifications: Partial<DonneesCommentaire> = {},
): DonneesCommentaire {
  return {
    annee: 2026,
    perimetre: 'Direction des Statistiques Sociales',
    respect: { base: 10, respectees: 8, taux: 80 },
    retards: { nombre: 2, moyen: 4.2, maximum: 9 },
    etatRetards: { total: 2, publieesApresEcheance: 1, nonPubliees: 1 },
    echeances: { j7: 0, j15: 1, j30: 3 },
    compteurs: {
      total: 12,
      planifiees: 2,
      televersees: 0,
      misesEnLigne: 8,
      enRetard: 2,
      annulees: 0,
    },
    avancement: 67,
    courbe: [],
    classement: [],
    parDomaine: [],
    classementVisible: false,
    ...modifications,
  };
}

function texte(modifications: Partial<DonneesCommentaire> = {}): string {
  return commentaireEnTexte(redigerCommentaire(donnees(modifications)));
}

describe('redigerCommentaire', () => {
  it('ouvre en situant le périmètre et l’année', () => {
    const observations = redigerCommentaire(donnees());

    expect(observations[0].texte).toContain('calendrier 2026');
    expect(observations[0].texte).toContain('12 lignes');
    expect(observations[0].texte).toContain('Direction des Statistiques Sociales');
  });

  it('ne commente rien sur un périmètre sans ligne', () => {
    const observations = redigerCommentaire(
      donnees({
        compteurs: {
          total: 0,
          planifiees: 0,
          televersees: 0,
          misesEnLigne: 0,
          enRetard: 0,
          annulees: 0,
        },
      }),
    );

    expect(observations).toHaveLength(1);
    expect(observations[0].texte).toContain("rien à commenter");
  });
});

describe('taux de respect', () => {
  it("dit que le taux n'est pas calculable plutôt que d'écrire 0 %", () => {
    // Écrire « 0 % » se lirait comme un échec, alors qu'il n'y a rien à juger.
    const resultat = texte({ respect: { base: 0, respectees: 0, taux: null } });

    expect(resultat).toContain('ne peut pas être calculé');
    expect(resultat).not.toContain('0 %');
  });

  it('salue un taux élevé', () => {
    const observations = redigerCommentaire(
      donnees({ respect: { base: 10, respectees: 10, taux: 100 } }),
    );

    expect(observations[1].ton).toBe('positif');
    expect(observations[1].texte).toContain('100 %');
  });

  it('accorde le verbe au singulier pour zéro et une diffusion', () => {
    // « 0 diffusion ont été mises » : la faute saute aux yeux dans un PDF.
    expect(texte({ respect: { base: 7, respectees: 0, taux: 0 } })).toContain(
      '0 diffusion sur 7 a été mise en ligne',
    );
    expect(texte({ respect: { base: 7, respectees: 1, taux: 14.3 } })).toContain(
      '1 diffusion sur 7 a été mise en ligne',
    );
    expect(texte({ respect: { base: 7, respectees: 3, taux: 42.9 } })).toContain(
      '3 diffusions sur 7 ont été mises en ligne',
    );
  });

  it('signale un taux faible', () => {
    const observations = redigerCommentaire(
      donnees({ respect: { base: 10, respectees: 3, taux: 30 } }),
    );

    expect(observations[1].ton).toBe('alerte');
  });
});

describe('retards', () => {
  it('sépare les retards publiés des retards non publiés', () => {
    const resultat = texte({
      etatRetards: { total: 5, publieesApresEcheance: 2, nonPubliees: 3 },
      retards: { nombre: 5, moyen: 12.6, maximum: 40 },
    });

    expect(resultat).toContain('5 lignes sont en retard');
    expect(resultat).toContain('2 ont été publiées après l’échéance');
    expect(resultat).toContain('3 restent attendues');
    expect(resultat).toContain('13 jours');
    expect(resultat).toContain('40 jours');
  });

  it('accorde correctement une ligne unique jamais diffusée', () => {
    const resultat = texte({
      etatRetards: { total: 1, publieesApresEcheance: 0, nonPubliees: 1 },
      retards: { nombre: 1, moyen: 3, maximum: 3 },
    });

    expect(resultat).toContain('1 ligne est en retard');
    expect(resultat).toContain('Elle n’a pas été diffusée');
    expect(resultat).toContain('3 jours');
  });

  it('salue l’absence de retard', () => {
    const observations = redigerCommentaire(
      donnees({
        etatRetards: { total: 0, publieesApresEcheance: 0, nonPubliees: 0 },
        retards: { nombre: 0, moyen: null, maximum: null },
      }),
    );

    expect(observations.some((o) => o.ton === 'positif')).toBe(true);
    expect(commentaireEnTexte(observations)).toContain('Aucune ligne');
  });
});

describe('tendance', () => {
  const point = (libelle: string, taux: number | null) => ({
    mois: 1,
    libelle,
    base: taux === null ? 0 : 2,
    taux,
  });

  it('compare les deux derniers mois mesurés', () => {
    const resultat = texte({
      courbe: [point('Jan', 50), point('Fév', 80)],
    });

    expect(resultat).toContain('progresse de 30 points');
  });

  it('saute les mois sans rien à publier', () => {
    // Comparer mars à un avril vide inventerait un effondrement.
    const resultat = texte({
      courbe: [point('Jan', 50), point('Fév', 80), point('Mar', null)],
    });

    expect(resultat).toContain('Jan');
    expect(resultat).toContain('Fév');
    expect(resultat).not.toContain('Mar');
  });

  it('parle de stabilité pour un écart faible', () => {
    const resultat = texte({ courbe: [point('Jan', 80), point('Fév', 82)] });

    expect(resultat).toContain('reste stable');
  });

  it('ne dit rien avec un seul mois mesuré', () => {
    const resultat = texte({ courbe: [point('Jan', 80), point('Fév', null)] });

    expect(resultat).not.toContain('stable');
    expect(resultat).not.toContain('progresse');
  });
});

describe('classement', () => {
  const rang = (nom: string, taux: number | null) => ({
    structureId: nom,
    structureNom: nom,
    base: 4,
    respectees: 2,
    taux,
    retards: 1,
  });

  it('nomme la meilleure et la moins bonne structure', () => {
    const resultat = texte({
      classementVisible: true,
      classement: [rang('Alpha', 90), rang('Beta', 40)],
    });

    expect(resultat).toContain('Alpha affiche le meilleur taux');
    expect(resultat).toContain('Beta le plus faible');
  });

  it('reste muet pour un point focal', () => {
    // §10 : le classement n'est visible que des admins et super admins.
    const resultat = texte({
      classementVisible: false,
      classement: [rang('Alpha', 90), rang('Beta', 40)],
    });

    expect(resultat).not.toContain('Alpha');
  });

  it('ignore les structures non mesurables', () => {
    const resultat = texte({
      classementVisible: true,
      classement: [rang('Alpha', 90), rang('Sans échéance', null)],
    });

    expect(resultat).not.toContain('Sans échéance');
  });
});

describe('concentration par domaine', () => {
  it('signale un domaine qui pèse plus de la moitié', () => {
    const resultat = texte({
      parDomaine: [
        { libelle: 'Prix', nombre: 9 },
        { libelle: 'Emploi', nombre: 3 },
      ],
    });

    expect(resultat).toContain('« Prix » concentre 75 %');
  });

  it('ne dit rien quand la répartition est équilibrée', () => {
    const resultat = texte({
      parDomaine: [
        { libelle: 'Prix', nombre: 5 },
        { libelle: 'Emploi', nombre: 7 },
      ],
    });

    expect(resultat).not.toContain('concentre');
  });
});

describe('échéances à venir', () => {
  it('met en avant les échéances sous 7 jours', () => {
    const observations = redigerCommentaire(
      donnees({ echeances: { j7: 2, j15: 3, j30: 5 } }),
    );

    const echeance = observations.find((o) => o.texte.includes('30 prochains jours'));

    expect(echeance?.ton).toBe('alerte');
    expect(echeance?.texte).toContain('dont 2 dans les 7 jours');
  });

  it('ne dit rien sans échéance à trente jours', () => {
    const resultat = texte({ echeances: { j7: 0, j15: 0, j30: 0 } });

    expect(resultat).not.toContain('30 prochains jours');
  });
});

describe('avancement', () => {
  it('mentionne les livrables en attente de mise en ligne', () => {
    const resultat = texte({
      compteurs: {
        total: 12,
        planifiees: 2,
        televersees: 3,
        misesEnLigne: 5,
        enRetard: 2,
        annulees: 0,
      },
    });

    expect(resultat).toContain('3 livrables attendent la confirmation');
  });
});
