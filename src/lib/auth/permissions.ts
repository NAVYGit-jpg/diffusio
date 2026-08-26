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
  /**
   * Créer un compte, par le formulaire ou par import.
   *
   * Distincte de « pointFocal:gerer », qui ouvre la gestion des comptes déjà
   * existants. Un administrateur suit et corrige ses points focaux ; ouvrir un
   * accès à l'application engage l'organisation, et cela reste au centre.
   */
  | 'utilisateur:creer'
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
  'pointFocal:gerer': ENCADREMENT,
  'admin:gerer': CENTRAL,
  'utilisateur:creer': CENTRAL,
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

/**
 * Accounts an acteur may see and modify on the « Utilisateurs » screen.
 *
 * A super administrator manages the whole organisation. An administrator only
 * manages **the points focaux of the structures they supervise** — not their
 * peers, not the super administrator, and nobody outside their perimeter.
 *
 * Written as a pure function rather than inline conditions because the same
 * rule has to hold in four places at once: the list the screen renders, the
 * creation, the edit, and the activation toggle. Four copies of a rule are
 * four chances for one of them to drift and open a door.
 */
export function peutGererCeCompte(
  acteur: ActeurSession,
  cible: { role: Role; structureId: string | null },
): boolean {
  if (acteur.role === 'SUPER_ADMIN') {
    return true;
  }

  if (acteur.role !== 'ADMIN') {
    return false;
  }

  // Un administrateur ne touche qu'a des points focaux : lui laisser modifier
  // un pair, ou le super administrateur, reviendrait a lui donner les moyens de
  // s elever lui-meme.
  if (cible.role !== 'POINT_FOCAL') {
    return false;
  }

  return (
    cible.structureId !== null &&
    acteur.structuresAdmin.includes(cible.structureId)
  );
}

/**
 * Roles an acteur may hand out.
 *
 * The screen builds its dropdown from this, and the server action checks the
 * submitted value against it — a list narrowed only in the browser is not a
 * restriction.
 */
export function rolesAttribuables(acteur: ActeurSession): Role[] {
  if (acteur.role === 'SUPER_ADMIN') {
    return ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'];
  }

  return acteur.role === 'ADMIN' ? ['POINT_FOCAL'] : [];
}
