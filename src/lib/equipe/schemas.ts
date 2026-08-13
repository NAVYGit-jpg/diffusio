import { z } from 'zod';

/**
 * Team members informed when a publication goes online (cahier des charges §7).
 *
 * The team is a **list of recipients**, not a list of accounts: these people
 * receive the release e-mail, they never sign in. Keeping them out of
 * `Utilisateur` avoids creating dormant accounts — and avoids the question of
 * what a director of cabinet would be allowed to do inside the application.
 */

const texteNettoye = z
  .string()
  .trim()
  .transform((valeur) => valeur.replace(/\s+/g, ' '));

export const membreEquipeSchema = z.object({
  nom: texteNettoye
    .pipe(
      z
        .string()
        .min(2, 'Le nom doit comporter au moins 2 caractères.')
        .max(120, 'Le nom ne peut pas dépasser 120 caractères.'),
    ),
  fonction: texteNettoye.pipe(
    z
      .string()
      .min(2, 'Indiquez la fonction du membre.')
      .max(150, 'La fonction ne peut pas dépasser 150 caractères.'),
  ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z.email({
        message: "Cette adresse e-mail n'est pas valide.",
      }),
    ),
});

export type MembreEquipeSaisi = z.infer<typeof membreEquipeSchema>;

/**
 * Scope a team belongs to.
 *
 * `null` is the organisation-wide team, kept by the super administrator: its
 * members are informed of every release, whichever structure published it.
 */
export type PorteeEquipe = string | null;

export function libellePortee(
  portee: PorteeEquipe,
  nomStructure?: string | null,
): string {
  return portee === null
    ? "Équipe de l'organisation"
    : (nomStructure ?? 'Équipe de la structure');
}
