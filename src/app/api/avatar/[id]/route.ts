import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * A user's profile photo. Signed-in members of the same organisation only:
 * photos are shown inside the application, never in e-mails.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return new Response(null, { status: 401 });
  }

  const { id } = await params;
  const utilisateur = await prisma.utilisateur.findFirst({
    where: { id, organisationId: session.user.organisationId, deletedAt: null },
    select: { photoFichier: true, photoMimeType: true },
  });

  if (!utilisateur?.photoFichier || !utilisateur.photoMimeType) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(utilisateur.photoFichier), {
    headers: {
      'content-type': utilisateur.photoMimeType,
      // The address carries a version: a new photo gets a new address.
      'cache-control': 'private, max-age=31536000, immutable',
    },
  });
}
