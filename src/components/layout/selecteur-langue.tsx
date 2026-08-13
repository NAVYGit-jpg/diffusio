'use client';

import { Check, Languages } from 'lucide-react';
import { useTransition } from 'react';
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
import { changerLangueAction } from '@/lib/actions/langue';
import {
  LANGUES,
  type CodeLangue,
  traduire,
} from '@/lib/langue/dictionnaire';

/**
 * Interface language picker, next to the notification bell (§9.5).
 *
 * The current language shows as a two-letter tag rather than a flag alone: a
 * flag stands for a country, not a language, and Portuguese is not only spoken
 * in Portugal. The flag stays inside the menu, where the full name is next to
 * it and cannot be misread.
 */
export function SelecteurLangue({ langue }: { langue: CodeLangue }) {
  const [enCours, demarrer] = useTransition();

  const choisir = (code: CodeLangue) => {
    if (code === langue) {
      return;
    }

    demarrer(async () => {
      await changerLangueAction(code);
      toast.success(traduire('langue.changee', code));
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={enCours}
          aria-label={traduire('entete.langue', langue)}
          className="gap-1.5 px-2"
        >
          <Languages className="size-4" aria-hidden />
          <span className="text-xs font-medium">{langue}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>
          {traduire('entete.langue', langue)}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {LANGUES.map((entree) => (
          <DropdownMenuItem
            key={entree.code}
            onSelect={() => choisir(entree.code)}
            className="gap-2"
          >
            <span aria-hidden>{entree.drapeau}</span>
            <span className="flex-1">{entree.libelle}</span>
            {entree.code === langue && (
              <Check className="size-4 opacity-70" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
