'use client';

import { CircleCheck, FileSpreadsheet, FileText, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * One named upload slot inside the deliverable form, as a drop zone.
 *
 * The real `<input type="file">` stays in the form — the file still travels
 * with « Enregistrer » — but it is hidden behind a zone that accepts a drag
 * and drop, and shows what was chosen before anything is sent: the first page
 * of a PDF, the first rows of a spreadsheet. Checking the right file was
 * picked costs a glance instead of a download after the fact.
 */

type Apercu =
  | { genre: 'pdf'; adresse: string }
  | { genre: 'tableau'; lignes: string[][] }
  | { genre: 'chargement' }
  | { genre: 'aucun' };

const MAX_LIGNES = 6;
const MAX_COLONNES = 6;

function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

/** First rows of a CSV, split on the separator the file actually uses. */
function lireCsv(texte: string): string[][] {
  const lignes = texte.split(/\r?\n/).filter((ligne) => ligne.trim() !== '');
  const separateur = (lignes[0]?.match(/;/g)?.length ?? 0) > (lignes[0]?.match(/,/g)?.length ?? 0) ? ';' : ',';

  return lignes
    .slice(0, MAX_LIGNES)
    .map((ligne) => ligne.split(separateur).slice(0, MAX_COLONNES).map((cellule) => cellule.replace(/^"|"$/g, '')));
}

/** First rows of the first sheet. ExcelJS is loaded only when a file is picked. */
async function lireClasseur(fichier: File): Promise<string[][]> {
  // The browser build is a UMD bundle: its export may or may not sit on `default`.
  const exceljs = await import('exceljs');
  const ExcelJS = (exceljs.default ?? exceljs) as typeof exceljs.default;
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(await fichier.arrayBuffer());
  const feuille = classeur.worksheets[0];
  const lignes: string[][] = [];

  feuille?.eachRow({ includeEmpty: false }, (ligne) => {
    if (lignes.length >= MAX_LIGNES) return;
    const cellules: string[] = [];
    for (let colonne = 1; colonne <= MAX_COLONNES; colonne += 1) {
      cellules.push(ligne.getCell(colonne).text ?? '');
    }
    lignes.push(cellules);
  });

  return lignes;
}

export function DepotFichier({
  identifiant,
  champ,
  intitule,
  precision,
  accept,
  depose,
  genre,
}: {
  identifiant: string;
  champ: string;
  intitule: string;
  precision: string;
  accept: string;
  depose: boolean;
  genre: 'pdf' | 'tableur';
}) {
  const champFichier = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<Apercu>({ genre: 'aucun' });
  const [survol, setSurvol] = useState(false);

  const Icone = genre === 'pdf' ? FileText : FileSpreadsheet;
  const teinte =
    genre === 'pdf'
      ? 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
      : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400';

  useEffect(() => {
    if (!fichier) {
      setApercu({ genre: 'aucun' });
      return;
    }

    if (fichier.type === 'application/pdf' || fichier.name.toLowerCase().endsWith('.pdf')) {
      const adresse = URL.createObjectURL(fichier);
      setApercu({ genre: 'pdf', adresse });
      return () => URL.revokeObjectURL(adresse);
    }

    let annule = false;
    setApercu({ genre: 'chargement' });

    const lecture = fichier.name.toLowerCase().endsWith('.csv')
      ? fichier.text().then(lireCsv)
      : fichier.name.toLowerCase().endsWith('.xlsx')
        ? lireClasseur(fichier)
        : Promise.resolve([] as string[][]);

    lecture
      .then((lignes) => !annule && setApercu(lignes.length > 0 ? { genre: 'tableau', lignes } : { genre: 'aucun' }))
      .catch(() => !annule && setApercu({ genre: 'aucun' }));

    return () => {
      annule = true;
    };
  }, [fichier]);

  const retirer = () => {
    if (champFichier.current) {
      champFichier.current.value = '';
    }
    setFichier(null);
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--elevation-1)]">
      <div className="mb-3 flex items-center gap-3">
        <span className={cn('flex size-9 items-center justify-center rounded-xl', teinte)}>
          <Icone className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{intitule}</p>
          <p className="text-xs text-muted-foreground">
            {depose
              ? 'Un nouveau fichier créera une version ; l’ancienne reste consultable.'
              : precision}
          </p>
        </div>
        {depose && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CircleCheck className="size-3.5" aria-hidden />
            Déposé
          </span>
        )}
      </div>

      <label
        htmlFor={identifiant}
        onDragOver={(evenement) => {
          evenement.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(evenement) => {
          evenement.preventDefault();
          setSurvol(false);
          const depot = evenement.dataTransfer.files[0];
          if (depot && champFichier.current) {
            // The dropped file goes into the real field, so it is submitted.
            const transfert = new DataTransfer();
            transfert.items.add(depot);
            champFichier.current.files = transfert.files;
            setFichier(depot);
          }
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all duration-200',
          survol
            ? 'scale-[1.01] border-[var(--couleur-primaire-lisible)] bg-[var(--couleur-primaire-douce)]'
            : 'border-border hover:border-[var(--couleur-primaire-lisible)]/60 hover:bg-muted/50',
          fichier && 'hidden',
        )}
      >
        <UploadCloud
          className={cn('size-7 transition-transform', survol ? '-translate-y-0.5 text-[var(--couleur-primaire-lisible)]' : 'text-muted-foreground')}
          aria-hidden
        />
        <span className="text-sm font-medium">
          Glissez le fichier ici ou <span className="text-[var(--couleur-primaire-lisible)] underline underline-offset-2">parcourez</span>
        </span>
        <span className="text-xs text-muted-foreground">{accept.split(',').join(' · ')}</span>
      </label>

      <input
        ref={champFichier}
        id={identifiant}
        name={champ}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(evenement) => setFichier(evenement.target.files?.[0] ?? null)}
      />

      {fichier && (
        <div className="surgir space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
            <Icone className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{fichier.name}</span>
              <span className="text-xs text-muted-foreground">
                {formaterTaille(fichier.size)} · sera envoyé à l’enregistrement
              </span>
            </span>
            <button
              type="button"
              onClick={retirer}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label={`Retirer ${fichier.name}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {apercu.genre === 'pdf' && (
            <div className="overflow-hidden rounded-xl border bg-white shadow-[var(--elevation-2)]">
              <iframe
                src={`${apercu.adresse}#toolbar=0&navpanes=0&view=FitH`}
                title={`Aperçu de ${fichier.name}`}
                className="h-64 w-full"
              />
            </div>
          )}

          {apercu.genre === 'chargement' && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
              Lecture de l’aperçu…
            </p>
          )}

          {apercu.genre === 'tableau' && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-[var(--elevation-2)]">
              <table className="w-full text-xs">
                <tbody>
                  {apercu.lignes.map((ligne, rang) => (
                    <tr
                      key={rang}
                      className={cn(
                        'border-b last:border-b-0',
                        rang === 0 ? 'bg-emerald-500/10 font-semibold' : rang % 2 === 0 && 'bg-muted/40',
                      )}
                    >
                      {ligne.map((cellule, colonne) => (
                        <td key={colonne} className="max-w-36 truncate px-3 py-1.5">
                          {cellule}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                Aperçu des {apercu.lignes.length} premières lignes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
