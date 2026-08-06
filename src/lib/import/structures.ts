import {
  type ColonneAttendue,
  type ErreurLigne,
  analyserGrille,
  detecterDoublons,
} from './analyse';
import { TYPES_STRUCTURE, structureSchema } from '@/lib/structures/schemas';

/**
 * Structure import (cahier des charges §9.3).
 *
 * Parents are designated by their **code**, not by an internal identifier: the
 * person filling the spreadsheet has no idea what a cuid is. Resolution against
 * existing structures and against rows of the same file happens here.
 */

export const COLONNES_STRUCTURES: ColonneAttendue[] = [
  { cle: 'nom', entetes: ['Nom'], obligatoire: true },
  { cle: 'sigle', entetes: ['Sigle'], obligatoire: true },
  { cle: 'code', entetes: ['Code'], obligatoire: true },
  { cle: 'type', entetes: ['Type'], obligatoire: false },
  {
    cle: 'codeParent',
    entetes: ['Code parent', 'Structure parente', 'Parent'],
    obligatoire: false,
  },
  { cle: 'description', entetes: ['Description'], obligatoire: false },
];

export type StructureImportee = {
  ligne: number;
  nom: string;
  sigle: string;
  code: string;
  type: string;
  codeParent: string | null;
  description: string | null;
};

export type RapportImportStructures = {
  aCreer: StructureImportee[];
  erreurs: ErreurLigne[];
  colonnesManquantes: string[];
  lignesIgnorees: number;
  /** Codes already present in the database; those rows are skipped. */
  dejaExistants: string[];
};

/** Accepts the enum values as well as their French labels. */
function normaliserType(valeur: string): string | null {
  if (valeur === '') {
    return 'AUTRE';
  }

  const brut = valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  const equivalences: Record<string, string> = {
    MINISTERE: 'MINISTERE',
    DIRECTION: 'DIRECTION',
    SOUS_DIRECTION: 'SOUS_DIRECTION',
    SERVICE: 'SERVICE',
    AUTRE: 'AUTRE',
  };

  return equivalences[brut] ?? null;
}

/**
 * Analyses a spreadsheet grid against what already exists.
 *
 * @param codesExistants codes already stored, lower-cased comparison
 */
export function analyserImportStructures(
  grille: readonly (readonly unknown[])[],
  codesExistants: readonly string[],
): RapportImportStructures {
  const existants = new Set(codesExistants.map((code) => code.toLowerCase()));

  const analyse = analyserGrille<StructureImportee>(
    grille,
    COLONNES_STRUCTURES,
    (valeurs, ligne) => {
      const erreurs: Omit<ErreurLigne, 'ligne'>[] = [];
      const type = normaliserType(valeurs.type);

      if (type === null) {
        erreurs.push({
          colonne: 'Type',
          message: `Type inconnu : « ${valeurs.type} ». Valeurs acceptées : ${TYPES_STRUCTURE.join(', ')}.`,
        });
      }

      const controle = structureSchema.safeParse({
        nom: valeurs.nom,
        sigle: valeurs.sigle,
        code: valeurs.code,
        type: type ?? 'AUTRE',
        parentId: '',
        description: valeurs.description,
      });

      if (!controle.success) {
        for (const probleme of controle.error.issues) {
          const champ = String(probleme.path[0] ?? '');

          erreurs.push({
            colonne: champ === 'nom' ? 'Nom' : champ === 'sigle' ? 'Sigle' : 'Code',
            message: probleme.message,
          });
        }
      }

      if (erreurs.length > 0) {
        return { ok: false, erreurs };
      }

      return {
        ok: true,
        valeur: {
          ligne,
          nom: controle.data!.nom,
          sigle: controle.data!.sigle,
          code: controle.data!.code,
          type: type!,
          codeParent:
            valeurs.codeParent.trim() === ''
              ? null
              : valeurs.codeParent.trim().toUpperCase(),
          description: valeurs.description || null,
        },
      };
    },
  );

  if (analyse.colonnesManquantes.length > 0) {
    return {
      aCreer: [],
      erreurs: [],
      colonnesManquantes: analyse.colonnesManquantes,
      lignesIgnorees: analyse.lignesIgnorees,
      dejaExistants: [],
    };
  }

  const erreurs = [
    ...analyse.erreurs,
    ...detecterDoublons(
      analyse.valides,
      (structure) => structure.code,
      (structure) => structure.ligne,
      'Code',
    ),
  ];

  // Codes available once the import completes: existing ones plus the file's.
  const codesDuFichier = new Set(
    analyse.valides.map((structure) => structure.code.toLowerCase()),
  );

  for (const structure of analyse.valides) {
    if (structure.codeParent === null) {
      continue;
    }

    const parent = structure.codeParent.toLowerCase();

    if (parent === structure.code.toLowerCase()) {
      erreurs.push({
        ligne: structure.ligne,
        colonne: 'Code parent',
        message: 'Une structure ne peut pas être sa propre structure parente.',
      });
      continue;
    }

    if (!existants.has(parent) && !codesDuFichier.has(parent)) {
      erreurs.push({
        ligne: structure.ligne,
        colonne: 'Code parent',
        message: `Aucune structure ne porte le code « ${structure.codeParent} », ni dans l'application ni dans ce fichier.`,
      });
    }
  }

  const dejaExistants: string[] = [];
  const aCreer: StructureImportee[] = [];

  for (const structure of analyse.valides) {
    if (existants.has(structure.code.toLowerCase())) {
      dejaExistants.push(structure.code);
    } else {
      aCreer.push(structure);
    }
  }

  return {
    aCreer,
    erreurs: erreurs.sort((a, b) => a.ligne - b.ligne),
    colonnesManquantes: [],
    lignesIgnorees: analyse.lignesIgnorees,
    dejaExistants,
  };
}

/**
 * Orders rows so a parent is always created before its children.
 *
 * Rows whose parent already exists in the database come first; the rest follow
 * as their own parent becomes available. Anything left over is caught in a
 * cycle and is reported rather than silently dropped.
 */
export function ordonnerPourCreation(
  structures: readonly StructureImportee[],
  codesExistants: readonly string[],
): { ordonnees: StructureImportee[]; cycliques: StructureImportee[] } {
  const disponibles = new Set(codesExistants.map((code) => code.toLowerCase()));
  const restantes = [...structures];
  const ordonnees: StructureImportee[] = [];

  let progresse = true;

  while (progresse && restantes.length > 0) {
    progresse = false;

    for (let index = restantes.length - 1; index >= 0; index -= 1) {
      const structure = restantes[index];
      const parent = structure.codeParent?.toLowerCase();

      if (parent === undefined || parent === null || disponibles.has(parent)) {
        ordonnees.push(structure);
        disponibles.add(structure.code.toLowerCase());
        restantes.splice(index, 1);
        progresse = true;
      }
    }
  }

  return { ordonnees, cycliques: restantes };
}
