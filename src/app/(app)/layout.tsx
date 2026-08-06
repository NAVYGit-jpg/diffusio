import type { ReactNode } from 'react';

import { BarreLaterale } from '@/components/layout/barre-laterale';
import { Button } from '@/components/ui/button';
import { deconnexionAction } from '@/lib/actions/auth';
import { exigerActeur } from '@/lib/auth/session';
import { Toaster } from '@/components/ui/sonner';

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

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">DIFFUSIO</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Calendrier de diffusion statistique
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight">{acteur.nomComplet}</p>
            <p className="text-xs leading-tight text-muted-foreground">
              {LIBELLE_ROLE[acteur.role]}
            </p>
          </div>

          <form action={deconnexionAction}>
            <Button type="submit" variant="outline" size="sm">
              Se déconnecter
            </Button>
          </form>
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
