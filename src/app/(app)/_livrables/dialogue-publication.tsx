'use client';

import { CircleAlert, Globe, LoaderCircle } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Switch } from '@/components/ui/switch';
import {
  type EtatMiseEnLigne,
  mettreEnLigneAction,
} from '@/lib/actions/mise-en-ligne';

const ETAT: EtatMiseEnLigne = {};

export type MembreCoordination = {
  id: string;
  nom: string;
  fonction: string;
  email: string;
};

/**
 * "Publier le produit" (cahier des charges §7).
 *
 * Three pieces of information: when it went online, where it can be read, and
 * who — beyond the mandatory recipients — should be told.
 *
 * The structure's team and its administrators are **not** offered here: they
 * are always in copy, and showing them as unticked boxes would suggest they
 * could be left out.
 */
export function DialoguePublication({
  ligne,
  membresCoordination,
  ouvert,
  onOuvertChange,
}: {
  ligne: { id: string; nomElement: string; libellePeriode: string };
  membresCoordination: MembreCoordination[];
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  const [etat, action, enCours] = useActionState(mettreEnLigneAction, ETAT);
  const [choisis, setChoisis] = useState<string[]>([]);

  useEffect(() => {
    if (etat.succes) {
      toast.success(etat.message ?? 'Publication enregistrée.');
      onOuvertChange(false);
    }
    if (etat.erreur) {
      toast.error(etat.erreur);
    }
  }, [etat, onOuvertChange]);

  // Default: today. The administrator confirms a release that has already
  // happened, so a future date makes no sense and is refused server-side.
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const basculer = (email: string) => {
    setChoisis((precedents) =>
      precedents.includes(email)
        ? precedents.filter((autre) => autre !== email)
        : [...precedents, email],
    );
  };

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publier le produit</DialogTitle>
          <DialogDescription>
            {ligne.nomElement} — {ligne.libellePeriode}
          </DialogDescription>
        </DialogHeader>

        {etat.erreur && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{etat.erreur}</AlertDescription>
          </Alert>
        )}

        <form action={action} className="space-y-4">
          <input type="hidden" name="ligneId" value={ligne.id} />
          <input type="hidden" name="emails" value={choisis.join(', ')} />

          <div className="space-y-2">
            <Label htmlFor="datePublication">Date de publication</Label>
            <Input
              id="datePublication"
              name="datePublication"
              type="date"
              max={aujourdhui}
              defaultValue={aujourdhui}
              required
            />
            <p className="text-xs text-muted-foreground">
              Le jour où le produit a réellement été mis en ligne. C&apos;est
              cette date qui est comparée à l&apos;échéance annoncée.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lien">Lien vers le produit en ligne</Label>
            <Input
              id="lien"
              name="lien"
              type="url"
              inputMode="url"
              placeholder="https://…"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Équipe de coordination à mettre en copie</Label>

            {membresCoordination.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Aucun membre dans l&apos;équipe de l&apos;organisation. Le super
                administrateur peut en ajouter depuis l&apos;onglet
                «&nbsp;Équipe&nbsp;».
              </p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {membresCoordination.map((membre) => (
                  <label
                    key={membre.id}
                    className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-muted"
                  >
                    <Switch
                      checked={choisis.includes(membre.email)}
                      onCheckedChange={() => basculer(membre.email)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{membre.nom}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {membre.fonction} · {membre.email}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              L&apos;équipe de la structure et ses administrateurs sont
              <strong> toujours </strong>
              en copie ; il n&apos;y a rien à cocher pour eux.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOuvertChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={enCours}>
              {enCours ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Globe aria-hidden />
              )}
              Publier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
