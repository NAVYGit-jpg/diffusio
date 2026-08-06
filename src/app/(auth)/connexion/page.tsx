import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { FormulaireConnexion } from './formulaire-connexion';

export const metadata: Metadata = {
  title: 'Connexion — DIFFUSIO',
};

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ motDePasseChange?: string }>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.mustChangePassword ? '/premiere-connexion' : '/tableau-de-bord');
  }

  const { motDePasseChange } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">DIFFUSIO</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendrier de diffusion statistique
          </p>
        </div>

        <FormulaireConnexion motDePasseChange={motDePasseChange === '1'} />
      </div>
    </main>
  );
}
