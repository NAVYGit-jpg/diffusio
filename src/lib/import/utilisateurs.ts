import {
  type ColonneAttendue,
  type ErreurLigne,
  analyserGrille,
  detecterDoublons,
} from './analyse';
import { PLAFOND_SUPER_ADMIN, validerCoherenceRole } from '@/lib/utilisateurs/regles';
import { utilisateurSchema } from '@/lib/utilisateurs/schemas';

/**
 * User import (cahier des charges §9.3).
 *
 * Structures are designated by their **code**, both for the point focal's own
 * structure and for the list an administrator supervises. Several codes are
 * separated by a semicolon or a comma, whichever the person used.
 */

export const COLONNES_UTILISATEURS: ColonneAttendue[] = [
  { cle: 'prenoms', entetes: ['Prénoms', 'Prénom'], obligatoire: true },
  { cle: 'nom', entetes: ['Nom'], obligatoire: true },
  { cle: 'email', entetes: ['Adresse e-mail', 'Email', 'E-mail'], obligatoire: true },
  { cle: 'role', entetes: ['Profil', 'Rôle'], obligatoire: true },
  {
    cle: 'codeStructure',
    entetes: ['Code structure', 'Structure'],
    obligatoire: false,
  },
  {
    cle: 'emailSuperieur',
    entetes: ['E-mail du supérieur', 'Email supérieur', 'Supérieur'],
    obligatoire: false,
  },
  {
    cle: 'codesStructuresSupervisees',
    entetes: ['Structures supervisées', 'Codes supervisés'],
    obligatoire: false,
  },
  { cle: 'titulaire', entetes: ['Titulaire'], obligatoire: false },
  { cle: 'telephone', entetes: ['Téléphone'], obligatoire: false },
  { cle: 'fonction', entetes: ['Fonction'], obligatoire: false },
];

export type UtilisateurImporte = {
  ligne: number;
  prenoms: string;
  nom: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'POINT_FOCAL';
  codeStructure: string | null;
  emailSuperieur: string | null;
  codesStructuresSupervisees: string[];
  estTitulaire: boolean;
  telephone: string | null;
  fonction: string | null;
};

export type RapportImportUtilisateurs = {
  aCreer: UtilisateurImporte[];
  erreurs: ErreurLigne[];
  colonnesManquantes: string[];
  lignesIgnorees: number;
  /** E-mails already registered; those rows are skipped. */
  dejaExistants: string[];
};

function sansAccents(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/** Accepts the enum values as well as the French labels shown in the interface. */
export function normaliserRole(
  valeur: string,
): UtilisateurImporte['role'] | null {
  const brut = sansAccents(valeur).replace(/[\s-]+/g, '_');

  const equivalences: Record<string, UtilisateurImporte['role']> = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    SUPER_ADMINISTRATEUR: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    ADMINISTRATEUR: 'ADMIN',
    POINT_FOCAL: 'POINT_FOCAL',
    POINTFOCAL: 'POINT_FOCAL',
  };

  return equivalences[brut] ?? null;
}

/** "oui", "x", "1", "vrai"… all mean yes; empty means no. */
export function estVrai(valeur: string): boolean {
  const brut = sansAccents(valeur);

  return ['OUI', 'X', '1', 'VRAI', 'TRUE', 'Y', 'YES'].includes(brut);
}

/** Splits a multi-code cell on semicolons or commas. */
export function decouperCodes(valeur: string): string[] {
  return valeur
    .split(/[;,]/)
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code !== '');
}

