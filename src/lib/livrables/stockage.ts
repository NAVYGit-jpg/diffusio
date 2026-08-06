import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Storage access (cahier des charges §6).
 *
 * The bucket is private and every download goes through a **time-limited signed
 * URL** generated here. §14 forbids exposing an uploaded file behind a permanent
 * public address, and a private bucket is only half the answer: the other half
 * is never handing out a durable link.
 *
 * The secret key bypasses every database rule, so this module is `server-only`:
 * importing it from a client component fails the build rather than shipping the
 * key to a browser.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'livrables';

/** Signed links live long enough to click, not long enough to circulate. */
export const DUREE_URL_SIGNEE_SECONDES = 300;

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SECRET_KEY?.replace(/\s+/g, '');

  if (!url || !cle) {
    throw new Error(
      'Le stockage des fichiers n’est pas configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY dans le fichier .env.',
    );
  }

  return createClient(url, cle, { auth: { persistSession: false } });
}

export type ResultatTeleversement =
  | { ok: true; chemin: string }
  | { ok: false; erreur: string };

export async function televerser(
  chemin: string,
  contenu: ArrayBuffer,
  mimeType: string,
): Promise<ResultatTeleversement> {
  try {
    const { error } = await client()
      .storage.from(BUCKET)
      .upload(chemin, contenu, {
        contentType: mimeType,
        // Never overwrite: each upload is a new version with its own path.
        upsert: false,
      });

    if (error) {
      return { ok: false, erreur: messageLisible(error.message) };
    }

    return { ok: true, chemin };
  } catch (erreur) {
    return {
      ok: false,
      erreur: erreur instanceof Error ? erreur.message : 'Téléversement impossible.',
    };
  }
}

/** Short-lived download link. Returns `null` rather than throwing. */
export async function urlSignee(
  chemin: string,
  duree = DUREE_URL_SIGNEE_SECONDES,
): Promise<string | null> {
  try {
    const { data, error } = await client()
      .storage.from(BUCKET)
      .createSignedUrl(chemin, duree);

    return error ? null : data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Removes a stored object.
 *
 * Only used when a database write fails right after an upload: leaving an
 * orphan file in the bucket would slowly fill a free plan with unreferenced
 * data.
 */
export async function supprimer(chemin: string): Promise<void> {
  try {
    await client().storage.from(BUCKET).remove([chemin]);
  } catch {
    // Best effort: an orphan file is a nuisance, not a failure to report.
  }
}

/** Turns a storage error into something a non-technical user can act on. */
function messageLisible(message: string): string {
  if (/exceeded the maximum allowed size/i.test(message)) {
    return 'Ce fichier dépasse la taille autorisée par le serveur de stockage.';
  }

  if (/Bucket not found/i.test(message)) {
    return `Le dossier de stockage « ${BUCKET} » est introuvable. Vérifiez qu’il existe dans Supabase.`;
  }

  if (/already exists/i.test(message)) {
    return 'Un fichier porte déjà ce nom. Réessayez : une nouvelle version sera créée.';
  }

  return "Le téléversement a échoué. Réessayez, et prévenez votre administrateur si le problème persiste.";
}
