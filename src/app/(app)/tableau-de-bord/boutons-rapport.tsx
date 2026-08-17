'use client';

import { FileSpreadsheet, Printer } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

/**
 * Downloading the dashboard (cahier des charges §10).
 *
 * Excel goes through a route that rebuilds the figures server-side. The PDF
 * goes through the browser's own print-to-PDF: the charts are already on the
 * page as SVG, so they print as sharp vectors, and no headless browser has to
 * be installed and kept alive in production to redraw them.
 *
 * Both carry the current query string, so the file matches the view on screen.
 */
export function BoutonsRapport() {
  const parametres = useSearchParams();

  return (
    <div data-boutons-rapport className="flex flex-wrap gap-2 print:hidden">
      <Button asChild variant="outline" size="sm">
        <a
          href={`/api/export/tableau-de-bord?${parametres.toString()}`}
          download
        >
          <FileSpreadsheet aria-hidden />
          Télécharger en Excel
        </a>
      </Button>

      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer aria-hidden />
        Télécharger en PDF
      </Button>
    </div>
  );
}
