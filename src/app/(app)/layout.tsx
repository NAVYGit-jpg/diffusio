import type { ReactNode } from 'react';

import { BarreLaterale } from '@/components/layout/barre-laterale';
import {
  LogoOrganisation,
  SloganOrganisation,
  chargerIdentiteOrganisation,
} from '@/components/layout/logo-organisation';
import { MenuUtilisateur } from '@/components/layout/menu-utilisateur';
import { SelecteurLangue } from '@/components/layout/selecteur-langue';
import { langueValide, traducteur } from '@/lib/langue/dictionnaire';
import { chargerCompteursOnglets } from '@/lib/navigation/compteurs';
import { exigerActeur } from '@/lib/auth/session';
import { Toaster } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';
import { Bell } from 'lucide-react';
import Link from 'next/link';

export default async function LayoutApplication({
  children,
}: {
  children: ReactNode;
}) {
  const acteur = await exigerActeur();

  // Unread counter for the bell (§9). Cheap enough to read on every render,
  // and always accurate — no cache to invalidate.
  const [nonLues, compte, identite, compteurs] = await Promise.all([
    prisma.notification.count({
      where: { destinataireId: acteur.id, lu: false },
    }),
    prisma.utilisateur.findUnique({
      where: { id: acteur.id },
      select: { langue: true },
    }),
    chargerIdentiteOrganisation(),
    chargerCompteursOnglets(acteur),
  ]);

  const langue = langueValide(compte?.langue);
  const t = traducteur(langue);

  return (
    // Coque en panneaux flottants : la navigation et le contenu sont deux
    // surfaces posées sur le fond, séparées par une gouttière, plutôt que deux
    // colonnes collées par une bordure. C'est ce qui donne à l'écran sa
    // respiration.
    <div className="flex min-h-svh gap-3 p-3 sm:gap-4 sm:p-4">
      {/* Nappe coloree derivee de la charte, derriere toute l'application.
          Purement decorative : masquee aux lecteurs d'ecran. */}
      <div className="fond-dynamique" aria-hidden />

      {/* La navigation porte le logo et reste en place pendant que le contenu
          défile : sur un long calendrier, une barre qui remonte oblige à
          revenir en haut pour changer d'écran. */}
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-4 flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-panneau bg-card shadow-[var(--elevation-2)]">
          <div className="flex min-w-0 items-center gap-2 px-5 pb-2 pt-5">
            <LogoOrganisation identite={identite} hauteur={26} priorite />
          </div>
          <SloganOrganisation
            identite={identite}
            className="truncate px-5 pb-4 text-xs text-muted-foreground"
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <BarreLaterale
              role={acteur.role}
              langue={langue}
              compteurs={compteurs}
            />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
        {/* `data-application` distinguishes the navigation bar from the <header>
            each page carries: printing hides this one and keeps the other. */}
        <header
          data-application
          className="sticky top-4 z-20 flex h-16 items-center justify-between gap-4 rounded-panneau bg-card/85 px-4 shadow-[var(--elevation-2)] backdrop-blur-xl"
        >
          {/* Le logo ayant rejoint la colonne, l'en-tête n'a plus à le répéter :
              il porte le nom de l'organisation, qui situe la page. */}
          <span className="truncate text-sm font-medium sm:text-base">
            {identite.nom}
          </span>

          <div className="flex items-center gap-2">
            {/* À gauche de la cloche : le choix de langue précède la lecture des
                messages qu'il habille. */}
            <SelecteurLangue langue={langue} />

            <Link
              href="/notifications"
              className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={
                nonLues > 0
                  ? `${t('entete.notifications')} — ${nonLues}`
                  : t('entete.notifications')
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
              langue={langue}
            />
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
