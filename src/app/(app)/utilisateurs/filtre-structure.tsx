'use client';

import { RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  type Option,
  SelecteurMultiple,
} from '../tableau-de-bord/selecteur-multiple';

/**
 * Structure filter for the « Utilisateurs » screen.
 *
 * The state lives in the URL, like every other filter bar in the application: a
 * filtered view can be bookmarked or pasted into a message, and the back button
 * behaves as expected. Several structures at once, mirroring the dashboard and
 * « Produits chargés » — the same control must not behave differently from one
 * screen to the next.
 */
export function FiltreStructure({
  structureIds,
  structures,
}: {
  structureIds: string[];
  structures: { id: string; nom: string; sigle: string }[];
}) {
  const router = useRouter();

  const naviguer = (selection: string[]) => {
    const parametres = new URLSearchParams();

    for (const id of selection) {
      parametres.append('structure', id);
    }

    const requete = parametres.toString();
    router.push(requete ? `/utilisateurs?${requete}` : '/utilisateurs');
  };

  const options: Option[] = structures.map((structure) => ({
    valeur: structure.id,
    libelle: `${structure.nom} (${structure.sigle})`,
  }));

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="w-full space-y-2 sm:w-80">
        <Label htmlFor="filtreStructureUtilisateurs">Structure</Label>
        <SelecteurMultiple
          identifiant="filtreStructureUtilisateurs"
          libelleVide="Toutes les structures"
          nomPluriel="structures"
          options={options}
          selection={structureIds}
          onChange={naviguer}
        />
      </div>

      {structureIds.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => naviguer([])}
        >
          <RotateCcw aria-hidden />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
