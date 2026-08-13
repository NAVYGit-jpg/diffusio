import 'server-only';

import type { TypeEnvoiEmail } from '@prisma/client';

import { prisma } from '@/lib/prisma';

/**
 * Transactional e-mail dispatch.
 *
 * Two modes, driven by `EMAIL_MODE` (§8.4):
 *   - `test`  — nothing leaves the machine; the message is printed to the
 *               server console. This is the mandatory mode during development
 *               (§14: "ne pas envoyer d'e-mail réel pendant les phases de
 *               développement").
 *   - `prod`  — real delivery through Brevo.
 *
 * Every attempt is recorded in `JournalEmail`, which also carries the
 * uniqueness constraint that makes duplicate automated sends impossible.
 */

export type MessageEmail = {
  destinataires: string[];
  copie?: string[];
  sujet: string;
  corpsHtml: string;
  corpsTexte: string;
  typeEnvoi: TypeEnvoiEmail;
  /** Set when the message relates to a calendar line, for the audit trail. */
  ligneCalendrierId?: string;
  /**
   * In-application notification mirroring the message.
   *
   * Every e-mail leaves a trace inside the application: an address can be
   * mistyped, a message can land in a spam folder, and somebody who signs in
   * must still find out what was sent to them. Recipients are matched by
   * address among the accounts of the organisation — a team member who has no
   * account gets the e-mail only, which is exactly what they signed up for.
   */
  notification?: {
    titre: string;
    message: string;
    lien?: string;
    /** Skipped: being told about one's own action is noise. */
    auteurId?: string;
  };
};

export type ResultatEnvoi = {
  envoye: boolean;
  erreur?: string;
  /** A message of the same type already went out for this line today. */
  doublon?: boolean;
};

const MODE = process.env.EMAIL_MODE ?? 'test';

async function envoyerViaBrevo(message: MessageEmail): Promise<ResultatEnvoi> {
  const cle = process.env.BREVO_API_KEY;

  if (!cle) {
    return {
      envoye: false,
      erreur: "BREVO_API_KEY n'est pas définie alors que EMAIL_MODE vaut « prod ».",
    };
  }

  const reponse = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': cle,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.EMAIL_EXPEDITEUR,
        name: process.env.EMAIL_EXPEDITEUR_NOM ?? 'DIFFUSIO',
      },
      to: message.destinataires.map((email) => ({ email })),
      ...(message.copie?.length ? { cc: message.copie.map((email) => ({ email })) } : {}),
      subject: message.sujet,
      htmlContent: message.corpsHtml,
      textContent: message.corpsTexte,
    }),
  });

  if (!reponse.ok) {
    return {
      envoye: false,
      erreur: `Brevo a répondu ${reponse.status} : ${await reponse.text()}`,
    };
  }

  return { envoye: true };
}

function afficherEnConsole(message: MessageEmail): ResultatEnvoi {
  const redirection = process.env.EMAIL_TEST_DESTINATAIRE;

  console.log(`
┌──────────────────────────────────────────────────────────────
│ E-MAIL SIMULÉ (EMAIL_MODE=test — aucun envoi réel)
├──────────────────────────────────────────────────────────────
│ Type        : ${message.typeEnvoi}
│ À           : ${message.destinataires.join(', ')}${
    message.copie?.length ? `\n│ Copie       : ${message.copie.join(', ')}` : ''
  }
│ Redirigé
│   vers      : ${redirection ?? '(non configuré)'}
│ Sujet       : ${message.sujet}
├──────────────────────────────────────────────────────────────
${message.corpsTexte
  .split('\n')
  .map((ligne) => `│ ${ligne}`)
  .join('\n')}
└──────────────────────────────────────────────────────────────
`);

  return { envoye: true };
}

/**
 * Sends (or simulates) a message and journals the attempt.
 *
 * Never throws: a failed notification must not roll back the business
 * operation that triggered it.
 */
export async function envoyerEmail(
  message: MessageEmail,
  maintenant: Date = new Date(),
): Promise<ResultatEnvoi> {
  const jourEnvoi = new Date(
    Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate(),
    ),
  );

  // The journal entry is written **before** sending, on purpose. Its unique
  // constraint (line, type, day) is what makes a duplicate impossible: if the
  // insert fails, a message of this type already went out today and nothing
  // more must happen. Sending first would let a second cron run deliver a
  // duplicate before the constraint could object (§8.4).
  let journalId: string;

  try {
    const entree = await prisma.journalEmail.create({
      data: {
        ligneCalendrierId: message.ligneCalendrierId ?? null,
        typeEnvoi: message.typeEnvoi,
        destinataires: message.destinataires,
        sujet: message.sujet,
        statut: 'ENVOYE',
        jourEnvoi,
        envoyeAt: maintenant,
      },
      select: { id: true },
    });

    journalId = entree.id;
  } catch {
    return { envoye: false, doublon: true };
  }

  let resultat: ResultatEnvoi;

  try {
    resultat =
      MODE === 'prod'
        ? await envoyerViaBrevo(message)
        : afficherEnConsole(message);
  } catch (erreur) {
    resultat = {
      envoye: false,
      erreur: erreur instanceof Error ? erreur.message : String(erreur),
    };
  }

  if (!resultat.envoye) {
    // The row stays: a failed attempt is worth keeping, and it also prevents
    // hammering a broken provider every few minutes for the same message.
    await prisma.journalEmail
      .update({
        where: { id: journalId },
        data: { statut: 'ECHEC', erreur: resultat.erreur ?? null },
      })
      .catch(() => undefined);
  }

  if (message.notification) {
    await notifierLesDestinataires(message);
  }

  return resultat;
}

/**
 * Mirrors the message as an in-application notification.
 *
 * Runs after the send and swallows its own failures: a notification must never
 * roll back — nor mask — the delivery it accompanies.
 */
async function notifierLesDestinataires(message: MessageEmail): Promise<void> {
  const notification = message.notification!;

  const adresses = [...message.destinataires, ...(message.copie ?? [])].map(
    (email) => email.trim().toLowerCase(),
  );

  if (adresses.length === 0) {
    return;
  }

  try {
    const comptes = await prisma.utilisateur.findMany({
      where: {
        email: { in: [...new Set(adresses)], mode: 'insensitive' },
        actif: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    const cibles = comptes
      .map((compte) => compte.id)
      .filter((id) => id !== notification.auteurId);

    if (cibles.length === 0) {
      return;
    }

    await prisma.notification.createMany({
      data: cibles.map((destinataireId) => ({
        destinataireId,
        type: message.typeEnvoi,
        titre: notification.titre,
        message: notification.message,
        lien: notification.lien ?? null,
      })),
    });
  } catch {
    // Best effort.
  }
}
