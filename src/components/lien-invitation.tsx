'use client';

import { Check, Copy, Info } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Shows an invitation link so an administrator can pass it on by hand.
 *
 * Needed as long as no mail provider is configured: the message only reaches
 * the server console, so a created account would otherwise be unreachable. The
 * block stays useful afterwards — a spam filter or a mistyped address makes the
 * automatic mail fail silently, and this is the fallback.
 */
export function LienInvitation({ lien }: { lien: string }) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      // Clipboard access can be refused; the address stays selectable by hand.
      setCopie(false);
    }
  };

  return (
    <Alert>
      <Info aria-hidden />
      <AlertDescription>
        <p className="mb-2">
          Transmettez ce lien à la personne concernée. Il est valable{' '}
          <strong>72 heures</strong> et lui permettra de choisir son mot de
          passe.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
            {lien}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={copier}>
            {copie ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copie ? 'Copié' : 'Copier'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
