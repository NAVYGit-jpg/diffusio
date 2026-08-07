'use client';

import type { Role } from '@prisma/client';
import { BellRing, CircleAlert, CircleCheck, LoaderCircle, PartyPopper } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import {
  type EtatRetard,
  envoyerAlerteAction,
  justifierRetardAction,
} from '@/lib/actions/retards';

type LigneRetard = {
  id: string;
  nomElement: string;
  structure: string;
  annee: number;
  libellePeriode: string;
  dateDiffusionPrevue: string;
  joursDeRetard: number;
  statutAvancement: string | null;
  justification: string | null;
  prochaineDateDiffusion: string | null;
  relancesSuspendues: boolean;
  nombreRelancesEnvoyees: number;
  nombreReports: number;
  publie: boolean;
};

const ETAT_INITIAL: EtatRetard = {};

function formaterDate(iso: string): string {
  const date = new Date(iso);
  const j = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${j}/${m}/${date.getUTCFullYear()}`;
}

/** For a date input, which needs AAAA-MM-JJ. */
function pourChampDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function VueRetards({
  lignes,
  role,
}: {
  lignes: LigneRetard[];
  role: Role;
}) {
  const [aJustifier, setAJustifier] = useState<LigneRetard | null>(null);
  const [aAlerter, setAAlerter] = useState<LigneRetard | null>(null);

  const [etatJustification, actionJustification, justificationEnCours] =
    useActionState(justifierRetardAction, ETAT_INITIAL);
  const [etatAlerte, actionAlerte, alerteEnCours] = useActionState(
    envoyerAlerteAction,
    ETAT_INITIAL,
  );

  const estAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  useEffect(() => {
    if (etatJustification.succes) {
      toast.success(etatJustification.message ?? 'Enregistré.');
      setAJustifier(null);
    }
    if (etatJustification.erreur) {
      toast.error(etatJustification.erreur);
    }
  }, [etatJustification]);

  useEffect(() => {
    if (etatAlerte.succes) {
      toast.success(etatAlerte.message ?? 'Alerte envoyée.');
      setAAlerter(null);
    }
    if (etatAlerte.erreur) {
      toast.error(etatAlerte.erreur);
    }
  }, [etatAlerte]);

  if (lignes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <PartyPopper className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-4 font-medium">Aucun retard</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Toutes les échéances passées ont été honorées. Cette page se remplira
          d&apos;elle-même si une date de diffusion est dépassée.
        </p>
      </div>
    );
  }

  const champs = etatJustification.erreursChamps;

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élément</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Date non respectée</TableHead>
              <TableHead className="text-right">Retard</TableHead>
              <TableHead>Suivi</TableHead>
              <TableHead>Publiée</TableHead>
              <TableHead className="w-44 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {lignes.map((ligne) => (
              <TableRow key={ligne.id}>
                <TableCell>
                  <span className="font-medium">{ligne.nomElement}</span>
                  <p className="text-xs text-muted-foreground">
                    {ligne.structure} · {ligne.annee}
                  </p>
                </TableCell>
                <TableCell className="text-sm">{ligne.libellePeriode}</TableCell>
                <TableCell className="text-sm tabular-nums">
                  {formaterDate(ligne.dateDiffusionPrevue)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={ligne.joursDeRetard > 0 ? 'text-destructive' : ''}>
                    {ligne.joursDeRetard > 0 ? `${ligne.joursDeRetard} j` : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {ligne.relancesSuspendues && ligne.prochaineDateDiffusion ? (
                    <>
                      <Badge variant="outline">Relances suspendues</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Annoncé pour le {formaterDate(ligne.prochaineDateDiffusion)}
                        {ligne.nombreReports > 0 &&
                          ` · ${ligne.nombreReports} report(s)`}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {ligne.nombreRelancesEnvoyees} relance(s) envoyée(s)
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={ligne.publie ? 'default' : 'secondary'}>
                    {ligne.publie ? 'Publié' : 'Non publié'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAJustifier(ligne)}
                  >
                    {ligne.justification ? 'Reporter' : 'Justifier'}
                  </Button>
                  {estAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAAlerter(ligne)}
                      aria-label={`Envoyer une alerte pour ${ligne.nomElement}`}
                    >
                      <BellRing aria-hidden />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ------------------------------------------------- justification */}
      <Dialog
        open={aJustifier !== null}
        onOpenChange={(ouvert) => !ouvert && setAJustifier(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Justifier le retard</DialogTitle>
            <DialogDescription>
              {aJustifier?.nomElement} — {aJustifier?.libellePeriode}
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <CircleCheck aria-hidden />
            <AlertDescription>
              Une fois ces trois informations enregistrées, les relances
              automatiques cesseront jusqu&apos;à la date que vous annoncez.
            </AlertDescription>
          </Alert>

          {aJustifier?.nombreReports ? (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>
                Cette échéance a déjà été reportée {aJustifier.nombreReports}{' '}
                fois. Chaque report est visible par vos administrateurs.
              </AlertDescription>
            </Alert>
          ) : null}

          <form
            key={aJustifier?.id ?? 'aucun'}
            action={actionJustification}
            className="space-y-4"
          >
            <input type="hidden" name="ligneId" value={aJustifier?.id ?? ''} />

            <div className="space-y-2">
              <Label htmlFor="statutAvancement">État d&apos;avancement</Label>
              <Select
                name="statutAvancement"
                defaultValue={aJustifier?.statutAvancement ?? 'EN_COURS'}
              >
                <SelectTrigger id="statutAvancement" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN_COURS">En cours</SelectItem>
                  <SelectItem value="NON_DEBUTEE">Non débutée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Justification</Label>
              <Textarea
                id="justification"
                name="justification"
                rows={3}
                defaultValue={aJustifier?.justification ?? ''}
                required
                aria-invalid={Boolean(champs?.justification)}
              />
              {champs?.justification && (
                <p className="text-sm text-destructive">{champs.justification[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prochaineDateDiffusion">
                Prochaine date de diffusion prévue
              </Label>
              <Input
                id="prochaineDateDiffusion"
                name="prochaineDateDiffusion"
                type="date"
                defaultValue={pourChampDate(aJustifier?.prochaineDateDiffusion ?? null)}
                required
                aria-invalid={Boolean(champs?.prochaineDateDiffusion)}
              />
              {champs?.prochaineDateDiffusion && (
                <p className="text-sm text-destructive">
                  {champs.prochaineDateDiffusion[0]}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAJustifier(null)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={justificationEnCours}>
                {justificationEnCours && (
                  <LoaderCircle className="animate-spin" aria-hidden />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------- alerte */}
      <Dialog
        open={aAlerter !== null}
        onOpenChange={(ouvert) => !ouvert && setAAlerter(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer une alerte</DialogTitle>
            <DialogDescription>
              Le message part au point focal, avec son supérieur en copie.
            </DialogDescription>
          </DialogHeader>

          <form
            key={aAlerter?.id ?? 'aucun'}
            action={actionAlerte}
            className="space-y-4"
          >
            <input type="hidden" name="ligneId" value={aAlerter?.id ?? ''} />

            <div className="space-y-2">
              <Label htmlFor="messageAlerte">Message</Label>
              <Textarea
                id="messageAlerte"
                name="message"
                rows={5}
                required
                placeholder="Précisez ce que vous attendez et sous quel délai."
              />
              {etatAlerte.erreursChamps?.message && (
                <p className="text-sm text-destructive">
                  {etatAlerte.erreursChamps.message[0]}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAAlerter(null)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={alerteEnCours}>
                {alerteEnCours && <LoaderCircle className="animate-spin" aria-hidden />}
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
