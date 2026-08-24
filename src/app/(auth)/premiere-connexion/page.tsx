import type { Metadata } from 'next';

import {
  LogoOrganisation,
  SloganOrganisation,
  chargerIdentiteOrganisation,
} from '@/components/layout/logo-organisation';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { FormulairePremiereConnexion } from './formulaire-premiere-connexion';

export const metadata: Metadata = {
  title: 'Première connexion — DIFFUSIO',
};

export default async function PagePremiereConnexion() {
  const session = await auth();

  if (!session?.user) {
    redirect('/connexion');
  }

  if (!session.user.mustChangePassword) {
    redirect('/tableau-de-bord');
  }

  // Chargée par la page, jamais par un composant asynchrone enfant : voir la
  // note du même ordre sur l'écran d'activation.
  const identite = await chargerIdentiteOrganisation();

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoOrganisation identite={identite} hauteur={40} priorite />
          <SloganOrganisation
            identite={identite}
            className="mt-3 text-sm text-muted-foreground"
          />
        </div>

        <FormulairePremiereConnexion emailActuel={session.user.email ?? ''} />
      </div>
    </main>
  );
}
