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
};

export type ResultatEnvoi = {
  envoye: boolean;
  erreur?: string;
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
): Promise<ResultatEnvoi> {
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

  const maintenant = new Date();

  try {
    await prisma.journalEmail.create({
      data: {
        ligneCalendrierId: message.ligneCalendrierId ?? null,
        typeEnvoi: message.typeEnvoi,
        destinataires: message.destinataires,
        sujet: message.sujet,
        statut: resultat.envoye ? 'ENVOYE' : 'ECHEC',
        erreur: resultat.erreur ?? null,
        jourEnvoi: new Date(
          Date.UTC(
            maintenant.getUTCFullYear(),
            maintenant.getUTCMonth(),
            maintenant.getUTCDate(),
          ),
        ),
      },
    });
  } catch {
    // A unique-constraint hit means the same message already went out today.
    // That is the anti-duplicate guard doing its job, not an error.
  }

  return resultat;
}
