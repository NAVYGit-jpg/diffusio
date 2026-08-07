import type { Metadata } from 'next';

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
