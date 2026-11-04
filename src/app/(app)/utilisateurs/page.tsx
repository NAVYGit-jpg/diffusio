import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { peutRealiser } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { lireParametres } from '@/lib/tableau-bord/filtres-url';
import { prisma } from '@/lib/prisma';
import { aplatir, construireArborescence } from '@/lib/structures/arborescence';
import { libelleQuotaSuperAdmin } from '@/lib/utilisateurs/regles';
import { FiltreStructure } from './filtre-structure';
import { HierarchieEquipes } from './hierarchie-equipes';
import Link from 'next/link';
import { avecDescendants } from '@/lib/structures/descendance';
import { TableauUtilisateurs } from './tableau-utilisateurs';

export const metadata: Metadata = {
  title: 'Utilisateurs — DIFFUSIO',
};

export default async function PageUtilisateurs({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const acteur = await exigerActeur();

  if (!peutRealiser(acteur, 'pointFocal:gerer')) {
    redirect('/tableau-de-bord');
  }

  // Choosing a parent structure lists the people of its children too.
  const structuresFiltrees = await avecDescendants(
    acteur.organisationId,
    lireParametres(await searchParams, 'structure'),
  );

  /**
   * « Appartenir » à une structure n'a pas le même sens selon le rôle : un
   * point focal y est rattaché, un administrateur la supervise. Le filtre
   * retient les deux, faute de quoi filtrer sur une structure ferait
   * disparaître les administrateurs qui en répondent.
   *
   * Le super administrateur, rattaché à aucune, sort de la liste dès qu'une
   * structure est choisie — c'est cohérent avec la question posée : « qui
   * travaille sur celle-ci ».
   */
  const filtreStructure =
    structuresFiltrees.length === 0
      ? {}
      : {
          OR: [
            { structureId: { in: structuresFiltrees } },
            {
              adminStructures: {
                some: { structureId: { in: structuresFiltrees } },
              },
            },
          ],
        };

  /**
   * Périmètre de l'écran.
   *
   * Un super administrateur voit toute l'organisation. Un administrateur ne
   * voit que les points focaux des structures qu'il supervise — le filtre est
   * posé dans la clause WHERE, jamais après coup : une liste chargée puis
   * masquée à l'affichage reste lisible dans la réponse du serveur.
   */
  const restreintAuxPointsFocaux =
    acteur.role === 'ADMIN'
      ? {
          role: 'POINT_FOCAL' as const,
          structureId: { in: acteur.structuresAdmin },
        }
      : {};

  const structuresLisibles =
    acteur.role === 'ADMIN' ? { id: { in: acteur.structuresAdmin } } : {};

  const [utilisateurs, structures] = await Promise.all([
    prisma.utilisateur.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        ...restreintAuxPointsFocaux,
        ...filtreStructure,
      },
      select: {
        id: true,
        nom: true,
        prenoms: true,
        email: true,
        telephone: true,
        fonction: true,
        role: true,
        structureId: true,
        emailSuperieur: true,
        estTitulaire: true,
        actif: true,
        derniereConnexion: true,
        jetonMotDePasse: true,
        structure: { select: { nom: true, sigle: true } },
        adminStructures: { select: { structureId: true } },
      },
      orderBy: [{ role: 'asc' }, { nom: 'asc' }],
    }),
    prisma.structure.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        actif: true,
        ...structuresLisibles,
      },
      select: { id: true, nom: true, sigle: true, code: true, parentId: true, actif: true },
    }),
  ]);

  // « Équipes » view: every supervisor with the points focaux of the
  // structures they administer. An administrator sees their own branch.
  const vueEquipes = lireParametres(await searchParams, 'vue').includes('equipes');
  const superviseurs = vueEquipes
    ? await prisma.utilisateur.findMany({
        where: {
          organisationId: acteur.organisationId,
          deletedAt: null,
          role: 'ADMIN',
          ...(acteur.role === 'ADMIN' ? { id: acteur.id } : {}),
        },
        select: {
          id: true,
          nom: true,
          prenoms: true,
          email: true,
          fonction: true,
          role: true,
          actif: true,
          structureId: true,
          adminStructures: { select: { structureId: true } },
        },
        orderBy: { nom: 'asc' },
      })
    : [];

  // Compté à part, et non sur la liste affichée : celle-ci est filtrée, et un
  // filtre sur une structure en écarte les super administrateurs. Le quota
  // annoncerait alors « 0 sur 5 » alors que rien n'a changé.
  const superAdminsActifs = await prisma.utilisateur.count({
    where: {
      organisationId: acteur.organisationId,
      deletedAt: null,
      role: 'SUPER_ADMIN',
      actif: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Points focaux, administrateurs et super administrateurs. Chaque compte
          créé reçoit une invitation pour choisir son propre mot de passe.
        </p>
      </header>

      {/* Affiché seulement s'il y a de quoi choisir : une organisation d'une
          seule structure n'a rien à filtrer. */}
      {structures.length > 1 && (
        <FiltreStructure
          structureIds={structuresFiltrees}
          structures={structures}
        />
      )}

      <nav aria-label="Affichage" className="mb-5 inline-flex rounded-full border bg-card p-1 shadow-[var(--elevation-1)]">
        {(
          [
            ['liste', 'Liste', '/utilisateurs'],
            ['equipes', 'Équipes et supérieurs', '/utilisateurs?vue=equipes'],
          ] as const
        ).map(([cle, libelle, lien]) => {
          const actif = (cle === 'equipes') === vueEquipes;
          return (
            <Link
              key={cle}
              href={lien}
              className={
                actif
                  ? 'rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background no-underline'
                  : 'rounded-full px-4 py-1.5 text-sm text-muted-foreground no-underline hover:text-foreground'
              }
            >
              {libelle}
            </Link>
          );
        })}
      </nav>

      {vueEquipes ? (
        <HierarchieEquipes
          superviseurs={superviseurs.map((superviseur) => ({
            ...superviseur,
            structuresAdmin: superviseur.adminStructures.map((lien) => lien.structureId),
          }))}
          pointsFocaux={utilisateurs.filter((utilisateur) => utilisateur.role === 'POINT_FOCAL')}
          sigles={new Map(structures.map((structure) => [structure.id, structure.sigle]))}
        />
      ) : (
      <TableauUtilisateurs
        utilisateurs={utilisateurs.map((utilisateur) => ({
          ...utilisateur,
          derniereConnexion: utilisateur.derniereConnexion?.toISOString() ?? null,
          enAttenteActivation: utilisateur.jetonMotDePasse !== null,
          structuresAdmin: utilisateur.adminStructures.map((lien) => lien.structureId),
        }))}
        structures={aplatir(construireArborescence(structures))}
        quotaSuperAdmin={libelleQuotaSuperAdmin(superAdminsActifs)}
        peutCreer={peutRealiser(acteur, 'utilisateur:creer')}
      />
      )}
    </div>
  );
}
