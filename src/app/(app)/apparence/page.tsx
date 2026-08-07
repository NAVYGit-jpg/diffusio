import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { peutRealiser } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { FormulaireApparence } from './formulaire-apparence';

export const metadata: Metadata = {
  title: 'Logo et couleurs — DIFFUSIO',
};

export default async function PageApparence() {
  const acteur = await exigerActeur();

  if (!peutRealiser(acteur, 'apparence:gerer')) {
    redirect('/tableau-de-bord');
  }

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: acteur.organisationId },
    select: {
      nom: true,
      sigle: true,
      logoUrl: true,
      couleurPrimaire: true,
      couleurSecondaire: true,
      couleurAccent: true,
      densiteInterface: true,
      radiusInterface: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Logo et couleurs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces réglages s&apos;appliquent à tous les utilisateurs de{' '}
          {organisation.nom}, immédiatement.
        </p>
      </header>

      <FormulaireApparence organisation={organisation} />
    </div>
  );
}
