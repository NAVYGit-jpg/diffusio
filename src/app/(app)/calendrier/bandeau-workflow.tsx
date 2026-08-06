'use client';

import type { Role, StatutCalendrier } from '@prisma/client';
import { CircleAlert, Info, LoaderCircle, Lock, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { executerTransitionAction } from '@/lib/actions/workflow';
import {
  type Transition,
  LIBELLE_STATUT_CALENDRIER,
  raisonVerrouillage,
  transitionsPossibles,
} from '@/lib/calendrier/workflow';

/** Wording and comment policy of each transition. */
const ACTIONS: Record<
  Transition,
  { libelle: string; titre: string; description: string; commentaire: 'obligatoire' | 'facultatif' | 'aucun' }
> = {
  soumettre: {
    libelle: 'Soumettre pour validation',
    titre: 'Soumettre le calendrier',
    description:
      'Vos administrateurs seront prévenus. Vous ne pourrez plus modifier ce calendrier tant qu’il n’aura pas été examiné.',
    commentaire: 'aucun',
  },
  valider: {
    libelle: 'Valider',
    titre: 'Valider le calendrier',
    description:
      'Le calendrier deviendra la référence officielle. Le point focal ne pourra plus le modifier sans votre autorisation.',
    commentaire: 'facultatif',
  },
  renvoyerPourCorrection: {
    libelle: 'Renvoyer pour correction',
    titre: 'Renvoyer le calendrier',
    description:
      'Le point focal retrouvera la main. Indiquez précisément ce qui doit être repris.',
    commentaire: 'obligatoire',
  },
  debloquer: {
    libelle: 'Rouvrir le calendrier',
    titre: 'Rouvrir le calendrier',
    description:
      'Le calendrier repassera en brouillon et le point focal pourra le modifier de nouveau.',
    commentaire: 'facultatif',
  },
  demanderDeblocage: {
    libelle: 'Demander une autorisation de modification',
    titre: 'Demander la réouverture',
    description:
      'Votre administrateur recevra votre demande et décidera de rouvrir ou non le calendrier.',
    commentaire: 'obligatoire',
  },
};

export function BandeauWorkflow({
  calendrierId,
  statut,
  role,
  nombreLignes,
  commentaireValidation,
  demandeDeblocage,
  demandeDeblocageMotif,
}: {
  calendrierId: string;
  statut: StatutCalendrier;
  role: Role;
  nombreLignes: number;
  commentaireValidation: string | null;
  demandeDeblocage: boolean;
  demandeDeblocageMotif: string | null;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [transitionActive, setTransitionActive] = useState<Transition | null>(null);
  const [commentaire, setCommentaire] = useState('');

  const disponibles = transitionsPossibles(statut, role);
  const verrou = raisonVerrouillage(statut, role);
  const configuration = transitionActive ? ACTIONS[transitionActive] : null;

  const executer = () => {
    if (!transitionActive) {
      return;
    }

    demarrer(async () => {
      const resultat = await executerTransitionAction(
        calendrierId,
        transitionActive,
        commentaire,
      );

      if (resultat.erreur) {
        toast.error(resultat.erreur);
        return;
      }

      toast.success(resultat.message ?? 'Fait.');
      setTransitionActive(null);
      setCommentaire('');
      router.refresh();
    });
  };

  return (
    <section className="mb-6 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={statut === 'VALIDE' ? 'default' : 'secondary'}>
            {LIBELLE_STATUT_CALENDRIER[statut]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {nombreLignes} ligne(s)
          </span>
          {demandeDeblocage && (
            <Badge variant="outline">Réouverture demandée</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {disponibles.map((transition) => (
            <Button
              key={transition}
              variant={transition === 'valider' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTransitionActive(transition);
                setCommentaire('');
              }}
            >
              {transition === 'soumettre' && <Send aria-hidden />}
              {transition === 'demanderDeblocage' && <Lock aria-hidden />}
              {ACTIONS[transition].libelle}
            </Button>
          ))}
        </div>
      </div>

      {verrou && (
        <Alert className="mt-3">
          <Lock aria-hidden />
          <AlertDescription>{verrou}</AlertDescription>
        </Alert>
      )}

      {commentaireValidation && (
        <Alert className="mt-3" variant={statut === 'BROUILLON' ? 'destructive' : 'default'}>
          <Info aria-hidden />
          <AlertDescription>
            <strong>Commentaire de l&apos;administrateur :</strong>{' '}
            {commentaireValidation}
          </AlertDescription>
        </Alert>
      )}

      {demandeDeblocage && demandeDeblocageMotif && (
        <Alert className="mt-3">
          <Info aria-hidden />
          <AlertDescription>
            <strong>Demande de réouverture :</strong> {demandeDeblocageMotif}
          </AlertDescription>
        </Alert>
      )}

      <Dialog
        open={transitionActive !== null}
        onOpenChange={(ouvert) => !ouvert && setTransitionActive(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{configuration?.titre}</DialogTitle>
            <DialogDescription>{configuration?.description}</DialogDescription>
          </DialogHeader>

          {configuration?.commentaire !== 'aucun' && (
            <div className="space-y-2">
              <Label htmlFor="commentaireWorkflow">
                Commentaire{' '}
                {configuration?.commentaire === 'obligatoire'
                  ? '(obligatoire)'
                  : '(facultatif)'}
              </Label>
              <Textarea
                id="commentaireWorkflow"
                rows={3}
                value={commentaire}
                onChange={(evenement) => setCommentaire(evenement.target.value)}
              />
              {configuration?.commentaire === 'obligatoire' &&
                commentaire.trim() === '' && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CircleAlert className="size-3.5" aria-hidden />
                    Ce commentaire sera lu par la personne concernée.
                  </p>
                )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransitionActive(null)}
              disabled={enCours}
            >
              Annuler
            </Button>
            <Button
              onClick={executer}
              disabled={
                enCours ||
                (configuration?.commentaire === 'obligatoire' &&
                  commentaire.trim() === '')
              }
            >
              {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
