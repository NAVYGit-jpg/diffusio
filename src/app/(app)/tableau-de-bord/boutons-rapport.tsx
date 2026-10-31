'use client';

import { FileSpreadsheet, FileText } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

/**
 * Downloading the dashboard (cahier des charges §10).
 *
 * Both files are built on the server from the same figures as the screen and
 * carry the current filters. The PDF is composed from the data in the
 * organisation's colours — it is no longer a print of the page.
 */
export function BoutonsRapport() {
  const parametres = useSearchParams();

  const adresse = (format: 'pdf' | 'xlsx') => {
    const copie = new URLSearchParams(parametres.toString());
    copie.set('format', format);

    return `/api/export/tableau-de-bord?${copie.toString()}`;
  };

  return (
    <div data-boutons-rapport className="flex flex-wrap gap-2 print:hidden">
      <Button asChild variant="outline">
        <a href={adresse('xlsx')} download>
          <FileSpreadsheet aria-hidden />
          Excel
        </a>
      </Button>

      <Button asChild>
        <a href={adresse('pdf')} download>
          <FileText aria-hidden />
          Rapport PDF
        </a>
      </Button>
    </div>
  );
}
