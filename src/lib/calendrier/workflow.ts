import type { Role, StatutCalendrier } from '@prisma/client';

/**
 * Calendar validation workflow (cahier des charges §5.6).
 *
 *   BROUILLON ──soumettre──▶ SOUMIS ──valider──▶ VALIDE
 *       ▲                      │                   │
 *       └───renvoyer───────────┘                   │
 *       └───debloquer──────────────────────────────┘
 *
 * A validated calendar is locked for its point focal: only an administrator can
 * unlock it, and the point focal has to ask for it. That asymmetry is the whole
 * point of the workflow, so it lives in a module of its own with no database
 * dependency.
 */

export type Transition =
  | 'soumettre'
  | 'valider'
  | 'renvoyerPourCorrection'
  | 'debloquer'
  | 'demanderDeblocage';

type Regle = {
  depuis: StatutCalendrier[];
  roles: Role[];
  vers: StatutCalendrier | null;
};

const REGLES: Record<Transition, Regle> = {
  // A point focal submits their own calendar; an administrator may do it too,
  // since they can already edit the content.
  soumettre: {
    depuis: ['BROUILLON'],
    roles: ['POINT_FOCAL', 'ADMIN', 'SUPER_ADMIN'],
    vers: 'SOUMIS',
  },
  valider: {
    depuis: ['SOUMIS'],
    roles: ['ADMIN', 'SUPER_ADMIN'],
    vers: 'VALIDE',
  },
  renvoyerPourCorrection: {
    depuis: ['SOUMIS'],
    roles: ['ADMIN', 'SUPER_ADMIN'],
    vers: 'BROUILLON',
  },
  debloquer: {
    depuis: ['VALIDE'],
    roles: ['ADMIN', 'SUPER_ADMIN'],
    vers: 'BROUILLON',
  },
  // Does not change the status: it raises a flag the administrator will see.
  demanderDeblocage: {
    depuis: ['VALIDE'],
    roles: ['POINT_FOCAL'],
    vers: null,
  },
};

export function transitionAutorisee(
  transition: Transition,
  statut: StatutCalendrier,
  role: Role,
): boolean {
  const regle = REGLES[transition];

  return regle.depuis.includes(statut) && regle.roles.includes(role);
}

export function statutApres(
  transition: Transition,
  statut: StatutCalendrier,
): StatutCalendrier {
  return REGLES[transition].vers ?? statut;
}

/** Transitions offered to this role in this state. */
export function transitionsPossibles(
  statut: StatutCalendrier,
  role: Role,
): Transition[] {
  return (Object.keys(REGLES) as Transition[]).filter((transition) =>
    transitionAutorisee(transition, statut, role),
  );
}

/**
 * May the calendar's lines still be edited?
 *
 * A point focal loses that right as soon as the calendar is submitted:
 * changing the content under the reviewer's eyes would make the review
 * meaningless.
 */
export function peutModifierLignes(
  statut: StatutCalendrier,
  role: Role,
): boolean {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return true;
  }

  return statut === 'BROUILLON';
}

/** Plain-language explanation shown next to a disabled action. */
export function raisonVerrouillage(
  statut: StatutCalendrier,
  role: Role,
): string | null {
  if (peutModifierLignes(statut, role)) {
    return null;
  }

  if (statut === 'SOUMIS') {
    return 'Ce calendrier est en cours de validation : il ne peut plus être modifié tant que votre administrateur ne l’a pas examiné.';
  }

  return 'Ce calendrier est validé. Demandez une autorisation de modification à votre administrateur pour le rouvrir.';
}

export const LIBELLE_STATUT_CALENDRIER: Record<StatutCalendrier, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis pour validation',
  VALIDE: 'Validé',
};
