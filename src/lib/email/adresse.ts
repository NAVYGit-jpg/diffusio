/**
 * Absolute address of the application, for anything a mail client must fetch.
 *
 * A message is read outside the application: a relative path resolves against
 * the mail client, never against the server that sent it. Every image and every
 * link in an e-mail therefore has to be absolute.
 *
 * On a development machine `AUTH_URL` points at localhost and those images
 * simply will not load. That is expected, and it is why the messages stay
 * readable without them.
 */
export function adresseApplication(): string {
  const base = process.env.AUTH_URL ?? 'http://localhost:3000';

  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Public address of the QR code drawn for a published calendar line. */
export function adresseQrCode(ligneId: string): string {
  return `${adresseApplication()}/api/qr/${ligneId}`;
}
