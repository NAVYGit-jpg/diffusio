import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Headline figures of the dashboard (cahier des charges §10).
 *
 * Server components: none of this needs interactivity, and rendering the
 * figures on the server keeps them out of the JavaScript bundle.
 *
 * One card per row is filled with the organisation's colour. It is not
 * decoration: the eye needs an entry point in a row of four identical tiles,
 * and the filled one is the figure that answers "how are we doing?" — the
 * respect rate. Filling several would cancel the effect and make the row loud.
 */

export function CarteIndicateur({
  libelle,
  valeur,
  unite,
  precision,
  icone: Icone,
  ton = 'neutre',
  misEnAvant = false,
}: {
  libelle: string;
  valeur: string | number | null;
  unite?: string;
  precision?: string;
  icone?: LucideIcon;
  ton?: 'neutre' | 'positif' | 'alerte';
  /** Filled with the organisation's colour: one per row at most. */
  misEnAvant?: boolean;
}) {
  // A missing figure is written "—", never 0: a zero would be read as a result.
  const affichage = valeur === null || valeur === '' ? '—' : valeur;

  return (
    <Card
      // Repris par la feuille de style à l'impression : sur papier, toutes les
      // cartes sont repeintes en blanc pour épargner l'encre, et le texte blanc
      // de cette tuile-ci disparaissait avec le fond. Un attribut plutôt qu'une
      // classe : c'est un état de la carte, pas une décoration de plus.
      data-mis-en-avant={misEnAvant ? '' : undefined}
      className={cn(
        'overflow-hidden',
        misEnAvant && 'border-transparent text-white',
      )}
      style={
        misEnAvant
          ? { backgroundImage: 'var(--gradient-primaire)' }
          : undefined
      }
    >
      <CardContent className="py-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              'text-sm',
              misEnAvant ? 'text-white/80' : 'text-muted-foreground',
            )}
          >
            {libelle}
          </p>

          {Icone && (
            <span
              data-pastille-icone
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full',
                misEnAvant
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <Icone className="size-4" aria-hidden />
            </span>
          )}
        </div>

        <p
          className={cn(
            'mt-2 text-3xl font-semibold tabular-nums tracking-tight',
            !misEnAvant && ton === 'positif' && 'text-emerald-600 dark:text-emerald-400',
            !misEnAvant && ton === 'alerte' && 'text-destructive',
          )}
        >
          {affichage}
          {affichage !== '—' && unite ? (
            <span
              className={cn(
                'ml-1 text-base font-normal',
                misEnAvant ? 'text-white/70' : 'text-muted-foreground',
              )}
            >
              {unite}
            </span>
          ) : null}
        </p>

        {precision ? (
          <p
            className={cn(
              'mt-2 text-xs',
              misEnAvant ? 'text-white/75' : 'text-muted-foreground',
            )}
          >
            {precision}
          </p>
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
      className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, pourcentage))}%`,
          backgroundImage: 'var(--gradient-primaire)',
        }}
      />
    </div>
  );
}
