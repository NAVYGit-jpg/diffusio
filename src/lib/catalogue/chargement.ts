import 'server-only';

import type { ActeurSession } from '@/lib/auth/permissions';
import { perimetreStructures } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import type { ElementCatalogue } from './statistiques';

/**
 * The catalogue within the reader's perimeter, flattened for statistics and
 * exports. The perimeter is applied in the query, never after loading.
 */
/** Optional narrowing, used by the dashboard (structures already include their descendants). */
export type FiltresCatalogue = {
  structureIds?: string[];
  domaineIds?: string[];
  periodicites?: string[];
  typesElement?: string[];
};

export async function chargerElementsCatalogue(
  acteur: ActeurSession & { organisationId: string },
  filtres: FiltresCatalogue = {},
): Promise<ElementCatalogue[]> {
  const perimetre = perimetreStructures(acteur);
  const demandees = filtres.structureIds?.length ? filtres.structureIds : null;
  const structures =
    perimetre === null ? demandees : demandees ? demandees.filter((id) => perimetre.includes(id)) : perimetre;
  const base = {
    organisationId: acteur.organisationId,
    deletedAt: null,
    ...(structures === null ? {} : { structureId: { in: structures } }),
    ...(filtres.domaineIds?.length ? { domaineId: { in: filtres.domaineIds } } : {}),
    ...(filtres.periodicites?.length
      ? { periodicite: { in: filtres.periodicites as ('MENSUELLE' | 'TRIMESTRIELLE')[] } }
      : {}),
  };
  const avecPublications = !filtres.typesElement?.length || filtres.typesElement.includes('PUBLICATION');
  const avecIndicateurs = !filtres.typesElement?.length || filtres.typesElement.includes('INDICATEUR');

  const [publications, indicateurs] = await Promise.all([
    !avecPublications ? [] : prisma.publication.findMany({
      where: base,
      select: {
        nom: true,
        periodicite: true,
        delaiJours: true,
        actif: true,
        structure: { select: { sigle: true } },
        domaine: { select: { nom: true } },
        pointFocal: { select: { nom: true, prenoms: true } },
      },
      orderBy: { nom: 'asc' },
    }),
    !avecIndicateurs ? [] : prisma.indicateur.findMany({
      where: base,
      select: {
        nom: true,
        periodicite: true,
        delaiJours: true,
        actif: true,
        unite: true,
        structure: { select: { sigle: true } },
        domaine: { select: { nom: true } },
        publication: { select: { nom: true } },
      },
      orderBy: { nom: 'asc' },
    }),
  ]);

  return [
    ...publications.map((publication) => ({
      type: 'PUBLICATION' as const,
      nom: publication.nom,
      structure: publication.structure.sigle,
      domaine: publication.domaine?.nom ?? null,
      periodicite: publication.periodicite,
      delaiJours: publication.delaiJours,
      actif: publication.actif,
      pointFocal: publication.pointFocal
        ? `${publication.pointFocal.prenoms} ${publication.pointFocal.nom}`
        : null,
    })),
    ...indicateurs.map((indicateur) => ({
      type: 'INDICATEUR' as const,
      nom: indicateur.nom,
      structure: indicateur.structure.sigle,
      domaine: indicateur.domaine?.nom ?? null,
      periodicite: indicateur.periodicite,
      delaiJours: indicateur.delaiJours,
      actif: indicateur.actif,
      unite: indicateur.unite,
      publication: indicateur.publication?.nom ?? null,
    })),
  ];
}
