import type { Metadata } from 'next';

import { CoqueAuthentification } from '@/components/layout/coque-authentification';
import { chargerIdentiteOrganisation } from '@/components/layout/logo-organisation';
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
    <CoqueAuthentification identite={identite} large>

        <FormulairePremiereConnexion emailActuel={session.user.email ?? ''} />
    </CoqueAuthentification>
  );
}
