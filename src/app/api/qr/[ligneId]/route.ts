import QRCode from 'qrcode';

import { prisma } from '@/lib/prisma';

/**
 * QR code pointing at a published product (cahier des charges §7).
 *
 * Deliberately public and unauthenticated, for the same reason as the logo
 * route: this address ends up inside an e-mail, and a mail client fetches
 * images without any session.
 *
 * It replaces the `data:` URI the message used to carry. Embedding a base64
 * image in an e-mail is the obvious thing to do and it does not work — Gmail
 * strips `data:` sources outright, so recipients saw a broken frame where the
 * code should have been. A fetched image is the only form mail clients agree
 * to render.
 *
 * Nothing is exposed that was not already public: the code encodes the address
 * of a product that has been published, and the route answers only for lines
 * that really are online.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ ligneId: string }> },
): Promise<Response> {
  const { ligneId } = await params;

  const ligne = await prisma.ligneCalendrier.findUnique({
    where: { id: ligneId },
    select: { lienPublication: true, statut: true, dateDiffusionReelle: true },
  });

  if (!ligne?.lienPublication || ligne.statut !== 'MIS_EN_LIGNE') {
    return new Response(null, { status: 404 });
  }

  // Redrawn rather than read back from the stored copy: the link is the
  // authority, and a code that disagreed with it would send readers somewhere
  // the product no longer is.
  const image = await QRCode.toBuffer(ligne.lienPublication, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return new Response(new Uint8Array(image), {
    headers: {
      'content-type': 'image/png',
      // A published line no longer moves; the code can be cached for a day.
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      etag: `"${ligne.dateDiffusionReelle?.getTime() ?? 0}"`,
    },
  });
}
