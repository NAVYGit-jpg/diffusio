'use client';

import {
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Bell,
  PackageCheck,
  TriangleAlert,
  Users,
  Users2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Role } from '@prisma/client';

import { Badge } from '@/components/ui/badge';
import { marquerOngletVuAction } from '@/lib/actions/navigation';
import {
  type CleTraduction,
  type CodeLangue,
  traducteur,
} from '@/lib/langue/dictionnaire';
import type { CompteursOnglets } from '@/lib/navigation/compteurs';
import {
  type OngletCompte,
  formaterCompteur,
  libelleCompteur,
  porteUnCompteur,
} from '@/lib/navigation/compteurs-regles';
import { cn } from '@/lib/utils';

type Entree = {
  href: string;
  /** Cle de traduction : le libelle depend de la langue du lecteur. */
  cle: CleTraduction;
  icone: typeof LayoutDashboard;
  /** Roles allowed to see the link. The server still checks on every request. */
  roles: Role[];
};

const ENTREES: Entree[] = [
  {
    href: '/tableau-de-bord',
    cle: 'nav.tableauDeBord',
    icone: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/structures',
    cle: 'nav.structures',
    icone: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/utilisateurs',
    cle: 'nav.utilisateurs',
    icone: Users,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/catalogue',
    cle: 'nav.catalogue',
    icone: ClipboardList,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/calendrier',
    cle: 'nav.calendrier',
    icone: CalendarDays,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/imminentes',
    cle: 'nav.imminentes',
    icone: CalendarClock,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/produits-charges',
    cle: 'nav.produitsCharges',
    icone: PackageCheck,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/retards',
    cle: 'nav.retards',
    icone: TriangleAlert,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/equipe',
    cle: 'nav.equipe',
    icone: Users2,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/notifications',
    cle: 'nav.notifications',
    icone: Bell,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/discussion',
    cle: 'nav.discussion',
    icone: MessageSquare,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
];

export function BarreLaterale({
  role,
  langue,
  compteurs = {},
}: {
  role: Role;
  langue: CodeLangue;
  /** New items per tab, computed on the server for this reader. */
  compteurs?: CompteursOnglets;
}) {
  const chemin = usePathname();
  const t = traducteur(langue);
  const entrees = ENTREES.filter((entree) => entree.roles.includes(role));

  /**
   * Tabs opened during this visit.
   *
   * The badge disappears the instant the tab is clicked rather than waiting for
   * the server: the reader is looking at what the badge was counting, so
   * leaving it lit for a round trip would be plainly wrong.
   */
  const [ouverts, setOuverts] = useState<string[]>([]);

  useEffect(() => {
    const onglet = ENTREES.find(
      (entree) =>
        chemin === entree.href || chemin.startsWith(`${entree.href}/`),
    )?.href;

    if (!onglet || !porteUnCompteur(onglet)) {
      return;
    }

    setOuverts((precedents) =>
      precedents.includes(onglet) ? precedents : [...precedents, onglet],
    );

    void marquerOngletVuAction(onglet);
  }, [chemin]);

  return (
    <nav aria-label={t('nav.principale')} className="p-3">
      <ul className="space-y-1">
        {entrees.map((entree) => {
          const actif = chemin === entree.href || chemin.startsWith(`${entree.href}/`);
          const Icone = entree.icone;

          const nombre = ouverts.includes(entree.href)
            ? 0
            : (compteurs[entree.href as OngletCompte] ?? 0);
          const badge = formaterCompteur(nombre);

          return (
            <li key={entree.href}>
              <Link
                href={entree.href}
                aria-current={actif ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  actif
                    ? 'bg-secondary font-medium text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <Icone className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{t(entree.cle)}</span>

                {badge && (
                  <>
                    <Badge
                      className="ml-auto h-5 min-w-5 justify-center px-1 tabular-nums"
                      aria-hidden
                    >
                      {badge}
                    </Badge>
                    {/* Le badge est décoratif ; le nombre est dit au lecteur
                        d'écran dans la même phrase que le nom de l'onglet. */}
                    <span className="sr-only">
                      , {libelleCompteur(nombre)}
                    </span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
