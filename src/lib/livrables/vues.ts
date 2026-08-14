import 'server-only';

import type { ActeurSession } from '@/lib/auth/permissions';
import { perimetreStructures } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import type { DetailLigne } from '@/app/(app)/calendrier/dialogue-livrable';

/**
 * Lines of the "imminentes" and "produits chargés" screens (§9.1).
 *
 * Both reuse the deliverable dialog, so both need exactly the shape it expects.
 * Loading them here, once, keeps the two screens from drifting apart — and puts
 * the perimeter filter in a single place.
 */

export type LigneVue = DetailLigne & {
  structureId: string;
  structureNom: string;
  structureSigle: string;
  annee: number;
  /** ISO instant of the confirmed release, `null` while nothing is public. */
  dateDiffusionReelle: string | null;
  /** Whoever answers for this element, so a screen can offer to contact them. */
  pointFocal: {
    nomComplet: string;
    email: string | null;
    telephone: string | null;
  } | null;
  /** Lets the caller tell a full delivery from one merely started. */
  nombreFichiers: number;
  nombreValeurs: number;
};

/**
 * Structures actually readable, once the requested ones are intersected with
 * the perimeter.
 *
 * The intersection is the whole point: asking for a structure outside one's
 * perimeter must narrow the view, never widen it.
 */
function structuresLisibles(
  perimetre: string[] | null,
  demandees: readonly string[],
): string[] | null {
  if (demandees.length === 0) {
    return perimetre;
  }

  return perimetre === null
    ? [...demandees]
    : perimetre.filter((id) => demandees.includes(id));
}

/**
 * Contact details of a point focal, ready for the interface.
 *
 * An element without a point focal returns `null` rather than an empty record:
 * the screen must be able to say "no contact" instead of offering a menu that
 * leads nowhere.
 */
export function contactPointFocal(
  compte: {
    nom: string;
    prenoms: string;
    email: string;
    telephone: string | null;
  } | null,
): LigneVue['pointFocal'] {
  if (!compte) {
    return null;
  }

  return {
    nomComplet: `${compte.prenoms} ${compte.nom}`.trim(),
    email: compte.email || null,
    telephone: compte.telephone,
  };
}

export async function chargerLignesLivrables(
  acteur: ActeurSession & { organisationId: string },
  filtre: { annee?: number; structureIds?: readonly string[] },
): Promise<LigneVue[]> {
  const perimetre = perimetreStructures(acteur);

  // An empty perimeter means "nothing visible" and must never become "all".
  if (perimetre !== null && perimetre.length === 0) {
    return [];
  }

  const lisibles = structuresLisibles(perimetre, filtre.structureIds ?? []);

  if (lisibles !== null && lisibles.length === 0) {
    return [];
  }

  const lignes = await prisma.ligneCalendrier.findMany({
    where: {
      calendrier: {
        organisationId: acteur.organisationId,
        ...(filtre.annee ? { annee: filtre.annee } : {}),
        ...(lisibles === null ? {} : { structureId: { in: lisibles } }),
      },
    },
    include: {
      calendrier: {
        select: {
          annee: true,
          structureId: true,
          structure: { select: { nom: true, sigle: true } },
        },
      },
      publication: {
        select: {
          nom: true,
          pointFocal: {
            select: { nom: true, prenoms: true, email: true, telephone: true },
          },
          indicateursAffilies: {
            where: { deletedAt: null, actif: true },
            select: { id: true, nom: true, unite: true },
          },
        },
      },
      indicateur: {
        select: {
          id: true,
          nom: true,
          unite: true,
          pointFocal: {
            select: { nom: true, prenoms: true, email: true, telephone: true },
          },
        },
      },
      fichiers: {
        where: { deletedAt: null },
        orderBy: [{ type: 'asc' }, { version: 'desc' }],
      },
      valeurs: true,
    },
    orderBy: { dateDiffusionPrevue: 'asc' },
  });

  return lignes.map((ligne) => ({
    id: ligne.id,
    nomElement: ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément',
    elementType: ligne.elementType,
    libellePeriode: ligne.libellePeriode,
    dateDiffusionPrevue: ligne.dateDiffusionPrevue.toISOString(),
    statut: ligne.statut,
    lienPublication: ligne.lienPublication,
    fichiers: ligne.fichiers.map((fichier) => ({
      id: fichier.id,
      type: fichier.type,
      nomOriginal: fichier.nomOriginal,
      version: fichier.version,
      tailleOctets: fichier.tailleOctets,
      televerseAt: fichier.televerseAt.toISOString(),
    })),
    valeurs: ligne.valeurs.map((valeur) => ({
      indicateurId: valeur.indicateurId,
      valeur: valeur.valeur?.toString() ?? null,
      valeurTexte: valeur.valeurTexte,
      commentaire: valeur.commentaire,
      nonDisponible: valeur.nonDisponible,
    })),
    indicateursASaisir: ligne.publication
      ? ligne.publication.indicateursAffilies
      : ligne.indicateur
        ? [ligne.indicateur]
        : [],
    structureId: ligne.calendrier.structureId,
    structureNom: ligne.calendrier.structure.nom,
    structureSigle: ligne.calendrier.structure.sigle,
    annee: ligne.calendrier.annee,
    dateDiffusionReelle: ligne.dateDiffusionReelle?.toISOString() ?? null,
    pointFocal: contactPointFocal(
      ligne.publication?.pointFocal ?? ligne.indicateur?.pointFocal ?? null,
    ),
    nombreFichiers: ligne.fichiers.length,
    nombreValeurs: ligne.valeurs.length,
  }));
}

/**
 * Choices offered by the filter bar.
 *
 * Read from the whole perimeter, never from the current selection: narrowing
 * the list to what is already picked would make a second choice impossible.
 * Years come from the calendars that actually exist — offering 2031 when
 * nothing was ever planned for it is an invitation to an empty screen.
 */
export async function chargerChoixFiltres(
  acteur: ActeurSession & { organisationId: string },
): Promise<{
  annees: number[];
  structures: { id: string; nom: string; sigle: string }[];
}> {
  const perimetre = perimetreStructures(acteur);

  if (perimetre !== null && perimetre.length === 0) {
    return { annees: [], structures: [] };
  }

  const filtreStructure =
    perimetre === null ? {} : { structureId: { in: perimetre } };

  const [calendriers, structures] = await Promise.all([
    prisma.calendrier.findMany({
      where: { organisationId: acteur.organisationId, ...filtreStructure },
      select: { annee: true },
      distinct: ['annee'],
      orderBy: { annee: 'desc' },
    }),
    prisma.structure.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        ...(perimetre === null ? {} : { id: { in: perimetre } }),
      },
      select: { id: true, nom: true, sigle: true },
      orderBy: { nom: 'asc' },
    }),
  ]);

  return {
    annees: calendriers.map((calendrier) => calendrier.annee),
    structures,
  };
}

/** Raw values needed by the pure selection rules. */
export function critereSelection(ligne: LigneVue) {
  return {
    statut: ligne.statut,
    dateDiffusionPrevue: new Date(ligne.dateDiffusionPrevue),
    dateDiffusionReelle: ligne.dateDiffusionReelle
      ? new Date(ligne.dateDiffusionReelle)
      : null,
    nombreFichiers: ligne.nombreFichiers,
    nombreValeurs: ligne.nombreValeurs,
  };
}
