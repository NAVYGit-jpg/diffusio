import { formaterJJMMAAAA } from '@/lib/calendrier/dates';

/**
 * Shaping of the calendar export (cahier des charges §9.3 and §10).
 *
 * Builds the rows and the file name; writing the workbook is left to the route.
 * Keeping the mapping pure means the column order, the labels and the scope
 * wording can be tested without producing a single byte of XLSX.
 */

export const COLONNES_EXPORT = [
  { cle: 'structure', entete: 'Structure', largeur: 34 },
  { cle: 'sigle', entete: 'Sigle', largeur: 12 },
  { cle: 'type', entete: 'Type', largeur: 13 },
  { cle: 'element', entete: 'Publication / Indicateur', largeur: 44 },
  { cle: 'domaine', entete: 'Domaine', largeur: 20 },
  { cle: 'periodicite', entete: 'Périodicité', largeur: 15 },
  { cle: 'periode', entete: 'Période couverte', largeur: 20 },
  { cle: 'debutCouverture', entete: 'Début de couverture', largeur: 19 },
  { cle: 'finCouverture', entete: 'Fin de couverture', largeur: 19 },
  { cle: 'diffusionPrevue', entete: 'Diffusion prévue', largeur: 18 },
  { cle: 'diffusionReelle', entete: 'Diffusion réelle', largeur: 18 },
  { cle: 'statut', entete: 'Statut', largeur: 16 },
  { cle: 'pointFocal', entete: 'Point focal', largeur: 26 },
  { cle: 'lien', entete: 'Lien de publication', largeur: 40 },
] as const;

export type LigneExport = Record<
  (typeof COLONNES_EXPORT)[number]['cle'],
  string
>;

export const LIBELLE_STATUT_EXPORT: Record<string, string> = {
  PLANIFIE: 'Planifié',
  A_VENIR: 'À venir',
  TELEVERSE: 'Téléversé',
  MIS_EN_LIGNE: 'Mis en ligne',
  EN_RETARD: 'En retard',
  ANNULE: 'Annulé',
};

export const LIBELLE_PERIODICITE_EXPORT: Record<string, string> = {
  MENSUELLE: 'Mensuelle',
  TRIMESTRIELLE: 'Trimestrielle',
  SEMESTRIELLE: 'Semestrielle',
  ANNUELLE: 'Annuelle',
  PLURIANNUELLE: 'Pluriannuelle',
  PONCTUELLE: 'Ponctuelle',
};

export type LigneSource = {
  structureNom: string;
  structureSigle: string;
  elementType: string;
  nomElement: string;
  domaine: string | null;
  periodicite: string;
  libellePeriode: string;
  dateDebutCouverture: Date;
  dateFinCouverture: Date;
  dateDiffusionPrevue: Date;
  dateDiffusionReelle: Date | null;
  statut: string;
  pointFocal: string | null;
  lienPublication: string | null;
};

/**
 * One spreadsheet row per calendar line.
 *
 * Empty cells hold "—" rather than nothing: an empty cell in a spreadsheet
 * reads as an oversight, a dash reads as a deliberate absence.
 */
export function construireLignesExport(
  sources: readonly LigneSource[],
): LigneExport[] {
  return sources.map((source) => ({
    structure: source.structureNom,
    sigle: source.structureSigle,
    type: source.elementType === 'PUBLICATION' ? 'Publication' : 'Indicateur',
    element: source.nomElement,
    domaine: source.domaine ?? '—',
    periodicite:
      LIBELLE_PERIODICITE_EXPORT[source.periodicite] ?? source.periodicite,
    periode: source.libellePeriode,
    debutCouverture: formaterJJMMAAAA(source.dateDebutCouverture),
    finCouverture: formaterJJMMAAAA(source.dateFinCouverture),
    diffusionPrevue: formaterJJMMAAAA(source.dateDiffusionPrevue),
    diffusionReelle: source.dateDiffusionReelle
      ? formaterJJMMAAAA(source.dateDiffusionReelle)
      : '—',
    statut: LIBELLE_STATUT_EXPORT[source.statut] ?? source.statut,
    pointFocal: source.pointFocal ?? '—',
    lien: source.lienPublication ?? '—',
  }));
}

/**
 * Sorts the export.
 *
 * By structure first, then by release date: a consolidated calendar is read
 * structure by structure, and inside one structure, chronologically. Sorting
 * by date alone would interleave every structure and make the file unusable.
 */
export function trierLignesExport(lignes: LigneSource[]): LigneSource[] {
  return [...lignes].sort((a, b) => {
    const parStructure = a.structureNom.localeCompare(b.structureNom, 'fr');

    if (parStructure !== 0) {
      return parStructure;
    }

    return a.dateDiffusionPrevue.getTime() - b.dateDiffusionPrevue.getTime();
  });
}

/** File name offered to the browser. */
export function nomFichierExport(params: {
  annee: number;
  global: boolean;
  sigleStructure?: string | null;
}): string {
  if (params.global || !params.sigleStructure) {
    return `calendrier-diffusion-global-${params.annee}.xlsx`;
  }

  const sigle = params.sigleStructure
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `calendrier-diffusion-${sigle || 'structure'}-${params.annee}.xlsx`;
}

/** Line describing the scope of the file, written above the table. */
export function libellePerimetre(params: {
  global: boolean;
  nombreStructures: number;
  nomStructure?: string | null;
}): string {
  if (!params.global && params.nomStructure) {
    return `Structure : ${params.nomStructure}`;
  }

  if (params.nombreStructures === 1) {
    return 'Périmètre : 1 structure';
  }

  return `Périmètre : ${params.nombreStructures} structures`;
}
