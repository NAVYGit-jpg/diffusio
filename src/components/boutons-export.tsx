import { FileSpreadsheet, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Excel and PDF downloads for any exportable screen. Both files are built on
 * the server from the data, in the organisation's colours.
 */
export function BoutonsExport({ adresse }: { adresse: string }) {
  const separateur = adresse.includes('?') ? '&' : '?';

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button asChild variant="outline">
        <a href={`${adresse}${separateur}format=xlsx`} download>
          <FileSpreadsheet aria-hidden />
          Excel
        </a>
      </Button>
      <Button asChild>
        <a href={`${adresse}${separateur}format=pdf`} download>
          <FileText aria-hidden />
          PDF
        </a>
      </Button>
    </div>
  );
}
