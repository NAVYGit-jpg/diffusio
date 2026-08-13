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
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';

import { cn } from '@/lib/utils';

type Entree = {
  href: string;
  libelle: string;
  icone: typeof LayoutDashboard;
  /** Roles allowed to see the link. The server still checks on every request. */
  roles: Role[];
};

const ENTREES: Entree[] = [
  {
    href: '/tableau-de-bord',
    libelle: 'Tableau de bord',
    icone: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/structures',
    libelle: 'Structures',
    icone: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/utilisateurs',
    libelle: 'Utilisateurs',
    icone: Users,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/catalogue',
    libelle: 'Publications & indicateurs',
    icone: ClipboardList,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/calendrier',
    libelle: 'Calendrier de diffusion',
    icone: CalendarDays,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/imminentes',
    libelle: 'Publications imminentes',
    icone: CalendarClock,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/produits-charges',
    libelle: 'Produits chargés',
    icone: PackageCheck,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/retards',
    libelle: 'Publications en retard',
    icone: TriangleAlert,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/notifications',
    libelle: 'Notifications',
    icone: Bell,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
  {
    href: '/discussion',
    libelle: 'Discussion',
    icone: MessageSquare,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
  },
];

export function BarreLaterale({ role }: { role: Role }) {
  const chemin = usePathname();
  const entrees = ENTREES.filter((entree) => entree.roles.includes(role));

  return (
    <nav aria-label="Navigation principale" className="p-3">
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
                <span className="truncate">{entree.libelle}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
