'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { marquerOngletVuAction } from '@/lib/actions/navigation';

/**
 * The bell, and the count of what arrived since it was last opened.
 *
 * Client-side for one reason: the badge has to go out the instant the reader
 * lands on the screen it counts. Waiting for the server to answer would leave a
 * number lit over the very list that empties it — which is exactly what used to
 * happen, and read as a bug rather than as a delay.
 *
 * The same mechanism as the sidebar badges, and the same record: the reader's
 * last visit to `/notifications`. « Lu » is a different matter, settled
 * notification by notification inside the list.
 */
export function ClocheNotifications({
  nombre,
  libelle,
}: {
  nombre: number;
  /** Already translated: this component knows nothing of the dictionary. */
  libelle: string;
}) {
  const chemin = usePathname();
  const surLEcran = chemin === '/notifications';

  const [ouvert, setOuvert] = useState(surLEcran);

  useEffect(() => {
    if (!surLEcran) {
      return;
    }

    setOuvert(true);
    void marquerOngletVuAction('/notifications');
  }, [surLEcran]);

  const afficher = ouvert ? 0 : nombre;

  return (
    <Link
      href="/notifications"
      className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label={afficher > 0 ? `${libelle} — ${afficher}` : libelle}
    >
      <Bell className="size-5" aria-hidden />
      {afficher > 0 && (
        <Badge
          className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 tabular-nums"
          aria-hidden
        >
          {afficher > 99 ? '99+' : afficher}
        </Badge>
      )}
    </Link>
  );
}
