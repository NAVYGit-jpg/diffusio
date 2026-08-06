import { z } from 'zod';

export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'] as const;

export const LIBELLE_ROLE: Record<(typeof ROLES)[number], string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  POINT_FOCAL: 'Point focal',
};

/** Empty <select> and optional text fields both arrive as "". */
const texteOptionnel = z
  .string()
  .trim()
  .transform((valeur) => (valeur === '' ? null : valeur))
  .nullable();

export const utilisateurSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères.'),
  prenoms: z
    .string()
    .trim()
    .min(2, 'Les prénoms doivent contenir au moins 2 caractères.')
    .max(100, 'Les prénoms ne peuvent pas dépasser 100 caractères.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Cette adresse e-mail n'est pas valide."),
  telephone: texteOptionnel,
  fonction: texteOptionnel,
  role: z.enum(ROLES),
  structureId: texteOptionnel,
  emailSuperieur: z
    .string()
    .trim()
    .toLowerCase()
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable()
    .refine(
      (valeur) => valeur === null || z.string().email().safeParse(valeur).success,
      "L'adresse e-mail du supérieur n'est pas valide.",
    ),
  estTitulaire: z.coerce.boolean(),
  structuresAdmin: z.array(z.string()).default([]),
});

export type DonneesUtilisateur = z.infer<typeof utilisateurSchema>;

/** Password chosen by an invited user from their invitation link. */
export const definirMotDePasseSchema = z
  .object({
    jeton: z.string().min(1),
    motDePasse: z
      .string()
      .min(12, 'Le mot de passe doit contenir au moins 12 caractères.')
      .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule.')
      .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule.')
      .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.'),
    confirmation: z.string(),
  })
  .refine((data) => data.motDePasse === data.confirmation, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmation'],
  });
