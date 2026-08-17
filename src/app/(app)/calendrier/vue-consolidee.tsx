'use client';

import type { Role } from '@prisma/client';
import { CalendarDays, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TOUTES } from '@/lib/calendrier/consolidation';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import {
  classesBadgeStatut,
  libelleStatut,
  statutAffiche,
} from '@/lib/calendrier/statuts';
import { BoutonsExport } from './boutons-export';

/**
 * Consolidated calendar, across several structures or several years (§9.3).
 *
 * Read-only on purpose. Generating, validating and editing a line all act on
 * **one** calendar — a calendar belongs to a structure and a year, and the
 * validation workflow with it. Offering those buttons over a mixed list would
 * raise a question the data model cannot answer: which calendar is being
 * validated? Narrowing back to one structure and one year brings them back.
 */

export type LigneConsolidee = {
  id: string;
  structureNom: string;
  structureSigle: string;
  annee: number;
  nomElement: string;
  elementType: string;
  libellePeriode: string;
  dateDebutCouverture: string;
  dateFinCouverture: string;
  dateDiffusionPrevue: string;
  dateDiffusionReelle: string | null;
  statut: string;
};

export function VueConsolidee({
  structures,
  annees,
  structureChoisie,
  anneeChoisie,
  lignes,
  role,
}: {
  structures: { id: string; nom: string; sigle: string }[];
  annees: number[];
  /** Identifier, or `TOUTES`. */
  structureChoisie: string;
  /** Year, or `TOUTES`. */
  anneeChoisie: string;
  lignes: LigneConsolidee[];
  role: Role;
}) {
  const router = useRouter();

  const naviguer = (structure: string, annee: string) => {
    router.push(`/calendrier?structure=${structure}&annee=${annee}`);
  };

  const structuresDistinctes = new Set(lignes.map((ligne) => ligne.structureNom));
  const anneesDistinctes = new Set(lignes.map((ligne) => ligne.annee));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        {structures.length > 1 && (
          <div className="w-64 space-y-2">
            <Label htmlFor="choixStructure">Structure</Label>
            <Select
              value={structureChoisie}
              onValueChange={(valeur) => naviguer(valeur, anneeChoisie)}
            >
              <SelectTrigger id="choixStructure" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUTES}>Toutes les structures</SelectItem>
                {structures.map((structure) => (
                  <SelectItem key={structure.id} value={structure.id}>
                    {structure.nom} ({structure.sigle})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-44 space-y-2">
          <Label htmlFor="choixAnnee">Année</Label>
          <Select
            value={anneeChoisie}
            onValueChange={(valeur) => naviguer(structureChoisie, valeur)}
          >
            <SelectTrigger id="choixAnnee" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={TOUTES}>Toutes les années</SelectItem>
              {annees.map((valeur) => (
                <SelectItem key={valeur} value={String(valeur)}>
                  {valeur}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto self-end pb-0.5">
          <BoutonsExport
            annee={
              anneeChoisie === TOUTES
                ? (annees[0] ?? new Date().getUTCFullYear())
                : Number(anneeChoisie)
            }
            structureId={structureChoisie === TOUTES ? '' : structureChoisie}
            role={role}
            nombreStructures={structures.length}
          />
        </div>
      </div>

      <Alert className="mb-4">
        <Info aria-hidden />
        <AlertDescription>
          Vue consolidée : {lignes.length} ligne(s) sur{' '}
          {structuresDistinctes.size} structure(s) et {anneesDistinctes.size}{' '}
          année(s). Choisissez une structure et une année précises pour générer,
          soumettre ou modifier un calendrier.
        </AlertDescription>
      </Alert>

      {lignes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <CalendarDays
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-4 font-medium">Aucune ligne pour cette sélection</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Aucun calendrier n&apos;a encore été généré pour les structures et
            les années retenues.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Structure</TableHead>
                <TableHead>Année</TableHead>
                <TableHead>Élément</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Couverture</TableHead>
                <TableHead>Diffusion prévue</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {lignes.map((ligne) => {
                const affiche = statutAffiche({
                  statut: ligne.statut,
                  dateDiffusionPrevue: ligne.dateDiffusionPrevue,
                  dateDiffusionReelle: ligne.dateDiffusionReelle,
                });

                return (
                  <TableRow key={ligne.id}>
                    <TableCell className="text-sm" title={ligne.structureNom}>
                      {ligne.structureSigle}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {ligne.annee}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ligne.nomElement}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {ligne.elementType === 'PUBLICATION'
                          ? 'Publication'
                          : 'Indicateur'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ligne.libellePeriode}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                      {formaterJJMMAAAA(new Date(ligne.dateDebutCouverture))} –{' '}
                      {formaterJJMMAAAA(new Date(ligne.dateFinCouverture))}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formaterJJMMAAAA(new Date(ligne.dateDiffusionPrevue))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={classesBadgeStatut(affiche)}
                      >
                        {libelleStatut(affiche)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
