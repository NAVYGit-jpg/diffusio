import 'server-only';

import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { envoyerEmail } from '@/lib/email/envoyer';
import { modeleRappel, modeleRelance } from '@/lib/email/modeles';
import { copieDeStructure } from '@/lib/notifications/destinataires';
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
      // Reminders and chases go to the titular point focal; a deputy can file
      // the deliverable but does not carry the responsibility (DEC-107).
      const destinataires = element.pointFocalId
        ? await prisma.utilisateur.findMany({
            where: { id: element.pointFocalId, actif: true, deletedAt: null },
            select: { id: true, email: true, nom: true, prenoms: true },
          })
        : [];

      // Systematiquement en copie : l equipe de la structure et ses admins.
      const copie = await copieDeStructure(
        organisation.id,
        ligne.calendrier.structureId,
      );

      const nomPointFocal = destinataires[0]
        ? `${destinataires[0].prenoms} ${destinataires[0].nom}`
        : '';

      const typeProduit =
        ligne.elementType === 'PUBLICATION' ? 'PUBLICATION' : 'INDICATEUR';

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
          typeProduit,
          nomElement: element.nom,
          nomPointFocal: nomPointFocal,
          periode: ligne.libellePeriode,
          dateDebutCouverture: formaterJJMMAAAA(ligne.dateDebutCouverture),
          dateFinCouverture: formaterJJMMAAAA(ligne.dateFinCouverture),
          dateDiffusionPrevue: formaterJJMMAAAA(ligne.dateDiffusionPrevue),
          joursRestants: rappel.joursRestants,
          lien,
        });

        // The notification travels with the message: `envoyerEmail` creates one
        // for every recipient who has an account, sender and copy alike.
        const envoi = await envoyerEmail({
          destinataires: destinataires.map((compte) => compte.email),
          copie,
          typeEnvoi: rappel.type,
          ligneCalendrierId: ligne.id,
          notification: {
            titre: `Publication imminente : ${element.nom}`,
            message: `${ligne.libellePeriode} — à diffuser ${libelleJoursRestants(rappel.joursRestants)}, le ${formaterJJMMAAAA(ligne.dateDiffusionPrevue)}.`,
            lien: `/imminentes`,
          },
          ...modele,
        }, aujourdhui);

        if (envoi.doublon) {
          resultat.doublonsEvites += 1;
        } else {
          resultat.rappelsEnvoyes += 1;
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
          typeProduit,
          nomElement: element.nom,
          nomPointFocal,
          periode: ligne.libellePeriode,
          dateDebutCouverture: formaterJJMMAAAA(ligne.dateDebutCouverture),
          dateFinCouverture: formaterJJMMAAAA(ligne.dateFinCouverture),
          dateNonRespectee: formaterJJMMAAAA(decision.dateDeReference),
          joursDeRetard: decision.joursDeRetard,
          lien,
        });

        const envoi = await envoyerEmail({
          destinataires: destinataires.map((compte) => compte.email),
          copie,
          typeEnvoi: 'RELANCE_RETARD',
          ligneCalendrierId: ligne.id,
          notification: {
            titre: `Publication en retard : ${element.nom}`,
            message: `${ligne.libellePeriode} — en retard ${libelleRetard(decision.joursDeRetard)}, attendu le ${formaterJJMMAAAA(decision.dateDeReference)}.`,
            lien: '/retards',
          },
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
        }
      }
    }
  }

  return resultat;
}
