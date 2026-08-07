import 'server-only';

import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { envoyerEmail } from '@/lib/email/envoyer';
import { modeleRappel, modeleRelance } from '@/lib/email/modeles';
import { LIBELLE_PERIODICITE } from '@/lib/catalogue/schemas';
import { notifier } from '@/lib/notifications/destinataires';
import { prisma } from '@/lib/prisma';
import {
  decisionRelance,
  libelleJoursRestants,
  libelleRetard,
  passeEnRetard,
  rappelDuJour,
} from './planification';

/**
 * Daily job behind `POST /api/cron/notifications` (cahier des charges §8).
 *
 * Takes the date as a parameter rather than reading the clock: that is what
 * makes a whole month replayable in one command, as §11 Phase 7 requires.
 *
 * Duplicate sends are impossible by construction — `JournalEmail` carries a
 * unique constraint on (line, type, day). A second run on the same day writes
 * nothing new.
 */

export type ResultatExecution = {
  date: string;
  lignesExaminees: number;
  passagesEnRetard: number;
  rappelsEnvoyes: number;
  relancesEnvoyees: number;
  doublonsEvites: number;
  erreurs: string[];
};

export async function executerRelances(
  aujourdhui: Date = new Date(),
): Promise<ResultatExecution> {
  const resultat: ResultatExecution = {
    date: formaterJJMMAAAA(aujourdhui),
    lignesExaminees: 0,
    passagesEnRetard: 0,
    rappelsEnvoyes: 0,
    relancesEnvoyees: 0,
    doublonsEvites: 0,
    erreurs: [],
  };

  const organisations = await prisma.organisation.findMany({
    where: { actif: true, deletedAt: null },
    select: {
      id: true,
      nom: true,
      sigle: true,
      couleurPrimaire: true,
      logoUrl: true,
      joursRappel: true,
      frequenceRelanceRetardJours: true,
    },
  });

  const base = process.env.AUTH_URL ?? 'http://localhost:3000';

  for (const organisation of organisations) {
    // Only lines that still expect something. Delivered and published ones are
    // filtered out at the source rather than line by line.
    const lignes = await prisma.ligneCalendrier.findMany({
      where: {
        calendrier: { organisationId: organisation.id },
        statut: { notIn: ['TELEVERSE', 'MIS_EN_LIGNE', 'ANNULE'] },
      },
      include: {
        calendrier: { select: { structureId: true, annee: true } },
        publication: {
          select: { nom: true, periodicite: true, pointFocalId: true },
        },
        indicateur: {
          select: { nom: true, periodicite: true, pointFocalId: true },
        },
        retard: true,
      },
    });

    resultat.lignesExaminees += lignes.length;

    for (const ligne of lignes) {
      const element = ligne.publication ?? ligne.indicateur;

      if (!element) {
        continue;
      }

      const lien = `${base}/calendrier?structure=${ligne.calendrier.structureId}&annee=${ligne.calendrier.annee}`;
      const periodicite =
        LIBELLE_PERIODICITE[
          element.periodicite as keyof typeof LIBELLE_PERIODICITE
        ] ?? element.periodicite;

      // Reminders and chases go to the titular point focal; a deputy can file
      // the deliverable but does not carry the responsibility (DEC-107).
      const destinataires = element.pointFocalId
        ? await prisma.utilisateur.findMany({
            where: { id: element.pointFocalId, actif: true, deletedAt: null },
            select: { id: true, email: true },
          })
        : [];

      // ------------------------------------------------------ passage en retard
      if (
        passeEnRetard({
          dateDiffusionPrevue: ligne.dateDiffusionPrevue,
          aujourdhui,
          statut: ligne.statut,
        })
      ) {
        await prisma.ligneCalendrier.update({
          where: { id: ligne.id },
          data: { statut: 'EN_RETARD' },
        });

        await prisma.retard.upsert({
          where: { ligneCalendrierId: ligne.id },
          create: { ligneCalendrierId: ligne.id, detecteAt: aujourdhui },
          update: {},
        });

        ligne.statut = 'EN_RETARD';
        resultat.passagesEnRetard += 1;
      }

      // ------------------------------------------------------------- rappels
      const rappel = rappelDuJour({
        dateDiffusionPrevue: ligne.dateDiffusionPrevue,
        aujourdhui,
        statut: ligne.statut,
        joursRappel: organisation.joursRappel,
      });

      if (rappel && destinataires.length > 0) {
        const modele = modeleRappel({
          organisation,
          nomElement: element.nom,
          periodicite,
          periode: ligne.libellePeriode,
          dateDiffusionPrevue: formaterJJMMAAAA(ligne.dateDiffusionPrevue),
          joursRestants: libelleJoursRestants(rappel.joursRestants),
          lien,
        });

        const envoi = await envoyerEmail({
          destinataires: destinataires.map((compte) => compte.email),
          typeEnvoi: rappel.type,
          ligneCalendrierId: ligne.id,
          ...modele,
        }, aujourdhui);

        if (envoi.doublon) {
          resultat.doublonsEvites += 1;
        } else {
          resultat.rappelsEnvoyes += 1;

          await notifier(
            destinataires.map((compte) => compte.id),
            {
              type: 'RAPPEL_ECHEANCE',
              titre: `À diffuser ${libelleJoursRestants(rappel.joursRestants)}`,
              message: `${element.nom} — ${ligne.libellePeriode}, attendu le ${formaterJJMMAAAA(ligne.dateDiffusionPrevue)}.`,
              lien: `/calendrier?structure=${ligne.calendrier.structureId}&annee=${ligne.calendrier.annee}`,
            },
          );
        }
      }

      // ------------------------------------------------------------ relances
      const decision = decisionRelance({
        dateDiffusionPrevue: ligne.dateDiffusionPrevue,
        aujourdhui,
        statut: ligne.statut,
        retard: ligne.retard
          ? {
              relancesSuspendues: ligne.retard.relancesSuspendues,
              prochaineDateDiffusion: ligne.retard.prochaineDateDiffusion,
              publie: ligne.retard.publie,
            }
          : null,
        frequenceJours: organisation.frequenceRelanceRetardJours,
      });

      if (decision.relancer && destinataires.length > 0) {
        const modele = modeleRelance({
          organisation,
          nomElement: element.nom,
          periodicite,
          periode: ligne.libellePeriode,
          dateNonRespectee: formaterJJMMAAAA(decision.dateDeReference),
          retard: libelleRetard(decision.joursDeRetard),
          lien,
        });

        const envoi = await envoyerEmail({
          destinataires: destinataires.map((compte) => compte.email),
          typeEnvoi: 'RELANCE_RETARD',
          ligneCalendrierId: ligne.id,
          ...modele,
        }, aujourdhui);

        if (envoi.doublon) {
          resultat.doublonsEvites += 1;
        } else {
          resultat.relancesEnvoyees += 1;

          await prisma.retard.update({
            where: { ligneCalendrierId: ligne.id },
            data: {
              nombreRelancesEnvoyees: { increment: 1 },
              derniereRelanceAt: aujourdhui,
            },
          });

          await notifier(
            destinataires.map((compte) => compte.id),
            {
              type: 'RELANCE_RETARD',
              titre: 'Diffusion en retard',
              message: `${element.nom} — ${ligne.libellePeriode} est en retard ${libelleRetard(decision.joursDeRetard)}.`,
              lien: '/retards',
            },
          );
        }
      }
    }
  }

  return resultat;
}
