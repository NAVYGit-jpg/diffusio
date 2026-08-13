import type {
  Compteurs,
  Echeances,
  EtatRetards,
  Part,
  PointMensuel,
  RangStructure,
  StatistiquesRetard,
  TauxRespect,
} from './indicateurs';

/**
 * Plain-language reading of the dashboard figures (cahier des charges §10).
 *
 * The numbers are already on screen; what a reader actually needs is what they
 * *mean*. This module turns them into a handful of French sentences that follow
 * the export into Excel and PDF, where nobody is there to explain them.
 *
 * Two rules run through everything here:
 *
 * 1. **Never state a rate that does not exist.** When nothing is measurable the
 *    commentary says so instead of writing "0 %", which reads as a failure.
 * 2. **Describe, never advise.** "Sept échéances sont passées sans diffusion" is
 *    a fact; "il faut relancer les points focaux" is an instruction the tool is
 *    in no position to give.
 */

export type Ton = 'neutre' | 'positif' | 'alerte';

export type Observation = {
  ton: Ton;
  texte: string;
};

export type DonneesCommentaire = {
  annee: number;
  perimetre: string;
  respect: TauxRespect;
  retards: StatistiquesRetard;
  etatRetards: EtatRetards;
  echeances: Echeances;
  compteurs: Compteurs;
  avancement: number;
  courbe: PointMensuel[];
  classement: RangStructure[];
  parDomaine: Part[];
  classementVisible: boolean;
};

