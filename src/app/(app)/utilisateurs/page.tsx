import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { peutRealiser } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { lireParametres } from '@/lib/tableau-bord/filtres-url';
import { prisma } from '@/lib/prisma';
import { aplatir, construireArborescence } from '@/lib/structures/arborescence';
import { libelleQuotaSuperAdmin } from '@/lib/utilisateurs/regles';
import { FiltreStructure } from './filtre-structure';
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

  const structuresFiltrees = lireParametres(await searchParams, 'structure');

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

      <TableauUtilisateurs
        utilisateurs={utilisateurs.map((utilisateur) => ({
          ...utilisateur,
          derniereConnexion: utilisateur.derniereConnexion?.toISOString() ?? null,
          enAttenteActivation: utilisateur.jetonMotDePasse !== null,
          structuresAdmin: utilisateur.adminStructures.map((lien) => lien.structureId),
        }))}
        structures={aplatir(construireArborescence(structures))}
        quotaSuperAdmin={libelleQuotaSuperAdmin(superAdminsActifs)}
      />
    </div>
  );
}
