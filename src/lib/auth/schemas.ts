import { z } from 'zod';

/**
 * Input validation shared by client and server (cahier des charges §13).
 * All messages are end-user facing, therefore in French.
 */

export const identifiantsSchema = z.object({
  email: z
    .string({ message: "L'adresse e-mail est obligatoire." })
    .trim()
    .min(1, "L'adresse e-mail est obligatoire.")
    .email("Cette adresse e-mail n'est pas valide."),
  motDePasse: z
    .string({ message: 'Le mot de passe est obligatoire.' })
    .min(1, 'Le mot de passe est obligatoire.'),
});

export type Identifiants = z.infer<typeof identifiantsSchema>;

/** Password policy applied everywhere a password is chosen. */
export const motDePasseSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères.')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule.')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule.')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.');

export const premiereConnexionSchema = z
  .object({
    nom: z
      .string()
      .trim()
      .min(2, 'Le nom doit contenir au moins 2 caractères.')
      .max(100, 'Le nom ne peut pas dépasser 100 caractères.'),
    prenoms: z
      .string()
      .trim()
      .min(2, 'Le prénom doit contenir au moins 2 caractères.')
      .max(100, 'Le prénom ne peut pas dépasser 100 caractères.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Cette adresse e-mail n'est pas valide."),
    motDePasseActuel: z.string().min(1, 'Le mot de passe actuel est obligatoire.'),
    nouveauMotDePasse: motDePasseSchema,
    confirmation: z.string(),
  })
  .refine((data) => data.nouveauMotDePasse === data.confirmation, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmation'],
  })
  .refine((data) => data.nouveauMotDePasse !== data.motDePasseActuel, {
    message: "Le nouveau mot de passe doit être différent de l'ancien.",
    path: ['nouveauMotDePasse'],
  });

export type PremiereConnexion = z.infer<typeof premiereConnexionSchema>;
