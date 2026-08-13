import type { Metadata } from 'next';

import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { VueEquipe } from './vue-equipe';

export const metadata: Metadata = {
  title: 'Équipe — DIFFUSIO',
};

/**
 * The people informed when a publication goes online (cahier des charges §7).
 *
 * A point focal keeps the team of their structure; the super administrator also
 * keeps an organisation-wide team, informed of every release whatever the
 * structure.
 */
export default async function PageEquipe({
  searchParams,
}: {
  searchParams: Promise<{ portee?: string }>;
}) {
  const acteur = await exigerActeur();
  const parametres = await searchParams;
  const perimetre = perimetreStructures(acteur);

  const structures = await prisma.structure.findMany({
    where: {
      organisationId: acteur.organisationId,
      deletedAt: null,
      actif: true,
      ...(perimetre === null ? {} : { id: { in: perimetre } }),
    },
    select: { id: true, nom: true, sigle: true },
    orderBy: { nom: 'asc' },
  });

  const peutTenirEquipeOrganisation = acteur.role === 'SUPER_ADMIN';

  // Default scope: the acteur's own structure, or the organisation team for a
  // super administrator who supervises none in particular.
  const porteeDemandee =
    parametres.portee ??
    (acteur.structureId && structures.some((s) => s.id === acteur.structureId)
      ? acteur.structureId
      : peutTenirEquipeOrganisation
        ? 'ORGANISATION'
        : (structures[0]?.id ?? ''));

  const portee =
    porteeDemandee === 'ORGANISATION' && peutTenirEquipeOrganisation
      ? 'ORGANISATION'
      : structures.some((structure) => structure.id === porteeDemandee)
        ? porteeDemandee
        : peutTenirEquipeOrganisation
          ? 'ORGANISATION'
          : (structures[0]?.id ?? '');

  const structureId = portee === 'ORGANISATION' ? null : portee;

  const membres =
    portee === ''
      ? []
      : await prisma.membreEquipe.findMany({
          where: {
            organisationId: acteur.organisationId,
            structureId,
            deletedAt: null,
          },
          select: {
            id: true,
            nom: true,
            fonction: true,
            email: true,
            createdAt: true,
          },
          orderBy: { nom: 'asc' },
        });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Équipe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les personnes prévenues par e-mail dès qu&apos;une publication ou un
          indicateur est mis en ligne. Elles reçoivent les messages sans avoir
          de compte sur la plateforme.
        </p>
      </header>

      <VueEquipe
        portee={portee}
        structures={structures}
        peutTenirEquipeOrganisation={peutTenirEquipeOrganisation}
        membres={membres.map((membre) => ({
          id: membre.id,
          nom: membre.nom,
          fonction: membre.fonction,
          email: membre.email,
          ajouteLe: membre.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
