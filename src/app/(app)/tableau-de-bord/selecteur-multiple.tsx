'use client';

import { ChevronDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Multiple-choice filter (cahier des charges §10).
 *
 * A checkbox menu rather than a `<select multiple>`: the native control needs
 * Ctrl-click to add a value and silently drops the whole selection on a plain
 * click, which is exactly the mistake a hurried user makes.
 *
 * An empty selection means "everything", not "nothing" — that is the state a
 * filter starts in, and it must read as an open door rather than a closed one.
 */

export type Option = { valeur: string; libelle: string };

export function SelecteurMultiple({
  identifiant,
  libelleVide,
  options,
  selection,
  onChange,
  nomPluriel,
}: {
  identifiant: string;
  /** Shown when nothing is selected, e.g. "Toutes les structures". */
  libelleVide: string;
  options: Option[];
  selection: string[];
  onChange: (selection: string[]) => void;
  /** Used to summarise several choices, e.g. "3 structures". */
  nomPluriel: string;
}) {
  const choisies = new Set(selection);

  const resume = (() => {
    if (choisies.size === 0) {
      return libelleVide;
    }

    if (choisies.size === 1) {
      const seule = options.find((option) => option.valeur === selection[0]);

      return seule?.libelle ?? libelleVide;
    }

    return `${choisies.size} ${nomPluriel}`;
  })();

  const basculer = (valeur: string) => {
    onChange(
      choisies.has(valeur)
        ? selection.filter((element) => element !== valeur)
        : [...selection, valeur],
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={identifiant}
          variant="outline"
          className={cn(
            'w-full justify-between font-normal',
            choisies.size === 0 && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{resume}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
        {options.length === 0 ? (
          <DropdownMenuItem disabled>Aucun choix disponible</DropdownMenuItem>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.valeur}
              checked={choisies.has(option.valeur)}
              // Without this the menu closes on the first tick, forcing the user
              // to reopen it for every additional choice.
              onSelect={(evenement) => evenement.preventDefault()}
              onCheckedChange={() => basculer(option.valeur)}
            >
              {option.libelle}
            </DropdownMenuCheckboxItem>
          ))
        )}

        {choisies.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              <X aria-hidden />
              Tout désélectionner
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
