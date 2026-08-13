import { CalendarClock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { exigerActeur } from '@/lib/auth/session';
import {
  HORIZON_IMMINENT_JOURS,
  estImminente,
  joursAvantEcheance,
} from '@/lib/calendrier/selection';
import { chargerLignesLivrables, critereSelection } from '@/lib/livrables/vues';
import { ListeLivrables } from '../_livrables/liste-livrables';

export const metadata: Metadata = {
  title: 'Publications imminentes — DIFFUSIO',
};

/**
 * What has to be produced within the next fortnight (§9.1).
 *
 * Overdue lines are deliberately absent: they live on "Publications en retard",
 * and a screen that mixes "coming up" with "already missed" becomes a backlog
 * rather than a plan for the fortnight.
 */
export default async function PageImminentes() {
  const acteur = await exigerActeur();
  const aujourdhui = new Date();

  const toutes = await chargerLignesLivrables(acteur, {});

  const lignes = toutes
    .filter((ligne) => estImminente(critereSelection(ligne), aujourdhui))
    .map((ligne) => ({
      ...ligne,
      joursRestants: joursAvantEcheance(
        { dateDiffusionPrevue: new Date(ligne.dateDiffusionPrevue) },
        aujourdhui,
      ),
      incomplet: false,
      publieeEnRetard: false,
    }));

  const structuresDistinctes = new Set(lignes.map((ligne) => ligne.structureId));

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Publications imminentes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ce qui doit être diffusé dans les {HORIZON_IMMINENT_JOURS} prochains
          jours. Les échéances déjà dépassées sont sur l&apos;écran «&nbsp;Publications
          en retard&nbsp;».
        </p>
      </header>

      {lignes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <CalendarClock
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-4 font-medium">Aucune échéance dans les 15 jours</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Rien n&apos;est attendu de vous d&apos;ici là. Cet écran se remplira
            à mesure que les dates de diffusion approcheront.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/calendrier">Voir le calendrier complet</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {lignes.length} diffusion{lignes.length > 1 ? 's' : ''} attendue
            {lignes.length > 1 ? 's' : ''}.
          </p>

          <ListeLivrables
            lignes={lignes}
            role={acteur.role}
            colonneEcheance="imminente"
            afficherStructure={structuresDistinctes.size > 1}
          />
        </>
      )}
    </div>
  );
}
