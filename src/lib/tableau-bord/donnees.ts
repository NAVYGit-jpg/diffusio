import 'server-only';

import type { ActeurSession } from '@/lib/auth/permissions';
import { perimetreStructures } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import type { LigneIndicateur } from './indicateurs';

/**
 * Data behind the dashboard (cahier des charges §10).
 *
 * The perimeter is applied here, once, in the WHERE clause — never in the page
 * and never on the client. A point focal reading `/tableau-de-bord?structure=…`
 * with somebody else's identifier gets their own figures back, not an error and
 * not the other structure's data.
 */

/** Empty lists mean "no restriction", never "nothing". */
export type FiltresTableauDeBord = {
  annee: number;
  structureIds: string[];
  domaineIds: string[];
  periodicites: string[];
  typesElement: string[];
};

export type ContexteTableauDeBord = {
  lignes: LigneIndicateur[];
  structures: { id: string; nom: string; sigle: string }[];
  domaines: { id: string; nom: string }[];
  /** Catalogue size over the same perimeter. */
  catalogue: { publications: number; indicateurs: number };
  anneesDisponibles: number[];
  /** True when the ranking may be shown (§10: admin and super admin only). */
  classementVisible: boolean;
};

/**
 * Resolves the structures the dashboard may read.
 *
 * Returns `null` for "no restriction". Requested structures are **intersected**
 * with the perimeter rather than replacing it — that intersection is the whole
 * point: asking for a structure outside one's perimeter must narrow the view,
 * never widen it.
 */
function structuresLisibles(
  acteur: ActeurSession,
  structuresDemandees: readonly string[],
): string[] | null {
  const perimetre = perimetreStructures(acteur);

  if (structuresDemandees.length === 0) {
    return perimetre;
  }

  if (perimetre === null) {
    return [...structuresDemandees];
  }

  return perimetre.filter((id) => structuresDemandees.includes(id));
}

