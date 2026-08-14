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
    <div className="flex min-h-svh flex-col">
      {/* Nappe coloree derivee de la charte, derriere toute l'application.
          Purement decorative : masquee aux lecteurs d'ecran. */}
      <div className="fond-dynamique" aria-hidden />
      {/* `data-application` distinguishes the navigation bar from the <header>
          each page carries: printing hides this one and keeps the other. */}
      <header
        data-application
        // Translucide sur la nappe plutôt qu'opaque : le dégradé traverse
        // l'en-tête, ce qui rattache la barre à la page au lieu de la poser
        // dessus comme un bandeau étranger.
        className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b bg-background/75 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
      >
        <div className="flex min-w-0 items-center gap-3">
          <LogoOrganisation identite={identite} hauteur={26} priorite />
          {/* Le slogan accompagne le logo dès que la place le permet ; il ne
              disparaît que sur les écrans les plus étroits, où le logo seul
              doit rester lisible. */}
          <SloganOrganisation
            identite={identite}
            className="hidden truncate border-l pl-3 text-sm text-muted-foreground sm:inline"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* À gauche de la cloche : le choix de langue précède la lecture des
              messages qu'il habille. */}
          <SelecteurLangue langue={langue} />

          <Link
            href="/notifications"
            className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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

      <div className="flex flex-1">
        {/* La navigation reste en place pendant que le contenu défile : sur un
            long calendrier, une barre qui remonte avec la page oblige à
            revenir en haut pour changer d'écran. `top-14` la cale sous
            l'en-tête, lui-même collant. */}
        <aside className="hidden w-64 shrink-0 border-r bg-background/50 backdrop-blur-xl md:block">
          <div className="sticky top-14 max-h-[calc(100svh-3.5rem)] overflow-y-auto">
            <BarreLaterale
              role={acteur.role}
              langue={langue}
              compteurs={compteurs}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
