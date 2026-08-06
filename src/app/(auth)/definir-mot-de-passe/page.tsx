import type { Metadata } from 'next';

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
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">DIFFUSIO</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activation de votre compte
          </p>
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
