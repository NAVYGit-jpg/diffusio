import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Headline figures of the dashboard (cahier des charges §10).
 *
 * Server components: none of this needs interactivity, and rendering the
 * figures on the server keeps them out of the JavaScript bundle.
 */

export function CarteIndicateur({
  libelle,
  valeur,
  unite,
  precision,
  icone: Icone,
  ton = 'neutre',
}: {
  libelle: string;
  valeur: string | number | null;
  unite?: string;
  precision?: string;
  icone?: LucideIcon;
  ton?: 'neutre' | 'positif' | 'alerte';
}) {
  // A missing figure is written "—", never 0: a zero would be read as a result.
  const affichage = valeur === null || valeur === '' ? '—' : valeur;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 py-1">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{libelle}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold tabular-nums tracking-tight',
              ton === 'positif' && 'text-emerald-600 dark:text-emerald-400',
              ton === 'alerte' && 'text-destructive',
            )}
          >
            {affichage}
            {affichage !== '—' && unite ? (
              <span className="ml-1 text-base font-normal text-muted-foreground">
                {unite}
              </span>
            ) : null}
          </p>
          {precision ? (
            <p className="mt-1 text-xs text-muted-foreground">{precision}</p>
          ) : null}
        </div>

        {Icone ? (
          <span className="rounded-md bg-muted p-2 text-muted-foreground">
            <Icone className="size-4" aria-hidden />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Progress bar of the year, with its value written out for screen readers. */
export function BarreAvancement({
  pourcentage,
  libelle,
}: {
  pourcentage: number;
  libelle: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={pourcentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={libelle}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-[var(--couleur-primaire,var(--primary))] transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pourcentage))}%` }}
      />
    </div>
  );
}
