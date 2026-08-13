'use client';

import type { Role } from '@prisma/client';
import {
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe,
  Pencil,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import {
  classesBadgeStatut,
  libelleStatut,
  statutAffiche,
} from '@/lib/calendrier/statuts';
import { libelleEcheance, urgence } from '@/lib/calendrier/selection';
import { DialogueLivrable, type DetailLigne } from '../calendrier/dialogue-livrable';
import {
  DialoguePublication,
  type MembreCoordination,
} from './dialogue-publication';
import { cn } from '@/lib/utils';

/**
 * Table shared by "Publications imminentes" and "Produits chargés" (§9.1).
 *
 * Both screens list calendar lines and open the same deliverable dialog, so
 * they share this component: two copies would drift the moment one of them
 * gained a column.
 */

export type LigneListe = DetailLigne & {
  structureNom: string;
  structureSigle: string;
  annee: number;
  /** Days left before the deadline; negative once passed. */
  joursRestants: number;
  /** Something has been handed over, but not everything §6 requires. */
  incomplet: boolean;
  /** ISO day of the confirmed release, `null` while nothing is public. */
  dateDiffusionReelle: string | null;
  /** Published, but after the announced date (§10). */
  publieeEnRetard: boolean;
};

const COULEURS_URGENCE: Record<string, string> = {
  aujourdhui: 'text-destructive font-medium',
  'trois-jours': 'text-amber-700 dark:text-amber-400 font-medium',
  semaine: 'text-foreground',
  'plus-tard': 'text-muted-foreground',
};

export function ListeLivrables({
  lignes,
  role,
  colonneEcheance,
  afficherStructure,
  membresCoordination = [],
}: {
  lignes: LigneListe[];
  role: Role;
  /** "imminente" shows the countdown, "chargee" shows the files held. */
  colonneEcheance: 'imminente' | 'chargee';
  afficherStructure: boolean;
  /** Organisation-wide team offered when publishing. */
  membresCoordination?: MembreCoordination[];
}) {
  const [ligneOuverte, setLigneOuverte] = useState<LigneListe | null>(null);
  const [ligneAPublier, setLigneAPublier] = useState<LigneListe | null>(null);

  const estAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const afficherPublication = colonneEcheance === 'chargee';

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élément</TableHead>
              <TableHead>Période</TableHead>
              {afficherStructure && <TableHead>Structure</TableHead>}
              <TableHead>Diffusion prévue</TableHead>
              <TableHead>
                {colonneEcheance === 'imminente' ? 'Échéance' : 'Fichiers'}
              </TableHead>
              {afficherPublication && <TableHead>Publié le</TableHead>}
              {afficherPublication && <TableHead>Lien</TableHead>}
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {lignes.map((ligne) => (
              <TableRow key={ligne.id}>
                <TableCell className="font-medium">
                  {ligne.nomElement}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {ligne.elementType === 'PUBLICATION'
                      ? 'Publication'
                      : 'Indicateur'}
                  </span>
                </TableCell>

                <TableCell className="text-sm">{ligne.libellePeriode}</TableCell>

                {afficherStructure && (
                  <TableCell className="text-sm" title={ligne.structureNom}>
                    {ligne.structureSigle}
                  </TableCell>
                )}

                <TableCell className="text-sm tabular-nums">
                  {formaterJJMMAAAA(new Date(ligne.dateDiffusionPrevue))}
                </TableCell>

                <TableCell className="text-sm">
                  {colonneEcheance === 'imminente' ? (
                    <span
                      className={cn(COULEURS_URGENCE[urgence(ligne.joursRestants)])}
                    >
                      {libelleEcheance(ligne.joursRestants)}
                    </span>
                  ) : (
                    <ResumeFichiers ligne={ligne} />
                  )}
                </TableCell>

                {afficherPublication && (
                  <TableCell className="text-sm tabular-nums">
                    {ligne.dateDiffusionReelle ? (
                      formaterJJMMAAAA(new Date(ligne.dateDiffusionReelle))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}

                {afficherPublication && (
                  <TableCell className="max-w-40 text-sm">
                    {ligne.lienPublication ? (
                      <a
                        href={ligne.lienPublication}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 underline underline-offset-4"
                      >
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">Ouvrir</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}

                <TableCell>
                  {/* Même règle que le calendrier et le tableau de bord : le
                      retard se lit sur les dates, pas sur un statut écrit la
                      nuit. Sans cela, deux écrans donneraient deux réponses
                      pour la même ligne. */}
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={classesBadgeStatut(statutAffiche(ligne))}
                    >
                      {libelleStatut(statutAffiche(ligne))}
                    </Badge>
                    {ligne.incomplet && (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                      >
                        Incomplet
                      </Badge>
                    )}
                    {ligne.publieeEnRetard && (
                      <Badge
                        variant="outline"
                        className="border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300"
                      >
                        Publié en retard
                      </Badge>
                    )}
                  </span>
                </TableCell>

                <TableCell className="text-right whitespace-nowrap">
                  {afficherPublication &&
                    estAdmin &&
                    ligne.statut !== 'MIS_EN_LIGNE' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setLigneAPublier(ligne)}
                      >
                        <Globe aria-hidden />
                        Publier le produit
                      </Button>
                    )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLigneOuverte(ligne)}
                  >
                    <Pencil aria-hidden />
                    {ligne.statut === 'MIS_EN_LIGNE' ? 'Consulter' : 'Modifier'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {ligneOuverte && (
        <DialogueLivrable
          ligne={ligneOuverte}
          role={role}
          ouvert
          onOuvertChange={(ouvert) => !ouvert && setLigneOuverte(null)}
        />
      )}

      {ligneAPublier && (
        <DialoguePublication
          ligne={ligneAPublier}
          membresCoordination={membresCoordination}
          ouvert
          onOuvertChange={(ouvert) => !ouvert && setLigneAPublier(null)}
        />
      )}
    </>
  );
}

/** What is already stored on the line, at a glance. */
function ResumeFichiers({ ligne }: { ligne: LigneListe }) {
  const pdf = ligne.fichiers.filter((fichier) => fichier.type === 'PDF').length;
  const excel = ligne.fichiers.filter((fichier) => fichier.type === 'EXCEL').length;
  const valeurs = ligne.valeurs.length;

  if (pdf === 0 && excel === 0 && valeurs === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {pdf > 0 && (
        <span className="flex items-center gap-1">
          <FileText className="size-3.5" aria-hidden />
          {pdf} PDF
        </span>
      )}
      {excel > 0 && (
        <span className="flex items-center gap-1">
          <FileSpreadsheet className="size-3.5" aria-hidden />
          {excel} Excel
        </span>
      )}
      {valeurs > 0 && (
        <span>
          {valeurs} valeur{valeurs > 1 ? 's' : ''}
        </span>
      )}
    </span>
  );
}
