/**
 * Absolute address of the application, for anything a mail client must fetch
 * or a recipient must click.
 *
 * A message is read outside the application: a relative path resolves against
 * the mail client, never against the server that sent it. Every image and every
 * link in an e-mail therefore has to be absolute.
 */

/**
 * Where the application answers.
 *
 * Three sources, in order of authority:
 *
 * 1. `AUTH_URL`, when it actually holds something. A **blank** value is treated
 *    as absent — `??` alone does not catch the empty string, and an empty
 *    `AUTH_URL` on the platform produced invitation links that began with a
 *    slash and led nowhere. Nobody could tell from the message that anything
 *    was wrong.
 * 2. The stable production address the platform publishes for the project.
 *    With it, an invitation still carries a working link even when nobody
 *    thought to declare `AUTH_URL`.
 * 3. Localhost, for a development machine — where those links are expected not
 *    to resolve for anyone else.
 */
export function adresseApplication(): string {
  const declaree = process.env.AUTH_URL?.trim();

  if (declaree) {
    return declaree.endsWith('/') ? declaree.slice(0, -1) : declaree;
  }

  const publiqueParLaPlateforme =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (publiqueParLaPlateforme) {
    if (process.env.VERCEL_ENV === 'production') {
      console.warn(
        "[adresse] AUTH_URL est vide : l'adresse publiée par la plateforme " +
          `est utilisée à la place (${publiqueParLaPlateforme}). Renseignez ` +
          'AUTH_URL pour ne pas dépendre de ce repli.',
      );
    }

    return `https://${publiqueParLaPlateforme}`;
  }

  return 'http://localhost:3000';
}

/** Public address of the QR code drawn for a published calendar line. */
export function adresseQrCode(ligneId: string): string {
  return `${adresseApplication()}/api/qr/${ligneId}`;
}
