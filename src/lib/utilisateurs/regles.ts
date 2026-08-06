import type { Role } from '@prisma/client';

/**
 * User business rules (cahier des charges §4.3).
 *
 * The specification asks for these to be enforced "par le code **et** par la
 * base". This module is the code half — pure, framework-free, exhaustively
 * testable. The database half lives in the migration as SQL constraints.
 */

/** §2.1 — hard ceiling on active super administrators, per organisation. */
export const PLAFOND_SUPER_ADMIN = 5;

export type ErreurRegle = {
  champ: string;
  message: string;
};

export type CandidatUtilisateur = {
  role: Role;
  /** Structure the user belongs to. Only meaningful for POINT_FOCAL. */
  structureId: string | null;
  /** Supervisor address. Mandatory for POINT_FOCAL (§4.3). */
  emailSuperieur: string | null;
  /** Structures supervised by an ADMIN. */
  structuresAdmin: string[];
  estTitulaire: boolean;
};

/**
 * Checks the shape of a user against their role.
 *
 * Returns every problem at once rather than the first one: making the user fix
 * one error per submission is needless friction.
 */
export function validerCoherenceRole(
  candidat: CandidatUtilisateur,
): ErreurRegle[] {
  const erreurs: ErreurRegle[] = [];

  if (candidat.role === 'POINT_FOCAL') {
    if (!candidat.structureId) {
      erreurs.push({
        champ: 'structureId',
        message: 'Un point focal doit être rattaché à une structure.',
      });
    }

    if (!candidat.emailSuperieur) {
      erreurs.push({
        champ: 'emailSuperieur',
        message:
          "L'adresse e-mail du supérieur est obligatoire. Si le point focal est son propre supérieur, indiquez sa propre adresse.",
      });
    }

    if (candidat.structuresAdmin.length > 0) {
      erreurs.push({
        champ: 'structuresAdmin',
        message: "Un point focal ne supervise pas de structures.",
      });
    }
  } else {
    // SUPER_ADMIN and ADMIN sit at central level and never belong to a
    // structure — otherwise their perimeter would be ambiguous.
    if (candidat.structureId) {
      erreurs.push({
        champ: 'structureId',
        message:
          "Un administrateur n'est rattaché à aucune structure : il intervient au niveau central.",
      });
    }

    if (candidat.estTitulaire) {
      erreurs.push({
        champ: 'estTitulaire',
        message: 'Seul un point focal peut être titulaire.',
      });
    }
  }

  if (candidat.role === 'ADMIN' && candidat.structuresAdmin.length === 0) {
    erreurs.push({
      champ: 'structuresAdmin',
      message:
        'Affectez au moins une structure à cet administrateur, sinon il ne verra aucune donnée.',
    });
  }

  if (candidat.role === 'SUPER_ADMIN' && candidat.structuresAdmin.length > 0) {
    erreurs.push({
      champ: 'structuresAdmin',
      message:
        "Un super administrateur voit déjà toutes les structures : aucune affectation n'est nécessaire.",
    });
  }

  return erreurs;
}

/**
 * Is there room for one more active super admin?
 *
 * `idModifie` excludes the account being edited from the count, so saving an
 * existing super admin never trips the ceiling.
 */
export function peutAjouterSuperAdmin(
  superAdminsActifs: readonly string[],
  idModifie: string | null = null,
): boolean {
  const autres = superAdminsActifs.filter((id) => id !== idModifie);

  return autres.length < PLAFOND_SUPER_ADMIN;
}

/** Human-readable counter for the interface: "3 / 5 utilisés" (§9.3). */
export function libelleQuotaSuperAdmin(nombreActifs: number): string {
  return `${nombreActifs} / ${PLAFOND_SUPER_ADMIN} utilisés`;
}

/**
 * Deactivating the last active super admin would lock everybody out of the
 * administration screens, with no way back in.
 */
export function estLeDernierSuperAdmin(
  superAdminsActifs: readonly string[],
  id: string,
): boolean {
  return superAdminsActifs.length === 1 && superAdminsActifs[0] === id;
}

/**
 * A structure has one titular point focal and any number of deputies
 * (DEC-107). Promoting a new titular demotes the previous one, so the caller
 * needs to know who that is.
 */
export function titulaireADemettre(
  pointsFocauxDeLaStructure: readonly { id: string; estTitulaire: boolean }[],
  candidatId: string | null,
  candidatEstTitulaire: boolean,
): string | null {
  if (!candidatEstTitulaire) {
    return null;
  }

  const titulaireActuel = pointsFocauxDeLaStructure.find(
    (pointFocal) => pointFocal.estTitulaire && pointFocal.id !== candidatId,
  );

  return titulaireActuel?.id ?? null;
}
