import type { Metadata } from 'next';

import Link from 'next/link';
import { Palette } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { FormulairesProfil } from './formulaires-profil';

export const metadata: Metadata = {
  title: 'Mon profil — DIFFUSIO',
};

export default async function PageProfil() {
  const acteur = await exigerActeur();

  const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
    where: { id: acteur.id },
    select: {
      nom: true,
      prenoms: true,
      email: true,
      telephone: true,
      fonction: true,
      emailSuperieur: true,
      role: true,
      derniereConnexion: true,
      structure: { select: { nom: true, sigle: true } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mon profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos coordonnées et votre mot de passe.
        </p>
      </header>

      {/* The theme belongs to the organisation, so only its main administrator
          sets it — from here, where they look for their own settings. */}
      {acteur.role === 'SUPER_ADMIN' && (
        <Card className="mb-6 overflow-hidden">
          <CardContent className="flex flex-wrap items-center gap-4 py-1">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[var(--elevation-2)]"
              style={{ backgroundImage: 'var(--gradient-primaire)' }}
              aria-hidden
            >
              <Palette className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Thème et couleurs du site</p>
              <p className="text-sm text-muted-foreground">
                Couleurs dominantes, logo, police et style. Le site, les e-mails
                et les rapports PDF et Excel suivent ce choix.
              </p>
              <div className="mt-2 flex gap-1.5" aria-hidden>
                {['--couleur-primaire', '--couleur-secondaire', '--couleur-accent'].map((variable) => (
                  <span key={variable} className="size-5 rounded-full ring-2 ring-card shadow" style={{ background: `var(${variable})` }} />
                ))}
              </div>
            </div>
            <Button asChild>
              <Link href="/apparence">Personnaliser</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <FormulairesProfil
        utilisateur={{
          ...utilisateur,
          structure: utilisateur.structure
            ? `${utilisateur.structure.nom} (${utilisateur.structure.sigle})`
            : null,
          derniereConnexion:
            utilisateur.derniereConnexion?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
