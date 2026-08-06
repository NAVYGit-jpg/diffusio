'use client';

import { BellOff, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { marquerLueAction, toutMarquerLuAction } from '@/lib/actions/workflow';

type Notification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  lien: string | null;
  lu: boolean;
  createdAt: string;
};

/** "il y a 3 heures", "hier", "le 12/03/2026" — dates in DD/MM/YYYY (règle 5). */
function depuis(iso: string): string {
  const date = new Date(iso);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) {
    return 'à l’instant';
  }
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }
  if (minutes < 60 * 24) {
    const heures = Math.floor(minutes / 60);
    return `il y a ${heures} h`;
  }
  if (minutes < 60 * 24 * 2) {
    return 'hier';
  }

  const j = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `le ${j}/${m}/${date.getFullYear()}`;
}

export function ListeNotifications({
  notifications,
}: {
  notifications: Notification[];
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  const nonLues = notifications.filter((notification) => !notification.lu).length;

  const marquerTout = () => {
    demarrer(async () => {
      const resultat = await toutMarquerLuAction();
      toast.success(resultat.message ?? 'Fait.');
      router.refresh();
    });
  };

  const ouvrir = (notification: Notification) => {
    if (!notification.lu) {
      demarrer(async () => {
        await marquerLueAction(notification.id);
        router.refresh();
      });
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <BellOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-4 font-medium">Aucune notification</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Vous serez prévenu ici lorsqu&apos;un calendrier vous est soumis, validé
          ou renvoyé, et lorsqu&apos;une échéance approche.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {nonLues > 0 ? `${nonLues} non lue(s)` : 'Tout est lu'}
        </p>
        {nonLues > 0 && (
          <Button variant="outline" size="sm" onClick={marquerTout} disabled={enCours}>
            <CheckCheck aria-hidden />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {notifications.map((notification) => {
          const contenu = (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{notification.titre}</span>
                <span className="text-xs text-muted-foreground">
                  {depuis(notification.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {notification.message}
              </p>
            </>
          );

          return (
            <li
              key={notification.id}
              className={
                notification.lu
                  ? 'rounded-lg border p-3'
                  : 'rounded-lg border border-primary/40 bg-primary/5 p-3'
              }
            >
              {!notification.lu && (
                <Badge variant="outline" className="mb-2">
                  Non lue
                </Badge>
              )}

              {notification.lien ? (
                <Link
                  href={notification.lien}
                  onClick={() => ouvrir(notification)}
                  className="block hover:underline"
                >
                  {contenu}
                </Link>
              ) : (
                <div>{contenu}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
