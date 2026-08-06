import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { deconnexionAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Tableau de bord — DIFFUSIO',
};

const LIBELLE_ROLE: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  POINT_FOCAL: 'Point focal',
};

export default async function PageTableauDeBord() {
  const session = await auth();

  if (!session?.user) {
    redirect('/connexion');
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.user.nomComplet} — {LIBELLE_ROLE[session.user.role]}
          </p>
        </div>

        <form action={deconnexionAction}>
          <Button type="submit" variant="outline">
            Se déconnecter
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Phase 1 terminée</CardTitle>
          <CardDescription>
            L&apos;authentification et la matrice des droits sont en place.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Les indicateurs de pilotage décrits à la section 10 du cahier des
            charges seront ajoutés en Phase 8, une fois le catalogue et le
            calendrier disponibles.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
