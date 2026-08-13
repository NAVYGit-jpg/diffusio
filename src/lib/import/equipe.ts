import {
  type ColonneAttendue,
  type ErreurLigne,
  analyserGrille,
  detecterDoublons,
} from './analyse';
import { membreEquipeSchema } from '@/lib/equipe/schemas';

/**
 * Team import from a spreadsheet (cahier des charges §9.3).
 *
 * Three columns only — name, function, e-mail — because that is exactly what
 * §7 needs to address somebody. Header labels are matched loosely, as in the
 * other importers: people write "Email", "E-mail" or "Adresse e-mail".
 */

export const COLONNES_EQUIPE: ColonneAttendue[] = [
  { cle: 'nom', entetes: ['Nom', 'Nom et prénoms', 'Nom complet'], obligatoire: true },
  { cle: 'fonction', entetes: ['Fonction', 'Poste', 'Qualité'], obligatoire: true },
  {
    cle: 'email',
    entetes: ['Adresse e-mail', 'Email', 'E-mail', 'Courriel'],
    obligatoire: true,
  },
];

export type MembreImporte = {
  ligne: number;
  nom: string;
  fonction: string;
  email: string;
};

export type RapportImportEquipe = {
  aCreer: MembreImporte[];
  /** Rows whose address is already in the team; they are skipped, not refused. */
  dejaPresents: MembreImporte[];
  erreurs: ErreurLigne[];
  colonnesManquantes: string[];
  lignesIgnorees: number;
};

const LIBELLES_CHAMPS: Record<string, string> = {
  nom: 'Nom',
  fonction: 'Fonction',
  email: 'Adresse e-mail',
};

export function analyserImportEquipe(
  grille: readonly (readonly unknown[])[],
  contexte: { emailsExistants: readonly string[] },
): RapportImportEquipe {
  const dejaEnBase = new Set(
    contexte.emailsExistants.map((email) => email.trim().toLowerCase()),
  );

  const analyse = analyserGrille<MembreImporte>(
    grille,
    COLONNES_EQUIPE,
    (valeurs, ligne) => {
      const controle = membreEquipeSchema.safeParse({
        nom: valeurs.nom,
        fonction: valeurs.fonction,
        email: valeurs.email,
      });

      if (!controle.success) {
        return {
          ok: false,
          erreurs: controle.error.issues.map((probleme) => {
            const champ = String(probleme.path[0] ?? '');

            return {
              colonne: LIBELLES_CHAMPS[champ] ?? champ,
              message: probleme.message,
            };
          }),
        };
      }

      return { ok: true, valeur: { ligne, ...controle.data } };
    },
  );

  if (analyse.colonnesManquantes.length > 0) {
    return {
      aCreer: [],
      dejaPresents: [],
      erreurs: [],
      colonnesManquantes: analyse.colonnesManquantes,
      lignesIgnorees: analyse.lignesIgnorees,
    };
  }

  const erreurs = [
    ...analyse.erreurs,
    ...detecterDoublons(
      analyse.valides,
      (membre) => membre.email,
      (membre) => membre.ligne,
      'Adresse e-mail',
    ),
  ];

  // An address already on the team is not a mistake: somebody re-importing a
  // corrected file should not be told off for the rows that were already right.
  const aCreer: MembreImporte[] = [];
  const dejaPresents: MembreImporte[] = [];
  const enErreur = new Set(erreurs.map((erreur) => erreur.ligne));

  for (const membre of analyse.valides) {
    if (enErreur.has(membre.ligne)) {
      continue;
    }

    if (dejaEnBase.has(membre.email)) {
      dejaPresents.push(membre);
    } else {
      aCreer.push(membre);
    }
  }

  return {
    aCreer,
    dejaPresents,
    erreurs: erreurs.sort((a, b) => a.ligne - b.ligne),
    colonnesManquantes: [],
    lignesIgnorees: analyse.lignesIgnorees,
  };
}
