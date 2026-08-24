import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { peutRealiser } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { aplatir, construireArborescence } from '@/lib/structures/arborescence';
import { libelleQuotaSuperAdmin } from '@/lib/utilisateurs/regles';
import { TableauUtilisateurs } from './tableau-utilisateurs';

export const metadata: Metadata = {
  title: 'Utilisateurs — DIFFUSIO',
};

export default async function PageUtilisateurs() {
  const acteur = await exigerActeur();

  if (!peutRealiser(acteur, 'pointFocal:gerer')) {
    redirect('/tableau-de-bord');
  }

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

  const superAdminsActifs = utilisateurs.filter(
    (utilisateur) => utilisateur.role === 'SUPER_ADMIN' && utilisateur.actif,
  ).length;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Points focaux, administrateurs et super administrateurs. Chaque compte
          créé reçoit une invitation pour choisir son propre mot de passe.
        </p>
      </header>

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
