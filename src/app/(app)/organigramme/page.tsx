import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { traducteurActeur } from '@/lib/langue/serveur';
import { LIBELLE_PERIODICITE } from '@/lib/catalogue/schemas';
import { prisma } from '@/lib/prisma';
import { OrganigrammeInteractif, type NoeudStructure } from './organigramme-interactif';

export const metadata: Metadata = {
  title: 'Organigramme — DIFFUSIO',
};

/**
 * The organisation as one large chart: structures from top to bottom, joined
 * by connecting lines, each carrying its supervisors, points focaux,
 * publications and indicators.
 *
 * Scoped like everything else: a super admin sees the whole organisation, an
 * administrator the structures they supervise, a point focal their own.
 */
export default async function PageOrganigramme() {
  const acteur = await exigerActeur();
  const t = await traducteurActeur();
  const perimetre = perimetreStructures(acteur);
  const actifs = { deletedAt: null, actif: true };

  const structures = await prisma.structure.findMany({
    where: {
      organisationId: acteur.organisationId,
      deletedAt: null,
      actif: true,
      ...(perimetre === null ? {} : { id: { in: perimetre } }),
    },
    select: {
      id: true,
      nom: true,
      sigle: true,
      parentId: true,
      pointsFocaux: {
        where: { deletedAt: null, role: 'POINT_FOCAL' },
        select: { nom: true, prenoms: true, email: true, fonction: true, actif: true, estTitulaire: true },
        orderBy: [{ estTitulaire: 'desc' }, { nom: 'asc' }],
      },
      adminStructures: {
        where: { admin: { deletedAt: null } },
        select: { admin: { select: { nom: true, prenoms: true, email: true, fonction: true, actif: true } } },
      },
      publications: {
        where: actifs,
        select: { id: true, nom: true, periodicite: true },
        orderBy: { nom: 'asc' },
      },
      indicateurs: {
        where: actifs,
        select: { id: true, nom: true, publication: { select: { nom: true } } },
        orderBy: { nom: 'asc' },
      },
    },
    orderBy: { nom: 'asc' },
  });

  const noeuds: NoeudStructure[] = structures.map((structure) => ({
    ...structure,
    superviseurs: structure.adminStructures.map((lien) => lien.admin),
    publications: structure.publications.map((publication) => ({
      ...publication,
      libellePeriodicite:
        LIBELLE_PERIODICITE[publication.periodicite as keyof typeof LIBELLE_PERIODICITE] ?? publication.periodicite,
    })),
  }));
  const total = (cle: 'pointsFocaux' | 'publications' | 'indicateurs') =>
    noeuds.reduce((somme, noeud) => somme + noeud[cle].length, 0);

  return (
    <div className="mx-auto max-w-[100rem]">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.organigramme')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les structures et leurs rattachements, avec pour chacune ses superviseurs, ses points
          focaux, ses publications et ses indicateurs
          {acteur.role === 'SUPER_ADMIN' ? '' : ' — dans votre périmètre'}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{noeuds.length} structure(s)</Badge>
          <Badge variant="secondary">{total('pointsFocaux')} point(s) focal(aux)</Badge>
          <Badge variant="secondary">{total('publications')} publication(s)</Badge>
          <Badge variant="secondary">{total('indicateurs')} indicateur(s)</Badge>
        </div>
      </header>

      {noeuds.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Aucune structure dans votre périmètre.
        </div>
      ) : (
        <OrganigrammeInteractif noeuds={noeuds} />
      )}
    </div>
  );
}
