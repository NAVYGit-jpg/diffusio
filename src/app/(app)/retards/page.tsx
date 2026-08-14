import type { Metadata } from 'next';

import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { contactPointFocal } from '@/lib/livrables/vues';
import { joursEntre } from '@/lib/relances/planification';
import { VueRetards } from './vue-retards';

export const metadata: Metadata = {
  title: 'Publications en retard — DIFFUSIO',
};

export default async function PageRetards() {
  const acteur = await exigerActeur();
  const perimetre = perimetreStructures(acteur);

  const aujourdhui = new Date();

  // Lateness is read from the dates, not from the stored `EN_RETARD` status.
  // That status is written by the nightly job: relying on it showed "no delay"
  // on an installation where the job had never run, while the dashboard — which
  // counts from the dates — reported several. Two screens, two answers.
  const finDuJour = new Date(
    Date.UTC(
      aujourdhui.getUTCFullYear(),
      aujourdhui.getUTCMonth(),
      aujourdhui.getUTCDate(),
    ),
  );

  const lignes = await prisma.ligneCalendrier.findMany({
    where: {
      dateDiffusionPrevue: { lt: finDuJour },
      dateDiffusionReelle: null,
      statut: { notIn: ['MIS_EN_LIGNE', 'ANNULE'] },
      calendrier: {
        organisationId: acteur.organisationId,
        ...(perimetre === null ? {} : { structureId: { in: perimetre } }),
      },
    },
    include: {
      calendrier: { select: { annee: true, structure: { select: { sigle: true } } } },
      publication: {
        select: {
          nom: true,
          pointFocal: {
            select: { nom: true, prenoms: true, email: true, telephone: true },
          },
        },
      },
      indicateur: {
        select: {
          nom: true,
          pointFocal: {
            select: { nom: true, prenoms: true, email: true, telephone: true },
          },
        },
      },
      retard: true,
    },
    orderBy: { dateDiffusionPrevue: 'asc' },
  });

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
          pointFocal: contactPointFocal(
            ligne.publication?.pointFocal ?? ligne.indicateur?.pointFocal ?? null,
          ),
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
