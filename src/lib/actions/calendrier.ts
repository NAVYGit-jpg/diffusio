'use server';

import { revalidatePath } from 'next/cache';

import { PermissionRefusee, assertPermission } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import {
  type LigneCalculee,
  type LigneExistante,
  comparerCalendrier,
  resumerComparaison,
} from '@/lib/calendrier/comparaison';
import type { JourFerie } from '@/lib/calendrier/dates';
import { ANNEE_MAX, ANNEE_MIN } from '@/lib/calendrier/annees';
import { genererLignes } from '@/lib/calendrier/moteur';
import { prisma } from '@/lib/prisma';

/**
 * Calendar generation (cahier des charges §5.4 and §5.5).
 *
 * Nothing is ever written without a preview first: the user picks a year and
 * the elements, sees exactly what will be created, then confirms.
 */

export type LigneApercu = {
  elementType: 'PUBLICATION' | 'INDICATEUR';
  elementId: string;
  nomElement: string;
  libellePeriode: string;
  dateDebutCouverture: string;
  dateFinCouverture: string;
  dateDiffusionPrevue: string;
};

export type EtatCalendrier = {
  apercu?: LigneApercu[];
  resume?: string[];
  /** Hand-edited lines whose date would be overwritten. */
  aConfirmer?: { libellePeriode: string; nomElement: string; ancienne: string; nouvelle: string }[];
  annee?: number;
  applique?: boolean;
  nombreLignes?: number;
  erreur?: string;
};

type ElementCatalogue = {
  id: string;
  nom: string;
  structureId: string;
  periodicite: 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'PLURIANNUELLE' | 'PONCTUELLE';
  nombreAnneesPeriodicite: number | null;
  delaiJours: number;
  delaiType: 'CALENDAIRES' | 'OUVRES';
  reportSiWeekendOuFerie: boolean;
};

/**
 * Loads the selected elements, restricted to what the acteur may touch.
 *
 * Only publications and **unaffiliated** indicators are eligible: an affiliated
 * indicator never gets a line of its own (§5.1).
 */
async function chargerElements(
  organisationId: string,
  structureId: string,
  identifiants: { publications: string[]; indicateurs: string[] },
): Promise<{ publications: ElementCatalogue[]; indicateurs: ElementCatalogue[] }> {
  const selection = {
    id: true,
    nom: true,
    structureId: true,
    periodicite: true,
    nombreAnneesPeriodicite: true,
    delaiJours: true,
    delaiType: true,
    reportSiWeekendOuFerie: true,
  } as const;

  const [publications, indicateurs] = await Promise.all([
    identifiants.publications.length > 0
      ? prisma.publication.findMany({
          where: {
            id: { in: identifiants.publications },
            organisationId,
            structureId,
            deletedAt: null,
            actif: true,
          },
          select: selection,
        })
      : Promise.resolve([]),
    identifiants.indicateurs.length > 0
      ? prisma.indicateur.findMany({
          where: {
            id: { in: identifiants.indicateurs },
            organisationId,
            structureId,
            deletedAt: null,
            actif: true,
            // §5.1 — an affiliated indicator inherits its publication's line.
            publicationId: null,
          },
          select: selection,
        })
      : Promise.resolve([]),
  ]);

  return {
    publications: publications as ElementCatalogue[],
    indicateurs: indicateurs as ElementCatalogue[],
  };
}

function calculerLignes(
  elements: { publications: ElementCatalogue[]; indicateurs: ElementCatalogue[] },
  annee: number,
  joursFeries: JourFerie[],
): { calculees: LigneCalculee[]; nomsParId: Map<string, string> } {
  const calculees: LigneCalculee[] = [];
  const nomsParId = new Map<string, string>();

  const traiter = (
    liste: ElementCatalogue[],
    elementType: 'PUBLICATION' | 'INDICATEUR',
  ) => {
    for (const element of liste) {
      nomsParId.set(`${elementType}::${element.id}`, element.nom);

      for (const ligne of genererLignes(element, annee, joursFeries)) {
        calculees.push({
          elementType,
          elementId: element.id,
          libellePeriode: ligne.libellePeriode,
          dateDebutCouverture: ligne.dateDebutCouverture,
          dateFinCouverture: ligne.dateFinCouverture,
          dateDiffusionPrevue: ligne.dateDiffusionPrevue,
        });
      }
    }
  };

  traiter(elements.publications, 'PUBLICATION');
  traiter(elements.indicateurs, 'INDICATEUR');

  return { calculees, nomsParId };
}

