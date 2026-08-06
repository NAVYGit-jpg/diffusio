import type { Metadata } from 'next';

import { exigerActeur } from '@/lib/auth/session';
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

export default async function PageTableauDeBord() {
  const acteur = await exigerActeur();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bienvenue {acteur.nomComplet}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Prochaines étapes</CardTitle>
          <CardDescription>
            Les indicateurs de pilotage seront ajoutés en Phase 8.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Commencez par déclarer vos structures, puis créez les points focaux
            qui alimenteront le catalogue des publications et des indicateurs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
