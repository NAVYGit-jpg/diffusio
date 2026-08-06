import type { Metadata } from 'next';
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
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">DIFFUSIO</h1>
          <p className="mt-1 text-sm text-muted-foreground">Première connexion</p>
        </div>

        <FormulairePremiereConnexion emailActuel={session.user.email ?? ''} />
      </div>
    </main>
  );
}
