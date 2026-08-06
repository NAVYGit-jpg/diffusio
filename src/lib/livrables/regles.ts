/**
 * Deliverable rules (cahier des charges §6).
 *
 * What may be uploaded, what a line needs before it can be considered ready,
 * and how versions are numbered. No database or storage dependency, so every
 * rule is testable on its own.
 */

export type TypeFichier = 'PDF' | 'EXCEL' | 'AUTRE';

/** Default ceiling; overridable through `UPLOAD_TAILLE_MAX_OCTETS`. */
export const TAILLE_MAX_PAR_DEFAUT = 20 * 1024 * 1024;

const EXTENSIONS_AUTORISEES: Record<string, TypeFichier> = {
  pdf: 'PDF',
  xlsx: 'EXCEL',
  xls: 'EXCEL',
  csv: 'EXCEL',
};

export type ErreurFichier = { champ: string; message: string };

export function extensionDe(nomFichier: string): string {
  const morceaux = nomFichier.toLowerCase().split('.');

  return morceaux.length > 1 ? morceaux[morceaux.length - 1] : '';
}

/** PDF, Excel or spreadsheet; anything else is refused. */
export function typeDeFichier(nomFichier: string): TypeFichier | null {
  return EXTENSIONS_AUTORISEES[extensionDe(nomFichier)] ?? null;
}

export function formaterTaille(octets: number): string {
  if (octets < 1024) {
    return `${octets} o`;
  }
  if (octets < 1024 * 1024) {
    return `${Math.round(octets / 1024)} Ko`;
  }

  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export function validerFichier(
  fichier: { nom: string; taille: number },
  tailleMax = TAILLE_MAX_PAR_DEFAUT,
): ErreurFichier[] {
  const erreurs: ErreurFichier[] = [];

  if (fichier.nom.trim() === '') {
    erreurs.push({ champ: 'fichier', message: 'Choisissez un fichier.' });
    return erreurs;
  }

  if (typeDeFichier(fichier.nom) === null) {
    erreurs.push({
      champ: 'fichier',
      message: `Format non accepté. Les formats autorisés sont : ${Object.keys(
        EXTENSIONS_AUTORISEES,
      )
        .map((extension) => `.${extension}`)
        .join(', ')}.`,
    });
  }

  if (fichier.taille === 0) {
    erreurs.push({ champ: 'fichier', message: 'Ce fichier est vide.' });
  } else if (fichier.taille > tailleMax) {
    erreurs.push({
      champ: 'fichier',
      message: `Ce fichier pèse ${formaterTaille(fichier.taille)}, au-delà de la limite de ${formaterTaille(tailleMax)}.`,
    });
  }

  return erreurs;
}

/**
 * Version number for a new upload of the same type.
 *
 * §6 asks that a new upload creates a new version while the previous one stays
 * readable, so versions are per line **and per type**: replacing the PDF must
 * not renumber the Excel files.
 */
export function prochaineVersion(
  fichiersExistants: readonly { type: TypeFichier; version: number }[],
  type: TypeFichier,
): number {
  const versions = fichiersExistants
    .filter((fichier) => fichier.type === type)
    .map((fichier) => fichier.version);

  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}

/**
 * Storage key of a file.
 *
 * Organisation first so a bucket policy could later isolate tenants; the
 * version is in the name so two versions never collide. The original name is
 * sanitised: it comes from the user and ends up in a URL.
 */
export function cheminStockage(params: {
  organisationId: string;
  ligneCalendrierId: string;
  version: number;
  nomOriginal: string;
}): string {
  const extension = extensionDe(params.nomOriginal) || 'bin';

  const base = params.nomOriginal
    .slice(0, params.nomOriginal.length - extension.length - 1)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);

  const nom = base === '' ? 'fichier' : base;

  return `${params.organisationId}/${params.ligneCalendrierId}/v${params.version}-${nom}.${extension}`;
}

export type IndicateurAffilie = {
  id: string;
  nom: string;
};

