import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { peutRealiser } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { FormulaireApparence } from './formulaire-apparence';

export const metadata: Metadata = {
  title: 'Apparence — DIFFUSIO',
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
      slogan: true,
      logoUrl: true,
      logoMimeType: true,
      couleurPrimaire: true,
      couleurSecondaire: true,
      couleurAccent: true,
      couleurFond: true,
      couleurBouton: true,
      paletteAutomatique: true,
      police: true,
      styleInterface: true,
      densiteInterface: true,
      radiusInterface: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Apparence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adaptez l&apos;application à la charte graphique de {organisation.nom}.
          Les changements s&apos;appliquent à tous les utilisateurs dès
          l&apos;enregistrement.
        </p>
      </header>

      <FormulaireApparence
        organisation={{
          ...organisation,
          // The bytes stay on the server; the form only needs to know whether a
          // logo exists, and fetches it from /api/logo for the preview.
          aUnLogoTeleverse: organisation.logoMimeType !== null,
        }}
      />
    </div>
  );
}
