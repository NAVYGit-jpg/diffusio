'use server';

import { revalidatePath } from 'next/cache';

import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export type EtatPhoto = { erreur?: string; succes?: boolean };

const FORMATS = ['image/png', 'image/jpeg', 'image/webp'];
const TAILLE_MAX = 2 * 1024 * 1024;

/**
 * Uploads the signed-in user's own photo. No identifier travels in the
 * request: one changes one's own photo, nobody else's.
 */
export async function televerserPhotoAction(
  _etat: EtatPhoto,
  donnees: FormData,
): Promise<EtatPhoto> {
  const acteur = await exigerActeur();
  const fichier = donnees.get('photo');

  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: 'Choisissez une image.' };
  }
  if (!FORMATS.includes(fichier.type)) {
    return { erreur: 'Formats acceptés : PNG, JPEG ou WebP.' };
  }
  if (fichier.size > TAILLE_MAX) {
    return { erreur: 'L’image ne doit pas dépasser 2 Mo.' };
  }

  await prisma.utilisateur.update({
    where: { id: acteur.id },
    data: {
      photoFichier: new Uint8Array(await fichier.arrayBuffer()),
      photoMimeType: fichier.type,
      photoMajAt: new Date(),
    },
  });

  revalidatePath('/', 'layout');

  return { succes: true };
}

export async function retirerPhotoAction(): Promise<void> {
  const acteur = await exigerActeur();

  await prisma.utilisateur.update({
    where: { id: acteur.id },
    data: { photoFichier: null, photoMimeType: null, photoMajAt: new Date() },
  });

  revalidatePath('/', 'layout');
}
