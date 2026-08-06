import type { Role } from '@prisma/client';

/**
 * Server-side permission matrix (cahier des charges §2.3).
 *
 * Every mutating request must go through `assertPermission`. Hiding a button in
 * the UI is never a permission check — the specification is explicit about this.
 *
 * The module is deliberately free of any database or framework dependency so it
 * can be exhaustively unit-tested, which the specification requires (rule 6).
 */

/** The subset of the session we need to take a decision. */
export type ActeurSession = {
  id: string;
  role: Role;
  /** Set for POINT_FOCAL only. */
  structureId: string | null;
  /** Structures supervised by an ADMIN. Empty for the other roles. */
  structuresAdmin: string[];
};

export type Action =
  // Administration centrale — SUPER_ADMIN uniquement
  | 'structure:gerer'
  | 'pointFocal:gerer'
  | 'admin:gerer'
  | 'superAdmin:gerer'
  | 'apparence:gerer'
  | 'referentiel:gerer'
  | 'organisation:gerer'
  // Périmètre partagé
  | 'structure:lire'
  | 'catalogue:lire'
  | 'catalogue:ecrire'
  | 'calendrier:generer'
  | 'calendrier:valider'
  | 'calendrier:modifierValide'
  | 'calendrier:publierEnLigne'
  | 'livrable:televerser'
  | 'miseEnLigne:confirmer'
  | 'alerte:envoyer'
  | 'messagerie:utiliser'
  | 'tableauDeBord:lire'
  | 'audit:lire';

const TOUS: readonly Role[] = ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'];
const ENCADREMENT: readonly Role[] = ['SUPER_ADMIN', 'ADMIN'];
const CENTRAL: readonly Role[] = ['SUPER_ADMIN'];

/**
 * Which roles may perform each action, before any scope check.
 *
 * Transcribed line by line from the table in §2.3 of the specification.
 */
const MATRICE: Record<Action, readonly Role[]> = {
  'structure:gerer': CENTRAL,
  'pointFocal:gerer': CENTRAL,
  'admin:gerer': CENTRAL,
  'superAdmin:gerer': CENTRAL,
  'apparence:gerer': CENTRAL,
  'referentiel:gerer': CENTRAL,
  'organisation:gerer': CENTRAL,

  'structure:lire': TOUS,
  'catalogue:lire': TOUS,
  'catalogue:ecrire': TOUS,
  'calendrier:generer': TOUS,
  'calendrier:valider': ENCADREMENT,
  'calendrier:modifierValide': ENCADREMENT,
  'calendrier:publierEnLigne': ENCADREMENT,
  'livrable:televerser': TOUS,
  'miseEnLigne:confirmer': ENCADREMENT,
  'alerte:envoyer': ENCADREMENT,
  'messagerie:utiliser': TOUS,
  'tableauDeBord:lire': TOUS,
  'audit:lire': ENCADREMENT,
};

/** Raised when a request is refused. Carries no technical detail (§9.5). */
export class PermissionRefusee extends Error {
  readonly action: Action;
  readonly structureId?: string;

  constructor(action: Action, structureId?: string) {
    super("Vous n'avez pas les droits nécessaires pour effectuer cette action.");
    this.name = 'PermissionRefusee';
    this.action = action;
    this.structureId = structureId;
  }
}

/**
 * Is `structureId` inside the acteur's perimeter?
 *
 * SUPER_ADMIN sees everything, ADMIN only the structures assigned to them,
 * POINT_FOCAL only their own.
 */
export function canAccessStructure(
  acteur: ActeurSession,
  structureId: string,
): boolean {
  if (!structureId) {
    return false;
  }

  switch (acteur.role) {
    case 'SUPER_ADMIN':
      return true;
    case 'ADMIN':
      return acteur.structuresAdmin.includes(structureId);
    case 'POINT_FOCAL':
      return acteur.structureId === structureId;
    default:
      return false;
  }
}

/** Role check only, ignoring scope. Use `assertPermission` for the full check. */
export function peutRealiser(acteur: ActeurSession, action: Action): boolean {
  return MATRICE[action].includes(acteur.role);
}

/**
 * Full check: role first, then perimeter when the action targets a structure.
 *
 * Throws rather than returning false so a forgotten check fails loudly instead
 * of silently letting the request through.
 */
export function assertPermission(
  acteur: ActeurSession,
  action: Action,
  structureId?: string,
): void {
  if (!peutRealiser(acteur, action)) {
    throw new PermissionRefusee(action, structureId);
  }

  if (structureId !== undefined && !canAccessStructure(acteur, structureId)) {
    throw new PermissionRefusee(action, structureId);
  }
}

/**
 * Structures the acteur may read.
 *
 * `null` means "no restriction" and must be translated into an absent WHERE
 * clause by the caller — never into an empty list, which would hide everything.
 */
export function perimetreStructures(acteur: ActeurSession): string[] | null {
  switch (acteur.role) {
    case 'SUPER_ADMIN':
      return null;
    case 'ADMIN':
      return acteur.structuresAdmin;
    case 'POINT_FOCAL':
      return acteur.structureId ? [acteur.structureId] : [];
    default:
      return [];
  }
}
