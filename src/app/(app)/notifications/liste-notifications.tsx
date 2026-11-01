'use client';

import {
  Bell,
  BellOff,
  CheckCheck,
  CircleCheck,
  Clock,
  type LucideIcon,
  MessageSquare,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
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
      <div className="verre rounded-[var(--rayon-panneau)] p-12 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-card shadow-[var(--elevation-3)]">
          <BellOff className="size-7 text-muted-foreground" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-semibold">Aucune notification</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Vous serez prévenu ici lorsqu&apos;un calendrier vous est soumis, validé
          ou renvoyé, et lorsqu&apos;une échéance approche.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="verre mb-5 flex items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          {nonLues > 0 && (
            <span className="point-non-lu size-2.5 rounded-full bg-[var(--couleur-primaire-lisible)]" />
          )}
          {nonLues > 0 ? `${nonLues} non lue(s)` : 'Tout est lu'}
          <span className="font-normal text-muted-foreground">
            sur {notifications.length}
          </span>
        </p>
        {nonLues > 0 && (
          <Button size="sm" onClick={marquerTout} disabled={enCours}>
            <CheckCheck aria-hidden />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <ul className="space-y-3">
        {notifications.map((notification, rang) => {
          const { Icone, teinte } = apparence(notification.titre);

          const contenu = (
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-[var(--elevation-1)]',
                  notification.lu ? 'bg-muted text-muted-foreground' : teinte,
                )}
              >
                <Icone className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span
                    className={cn(
                      'text-[15px] tracking-tight',
                      notification.lu ? 'font-medium text-muted-foreground' : 'font-semibold',
                    )}
                  >
                    {notification.titre}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {depuis(notification.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
              </div>
              {!notification.lu && (
                <span
                  className="point-non-lu mt-1.5 size-2.5 shrink-0 rounded-full bg-[var(--couleur-primaire-lisible)]"
                  aria-label="Non lue"
                />
              )}
            </div>
          );

          const carte = cn(
            'relative block overflow-hidden rounded-[calc(var(--rayon-panneau)*0.8)] p-4 pl-5 no-underline transition-all duration-200',
            notification.lu
              ? 'bg-card/60 shadow-[var(--elevation-1)]'
              : 'bg-card shadow-[var(--elevation-2)]',
            notification.lien && 'hover:-translate-y-0.5 hover:shadow-[var(--elevation-3)]',
          );

          return (
            <li
              key={notification.id}
              className="surgir"
              style={{ '--rang': rang } as React.CSSProperties}
            >
              {notification.lien ? (
                <Link
                  href={notification.lien}
                  onClick={() => ouvrir(notification)}
                  className={carte}
                >
                  {!notification.lu && <Liseré />}
                  {contenu}
                </Link>
              ) : (
                <div className={carte}>
                  {!notification.lu && <Liseré />}
                  {contenu}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Accent bar on the left edge of an unread notification. */
function Liseré() {
  return (
    <span
      aria-hidden
      className="absolute inset-y-0 left-0 w-1"
      style={{ backgroundImage: 'var(--gradient-primaire)' }}
    />
  );
}

/** Icon and tint from the title: a delay reads red, a deadline amber. */
function apparence(titre: string): { Icone: LucideIcon; teinte: string } {
  const t = titre.toLowerCase();

  if (t.includes('retard')) {
    return { Icone: TriangleAlert, teinte: 'bg-red-500/12 text-red-600 dark:text-red-400' };
  }
  if (t.includes('imminente') || t.includes('échéance') || t.includes('rappel')) {
    return { Icone: Clock, teinte: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' };
  }
  if (t.includes('discussion') || t.includes('message')) {
    return { Icone: MessageSquare, teinte: 'bg-sky-500/12 text-sky-700 dark:text-sky-400' };
  }
  if (t.includes('ligne') || t.includes('publié') || t.includes('valid')) {
    return { Icone: CircleCheck, teinte: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' };
  }

  return {
    Icone: Bell,
    teinte: 'bg-[var(--couleur-primaire-douce)] text-[var(--couleur-primaire-lisible)]',
  };
}
