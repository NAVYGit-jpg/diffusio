import { prisma } from '@/lib/prisma';

/**
 * The organisation's uploaded logo (cahier des charges §9.4).
 *
 * Deliberately public and unauthenticated: this address ends up inside every
 * e-mail, and a mail client fetches images without any session. A wordmark is
 * not a secret — it is on the institution's letterhead.
 *
 * Stored in the database rather than the storage bucket for the same reason:
 * the bucket is private, and a signed URL expires long before an e-mail is
 * read.
 */
export async function GET(): Promise<Response> {
  const organisation = await prisma.organisation.findFirst({
    where: { deletedAt: null },
    select: { logoFichier: true, logoMimeType: true, updatedAt: true },
  });

  if (!organisation?.logoFichier || !organisation.logoMimeType) {
    // No custom logo: the caller falls back to the DIFFUSIO wordmark.
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(organisation.logoFichier), {
    headers: {
      'content-type': organisation.logoMimeType,
      // Cached, but revalidated: a logo changed at 9 a.m. must not still be the
      // old one at noon.
      'cache-control': 'public, max-age=60, stale-while-revalidate=300',
      etag: `"${organisation.updatedAt.getTime()}"`,
    },
  });
}