export type ValeurSaisie = {
  indicateurId: string;
  valeur: string;
  nonDisponible: boolean;
  commentaire: string;
};

export type EtatCompletude = {
  complet: boolean;
  manquants: string[];
  messages: string[];
};

/**
 * Is a calendar line ready to be handed over?
 *
 * §6 spells out three cases: a publication needs its PDF; an autonomous
 * indicator needs its value; a publication carrying affiliated indicators needs
 * a value — or an explicit "non disponible" with a justification — for **each**
 * of them.
 */
export function evaluerCompletude(params: {
  elementType: 'PUBLICATION' | 'INDICATEUR';
  fichiers: readonly { type: TypeFichier }[];
  indicateursAffilies: readonly IndicateurAffilie[];
  valeurs: readonly ValeurSaisie[];
  /** Value of the autonomous indicator itself. */
  valeurPropre?: ValeurSaisie;
}): EtatCompletude {
  const manquants: string[] = [];
  const messages: string[] = [];

  if (params.elementType === 'PUBLICATION') {
    if (!params.fichiers.some((fichier) => fichier.type === 'PDF')) {
      manquants.push('pdf');
      messages.push('Le fichier PDF de la publication est obligatoire.');
    }
  } else if (
    !params.valeurPropre ||
    (params.valeurPropre.valeur.trim() === '' && !params.valeurPropre.nonDisponible)
  ) {
    manquants.push('valeur');
    messages.push("Saisissez la valeur de l'indicateur.");
  }

  const parIndicateur = new Map(
    params.valeurs.map((valeur) => [valeur.indicateurId, valeur]),
  );

  for (const indicateur of params.indicateursAffilies) {
    const saisie = parIndicateur.get(indicateur.id);

    if (!saisie || (saisie.valeur.trim() === '' && !saisie.nonDisponible)) {
      manquants.push(indicateur.id);
      messages.push(`Valeur manquante pour « ${indicateur.nom} ».`);
      continue;
    }

    // "Non disponible" is allowed, but never without saying why.
    if (saisie.nonDisponible && saisie.commentaire.trim() === '') {
      manquants.push(indicateur.id);
      messages.push(
        `Justifiez pourquoi « ${indicateur.nom} » n'est pas disponible.`,
      );
    }
  }

  return { complet: manquants.length === 0, manquants, messages };
}

/** A published link must be a real, reachable http(s) address (§7). */
export function validerLienPublication(lien: string): string | null {
  const valeur = lien.trim();

  if (valeur === '') {
    return 'Indiquez le lien vers la publication en ligne.';
  }

  let analyse: URL;

  try {
    analyse = new URL(valeur);
  } catch {
    return "Ce lien n'est pas une adresse valide. Il doit commencer par https://";
  }

  if (analyse.protocol !== 'http:' && analyse.protocol !== 'https:') {
    return 'Le lien doit commencer par http:// ou https://';
  }

  return null;
}

/**
 * Parses an address list typed, pasted or imported (§7).
 *
 * Separators are commas, semicolons, spaces and line breaks all at once,
 * because people paste from a mail client without cleaning up.
 */
export function analyserListeEmails(saisie: string): {
  valides: string[];
  invalides: string[];
} {
  const morceaux = saisie
    .split(/[\s,;]+/)
    .map((morceau) => morceau.trim().toLowerCase())
    .filter((morceau) => morceau !== '');

  const valides: string[] = [];
  const invalides: string[] = [];
  const vus = new Set<string>();

  // Deliberately simple: something, an @, a dot-bearing domain. Rejecting a
  // valid address is worse here than accepting a doubtful one.
  const motif = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  for (const morceau of morceaux) {
    if (vus.has(morceau)) {
      continue;
    }
    vus.add(morceau);

    if (motif.test(morceau)) {
      valides.push(morceau);
    } else {
      invalides.push(morceau);
    }
  }

  return { valides, invalides };
}
