import type { Metadata } from 'next';

import { LogoDiffusio } from '@/components/layout/logo-diffusio';
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

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoDiffusio hauteur={40} priorite />
          <p className="mt-3 text-sm text-muted-foreground">Première connexion</p>
        </div>

        <FormulairePremiereConnexion emailActuel={session.user.email ?? ''} />
      </div>
    </main>
  );
}
