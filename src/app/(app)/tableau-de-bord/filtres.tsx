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
import { LIBELLE_PERIODICITE, PERIODICITES } from '@/lib/catalogue/schemas';
import {
  LIBELLE_MOIS,
  LIBELLE_TYPE_ELEMENT,
  MOIS,
  TYPES_ELEMENT,
  type FiltresLus,
  adresseTableauDeBord,
} from '@/lib/tableau-bord/filtres-url';
import { type Option, SelecteurMultiple } from './selecteur-multiple';

/**
 * Common dashboard filters (cahier des charges §10).
 *
 * The state lives in the URL, not in React: a filtered dashboard can then be
 * bookmarked or pasted into a message, and the back button behaves as expected.
 *
 * Every categorical filter accepts several values at once. The year stays
 * single-valued because the screens indexed on it — the twelve-month curve, the
 * progress bar, the calendar title — are each defined for one year. The month
 * does not: a quarter, a semester, the two months a survey straddles are all
 * ordinary questions, and each is a handful of ticks.
 */

export function FiltresTableauDeBord({
  etat,
  annees,
  structures,
  domaines,
}: {
  etat: FiltresLus;
  annees: number[];
  structures: { id: string; nom: string; sigle: string }[];
  domaines: { id: string; nom: string }[];
}) {
  const router = useRouter();

  const naviguer = (modifications: Partial<FiltresLus>) => {
    router.push(adresseTableauDeBord({ ...etat, ...modifications }));
  };

  const optionsStructures: Option[] = structures.map((structure) => ({
    valeur: structure.id,
    libelle: `${structure.nom} (${structure.sigle})`,
  }));

  const optionsDomaines: Option[] = domaines.map((domaine) => ({
    valeur: domaine.id,
    libelle: domaine.nom,
  }));

  const optionsPeriodicites: Option[] = PERIODICITES.map((periodicite) => ({
    valeur: periodicite,
    libelle: LIBELLE_PERIODICITE[periodicite],
  }));

  const optionsTypes: Option[] = TYPES_ELEMENT.map((type) => ({
    valeur: type,
    libelle: LIBELLE_TYPE_ELEMENT[type],
  }));

  // Chronological, not alphabetical: nobody looks for April between August and
  // December.
  const optionsMois: Option[] = MOIS.map((mois) => ({
    valeur: String(mois),
    libelle: LIBELLE_MOIS[mois],
  }));

  const nombreFiltres =
    etat.mois.length +
    etat.structureIds.length +
    etat.domaineIds.length +
    etat.periodicites.length +
    etat.typesElement.length;

  return (
    <div data-filtres-tableau-de-bord className="mb-6 space-y-3">
      {/* Three per row rather than five. A sixth control squeezed onto one line
          left each summary too narrow for « Toutes les périodicités », which
          then truncated into something unreadable. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
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

        <div className="space-y-2">
          <Label htmlFor="filtreMois">Mois</Label>
          <SelecteurMultiple
            identifiant="filtreMois"
            libelleVide="Toute l'année"
            nomPluriel="mois"
            options={optionsMois}
            selection={etat.mois.map(String)}
            onChange={(selection) =>
              naviguer({ mois: selection.map(Number) })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filtreType">Type de produit</Label>
          <SelecteurMultiple
            identifiant="filtreType"
            libelleVide="Tous les types"
            nomPluriel="types"
            options={optionsTypes}
            selection={etat.typesElement}
            onChange={(selection) =>
              naviguer({ typesElement: selection as FiltresLus['typesElement'] })
            }
          />
        </div>

        {structures.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="filtreStructure">Structure</Label>
            <SelecteurMultiple
              identifiant="filtreStructure"
              libelleVide="Toutes mes structures"
              nomPluriel="structures"
              options={optionsStructures}
              selection={etat.structureIds}
              onChange={(selection) => naviguer({ structureIds: selection })}
            />
          </div>
        )}

        {domaines.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="filtreDomaine">Domaine</Label>
            <SelecteurMultiple
              identifiant="filtreDomaine"
              libelleVide="Tous les domaines"
              nomPluriel="domaines"
              options={optionsDomaines}
              selection={etat.domaineIds}
              onChange={(selection) => naviguer({ domaineIds: selection })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="filtrePeriodicite">Périodicité</Label>
          <SelecteurMultiple
            identifiant="filtrePeriodicite"
            libelleVide="Toutes les périodicités"
            nomPluriel="périodicités"
            options={optionsPeriodicites}
            selection={etat.periodicites}
            onChange={(selection) => naviguer({ periodicites: selection })}
          />
        </div>
      </div>

      {nombreFiltres > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {nombreFiltres} filtre{nombreFiltres > 1 ? 's' : ''} actif
            {nombreFiltres > 1 ? 's' : ''} :
          </span>

          <JetonsActifs
            etat={etat}
            optionsMois={optionsMois}
            optionsStructures={optionsStructures}
            optionsDomaines={optionsDomaines}
            optionsPeriodicites={optionsPeriodicites}
            optionsTypes={optionsTypes}
            naviguer={naviguer}
          />

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() =>
              naviguer({
                mois: [],
                structureIds: [],
                domaineIds: [],
                periodicites: [],
                typesElement: [],
              })
            }
          >
            <RotateCcw aria-hidden />
            Tout réinitialiser
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * One removable chip per active choice.
 *
 * With several values hidden behind a summary like "3 structures", the chips
 * are the only place the reader can see *which* three — and drop one without
 * reopening the menu.
 */
function JetonsActifs({
  etat,
  optionsMois,
  optionsStructures,
  optionsDomaines,
  optionsPeriodicites,
  optionsTypes,
  naviguer,
}: {
  etat: FiltresLus;
  optionsMois: Option[];
  optionsStructures: Option[];
  optionsDomaines: Option[];
  optionsPeriodicites: Option[];
  optionsTypes: Option[];
  naviguer: (modifications: Partial<FiltresLus>) => void;
}) {
  // Chips carry strings, because that is what a URL carries. Months are the one
  // filter whose state is numeric, so the group says how to convert back —
  // without it, removing « Mars » would write the string "3" into a number[]
  // and TypeScript would be the only one to notice.
  const groupes: {
    cle: keyof FiltresLus;
    options: Option[];
    valeurs: string[];
    reconstruire?: (restantes: string[]) => number[];
  }[] = [
    {
      cle: 'mois',
      options: optionsMois,
      valeurs: etat.mois.map(String),
      reconstruire: (restantes) => restantes.map(Number),
    },
    {
      cle: 'typesElement' as const,
      options: optionsTypes,
      valeurs: etat.typesElement as string[],
    },
    {
      cle: 'structureIds' as const,
      options: optionsStructures,
      valeurs: etat.structureIds,
    },
    {
      cle: 'domaineIds' as const,
      options: optionsDomaines,
      valeurs: etat.domaineIds,
    },
    {
      cle: 'periodicites' as const,
      options: optionsPeriodicites,
      valeurs: etat.periodicites,
    },
  ];

  return (
    <>
      {groupes.flatMap((groupe) =>
        groupe.valeurs.map((valeur) => {
          const option = groupe.options.find(
            (element) => element.valeur === valeur,
          );

          return (
            <button
              key={`${groupe.cle}-${valeur}`}
              type="button"
              onClick={() => {
                const restantes = groupe.valeurs.filter(
                  (element) => element !== valeur,
                );

                naviguer({
                  [groupe.cle]: groupe.reconstruire
                    ? groupe.reconstruire(restantes)
                    : restantes,
                } as Partial<FiltresLus>);
              }}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs transition-colors hover:bg-muted"
            >
              <span className="max-w-40 truncate">
                {option?.libelle ?? valeur}
              </span>
              <span aria-hidden>×</span>
              <span className="sr-only">Retirer ce filtre</span>
            </button>
          );
        }),
      )}
    </>
  );
}
