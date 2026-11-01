'use client';

import { Ban, Check, LoaderCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deciderAnnulationAction } from '@/lib/actions/annulation';

export type LigneAnnulation = {
  id: string;
  nomElement: string;
  structure: string;
  libellePeriode: string;
  dateDiffusionPrevue: string;
  motif: string | null;
  demandeur: string | null;
  date: string | null;
};

function jjmmaaaa(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

/** Pending requests (to decide) above the lines already cancelled. */
export function ListeAnnulations({
  demandes,
  annulees,
  estAdmin,
}: {
  demandes: LigneAnnulation[];
  annulees: LigneAnnulation[];
  estAdmin: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  const decider = (id: string, accepter: boolean) =>
    demarrer(async () => {
      const resultat = await deciderAnnulationAction(id, accepter);
      if (resultat.erreur) {
        toast.error(resultat.erreur);
        return;
      }
      toast.success(resultat.message ?? 'Fait.');
      router.refresh();
    });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          Demandes d’annulation
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {demandes.length}
          </span>
        </h2>
        {demandes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
        ) : (
          <ul className="space-y-3">
            {demandes.map((demande) => (
              <li
                key={demande.id}
                className="surgir relative overflow-hidden rounded-2xl bg-card p-4 pl-5 shadow-[var(--elevation-2)]"
              >
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {demande.nomElement}{' '}
                      <span className="font-normal text-muted-foreground">
                        — {demande.libellePeriode} · {demande.structure}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Demandée par {demande.demandeur ?? '—'} le {jjmmaaaa(demande.date)} ·
                      diffusion prévue le {jjmmaaaa(demande.dateDiffusionPrevue)}
                    </p>
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                      « {demande.motif} »
                    </p>
                  </div>
                  {estAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={enCours}
                        onClick={() => decider(demande.id, true)}
                      >
                        {enCours ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={enCours}
                        onClick={() => decider(demande.id, false)}
                      >
                        <X aria-hidden />
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Ban className="size-4 text-muted-foreground" aria-hidden />
          Publications annulées
        </h2>
        {annulees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune publication annulée.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élément</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Prévue le</TableHead>
                  <TableHead>Annulée le</TableHead>
                  <TableHead>Motif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annulees.map((ligne) => (
                  <TableRow key={ligne.id}>
                    <TableCell>
                      <span className="font-medium">{ligne.nomElement}</span>
                      <p className="text-xs text-muted-foreground">{ligne.structure}</p>
                    </TableCell>
                    <TableCell className="text-sm">{ligne.libellePeriode}</TableCell>
                    <TableCell className="text-sm tabular-nums">{jjmmaaaa(ligne.dateDiffusionPrevue)}</TableCell>
                    <TableCell className="text-sm tabular-nums">{jjmmaaaa(ligne.date)}</TableCell>
                    <TableCell className="max-w-72 text-sm text-muted-foreground">{ligne.motif ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
