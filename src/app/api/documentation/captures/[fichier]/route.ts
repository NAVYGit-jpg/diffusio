import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { auth } from '@/auth';

/**
 * Screenshots of the documentation, read from documentation/captures.
 * Signed-in users only: they show the inside of the platform.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ fichier: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return new Response('Authentification requise.', { status: 401 });
  }

  const { fichier } = await params;

  if (!/^[a-z0-9-]+\.(jpg|png)$/.test(fichier)) {
    return new Response('Fichier inconnu.', { status: 404 });
  }

  try {
    const donnees = await readFile(path.join(process.cwd(), 'documentation', 'captures', fichier));

    return new Response(new Uint8Array(donnees), {
      headers: {
        'content-type': fichier.endsWith('.png') ? 'image/png' : 'image/jpeg',
        'cache-control': 'private, max-age=86400',
      },
    });
  } catch {
    return new Response('Capture absente.', { status: 404 });
  }
}
