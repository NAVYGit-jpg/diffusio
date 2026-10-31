import type { Metadata } from 'next';

import { CoqueAuthentification } from '@/components/layout/coque-authentification';
import { chargerIdentiteOrganisation } from '@/components/layout/logo-organisation';

import { prisma } from '@/lib/prisma';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormulaireDefinirMotDePasse } from './formulaire-definir-mot-de-passe';

export const metadata: Metadata = {
  title: 'Choisir mon mot de passe — DIFFUSIO',
};

export default async function PageDefinirMotDePasse({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>;
}) {
  const { jeton } = await searchParams;

  // Chargée ici plutôt que dans un composant enfant : une identité récupérée
  // par un composant asynchrone poserait une frontière Suspense au milieu de
  // l'en-tête, et React numéroterait les `useId` du formulaire différemment sur
  // le serveur et dans le navigateur.
  const identite = await chargerIdentiteOrganisation();

  const utilisateur = jeton
    ? await prisma.utilisateur.findFirst({
        where: {
          jetonMotDePasse: jeton,
          jetonMotDePasseExpire: { gt: new Date() },
          actif: true,
          deletedAt: null,
        },
        select: { prenoms: true, nom: true, email: true },
      })
    : null;

  return (
    <CoqueAuthentification identite={identite}>

        {utilisateur ? (
          <FormulaireDefinirMotDePasse
            jeton={jeton!}
            nomComplet={`${utilisateur.prenoms} ${utilisateur.nom}`}
            email={utilisateur.email}
          />
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              Ce lien d&apos;invitation n&apos;est plus valable. Les liens
              expirent au bout de 72 heures. Demandez à votre administrateur de
              vous en renvoyer un.
            </AlertDescription>
          </Alert>
        )}
    </CoqueAuthentification>
  );
}
