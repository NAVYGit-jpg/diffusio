import { LIBELLE_PERIODICITE } from './schemas';

/** A catalogue entry, flattened for statistics and exports. */
export type ElementCatalogue = {
  type: 'PUBLICATION' | 'INDICATEUR';
  nom: string;
  structure: string;
  domaine: string | null;
  periodicite: string;
  delaiJours: number;
  actif: boolean;
  unite?: string | null;
  publication?: string | null;
  pointFocal?: string | null;
};

export type Repartition = { libelle: string; nombre: number }[];

export type StatistiquesCatalogue = {
  total: number;
  publications: number;
  indicateurs: number;
  actifs: number;
  domainesCouverts: number;
  structuresCouvertes: number;
  /** Average release delay in days; `null` on an empty catalogue. */
  delaiMoyen: number | null;
  parPeriodicite: Repartition;
  parDomaine: Repartition;
  parStructure: Repartition;
};

function compter(valeurs: string[]): Repartition {
  const comptes = new Map<string, number>();

  for (const valeur of valeurs) {
    comptes.set(valeur, (comptes.get(valeur) ?? 0) + 1);
  }

  return [...comptes.entries()]
    .map(([libelle, nombre]) => ({ libelle, nombre }))
    .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, 'fr'));
}

export function libellePeriodicite(code: string): string {
  return LIBELLE_PERIODICITE[code as keyof typeof LIBELLE_PERIODICITE] ?? code;
}

export function statistiquesCatalogue(
  elements: readonly ElementCatalogue[],
): StatistiquesCatalogue {
  const domaines = elements.map((element) => element.domaine ?? 'Sans domaine');

  return {
    total: elements.length,
    publications: elements.filter((element) => element.type === 'PUBLICATION').length,
    indicateurs: elements.filter((element) => element.type === 'INDICATEUR').length,
    actifs: elements.filter((element) => element.actif).length,
    // « Sans domaine » is not a domain: counting it would overstate coverage.
    domainesCouverts: new Set(elements.map((element) => element.domaine).filter(Boolean)).size,
    structuresCouvertes: new Set(elements.map((element) => element.structure)).size,
    delaiMoyen:
      elements.length === 0
        ? null
        : Math.round(
            (elements.reduce((somme, element) => somme + element.delaiJours, 0) /
              elements.length) *
              10,
          ) / 10,
    parPeriodicite: compter(elements.map((element) => libellePeriodicite(element.periodicite))),
    parDomaine: compter(domaines),
    parStructure: compter(elements.map((element) => element.structure)),
  };
}
