import type { Metadata } from 'next';

import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { joursEntre } from '@/lib/relances/planification';
import { VueRetards } from './vue-retards';

export const metadata: Metadata = {
  title: 'Publications en retard — DIFFUSIO',
};

export default async function PageRetards() {
  const acteur = await exigerActeur();
  const perimetre = perimetreStructures(acteur);

  const lignes = await prisma.ligneCalendrier.findMany({
    where: {
      statut: 'EN_RETARD',
      calendrier: {
        organisationId: acteur.organisationId,
        ...(perimetre === null ? {} : { structureId: { in: perimetre } }),
      },
    },
    include: {
      calendrier: { select: { annee: true, structure: { select: { sigle: true } } } },
      publication: { select: { nom: true } },
      indicateur: { select: { nom: true } },
      retard: true,
    },
    orderBy: { dateDiffusionPrevue: 'asc' },
  });

  const aujourdhui = new Date();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Publications en retard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseigner l&apos;état d&apos;avancement, une justification et une
          prochaine date suspend les relances automatiques jusqu&apos;à cette
          nouvelle date.
        </p>
      </header>

      <VueRetards
        role={acteur.role}
        lignes={lignes.map((ligne) => ({
          id: ligne.id,
          nomElement: ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément',
          structure: ligne.calendrier.structure.sigle,
          annee: ligne.calendrier.annee,
          libellePeriode: ligne.libellePeriode,
          dateDiffusionPrevue: ligne.dateDiffusionPrevue.toISOString(),
          joursDeRetard: joursEntre(
            ligne.retard?.prochaineDateDiffusion ?? ligne.dateDiffusionPrevue,
            aujourdhui,
          ),
          statutAvancement: ligne.retard?.statutAvancement ?? null,
          justification: ligne.retard?.justification ?? null,
          prochaineDateDiffusion:
            ligne.retard?.prochaineDateDiffusion?.toISOString() ?? null,
          relancesSuspendues: ligne.retard?.relancesSuspendues ?? false,
          nombreRelancesEnvoyees: ligne.retard?.nombreRelancesEnvoyees ?? 0,
          nombreReports: ligne.retard?.nombreReports ?? 0,
          publie: ligne.retard?.publie ?? false,
        }))}
      />
    </div>
  );
}
