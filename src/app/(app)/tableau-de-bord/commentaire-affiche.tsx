import { CircleAlert, CircleCheck, Info } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Observation } from '@/lib/tableau-bord/commentaire';
import { cn } from '@/lib/utils';

/**
 * The written reading of the figures (cahier des charges §10).
 *
 * Shown on screen as well as exported: a reader who opens the PDF a month later
 * has the same sentences as the person who was looking at the screen.
 */
export function CommentaireAffiche({
  observations,
}: {
  observations: Observation[];
}) {
  if (observations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lecture des résultats</CardTitle>
        <CardDescription>
          Ce que disent les chiffres ci-dessus, en clair.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {observations.map((observation, index) => {
            const Icone =
              observation.ton === 'alerte'
                ? CircleAlert
                : observation.ton === 'positif'
                  ? CircleCheck
                  : Info;

            return (
              <li key={index} className="flex items-start gap-2.5 text-sm">
                <Icone
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    observation.ton === 'alerte' && 'text-destructive',
                    observation.ton === 'positif' &&
                      'text-emerald-600 dark:text-emerald-400',
                    observation.ton === 'neutre' && 'text-muted-foreground',
                  )}
                  aria-hidden
                />
                <span>{observation.texte}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