/** "12 lignes" / "1 ligne" — French agreement, written once. */
function accorder(nombre: number, singulier: string, pluriel = `${singulier}s`) {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

function jours(nombre: number): string {
  return accorder(nombre, 'jour');
}

/** Opening sentence: what the figures cover. */
function observationCadrage(donnees: DonneesCommentaire): Observation {
  const { compteurs, annee, perimetre } = donnees;

  return {
    ton: 'neutre',
    texte: `Le calendrier ${annee} compte ${accorder(
      compteurs.total,
      'ligne',
    )} de diffusion sur le périmètre « ${perimetre} »${
      compteurs.annulees > 0
        ? `, hors ${accorder(compteurs.annulees, 'ligne annulée', 'lignes annulées')}`
        : ''
    }.`,
  };
}

function observationRespect(donnees: DonneesCommentaire): Observation {
  const { respect } = donnees;

  if (respect.taux === null) {
    return {
      ton: 'neutre',
      texte:
        "Aucune échéance n'est encore passée : le taux de respect des délais ne peut pas être calculé pour l'instant.",
    };
  }

  // « 0 diffusion » et « 1 diffusion » commandent le singulier ; seul le pluriel
  // à partir de 2 prend « ont été mises ».
  const verbe =
    respect.respectees > 1 ? 'ont été mises' : 'a été mise';

  const base = `${accorder(respect.respectees, 'diffusion')} sur ${
    respect.base
  } ${verbe} en ligne à la date annoncée ou avant, soit un taux de respect de ${respect.taux} %.`;

  if (respect.taux >= 90) {
    return { ton: 'positif', texte: `${base} Les engagements sont tenus.` };
  }

  if (respect.taux >= 70) {
    return { ton: 'neutre', texte: base };
  }

  return { ton: 'alerte', texte: base };
}

function observationRetards(donnees: DonneesCommentaire): Observation | null {
  const { etatRetards, retards } = donnees;

  if (etatRetards.total === 0) {
    return {
      ton: 'positif',
      texte: 'Aucune ligne du calendrier n’accuse de retard à ce jour.',
    };
  }

  const detail =
    etatRetards.publieesApresEcheance > 0
      ? ` ${accorder(
          etatRetards.publieesApresEcheance,
          'a été publiée',
          'ont été publiées',
        )} après l’échéance, ${accorder(
          etatRetards.nonPubliees,
          "reste attendue",
          'restent attendues',
        )}.`
      : ` ${
          etatRetards.nonPubliees > 1
            ? 'Aucune n’a été diffusée'
            : 'Elle n’a pas été diffusée'
        } à ce jour.`;

  const moyenne =
    retards.moyen === null
      ? ''
      : ` Le retard moyen s’établit à ${jours(Math.round(retards.moyen))}, le plus ancien atteignant ${jours(
          retards.maximum ?? 0,
        )}.`;

  return {
    ton: 'alerte',
    texte: `${accorder(etatRetards.total, 'ligne est en retard', 'lignes sont en retard')}.${detail}${moyenne}`,
  };
}

function observationEcheances(donnees: DonneesCommentaire): Observation | null {
  const { echeances } = donnees;

  if (echeances.j30 === 0) {
    return null;
  }

  return {
    ton: echeances.j7 > 0 ? 'alerte' : 'neutre',
    texte: `${accorder(
      echeances.j30,
      'diffusion est attendue',
      'diffusions sont attendues',
    )} dans les 30 prochains jours${
      echeances.j7 > 0 ? `, dont ${echeances.j7} dans les 7 jours` : ''
    }.`,
  };
}

function observationAvancement(donnees: DonneesCommentaire): Observation {
  const { avancement, compteurs } = donnees;

  const attente =
    compteurs.televersees > 0
      ? ` ${accorder(
          compteurs.televersees,
          'livrable attend',
          'livrables attendent',
        )} la confirmation de mise en ligne.`
      : '';

  return {
    ton: avancement >= 75 ? 'positif' : 'neutre',
    texte: `L’année est réalisée à ${avancement} % : ${accorder(
      compteurs.misesEnLigne,
      'ligne a été mise',
      'lignes ont été mises',
    )} en ligne.${attente}`,
  };
}

/**
 * Trend over the months that carry a measure.
 *
 * Compares the last measured month with the one before it, skipping empty
 * months: comparing March with an empty April would invent a collapse.
 */
function observationTendance(donnees: DonneesCommentaire): Observation | null {
  const mesures = donnees.courbe.filter((point) => point.taux !== null);

  if (mesures.length < 2) {
    return null;
  }

  const dernier = mesures[mesures.length - 1];
  const precedent = mesures[mesures.length - 2];
  const ecart = Math.round(((dernier.taux ?? 0) - (precedent.taux ?? 0)) * 10) / 10;

  if (Math.abs(ecart) < 5) {
    return {
      ton: 'neutre',
      texte: `Le taux de respect reste stable entre ${precedent.libelle} (${precedent.taux} %) et ${dernier.libelle} (${dernier.taux} %).`,
    };
  }

  return {
    ton: ecart > 0 ? 'positif' : 'alerte',
    texte: `Le taux de respect ${
      ecart > 0 ? 'progresse' : 'recule'
    } de ${Math.abs(ecart)} points entre ${precedent.libelle} (${precedent.taux} %) et ${dernier.libelle} (${dernier.taux} %).`,
  };
}

/** Ranking, for the roles allowed to see it (§10). */
function observationClassement(donnees: DonneesCommentaire): Observation | null {
  if (!donnees.classementVisible) {
    return null;
  }

  const mesurables = donnees.classement.filter((rang) => rang.taux !== null);

  if (mesurables.length < 2) {
    return null;
  }

  const meilleur = mesurables[0];
  const dernier = mesurables[mesurables.length - 1];

  if (meilleur.taux === dernier.taux) {
    return {
      ton: 'neutre',
      texte: `Les ${mesurables.length} structures mesurables affichent le même taux de respect (${meilleur.taux} %).`,
    };
  }

  return {
    ton: 'neutre',
    texte: `${meilleur.structureNom} affiche le meilleur taux de respect (${meilleur.taux} %), ${dernier.structureNom} le plus faible (${dernier.taux} %).`,
  };
}

/** Where the calendar's weight sits, when one domain dominates. */
function observationConcentration(
  donnees: DonneesCommentaire,
): Observation | null {
  const { parDomaine, compteurs } = donnees;

  if (parDomaine.length < 2 || compteurs.total === 0) {
    return null;
  }

  const premier = parDomaine[0];
  const part = Math.round((premier.nombre / compteurs.total) * 100);

  if (part < 50) {
    return null;
  }

  return {
    ton: 'neutre',
    texte: `Le domaine « ${premier.libelle} » concentre ${part} % des lignes du calendrier.`,
  };
}

/**
 * The full commentary, in reading order.
 *
 * Scope first, then performance, then what is coming — the order somebody would
 * naturally ask the questions in.
 */
export function redigerCommentaire(
  donnees: DonneesCommentaire,
): Observation[] {
  if (donnees.compteurs.total === 0) {
    return [
      {
        ton: 'neutre',
        texte: `Aucune ligne de calendrier pour ${donnees.annee} sur ce périmètre : il n’y a rien à commenter.`,
      },
    ];
  }

  return [
    observationCadrage(donnees),
    observationRespect(donnees),
    observationRetards(donnees),
    observationTendance(donnees),
    observationEcheances(donnees),
    observationAvancement(donnees),
    observationClassement(donnees),
    observationConcentration(donnees),
  ].filter((observation): observation is Observation => observation !== null);
}

/** Flattened version, for a cell or a paragraph. */
export function commentaireEnTexte(observations: readonly Observation[]): string {
  return observations.map((observation) => observation.texte).join(' ');
}