export async function chargerTableauDeBord(
  acteur: ActeurSession & { organisationId: string },
  filtres: FiltresTableauDeBord,
): Promise<ContexteTableauDeBord> {
  const lisibles = structuresLisibles(acteur, filtres.structureIds);

  // The dropdown must keep offering the whole perimeter even once a structure
  // is ticked: narrowing it to the current selection would make a second choice
  // impossible.
  const perimetreComplet = perimetreStructures(acteur);

  // An ADMIN with no structure assigned, or a POINT_FOCAL without a structure:
  // an empty list means "nothing", and must not be turned into "everything".
  if (perimetreComplet !== null && perimetreComplet.length === 0) {
    return {
      lignes: [],
      structures: [],
      domaines: [],
      catalogue: { publications: 0, indicateurs: 0 },
      anneesDisponibles: [],
      classementVisible: acteur.role !== 'POINT_FOCAL',
    };
  }

  const filtreStructure = lisibles === null ? {} : { structureId: { in: lisibles } };

  // Element type is a column of the calendar line, so it filters in SQL.
  const filtreType =
    filtres.typesElement.length === 0
      ? {}
      : { elementType: { in: filtres.typesElement as ('PUBLICATION' | 'INDICATEUR')[] } };

  const [lignes, structures, domaines, annees] = await Promise.all([
    prisma.ligneCalendrier.findMany({
      where: {
        ...filtreType,
        calendrier: {
          organisationId: acteur.organisationId,
          annee: filtres.annee,
          ...filtreStructure,
        },
      },
      select: {
        id: true,
        statut: true,
        elementType: true,
        dateDiffusionPrevue: true,
        dateDiffusionReelle: true,
        calendrier: {
          select: { structureId: true, structure: { select: { nom: true } } },
        },
        publication: {
          select: {
            periodicite: true,
            domaineId: true,
            domaine: { select: { nom: true } },
          },
        },
        indicateur: {
          select: {
            periodicite: true,
            domaineId: true,
            domaine: { select: { nom: true } },
          },
        },
        retard: { select: { publie: true } },
      },
    }),

    // Perimeter, not selection: see the note above.
    prisma.structure.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        ...(perimetreComplet === null ? {} : { id: { in: perimetreComplet } }),
      },
      select: { id: true, nom: true, sigle: true },
      orderBy: { nom: 'asc' },
    }),

    prisma.domaine.findMany({
      where: { organisationId: acteur.organisationId },
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    }),

    // Years come from the whole perimeter so the selector keeps its choices
    // when a structure filter is applied.
    prisma.calendrier.findMany({
      where: {
        organisationId: acteur.organisationId,
        ...(perimetreComplet === null
          ? {}
          : { structureId: { in: perimetreComplet } }),
      },
      select: { annee: true },
      distinct: ['annee'],
      orderBy: { annee: 'desc' },
    }),
  ]);

  // Catalogue counts follow the perimeter and the filters, but not the calendar:
  // an element declared and never scheduled still belongs to the catalogue.
  const compterPublications =
    filtres.typesElement.length === 0 || filtres.typesElement.includes('PUBLICATION');
  const compterIndicateurs =
    filtres.typesElement.length === 0 || filtres.typesElement.includes('INDICATEUR');

  const filtreDomaine =
    filtres.domaineIds.length === 0 ? {} : { domaineId: { in: filtres.domaineIds } };
  const filtrePeriodicite =
    filtres.periodicites.length === 0
      ? {}
      : {
          periodicite: {
            in: filtres.periodicites as ('MENSUELLE' | 'TRIMESTRIELLE')[],
          },
        };

  const [publications, indicateurs] = await Promise.all([
    compterPublications
      ? prisma.publication.count({
          where: {
            organisationId: acteur.organisationId,
            deletedAt: null,
            ...filtreStructure,
            ...filtreDomaine,
            ...filtrePeriodicite,
          },
        })
      : Promise.resolve(0),
    compterIndicateurs
      ? prisma.indicateur.count({
          where: {
            organisationId: acteur.organisationId,
            deletedAt: null,
            ...filtreStructure,
            ...filtreDomaine,
            ...filtrePeriodicite,
          },
        })
      : Promise.resolve(0),
  ]);

  // Domain and periodicity live on the catalogue element, not on the calendar
  // line, so those two filters are applied after the join rather than in SQL.
  const converties: LigneIndicateur[] = [];

  for (const ligne of lignes) {
    const element = ligne.publication ?? ligne.indicateur;
    const domaineId = element?.domaineId ?? null;
    const periodicite = (element?.periodicite as string | undefined) ?? '';

    if (
      filtres.domaineIds.length > 0 &&
      (domaineId === null || !filtres.domaineIds.includes(domaineId))
    ) {
      continue;
    }
    if (
      filtres.periodicites.length > 0 &&
      !filtres.periodicites.includes(periodicite)
    ) {
      continue;
    }

    converties.push({
      id: ligne.id,
      structureId: ligne.calendrier.structureId,
      structureNom: ligne.calendrier.structure.nom,
      domaine: element?.domaine?.nom ?? null,
      periodicite,
      elementType: ligne.elementType as 'PUBLICATION' | 'INDICATEUR',
      dateDiffusionPrevue: ligne.dateDiffusionPrevue,
      dateDiffusionReelle: ligne.dateDiffusionReelle,
      statut: ligne.statut as string,
      retardPublie: ligne.retard ? ligne.retard.publie : null,
    });
  }

  return {
    lignes: converties,
    structures,
    domaines,
    catalogue: { publications, indicateurs },
    // Raw list; `anneesProposees` adds the selected year and filters out any
    // value outside the offered range.
    anneesDisponibles: annees.map((entree) => entree.annee),
    classementVisible: acteur.role !== 'POINT_FOCAL',
  };
}

export type ActionRecente = {
  id: string;
  action: string;
  entite: string;
  auteur: string | null;
  quand: Date;
};

/**
 * Recent activity feed (§10).
 *
 * Read from the audit journal, restricted to the organisation. Entries are not
 * filtered by structure: the journal records actions, not calendar lines, and
 * inventing a link would be guesswork.
 */
export async function chargerActiviteRecente(
  organisationId: string,
  limite = 8,
): Promise<ActionRecente[]> {
  const entrees = await prisma.journalAudit.findMany({
    where: { organisationId },
    select: {
      id: true,
      action: true,
      entite: true,
      createdAt: true,
      utilisateur: { select: { nom: true, prenoms: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limite,
  });

  return entrees.map((entree) => ({
    id: entree.id,
    action: entree.action,
    entite: entree.entite,
    auteur: entree.utilisateur
      ? `${entree.utilisateur.prenoms} ${entree.utilisateur.nom}`
      : null,
    quand: entree.createdAt,
  }));
}
