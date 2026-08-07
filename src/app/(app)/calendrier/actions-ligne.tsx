'use client';

import { LoaderCircle, Pencil, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  modifierDateLigneAction,
  supprimerLigneAction,
} from '@/lib/actions/lignes-calendrier';

/**
 * Manual edition of one calendar line (§5.5).
 *
 * Both actions are hidden once the line carries a deliverable: the server
 * refuses them anyway, and offering a button that always fails is worse than
 * offering none.
 */
export function ActionsLigne({
  ligneId,
  nomElement,
  libellePeriode,
  dateDiffusionPrevue,
  dateFinCouverture,
  commentaire,
  modifiable,
}: {
  ligneId: string;
  nomElement: string;
  libellePeriode: string;
  dateDiffusionPrevue: string;
  dateFinCouverture: string;
  commentaire: string | null;
  modifiable: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(dateDiffusionPrevue.slice(0, 10));
  const [note, setNote] = useState(commentaire ?? '');

  if (!modifiable) {
    return null;
  }

  const enregistrer = () => {
    demarrer(async () => {
      const resultat = await modifierDateLigneAction(ligneId, date, note);

      if (resultat.erreur) {
        toast.error(resultat.erreur);
        return;
      }

      toast.success(resultat.message ?? 'Modifié.');
      setOuvert(false);
      router.refresh();
    });
  };

  const supprimer = () => {
    const confirmation = window.confirm(
      `Supprimer la ligne « ${nomElement} — ${libellePeriode} » ?\n\n` +
        'Elle disparaîtra du calendrier. Vous pourrez la régénérer plus tard ' +
        'en relançant une génération sur cet élément.',
    );

    if (!confirmation) {
      return;
    }

    demarrer(async () => {
      const resultat = await supprimerLigneAction(ligneId);

      if (resultat.erreur) {
        toast.error(resultat.erreur);
        return;
      }

      toast.success(resultat.message ?? 'Supprimée.');
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOuvert(true)}
        aria-label={`Modifier la date de ${nomElement} — ${libellePeriode}`}
      >
        <Pencil aria-hidden />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={enCours}
        onClick={supprimer}
        aria-label={`Supprimer ${nomElement} — ${libellePeriode}`}
      >
        <Trash2 aria-hidden />
      </Button>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la date de diffusion</DialogTitle>
            <DialogDescription>
              {nomElement} — {libellePeriode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`date-${ligneId}`}>Date de diffusion prévue</Label>
              <Input
                id={`date-${ligneId}`}
                type="date"
                value={date}
                min={dateFinCouverture.slice(0, 10)}
                onChange={(evenement) => setDate(evenement.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Elle ne peut pas précéder la fin de la période couverte, le{' '}
                {new Date(dateFinCouverture).toLocaleDateString('fr-FR', {
                  timeZone: 'UTC',
                })}
                .
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`note-${ligneId}`}>Commentaire (facultatif)</Label>
              <Textarea
                id={`note-${ligneId}`}
                rows={2}
                value={note}
                onChange={(evenement) => setNote(evenement.target.value)}
                placeholder="Pourquoi cette date diffère-t-elle du calcul ?"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              La ligne sera signalée comme modifiée à la main. Une régénération
              future demandera confirmation avant de recalculer sa date.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button onClick={enregistrer} disabled={enCours}>
              {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
