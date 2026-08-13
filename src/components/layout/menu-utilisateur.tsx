'use client';

import type { Role } from '@prisma/client';
import {
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  UserRound,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deconnexionAction } from '@/lib/actions/auth';
import { type CodeLangue, traducteur } from '@/lib/langue/dictionnaire';

/** Initials for the avatar: "Elie N'DOUBA" gives "EN". */
function initiales(nomComplet: string): string {
  return nomComplet
    .split(/[\s'’-]+/)
    .filter((morceau) => morceau.length > 0)
    .slice(0, 2)
    .map((morceau) => morceau[0].toUpperCase())
    .join('');
}

export function MenuUtilisateur({
  nomComplet,
  email,
  role,
  langue,
}: {
  nomComplet: string;
  email: string;
  role: Role;
  langue: CodeLangue;
}) {
  const { theme, setTheme } = useTheme();
  const t = traducteur(langue);

  // The server does not know the browser's theme, so rendering the current
  // choice before mounting would produce a mismatch React complains about.
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  const themes = [
    { valeur: 'light', libelle: t('compte.themeClair'), icone: Sun },
    { valeur: 'dark', libelle: t('compte.themeSombre'), icone: Moon },
    { valeur: 'system', libelle: t('compte.themeSysteme'), icone: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-2"
          aria-label="Mon compte et préférences"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initiales(nomComplet)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm leading-tight">{nomComplet}</span>
            <span className="block text-xs leading-tight text-muted-foreground">
              {t(`role.${role}`)}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{nomComplet}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profil">
            <UserRound aria-hidden />
            {t('compte.profil')}
          </Link>
        </DropdownMenuItem>

        {role === 'SUPER_ADMIN' && (
          <DropdownMenuItem asChild>
            <Link href="/apparence">
              <Palette aria-hidden />
              {t('compte.apparence')}
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t('compte.theme')}
        </DropdownMenuLabel>

        {themes.map((choix) => {
          const Icone = choix.icone;
          const actif = monte && theme === choix.valeur;

          return (
            <DropdownMenuItem
              key={choix.valeur}
              onSelect={() => setTheme(choix.valeur)}
              className={actif ? 'bg-secondary' : undefined}
            >
              <Icone aria-hidden />
              {choix.libelle}
              {actif && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <form action={deconnexionAction}>
          <button
            type="submit"
            className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-secondary"
          >
            <LogOut className="size-4" aria-hidden />
            {t('compte.deconnexion')}
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
