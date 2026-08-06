import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { peutRealiser } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { aplatir, construireArborescence } from '@/lib/structures/arborescence';
import { TableauStructures } from './tableau-structures';

export const metadata: Metadata = {
  title: 'Structures — DIFFUSIO',
};

export default async function PageStructures() {
  const acteur = await exigerActeur();

  // The sidebar already hides the entry; this is the check that actually counts.
  // `forbidden()` would be a better fit but is still behind the experimental
  // `authInterrupts` flag in Next 15.
  if (!peutRealiser(acteur, 'structure:gerer')) {
    redirect('/tableau-de-bord');
  }

  const structures = await prisma.structure.findMany({
    where: { organisationId: acteur.organisationId, deletedAt: null },
    select: {
      id: true,
      nom: true,
      sigle: true,
      code: true,
      type: true,
      parentId: true,
      actif: true,
      description: true,
      _count: { select: { pointsFocaux: true, publications: true } },
    },
  });

  const ordonnees = aplatir(construireArborescence(structures));

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Structures</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organigramme de votre institution. Une structure peut contenir
          d&apos;autres structures, sans limite de niveaux.
        </p>
      </header>

      <TableauStructures structures={ordonnees} />
    </div>
  );
}
