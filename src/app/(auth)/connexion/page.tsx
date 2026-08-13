import type { Metadata } from 'next';

import {
  LogoOrganisation,
  SloganOrganisation,
} from '@/components/layout/logo-organisation';
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

  // Hint shown in the e-mail field. Read from the environment so it can be
  // emptied in production without touching the code: once deployed, this line
  // tells every visitor which account administers the site.
  const emailIndicatif =
    process.env.EMAIL_ADMIN_PAR_DEFAUT ?? 'super.admin@diffusio.local';

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoOrganisation hauteur={40} priorite />
          <SloganOrganisation className="mt-3 text-sm text-muted-foreground" />
        </div>

        <FormulaireConnexion
          motDePasseChange={motDePasseChange === '1'}
          emailIndicatif={emailIndicatif}
        />
      </div>
    </main>
  );
}
