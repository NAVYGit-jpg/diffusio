'use client';

import type { Role } from '@prisma/client';
import { Download, Layers } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Excel download of the calendar (§9.3, §10).
 *
 * Plain links rather than buttons with a fetch: the browser handles the
 * download, its progress and its errors far better than any code here would,
 * and the file never has to pass through the page's memory.
 *
 * The scope is not carried by these links — the server recomputes it from the
 * session. They only say *which view* is wanted.
 */
export function BoutonsExport({
  annee,
  structureId,
  role,
  nombreStructures,
}: {
  annee: number;
  structureId: string;
  role: Role;
  nombreStructures: number;
}) {
  // The consolidated file only means something when several structures are
  // within reach; otherwise it would duplicate the button next to it.
  const consolideUtile = nombreStructures > 1;

  const libelleConsolide =
    role === 'SUPER_ADMIN'
      ? 'Calendrier global (toutes structures)'
      : `Calendrier global (mes ${nombreStructures} structures)`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <a
          href={`/api/export/calendrier?annee=${annee}&structure=${structureId}`}
          download
        >
          <Download aria-hidden />
          Télécharger ce calendrier
        </a>
      </Button>

      {consolideUtile && (
        <Button asChild variant="outline" size="sm">
          <a href={`/api/export/calendrier?annee=${annee}&global=1`} download>
            <Layers aria-hidden />
            {libelleConsolide}
          </a>
        </Button>
      )}
    </div>
  );
}
