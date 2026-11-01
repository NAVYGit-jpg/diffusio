'use client';

import { Ban, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { deciderAnnulationAction, demanderAnnulationAction } from '@/lib/actions/annulation';

/**
 * « Annuler » on a calendar line.
 *
 * For a point focal it sends a request, with its reason, to the supervisors;
 * for an administrator it cancels at once. Either way the reason is written
 * down: a release that silently disappears from a public calendar needs one.
 */
export function BoutonAnnulation({
  ligneId,
  nomElement,
  libellePeriode,
  estAdmin,
  dejaDemandee,
}: {
  ligneId: string;
  nomElement: string;
  libellePeriode: string;
  estAdmin: boolean;
  dejaDemandee: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState('');
  const [enCours, demarrer] = useTransition();

  if (dejaDemandee && !estAdmin) {
    return null;
  }

  const valider = () =>
    demarrer(async () => {
      const resultat = estAdmin
        ? await deciderAnnulationAction(ligneId, true, motif)
        : await demanderAnnulationAction(ligneId, motif);

      if (resultat.erreur) {
        toast.error(resultat.erreur);
        return;
      }

      toast.success(resultat.message ?? 'Fait.');
      setOuvert(false);
      router.refresh();
    });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOuvert(true)}
        aria-label={`Annuler ${nomElement} — ${libellePeriode}`}
      >
        <Ban aria-hidden />
        Annuler
      </Button>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {estAdmin ? 'Annuler cette publication' : 'Demander l’annulation'}
            </DialogTitle>
            <DialogDescription>
              {nomElement} — {libellePeriode}.{' '}
              {estAdmin
                ? 'La ligne quittera le calendrier et apparaîtra dans « État du calendrier », onglet Annulées.'
                : 'Votre message est envoyé à vos administrateurs, qui décident de l’annulation.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`motif-${ligneId}`}>Motif de l’annulation</Label>
            <Textarea
              id={`motif-${ligneId}`}
              rows={3}
              value={motif}
              onChange={(evenement) => setMotif(evenement.target.value)}
              placeholder="Ex. : enquête reportée, source de données indisponible…"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOuvert(false)}>
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={valider}
              disabled={enCours || (!estAdmin && motif.trim().length < 5)}
            >
              {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
              {estAdmin ? 'Annuler la publication' : 'Envoyer la demande'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
