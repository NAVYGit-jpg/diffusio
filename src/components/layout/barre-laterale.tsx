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
import type { Role } from '@prisma/client';

import {
  type CleTraduction,
  type CodeLangue,
  traducteur,
} from '@/lib/langue/dictionnaire';
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
}: {
  role: Role;
  langue: CodeLangue;
}) {
  const chemin = usePathname();
  const t = traducteur(langue);
  const entrees = ENTREES.filter((entree) => entree.roles.includes(role));

  return (
    <nav aria-label={t('nav.principale')} className="p-3">
      <ul className="space-y-1">
        {entrees.map((entree) => {
          const actif = chemin === entree.href || chemin.startsWith(`${entree.href}/`);
          const Icone = entree.icone;

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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
