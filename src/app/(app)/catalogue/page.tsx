import type { Metadata } from 'next';

import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { aplatir, construireArborescence } from '@/lib/structures/arborescence';
import { VueCatalogue } from './vue-catalogue';

export const metadata: Metadata = {
  title: 'Publications & indicateurs — DIFFUSIO',
};

export default async function PageCatalogue() {
  const acteur = await exigerActeur();
  const perimetre = perimetreStructures(acteur);

  // `null` means no restriction; an empty array means "nothing visible".
  // Confusing the two would either leak every structure or hide them all.
  const filtreStructure =
    perimetre === null ? {} : { structureId: { in: perimetre } };

  const [publications, indicateurs, domaines, structures] = await Promise.all([
    prisma.publication.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        ...filtreStructure,
      },
      select: {
        id: true,
        nom: true,
        description: true,
        structureId: true,
        domaineId: true,
        periodicite: true,
        nombreAnneesPeriodicite: true,
        delaiJours: true,
        delaiType: true,
        reportSiWeekendOuFerie: true,
        actif: true,
        structure: { select: { sigle: true } },
        domaine: { select: { nom: true } },
        pointFocal: { select: { nom: true, prenoms: true } },
        _count: { select: { indicateursAffilies: true } },
      },
      orderBy: { nom: 'asc' },
    }),
    prisma.indicateur.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        ...filtreStructure,
      },
      select: {
        id: true,
        nom: true,
        description: true,
        structureId: true,
        publicationId: true,
        domaineId: true,
        periodicite: true,
        nombreAnneesPeriodicite: true,
        delaiJours: true,
        delaiType: true,
        reportSiWeekendOuFerie: true,
        unite: true,
        sourceDonnees: true,
        actif: true,
        structure: { select: { sigle: true } },
        domaine: { select: { nom: true } },
        publication: { select: { nom: true } },
      },
      orderBy: { nom: 'asc' },
    }),
    prisma.domaine.findMany({
      where: { organisationId: acteur.organisationId, deletedAt: null, actif: true },
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    }),
    prisma.structure.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        actif: true,
        ...(perimetre === null ? {} : { id: { in: perimetre } }),
      },
      select: { id: true, nom: true, sigle: true, code: true, parentId: true, actif: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Publications &amp; indicateurs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le catalogue alimente la génération du calendrier. La périodicité et le
          délai saisis ici déterminent les dates de diffusion.
        </p>
      </header>

      <VueCatalogue
        publications={publications}
        indicateurs={indicateurs}
        domaines={domaines}
        structures={aplatir(construireArborescence(structures)).map((s) => ({
          id: s.id,
          nom: s.nom,
          sigle: s.sigle,
          profondeur: s.profondeur,
        }))}
      />
    </div>
  );
}
