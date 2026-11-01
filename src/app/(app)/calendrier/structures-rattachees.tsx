import { Network } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { classesBadgeStatut, libelleStatut, statutAffiche } from '@/lib/calendrier/statuts';
import { prisma } from '@/lib/prisma';

/**
 * Calendars of the structures attached to the one on screen.
 *
 * Selecting a parent structure shows its own calendar — the one generated and
 * validated here — and below it, one panel per child structure, so each
 * child's releases stay distinguishable. Read-only: a child's calendar is
 * worked on from its own page, one click away.
 */
export async function StructuresRattachees({
  organisationId,
  structureIds,
  annee,
}: {
  organisationId: string;
  /** Descendants of the structure on screen, already narrowed to the perimeter. */
  structureIds: string[];
  annee: number;
}) {
  if (structureIds.length === 0) {
    return null;
  }

  const [structures, lignes] = await Promise.all([
    prisma.structure.findMany({
      where: { id: { in: structureIds }, organisationId, deletedAt: null },
      select: { id: true, nom: true, sigle: true },
      orderBy: { nom: 'asc' },
    }),
    prisma.ligneCalendrier.findMany({
      where: {
        statut: { not: 'ANNULE' },
        calendrier: { organisationId, annee, structureId: { in: structureIds } },
      },
      select: {
        id: true,
        libellePeriode: true,
        dateDiffusionPrevue: true,
        dateDiffusionReelle: true,
        statut: true,
        calendrier: { select: { structureId: true } },
        publication: { select: { nom: true } },
        indicateur: { select: { nom: true } },
      },
      orderBy: { dateDiffusionPrevue: 'asc' },
    }),
  ]);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--couleur-primaire-douce)] text-[var(--couleur-primaire-lisible)] shadow-[var(--elevation-1)]">
          <Network className="size-[18px]" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold">Structures rattachées — {annee}</h2>
          <p className="text-sm text-muted-foreground">
            Le calendrier de chaque structure enfant, séparément.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {structures.map((structure) => {
          const siennes = lignes.filter((ligne) => ligne.calendrier.structureId === structure.id);
          const publiees = siennes.filter((ligne) => ligne.statut === 'MIS_EN_LIGNE').length;

          return (
            <div key={structure.id} className="rounded-3xl border bg-card p-5 shadow-[var(--elevation-2)]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="rounded-lg bg-[var(--couleur-primaire-douce)] px-2 py-0.5 text-xs font-bold text-[var(--couleur-primaire-lisible)]">
                    {structure.sigle}
                  </span>
                  {structure.nom}
                  <span className="text-sm font-normal text-muted-foreground">
                    · {siennes.length} ligne(s), {publiees} publiée(s)
                  </span>
                </p>
                <Link
                  href={`/calendrier?structure=${structure.id}&annee=${annee}`}
                  className="text-sm font-medium text-[var(--couleur-primaire-lisible)] underline-offset-2 hover:underline"
                >
                  Ouvrir son calendrier
                </Link>
              </div>

              {siennes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun calendrier généré pour {annee}.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Diffusion prévue</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siennes.map((ligne) => {
                        const affiche = statutAffiche(ligne);

                        return (
                          <TableRow key={ligne.id}>
                            <TableCell className="text-sm">
                              {ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément'}
                            </TableCell>
                            <TableCell className="text-sm">{ligne.libellePeriode}</TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {formaterJJMMAAAA(ligne.dateDiffusionPrevue)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={classesBadgeStatut(affiche)}>
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