function lireSelection(donnees: FormData) {
  return {
    annee: Number(donnees.get('annee')),
    structureId: String(donnees.get('structureId') ?? ''),
    publications: donnees.getAll('publications').map(String),
    indicateurs: donnees.getAll('indicateurs').map(String),
  };
}

/**
 * Computes what a generation would produce, without writing anything (§5.4
 * step 5). Also used as the difference report of an update (§5.5).
 */
export async function previsualiserCalendrierAction(
  _etatPrecedent: EtatCalendrier,
  donnees: FormData,
): Promise<EtatCalendrier> {
  const acteur = await exigerActeur();
  const selection = lireSelection(donnees);

  if (
    !Number.isInteger(selection.annee) ||
    selection.annee < ANNEE_MIN ||
    selection.annee > ANNEE_MAX
  ) {
    return { erreur: `Choisissez une année entre ${ANNEE_MIN} et ${ANNEE_MAX}.` };
  }

  try {
    assertPermission(acteur, 'calendrier:generer', selection.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  if (selection.publications.length + selection.indicateurs.length === 0) {
    return { erreur: 'Sélectionnez au moins une publication ou un indicateur.' };
  }

  const [elements, feries, calendrier] = await Promise.all([
    chargerElements(acteur.organisationId, selection.structureId, selection),
    prisma.jourFerie.findMany({
      where: { organisationId: acteur.organisationId },
      select: { date: true, recurrentAnnuel: true },
    }),
    prisma.calendrier.findUnique({
      where: {
        structureId_annee: {
          structureId: selection.structureId,
          annee: selection.annee,
        },
      },
      include: { lignes: true },
    }),
  ]);

  const { calculees, nomsParId } = calculerLignes(elements, selection.annee, feries);

  if (calculees.length === 0) {
    return {
      erreur:
        'Aucune ligne à générer. Les publications ponctuelles se saisissent à la main, et un indicateur rattaché à une publication n’a pas de ligne propre.',
      annee: selection.annee,
    };
  }

  const existantes: LigneExistante[] = (calendrier?.lignes ?? []).map((ligne) => ({
    id: ligne.id,
    elementType: ligne.elementType,
    elementId: (ligne.publicationId ?? ligne.indicateurId)!,
    libellePeriode: ligne.libellePeriode,
    dateDiffusionPrevue: ligne.dateDiffusionPrevue,
    statut: ligne.statut,
    modifieManuellement: ligne.modifieManuellement,
  }));

  const rapport = comparerCalendrier(existantes, calculees);

  const nommer = (ligne: { elementType: string; elementId: string }) =>
    nomsParId.get(`${ligne.elementType}::${ligne.elementId}`) ?? 'Élément inconnu';

  return {
    annee: selection.annee,
    resume: resumerComparaison(rapport),
    apercu: calculees.map((ligne) => ({
      elementType: ligne.elementType,
      elementId: ligne.elementId,
      nomElement: nommer(ligne),
      libellePeriode: ligne.libellePeriode,
      dateDebutCouverture: ligne.dateDebutCouverture.toISOString(),
      dateFinCouverture: ligne.dateFinCouverture.toISOString(),
      dateDiffusionPrevue: ligne.dateDiffusionPrevue.toISOString(),
    })),
    aConfirmer: rapport.aConfirmer.map((paire) => ({
      nomElement: nommer(paire.calculee),
      libellePeriode: paire.calculee.libellePeriode,
      ancienne: paire.existante.dateDiffusionPrevue.toISOString(),
      nouvelle: paire.calculee.dateDiffusionPrevue.toISOString(),
    })),
  };
}

/**
 * Applies the generation.
 *
 * Recomputed server-side rather than trusting the preview sent back: the
 * browser must never be the source of the dates that get stored.
 */
export async function genererCalendrierAction(
  _etatPrecedent: EtatCalendrier,
  donnees: FormData,
): Promise<EtatCalendrier> {
  const acteur = await exigerActeur();
  const selection = lireSelection(donnees);
  const ecraserManuelles = donnees.get('ecraserManuelles') === '1';

  try {
    assertPermission(acteur, 'calendrier:generer', selection.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const [elements, feries] = await Promise.all([
    chargerElements(acteur.organisationId, selection.structureId, selection),
    prisma.jourFerie.findMany({
      where: { organisationId: acteur.organisationId },
      select: { date: true, recurrentAnnuel: true },
    }),
  ]);

  const { calculees } = calculerLignes(elements, selection.annee, feries);

  if (calculees.length === 0) {
    return { erreur: 'Aucune ligne à générer.' };
  }

  const calendrier = await prisma.calendrier.upsert({
    where: {
      structureId_annee: {
        structureId: selection.structureId,
        annee: selection.annee,
      },
    },
    create: {
      organisationId: acteur.organisationId,
      structureId: selection.structureId,
      annee: selection.annee,
      statut: 'BROUILLON',
      generePar: acteur.id,
      generatedAt: new Date(),
    },
    update: { generePar: acteur.id, generatedAt: new Date() },
    include: { lignes: true },
  });

  // A validated calendar is locked for a point focal (§5.6).
  if (calendrier.statut === 'VALIDE' && acteur.role === 'POINT_FOCAL') {
    return {
      erreur:
        'Ce calendrier est validé : demandez une autorisation de modification à votre administrateur.',
    };
  }

  const existantes: LigneExistante[] = calendrier.lignes.map((ligne) => ({
    id: ligne.id,
    elementType: ligne.elementType,
    elementId: (ligne.publicationId ?? ligne.indicateurId)!,
    libellePeriode: ligne.libellePeriode,
    dateDiffusionPrevue: ligne.dateDiffusionPrevue,
    statut: ligne.statut,
    modifieManuellement: ligne.modifieManuellement,
  }));

  const rapport = comparerCalendrier(existantes, calculees);

  if (rapport.aConfirmer.length > 0 && !ecraserManuelles) {
    return {
      erreur: `${rapport.aConfirmer.length} ligne(s) ont été modifiées à la main. Confirmez leur écrasement pour continuer.`,
      annee: selection.annee,
    };
  }

  const aEcrire = [...rapport.aModifier, ...(ecraserManuelles ? rapport.aConfirmer : [])];

  await prisma.$transaction([
    ...(rapport.aSupprimer.length > 0
      ? [
          prisma.ligneCalendrier.deleteMany({
            where: { id: { in: rapport.aSupprimer.map((ligne) => ligne.id) } },
          }),
        ]
      : []),

    ...aEcrire.map((paire) =>
      prisma.ligneCalendrier.update({
        where: { id: paire.existante.id },
        data: {
          dateDebutCouverture: paire.calculee.dateDebutCouverture,
          dateFinCouverture: paire.calculee.dateFinCouverture,
          dateDiffusionPrevue: paire.calculee.dateDiffusionPrevue,
          modifieManuellement: false,
        },
      }),
    ),

    ...(rapport.aAjouter.length > 0
      ? [
          prisma.ligneCalendrier.createMany({
            data: rapport.aAjouter.map((ligne) => ({
              calendrierId: calendrier.id,
              elementType: ligne.elementType,
              publicationId:
                ligne.elementType === 'PUBLICATION' ? ligne.elementId : null,
              indicateurId:
                ligne.elementType === 'INDICATEUR' ? ligne.elementId : null,
              libellePeriode: ligne.libellePeriode,
              dateDebutCouverture: ligne.dateDebutCouverture,
              dateFinCouverture: ligne.dateFinCouverture,
              dateDiffusionPrevue: ligne.dateDiffusionPrevue,
              // Kept as the trace of the first computed value (§4.6).
              dateDiffusionInitiale: ligne.dateDiffusionPrevue,
              statut: 'PLANIFIE',
            })),
          }),
        ]
      : []),
  ]);

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'GENERATION_CALENDRIER',
      entite: 'Calendrier',
      entiteId: calendrier.id,
      apres: {
        annee: selection.annee,
        ajoutees: rapport.aAjouter.length,
        modifiees: aEcrire.length,
        supprimees: rapport.aSupprimer.length,
        conservees: rapport.conservees.length,
      },
    },
  });

  revalidatePath('/calendrier');

  return {
    applique: true,
    annee: selection.annee,
    nombreLignes: rapport.aAjouter.length + aEcrire.length,
    resume: resumerComparaison(rapport),
  };
}
