import 'server-only';

import type { ActeurSession } from '@/lib/auth/permissions';
import { LIBELLE_PERIODICITE } from '@/lib/catalogue/schemas';
import { type Observation, redigerCommentaire } from './commentaire';
import {
  type ContexteTableauDeBord,
  type FiltresTableauDeBord,
  chargerTableauDeBord,
} from './donnees';
import { LIBELLE_TYPE_ELEMENT, type TypeElement } from './filtres-url';
import {
  type Compteurs,
  type Echeances,
  type EtatRetards,
  type LigneIndicateur,
  type Part,
  type PointMensuel,
  type RangStructure,
  type StatistiquesRetard,
  type TauxRespect,
  avancementAnnee,
  classementStructures,
  compteurs,
  etatRetards,
  evolutionMensuelle,
  lignesComparables,
  prochainesEcheances,
  repartition,
  statistiquesRetard,
  tauxRespect,
} from './indicateurs';

/**
 * The dashboard, computed once (cahier des charges §10).
 *
 * The screen, the Excel file and the printed PDF all go through here. Computing
 * the figures twice — once for the page, once for the export — is how a report
 * ends up disagreeing with the screen it claims to reproduce.
 */

export type Rapport = {
  annee: number;
  perimetre: string;
  filtresLisibles: string[];
  contexte: ContexteTableauDeBord;
  lignes: LigneIndicateur[];
  respect: TauxRespect;
  retards: StatistiquesRetard;
  echeances: Echeances;
  etat: EtatRetards;
  nombres: Compteurs;
  avancement: number;
  courbe: PointMensuel[];
  classement: RangStructure[];
  parDomaine: Part[];
  parPeriodicite: Part[];
  parStructure: Part[];
  parType: Part[];
  commentaire: Observation[];
  genereLe: Date;
};

/** Human-readable summary of the scope, used as a subtitle everywhere. */
function decrirePerimetre(
  contexte: ContexteTableauDeBord,
  filtres: FiltresTableauDeBord,
): string {
  if (filtres.structureIds.length > 0) {
    const noms = contexte.structures
      .filter((structure) => filtres.structureIds.includes(structure.id))
      .map((structure) => structure.sigle);

    if (noms.length > 0) {
      return noms.join(', ');
    }
  }

  if (contexte.structures.length === 1) {
    return contexte.structures[0].nom;
  }

  return `${contexte.structures.length} structures`;
}

/** The active filters, spelled out for the header of an exported file. */
function decrireFiltres(
  contexte: ContexteTableauDeBord,
  filtres: FiltresTableauDeBord,
): string[] {
  const lignes: string[] = [];

  if (filtres.typesElement.length > 0) {
    lignes.push(
      `Type de produit : ${filtres.typesElement
        .map(
          (type) =>
            LIBELLE_TYPE_ELEMENT[type as TypeElement] ?? type,
        )
        .join(', ')}`,
    );
  }

  if (filtres.domaineIds.length > 0) {
    const noms = contexte.domaines
      .filter((domaine) => filtres.domaineIds.includes(domaine.id))
      .map((domaine) => domaine.nom);

    lignes.push(`Domaine : ${noms.join(', ')}`);
  }

  if (filtres.periodicites.length > 0) {
    lignes.push(
      `Périodicité : ${filtres.periodicites
        .map(
          (periodicite) =>
            LIBELLE_PERIODICITE[
              periodicite as keyof typeof LIBELLE_PERIODICITE
            ] ?? periodicite,
        )
        .join(', ')}`,
    );
  }

  return lignes;
}

export async function assemblerRapport(
  acteur: ActeurSession & { organisationId: string },
  filtres: FiltresTableauDeBord,
  maintenant: Date = new Date(),
): Promise<Rapport> {
  const contexte = await chargerTableauDeBord(acteur, filtres);
  const lignes = lignesComparables(contexte.lignes);

  const nombres = compteurs(contexte.lignes, maintenant);

  const parDomaine = repartition(
    lignes,
    (ligne) => ligne.domaine ?? 'Sans domaine',
  );

  const courbe = evolutionMensuelle(lignes, filtres.annee, maintenant);
  const classement = classementStructures(lignes, maintenant);
  const respect = tauxRespect(lignes, maintenant);
  const etat = etatRetards(lignes, maintenant);
  const echeances = prochainesEcheances(lignes, maintenant);
  const avancement = avancementAnnee(contexte.lignes);
  const perimetre = decrirePerimetre(contexte, filtres);

  return {
    annee: filtres.annee,
    perimetre,
    filtresLisibles: decrireFiltres(contexte, filtres),
    contexte,
    lignes,
    respect,
    retards: statistiquesRetard(lignes, maintenant),
    echeances,
    etat,
    nombres,
    avancement,
    courbe,
    classement,
    parDomaine,
    parPeriodicite: repartition(
      lignes,
      (ligne) =>
        LIBELLE_PERIODICITE[
          ligne.periodicite as keyof typeof LIBELLE_PERIODICITE
        ] ?? 'Non renseignée',
    ),
    parStructure: repartition(lignes, (ligne) => ligne.structureNom),
    parType: repartition(
      lignes,
      (ligne) => LIBELLE_TYPE_ELEMENT[ligne.elementType] ?? ligne.elementType,
    ),
    commentaire: redigerCommentaire({
      annee: filtres.annee,
      perimetre,
      respect,
      retards: statistiquesRetard(lignes, maintenant),
      etatRetards: etat,
      echeances,
      compteurs: nombres,
      avancement,
      courbe,
      classement,
      parDomaine,
      classementVisible: contexte.classementVisible,
    }),
    genereLe: maintenant,
  };
}

/** The headline figures, in the order they appear on screen. */
export function indicateursDuRapport(
  rapport: Rapport,
): { libelle: string; valeur: string; precision: string }[] {
  const { respect, etat, retards, echeances, nombres, contexte, avancement } =
    rapport;

  return [
    {
      libelle: 'Taux de respect des délais',
      valeur: respect.taux === null ? '—' : `${respect.taux} %`,
      precision:
        respect.base === 0
          ? 'Aucune échéance passée'
          : `${respect.respectees} sur ${respect.base} ligne(s) jugeable(s)`,
    },
    {
      libelle: 'Lignes en retard',
      valeur: String(etat.total),
      precision: `${etat.nonPubliees} non publiée(s), ${etat.publieesApresEcheance} publiée(s) hors délai`,
    },
    {
      libelle: 'Retard moyen',
      valeur: retards.moyen === null ? '—' : `${retards.moyen} j`,
      precision:
        retards.maximum === null
          ? 'Aucun retard constaté'
          : `Retard maximum : ${retards.maximum} jour(s)`,
    },
    {
      libelle: 'Échéances à 30 jours',
      valeur: String(echeances.j30),
      precision: `${echeances.j7} sous 7 jours, ${echeances.j15} sous 15 jours`,
    },
    {
      libelle: 'Au catalogue',
      valeur: String(
        contexte.catalogue.publications + contexte.catalogue.indicateurs,
      ),
      precision: `${contexte.catalogue.publications} publication(s), ${contexte.catalogue.indicateurs} indicateur(s)`,
    },
    {
      libelle: 'Lignes prévues',
      valeur: String(nombres.total),
      precision: `Calendrier ${rapport.annee}`,
    },
    {
      libelle: 'Livrées',
      valeur: String(nombres.televersees),
      precision: 'En attente de confirmation de publication',
    },
    {
      libelle: 'Publiées',
      valeur: String(nombres.misesEnLigne),
      precision: `${avancement} % du calendrier`,
    },
  ];
}
