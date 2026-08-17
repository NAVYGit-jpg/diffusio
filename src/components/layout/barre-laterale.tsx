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
  /**
   * Groupe d'appartenance.
   *
   * « suivi » rassemble le travail quotidien, « general » l'administration et
   * les échanges. Regrouper une dizaine d'entrées sous deux intitulés évite la
   * liste indifférenciée où l'oeil ne se raccroche à rien.
   */
  groupe: 'suivi' | 'general';
};

const ENTREES: Entree[] = [
  {
    href: '/tableau-de-bord',
    cle: 'nav.tableauDeBord',
    icone: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'suivi',
  },
  {
    href: '/structures',
    cle: 'nav.structures',
    icone: Building2,
    roles: ['SUPER_ADMIN'],
    groupe: 'general',
  },
  {
    href: '/utilisateurs',
    cle: 'nav.utilisateurs',
    icone: Users,
    roles: ['SUPER_ADMIN'],
    groupe: 'general',
  },
  {
    href: '/catalogue',
    cle: 'nav.catalogue',
    icone: ClipboardList,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'suivi',
  },
  {
    href: '/calendrier',
    cle: 'nav.calendrier',
    icone: CalendarDays,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'suivi',
  },
  {
    href: '/imminentes',
    cle: 'nav.imminentes',
    icone: CalendarClock,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'suivi',
  },
  {
    href: '/produits-charges',
    cle: 'nav.produitsCharges',
    icone: PackageCheck,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'suivi',
  },
  {
    href: '/retards',
    cle: 'nav.retards',
    icone: TriangleAlert,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'suivi',
  },
  {
    href: '/equipe',
    cle: 'nav.equipe',
    icone: Users2,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'general',
  },
  {
    href: '/notifications',
    cle: 'nav.notifications',
    icone: Bell,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'general',
  },
  {
    href: '/discussion',
    cle: 'nav.discussion',
    icone: MessageSquare,
    roles: ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'],
    groupe: 'general',
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

  const groupes: { cle: 'suivi' | 'general'; titre: string }[] = [
    { cle: 'suivi', titre: 'Suivi' },
    { cle: 'general', titre: 'Général' },
  ];

  const rendreEntree = (entree: Entree) => {
    const actif = chemin === entree.href || chemin.startsWith(`${entree.href}/`);
    const Icone = entree.icone;

    const nombre = ouverts.includes(entree.href)
      ? 0
      : (compteurs[entree.href as OngletCompte] ?? 0);
    const badge = formaterCompteur(nombre);

    return (
      <li key={entree.href} className="relative">
        {/* Repère vertical sur l'onglet courant : le fond teinté seul se
            confond avec un survol, le trait dit « vous êtes ici ». */}
        {actif && (
          <span
            className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-[var(--couleur-primaire-lisible)]"
            aria-hidden
          />
        )}

        <Link
          href={entree.href}
          aria-current={actif ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-full py-2.5 pl-4 pr-3 text-sm transition-colors',
            actif
              ? 'bg-[var(--couleur-primaire-douce)] font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icone
            className={cn(
              'size-[18px] shrink-0',
              actif && 'text-[var(--couleur-primaire-lisible)]',
            )}
            aria-hidden
          />
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
              <span className="sr-only">, {libelleCompteur(nombre)}</span>
            </>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label={t('nav.principale')} className="px-3 pb-4">
      {groupes.map((groupe) => {
        const duGroupe = entrees.filter((entree) => entree.groupe === groupe.cle);

        if (duGroupe.length === 0) {
          return null;
        }

        return (
          <section key={groupe.cle} className="mb-4 last:mb-0">
            <h2 className="px-4 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {groupe.titre}
            </h2>
            <ul className="space-y-1">{duGroupe.map(rendreEntree)}</ul>
          </section>
        );
      })}
    </nav>
  );
}