export function analyserImportUtilisateurs(
  grille: readonly (readonly unknown[])[],
  contexte: {
    emailsExistants: readonly string[];
    codesStructures: readonly string[];
    superAdminsActifs: number;
  },
): RapportImportUtilisateurs {
  const emailsPris = new Set(
    contexte.emailsExistants.map((email) => email.toLowerCase()),
  );
  const structures = new Set(
    contexte.codesStructures.map((code) => code.toUpperCase()),
  );

  const analyse = analyserGrille<UtilisateurImporte>(
    grille,
    COLONNES_UTILISATEURS,
    (valeurs, ligne) => {
      const erreurs: Omit<ErreurLigne, 'ligne'>[] = [];
      const role = normaliserRole(valeurs.role);

      if (role === null) {
        erreurs.push({
          colonne: 'Profil',
          message: `Profil inconnu : « ${valeurs.role} ». Valeurs acceptées : Super administrateur, Administrateur, Point focal.`,
        });
      }

      const codeStructure =
        valeurs.codeStructure.trim() === ''
          ? null
          : valeurs.codeStructure.trim().toUpperCase();
      const supervisees = decouperCodes(valeurs.codesStructuresSupervisees);

      const controle = utilisateurSchema.safeParse({
        nom: valeurs.nom,
        prenoms: valeurs.prenoms,
        email: valeurs.email,
        telephone: valeurs.telephone,
        fonction: valeurs.fonction,
        role: role ?? 'POINT_FOCAL',
        structureId: codeStructure ?? '',
        emailSuperieur: valeurs.emailSuperieur,
        estTitulaire: estVrai(valeurs.titulaire),
        structuresAdmin: supervisees,
      });

      if (!controle.success) {
        const libelles: Record<string, string> = {
          nom: 'Nom',
          prenoms: 'Prénoms',
          email: 'Adresse e-mail',
          emailSuperieur: 'E-mail du supérieur',
        };

        for (const probleme of controle.error.issues) {
          const champ = String(probleme.path[0] ?? '');
          erreurs.push({
            colonne: libelles[champ] ?? champ,
            message: probleme.message,
          });
        }
      }

      // Unknown structure codes, reported before the role coherence rules so
      // the message points at the actual mistake.
      if (codeStructure !== null && !structures.has(codeStructure)) {
        erreurs.push({
          colonne: 'Code structure',
          message: `Aucune structure ne porte le code « ${codeStructure} ».`,
        });
      }

      for (const code of supervisees) {
        if (!structures.has(code)) {
          erreurs.push({
            colonne: 'Structures supervisées',
            message: `Aucune structure ne porte le code « ${code} ».`,
          });
        }
      }

      if (role !== null && erreurs.length === 0) {
        for (const regle of validerCoherenceRole({
          role,
          structureId: codeStructure,
          emailSuperieur: controle.success
            ? controle.data.emailSuperieur
            : (valeurs.emailSuperieur || null),
          structuresAdmin: supervisees,
          estTitulaire: estVrai(valeurs.titulaire),
        })) {
          const libelles: Record<string, string> = {
            structureId: 'Code structure',
            emailSuperieur: 'E-mail du supérieur',
            structuresAdmin: 'Structures supervisées',
            estTitulaire: 'Titulaire',
          };

          erreurs.push({
            colonne: libelles[regle.champ] ?? regle.champ,
            message: regle.message,
          });
        }
      }

      if (erreurs.length > 0) {
        return { ok: false, erreurs };
      }

      return {
        ok: true,
        valeur: {
          ligne,
          prenoms: controle.data!.prenoms,
          nom: controle.data!.nom,
          email: controle.data!.email,
          role: role!,
          codeStructure,
          emailSuperieur: controle.data!.emailSuperieur,
          codesStructuresSupervisees: supervisees,
          estTitulaire: estVrai(valeurs.titulaire),
          telephone: controle.data!.telephone,
          fonction: controle.data!.fonction,
        },
      };
    },
  );

  if (analyse.colonnesManquantes.length > 0) {
    return {
      aCreer: [],
      erreurs: [],
      colonnesManquantes: analyse.colonnesManquantes,
      lignesIgnorees: analyse.lignesIgnorees,
      dejaExistants: [],
    };
  }

  const erreurs = [
    ...analyse.erreurs,
    ...detecterDoublons(
      analyse.valides,
      (utilisateur) => utilisateur.email,
      (utilisateur) => utilisateur.ligne,
      'Adresse e-mail',
    ),
  ];

  const dejaExistants: string[] = [];
  const aCreer: UtilisateurImporte[] = [];

  for (const utilisateur of analyse.valides) {
    if (emailsPris.has(utilisateur.email.toLowerCase())) {
      dejaExistants.push(utilisateur.email);
    } else {
      aCreer.push(utilisateur);
    }
  }

  // §2.1 — the ceiling applies to the import as a whole, not row by row.
  const superAdminsImportes = aCreer.filter(
    (utilisateur) => utilisateur.role === 'SUPER_ADMIN',
  );
  const total = contexte.superAdminsActifs + superAdminsImportes.length;

  if (total > PLAFOND_SUPER_ADMIN) {
    const enTrop = total - PLAFOND_SUPER_ADMIN;

    for (const utilisateur of superAdminsImportes.slice(-enTrop)) {
      erreurs.push({
        ligne: utilisateur.ligne,
        colonne: 'Profil',
        message: `Plafond de ${PLAFOND_SUPER_ADMIN} super administrateurs dépassé : ${contexte.superAdminsActifs} déjà actif(s), ${superAdminsImportes.length} dans ce fichier.`,
      });
    }
  }

  return {
    aCreer,
    erreurs: erreurs.sort((a, b) => a.ligne - b.ligne),
    colonnesManquantes: [],
    lignesIgnorees: analyse.lignesIgnorees,
    dejaExistants,
  };
}
