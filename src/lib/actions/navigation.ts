'use server';

import { exigerActeur } from '@/lib/auth/session';
import { marquerOngletVu } from '@/lib/navigation/compteurs';

/**
 * Clears a tab's badge (cahier des charges §9.5).
 *
 * Called by the sidebar when the reader lands on a tab. Deliberately **without**
 * `revalidatePath`: refreshing the layout here would re-render the sidebar,
 * which would fire the effect again, and the page would rebuild itself on every
 * navigation for a badge the interface has already hidden on its own.
 *
 * The stored value is the reader's own; no identifier travels in the request.
 */
export async function marquerOngletVuAction(onglet: string): Promise<void> {
  const acteur = await exigerActeur();

  await marquerOngletVu(acteur.id, onglet);
}
