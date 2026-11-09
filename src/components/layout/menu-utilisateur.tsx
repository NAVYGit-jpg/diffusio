'use client';

import type { Role } from '@prisma/client';
import {
  BookOpen,
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
import { AvatarUtilisateur } from '@/components/avatar-utilisateur';
import { deconnexionAction } from '@/lib/actions/auth';
import { type CodeLangue, traducteur } from '@/lib/langue/dictionnaire';

export function MenuUtilisateur({
  nomComplet,
  email,
  role,
  langue,
  photo = null,
}: {
  nomComplet: string;
  email: string;
  role: Role;
  langue: CodeLangue;
  photo?: string | null;
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
          className="h-11 gap-2.5 rounded-full py-1 pl-1 pr-3"
          aria-label="Mon compte et préférences"
        >
          <AvatarUtilisateur photo={photo} nomComplet={nomComplet} className="size-9 text-xs ring-2 ring-card" />
          <span className="hidden text-left sm:block">
            <span className="block text-sm leading-tight">{nomComplet}</span>
            <span className="block text-xs leading-tight text-muted-foreground">
              {t(`role.${role}`)}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 overflow-hidden rounded-3xl p-0">
        <div className="relative px-4 pb-4 pt-12">
          <div className="absolute inset-x-0 top-0 h-16" style={{ backgroundImage: 'var(--gradient-primaire)' }} aria-hidden />
          <AvatarUtilisateur photo={photo} nomComplet={nomComplet} className="relative size-16 border-4 border-popover text-lg shadow-[var(--elevation-2)]" />
          <p className="mt-2 text-base font-semibold leading-tight">{nomComplet}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <span className="mt-2 inline-block rounded-full bg-[var(--couleur-primaire-douce)] px-2.5 py-0.5 text-xs font-medium text-[var(--couleur-primaire-lisible)]">
            {t(`role.${role}`)}
          </span>
        </div>
        <div className="p-1.5">

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profil">
            <UserRound aria-hidden />
            {t('compte.profil')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/documentation">
            <BookOpen aria-hidden />
            Documentation
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
