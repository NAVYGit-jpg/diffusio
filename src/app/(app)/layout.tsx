import type { ReactNode } from 'react';

import { BarreLaterale } from '@/components/layout/barre-laterale';
import { LogoDiffusio } from '@/components/layout/logo-diffusio';
import { MenuUtilisateur } from '@/components/layout/menu-utilisateur';
import { Button } from '@/components/ui/button';
import { deconnexionAction } from '@/lib/actions/auth';
import { exigerActeur } from '@/lib/auth/session';
import { Toaster } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';
import { Bell } from 'lucide-react';
import Link from 'next/link';

const LIBELLE_ROLE: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  POINT_FOCAL: 'Point focal',
};

export default async function LayoutApplication({
  children,
}: {
  children: ReactNode;
}) {
  const acteur = await exigerActeur();

  // Unread counter for the bell (§9). Cheap enough to read on every render,
  // and always accurate — no cache to invalidate.
  const nonLues = await prisma.notification.count({
    where: { destinataireId: acteur.id, lu: false },
  });

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
        <div className="flex items-center gap-3">
          <LogoDiffusio hauteur={26} priorite />
          <span className="hidden border-l pl-3 text-sm text-muted-foreground lg:inline">
            Calendrier de diffusion statistique
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={
              nonLues > 0
                ? `Notifications, ${nonLues} non lue(s)`
                : 'Notifications'
            }
          >
            <Bell className="size-5" aria-hidden />
            {nonLues > 0 && (
              <Badge
                className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 tabular-nums"
                aria-hidden
              >
                {nonLues > 99 ? '99+' : nonLues}
              </Badge>
            )}
          </Link>

          <MenuUtilisateur
            nomComplet={acteur.nomComplet}
            email={acteur.email}
            role={acteur.role}
          />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r md:block">
          <BarreLaterale role={acteur.role} />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
