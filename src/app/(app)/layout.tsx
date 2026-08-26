import type { ReactNode } from 'react';

import { BarreLaterale } from '@/components/layout/barre-laterale';
import {
  LogoOrganisation,
  SloganOrganisation,
  chargerIdentiteOrganisation,
} from '@/components/layout/logo-organisation';
import { ClocheNotifications } from '@/components/layout/cloche-notifications';
import { MenuUtilisateur } from '@/components/layout/menu-utilisateur';
import { SelecteurLangue } from '@/components/layout/selecteur-langue';
import { langueValide, traducteur } from '@/lib/langue/dictionnaire';
import { chargerCompteursOnglets } from '@/lib/navigation/compteurs';
import { exigerActeur } from '@/lib/auth/session';
import { Toaster } from '@/components/ui/sonner';
import { prisma } from '@/lib/prisma';

export default async function LayoutApplication({
  children,
}: {
  children: ReactNode;
}) {
  const acteur = await exigerActeur();

  // Unread counter for the bell (§9). Cheap enough to read on every render,
  // and always accurate — no cache to invalidate.
  const [compte, identite, compteurs] = await Promise.all([
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
      {/* La navigation porte le logo et reste en place pendant que le contenu
          défile : sur un long calendrier, une barre qui remonte oblige à
          revenir en haut pour changer d'écran. */}
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-4 flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-panneau bg-card shadow-[var(--elevation-2)]">
          {/* Le logo seul, et plus grand : le slogan qui l'accompagnait le
              tassait contre le haut du panneau. Il a rejoint l'en-tête, où il
              tient sur une ligne sans rien serrer. */}
          <div className="flex min-w-0 items-center px-5 pb-5 pt-6">
            <LogoOrganisation identite={identite} hauteur={34} priorite />
          </div>

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
          {/* Le logo ayant rejoint la colonne, l'en-tête n'a plus à le
              répéter : il porte le slogan, qui dit ce que fait l'application
              là où le nom de l'organisation ne faisait que redire le logo. */}
          <SloganOrganisation
            identite={identite}
            className="truncate text-sm font-medium sm:text-base"
          />

          <div className="flex items-center gap-2">
            {/* À gauche de la cloche : le choix de langue précède la lecture des
                messages qu'il habille. */}
            <SelecteurLangue langue={langue} />

            <ClocheNotifications
              nombre={compteurs['/notifications'] ?? 0}
              libelle={t('entete.notifications')}
            />

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
