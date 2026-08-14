'use client';

import { RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type Option,
  SelecteurMultiple,
} from '../tableau-de-bord/selecteur-multiple';

/**
 * Year and structure filters for "Produits chargés" (cahier des charges §9.2).
 *
 * The state lives in the URL, like every other filter bar in the application: a
 * filtered view can then be bookmarked or pasted into a message, and the back
 * button behaves as expected.
 *
 * The year is single-valued and the structures multiple, mirroring the
 * dashboard — the same two controls must not behave differently from one screen
 * to the next.
 */

const TOUTES_ANNEES = 'TOUTES';

export function FiltresLivrables({
  chemin,
  annee,
  structureIds,
  annees,
  structures,
}: {
  /** Address of the screen carrying these filters. */
  chemin: string;
  annee: number | null;
  structureIds: string[];
  annees: number[];
  structures: { id: string; nom: string; sigle: string }[];
}) {
  const router = useRouter();

  const naviguer = (modifications: {
    annee?: number | null;
    structureIds?: string[];
  }) => {
    const suivant = {
      annee: modifications.annee !== undefined ? modifications.annee : annee,
      structureIds: modifications.structureIds ?? structureIds,
    };

    const parametres = new URLSearchParams();

    if (suivant.annee !== null) {
      parametres.set('annee', String(suivant.annee));
    }

    for (const identifiant of suivant.structureIds) {
      parametres.append('structure', identifiant);
    }

    const requete = parametres.toString();
    router.push(requete ? `${chemin}?${requete}` : chemin);
  };

  const optionsStructures: Option[] = structures.map((structure) => ({
    valeur: structure.id,
    libelle: `${structure.nom} (${structure.sigle})`,
  }));

  // Une année venue de l'adresse mais sans calendrier reste proposée : sans
  // cela le sélecteur s'afficherait vide, sans dire sur quoi il filtre.
  const anneesProposees =
    annee !== null && !annees.includes(annee)
      ? [annee, ...annees].sort((a, b) => b - a)
      : annees;

  const filtreActif = annee !== null || structureIds.length > 0;

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="w-40 space-y-2">
        <Label htmlFor="filtreAnneeLivrables">Année</Label>
        <Select
          value={annee === null ? TOUTES_ANNEES : String(annee)}
          onValueChange={(valeur) =>
            naviguer({
              annee: valeur === TOUTES_ANNEES ? null : Number(valeur),
            })
          }
        >
          <SelectTrigger id="filtreAnneeLivrables" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={TOUTES_ANNEES}>Toutes les années</SelectItem>
            {anneesProposees.map((valeur) => (
              <SelectItem key={valeur} value={String(valeur)}>
                {valeur}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {structures.length > 1 && (
        <div className="w-72 space-y-2">
          <Label htmlFor="filtreStructureLivrables">Structure</Label>
          <SelecteurMultiple
            identifiant="filtreStructureLivrables"
            libelleVide="Toutes mes structures"
            nomPluriel="structures"
            options={optionsStructures}
            selection={structureIds}
            onChange={(selection) => naviguer({ structureIds: selection })}
          />
        </div>
      )}

      {filtreActif && (
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => naviguer({ annee: null, structureIds: [] })}
        >
          <RotateCcw aria-hidden />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
