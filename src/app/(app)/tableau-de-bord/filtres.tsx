'use client';

import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Common dashboard filters (cahier des charges §10).
 *
 * The state lives in the URL, not in React: a filtered dashboard can then be
 * bookmarked or pasted into a message, and the back button behaves as expected.
 *
 * "Toutes" is carried by the sentinel `TOUTES` rather than an empty string —
 * Radix's Select refuses an empty value, and a missing key in the URL is what
 * "no filter" means server-side.
 */

const TOUTES = 'TOUTES';

export const PERIODICITES_FILTRE = [
  { valeur: 'MENSUELLE', libelle: 'Mensuelle' },
  { valeur: 'TRIMESTRIELLE', libelle: 'Trimestrielle' },
  { valeur: 'SEMESTRIELLE', libelle: 'Semestrielle' },
  { valeur: 'ANNUELLE', libelle: 'Annuelle' },
  { valeur: 'PLURIANNUELLE', libelle: 'Pluriannuelle' },
  { valeur: 'PONCTUELLE', libelle: 'Ponctuelle' },
];

export type EtatFiltres = {
  annee: number;
  structureId: string | null;
  domaineId: string | null;
  periodicite: string | null;
};

export function FiltresTableauDeBord({
  etat,
  annees,
  structures,
  domaines,
}: {
  etat: EtatFiltres;
  annees: number[];
  structures: { id: string; nom: string; sigle: string }[];
  domaines: { id: string; nom: string }[];
}) {
  const router = useRouter();

  const naviguer = (modifications: Partial<EtatFiltres>) => {
    const suivant = { ...etat, ...modifications };
    const parametres = new URLSearchParams();

    parametres.set('annee', String(suivant.annee));

    if (suivant.structureId) {
      parametres.set('structure', suivant.structureId);
    }
    if (suivant.domaineId) {
      parametres.set('domaine', suivant.domaineId);
    }
    if (suivant.periodicite) {
      parametres.set('periodicite', suivant.periodicite);
    }

    router.push(`/tableau-de-bord?${parametres.toString()}`);
  };

  const filtreActif =
    etat.structureId !== null ||
    etat.domaineId !== null ||
    etat.periodicite !== null;

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div className="w-32 space-y-2">
        <Label htmlFor="filtreAnnee">Année</Label>
        <Select
          value={String(etat.annee)}
          onValueChange={(valeur) => naviguer({ annee: Number(valeur) })}
        >
          <SelectTrigger id="filtreAnnee" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {annees.map((valeur) => (
              <SelectItem key={valeur} value={String(valeur)}>
                {valeur}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {structures.length > 1 && (
        <div className="w-64 space-y-2">
          <Label htmlFor="filtreStructure">Structure</Label>
          <Select
            value={etat.structureId ?? TOUTES}
            onValueChange={(valeur) =>
              naviguer({ structureId: valeur === TOUTES ? null : valeur })
            }
          >
            <SelectTrigger id="filtreStructure" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={TOUTES}>Toutes mes structures</SelectItem>
              {structures.map((structure) => (
                <SelectItem key={structure.id} value={structure.id}>
                  {structure.nom} ({structure.sigle})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {domaines.length > 0 && (
        <div className="w-52 space-y-2">
          <Label htmlFor="filtreDomaine">Domaine</Label>
          <Select
            value={etat.domaineId ?? TOUTES}
            onValueChange={(valeur) =>
              naviguer({ domaineId: valeur === TOUTES ? null : valeur })
            }
          >
            <SelectTrigger id="filtreDomaine" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={TOUTES}>Tous les domaines</SelectItem>
              {domaines.map((domaine) => (
                <SelectItem key={domaine.id} value={domaine.id}>
                  {domaine.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="w-44 space-y-2">
        <Label htmlFor="filtrePeriodicite">Périodicité</Label>
        <Select
          value={etat.periodicite ?? TOUTES}
          onValueChange={(valeur) =>
            naviguer({ periodicite: valeur === TOUTES ? null : valeur })
          }
        >
          <SelectTrigger id="filtrePeriodicite" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUTES}>Toutes</SelectItem>
            {PERIODICITES_FILTRE.map((periodicite) => (
              <SelectItem key={periodicite.valeur} value={periodicite.valeur}>
                {periodicite.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtreActif && (
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() =>
            naviguer({ structureId: null, domaineId: null, periodicite: null })
          }
        >
          <RotateCcw aria-hidden />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
