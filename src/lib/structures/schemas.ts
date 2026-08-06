import { z } from 'zod';

/** Structure types listed in §4.2. The list is deliberately open-ended. */
export const TYPES_STRUCTURE = [
  'MINISTERE',
  'DIRECTION',
  'SOUS_DIRECTION',
  'SERVICE',
  'AUTRE',
] as const;

export const LIBELLE_TYPE_STRUCTURE: Record<
  (typeof TYPES_STRUCTURE)[number],
  string
> = {
  MINISTERE: 'Ministère',
  DIRECTION: 'Direction',
  SOUS_DIRECTION: 'Sous-direction',
  SERVICE: 'Service',
  AUTRE: 'Autre',
};

export const structureSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(200, 'Le nom ne peut pas dépasser 200 caractères.'),
  sigle: z
    .string()
    .trim()
    .min(1, 'Le sigle est obligatoire.')
    .max(20, 'Le sigle ne peut pas dépasser 20 caractères.'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Le code doit contenir au moins 2 caractères.')
    .max(20, 'Le code ne peut pas dépasser 20 caractères.')
    .regex(
      /^[A-Z0-9_-]+$/,
      'Le code ne peut contenir que des lettres, des chiffres, des tirets et des soulignés.',
    ),
  type: z.enum(TYPES_STRUCTURE),
  // An empty <select> value arrives as "", which means "no parent".
  parentId: z
    .string()
    .trim()
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable(),
  description: z
    .string()
    .trim()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères.')
    .optional()
    .or(z.literal('')),
});

export type DonneesStructure = z.infer<typeof structureSchema>;
