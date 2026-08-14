'use client';

import { Check, Copy, Mail, Phone, UserRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Contacting the point focal of a publication (cahier des charges §8.3).
 *
 * The menu **drafts**, it never sends: `mailto:` opens the reader's own mail
 * client with the subject and body filled in, and they decide what leaves. An
 * action that sent a message straight from a table row would be a message
 * nobody reread.
 *
 * The phone number is both a `tel:` link and a copyable string: `tel:` does
 * nothing on most desktops, where the number still has to reach a handset.
 */

export type PointFocalContact = {
  nomComplet: string;
  email: string | null;
  telephone: string | null;
};

export function ContacterPointFocal({
  pointFocal,
  nomElement,
  libellePeriode,
  dateDiffusionPrevue,
  motif,
}: {
  pointFocal: PointFocalContact | null;
  nomElement: string;
  libellePeriode: string;
  /** Already formatted for reading, JJ/MM/AAAA. */
  dateDiffusionPrevue: string;
  /** Shapes the drafted message. */
  motif: 'imminente' | 'retard';
}) {
  const [copie, setCopie] = useState(false);

  if (!pointFocal || (!pointFocal.email && !pointFocal.telephone)) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <UserRound aria-hidden />
        Aucun contact
      </Button>
    );
  }

  const objet =
    motif === 'retard'
      ? `Publication en retard : ${nomElement} — ${libellePeriode}`
      : `Publication imminente : ${nomElement} — ${libellePeriode}`;

  const corps =
    motif === 'retard'
      ? `Bonjour ${pointFocal.nomComplet},\n\nLa diffusion de « ${nomElement} » pour la période ${libellePeriode} était attendue le ${dateDiffusionPrevue} et n'a pas encore été mise en ligne.\n\nPouvez-vous m'indiquer où en est ce document ?\n\nCordialement,`
      : `Bonjour ${pointFocal.nomComplet},\n\nLa diffusion de « ${nomElement} » pour la période ${libellePeriode} est attendue le ${dateDiffusionPrevue}.\n\nPouvez-vous me confirmer que le document sera prêt à cette date ?\n\nCordialement,`;

  const lienMail = pointFocal.email
    ? `mailto:${pointFocal.email}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`
    : null;

  const copierNumero = async () => {
    if (!pointFocal.telephone) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pointFocal.telephone);
      setCopie(true);
      toast.success('Numéro copié.');
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Le presse-papiers peut être refusé ; le numéro reste lisible à l'écran.
      toast.error('Copie impossible. Le numéro est affiché dans le menu.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <UserRound aria-hidden />
          Contacter
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">
            {pointFocal.nomComplet}
          </span>
          <span className="block text-xs text-muted-foreground">
            Point focal de {nomElement}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {lienMail ? (
          <DropdownMenuItem asChild>
            <a href={lienMail}>
              <Mail aria-hidden />
              <span className="flex-1">
                <span className="block">Écrire un e-mail</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {pointFocal.email}
                </span>
              </span>
            </a>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <Mail aria-hidden />
            Aucune adresse enregistrée
          </DropdownMenuItem>
        )}

        {pointFocal.telephone ? (
          <>
            <DropdownMenuItem asChild>
              <a href={`tel:${pointFocal.telephone.replace(/\s+/g, '')}`}>
                <Phone aria-hidden />
                <span className="flex-1">
                  <span className="block">Appeler</span>
                  <span className="block text-xs text-muted-foreground">
                    {pointFocal.telephone}
                  </span>
                </span>
              </a>
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={(evenement) => {
                // Le menu reste ouvert : la confirmation « copié » n'aurait
                // aucun sens sur un menu qui se ferme au même instant.
                evenement.preventDefault();
                void copierNumero();
              }}
            >
              {copie ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copie ? 'Numéro copié' : 'Copier le numéro'}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem disabled>
            <Phone aria-hidden />
            Aucun téléphone enregistré
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
