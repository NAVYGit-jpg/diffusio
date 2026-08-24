import type { Metadata } from 'next';

import {
  LogoOrganisation,
  SloganOrganisation,
  chargerIdentiteOrganisation,
} from '@/components/layout/logo-organisation';

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
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* L'invitation est le tout premier contact de la personne avec
              l'application : elle doit y reconnaître son institution, pas
              l'outil. Le contexte — « activation » — est déjà porté par la
              carte, qui souhaite la bienvenue et explique quoi faire. */}
          <LogoOrganisation identite={identite} hauteur={40} priorite />
          <SloganOrganisation
            identite={identite}
            className="mt-3 text-sm text-muted-foreground"
          />
        </div>

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
      </div>
    </main>
  );
}
