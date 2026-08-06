import { z } from 'zod';

export const PERIODICITES = [
  'MENSUELLE',
  'TRIMESTRIELLE',
  'SEMESTRIELLE',
  'ANNUELLE',
  'PLURIANNUELLE',
  'PONCTUELLE',
] as const;

export const LIBELLE_PERIODICITE: Record<(typeof PERIODICITES)[number], string> = {
  MENSUELLE: 'Mensuelle',
  TRIMESTRIELLE: 'Trimestrielle',
  SEMESTRIELLE: 'Semestrielle',
  ANNUELLE: 'Annuelle',
  PLURIANNUELLE: 'Pluriannuelle',
  PONCTUELLE: 'Ponctuelle',
};

export const TYPES_DELAI = ['CALENDAIRES', 'OUVRES'] as const;

export const LIBELLE_TYPE_DELAI: Record<(typeof TYPES_DELAI)[number], string> = {
  CALENDAIRES: 'Jours calendaires',
  OUVRES: 'Jours ouvrés',
};

/** Empty text and empty <select> both arrive as "". */
const texteOptionnel = z
  .string()
  .trim()
  .transform((valeur) => (valeur === '' ? null : valeur))
  .nullable();

/** Numeric field left empty means "not applicable", not zero. */
const entierOptionnel = z
  .string()
  .trim()
  .transform((valeur) => (valeur === '' ? null : Number(valeur)))
  .nullable()
  .refine(
    (valeur) => valeur === null || Number.isFinite(valeur),
    'Saisissez un nombre entier.',
  );

const planification = {
  periodicite: z.enum(PERIODICITES),
  nombreAnneesPeriodicite: entierOptionnel,
  delaiJours: z
    .string()
    .trim()
    .min(1, 'Le délai de mise à disposition est obligatoire.')
    .transform((valeur) => Number(valeur))
    .refine(
      (valeur) => Number.isFinite(valeur),
      'Le délai doit être un nombre de jours.',
    ),
  delaiType: z.enum(TYPES_DELAI),
  reportSiWeekendOuFerie: z.coerce.boolean(),
};

export const publicationSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(3, 'Le nom doit contenir au moins 3 caractères.')
    .max(250, 'Le nom ne peut pas dépasser 250 caractères.'),
  description: z
    .string()
    .trim()
    .max(2000, 'La description ne peut pas dépasser 2000 caractères.')
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable(),
  structureId: z.string().trim().min(1, 'La structure est obligatoire.'),
  domaineId: z.string().trim().min(1, 'Le domaine est obligatoire.'),
  ...planification,
});

export type DonneesPublication = z.infer<typeof publicationSchema>;

/**
 * Indicator form.
 *
 * The scheduling fields are lenient here on purpose. When the indicator is
 * attached to a publication the interface shows them disabled, and a disabled
 * field is never submitted by the browser — so requiring them would reject a
 * perfectly valid form. The action fills them from the publication and only
 * enforces them for an autonomous indicator, which is also what protects
 * against a crafted request carrying different values.
 */
export const indicateurSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(3, 'Le nom doit contenir au moins 3 caractères.')
    .max(250, 'Le nom ne peut pas dépasser 250 caractères.'),
  description: z
    .string()
    .trim()
    .max(2000, 'La description ne peut pas dépasser 2000 caractères.')
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable(),
  structureId: z.string().trim().min(1, 'La structure est obligatoire.'),
  /** Empty means the indicator is autonomous and carries its own schedule. */
  publicationId: texteOptionnel,
  domaineId: z.string().trim(),
  unite: texteOptionnel,
  sourceDonnees: texteOptionnel,
  periodicite: z.enum(PERIODICITES).nullable().catch(null),
  nombreAnneesPeriodicite: entierOptionnel,
  delaiJours: z
    .string()
    .trim()
    .transform((valeur) => (valeur === '' ? null : Number(valeur)))
    .nullable()
    .refine(
      (valeur) => valeur === null || Number.isFinite(valeur),
      'Le délai doit être un nombre de jours.',
    ),
  delaiType: z.enum(TYPES_DELAI).nullable().catch(null),
  reportSiWeekendOuFerie: z.coerce.boolean(),
});

/** Fields an autonomous indicator must carry itself. */
export const CHAMPS_OBLIGATOIRES_AUTONOME = {
  domaineId: 'Le domaine est obligatoire.',
  periodicite: 'La périodicité est obligatoire.',
  delaiJours: 'Le délai de mise à disposition est obligatoire.',
  delaiType: 'Le type de délai est obligatoire.',
} as const;

export type DonneesIndicateur = z.infer<typeof indicateurSchema>;
