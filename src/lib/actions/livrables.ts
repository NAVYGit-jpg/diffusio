'use server';

import { revalidatePath } from 'next/cache';

import { PermissionRefusee, assertPermission } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import {
  type ValeurSaisie,
  cheminStockage,
  evaluerCompletude,
  prochaineVersion,
  typeDeFichier,
  validerFichier,
} from '@/lib/livrables/regles';
import { supprimer, televerser, urlSignee } from '@/lib/livrables/stockage';
import {
  encadrementDe,
  notifier,
  pointsFocauxDe,
} from '@/lib/notifications/destinataires';
import { prisma } from '@/lib/prisma';

export type EtatLivrable = {
  succes?: boolean;
  message?: string;
  erreur?: string;
  messagesCompletude?: string[];
};

function tailleMax(): number {
  const brut = Number(process.env.UPLOAD_TAILLE_MAX_OCTETS);

  return Number.isFinite(brut) && brut > 0 ? brut : 20 * 1024 * 1024;
}

/**
 * Loads a calendar line and checks the acteur may act on it.
 *
 * Every deliverable action starts here: a line belongs to a calendar, which
 * belongs to a structure, and that structure is what the permission is scoped
 * to.
 */
async function chargerLigne(ligneId: string, acteur: Awaited<ReturnType<typeof exigerActeur>>) {
  const ligne = await prisma.ligneCalendrier.findFirst({
    where: { id: ligneId, calendrier: { organisationId: acteur.organisationId } },
    include: {
      calendrier: { select: { structureId: true, annee: true, statut: true } },
      publication: {
        select: {
          nom: true,
          indicateursAffilies: {
            where: { deletedAt: null, actif: true },
            select: { id: true, nom: true, unite: true },
          },
        },
      },
      indicateur: { select: { nom: true, unite: true } },
      fichiers: {
        where: { deletedAt: null },
        orderBy: [{ type: 'asc' }, { version: 'desc' }],
      },
      valeurs: true,
    },
  });

  return ligne;
}

/**
 * Moves a line to `TELEVERSE` — "Livré" on screen — once everything §6 asks for
 * is there, and warns the administrators.
 *
 * Called both after a file upload and after the indicator values are saved.
 * Before, only the second path did it: a publication with no affiliated
 * indicator could receive its PDF and stay "Planifié", because nobody ever ran
 * the check. The state has to follow what has actually been handed over, not
 * which button was pressed last.
 *
 * Returns whether the line has just changed state, so the caller can say so.
 */
async function basculerSiComplet(
  ligneId: string,
  acteur: Awaited<ReturnType<typeof exigerActeur>>,
): Promise<boolean> {
  const ligne = await chargerLigne(ligneId, acteur);

  if (!ligne || ligne.statut === 'MIS_EN_LIGNE' || ligne.statut === 'ANNULE') {
    return false;
  }

  const affilies = ligne.publication?.indicateursAffilies ?? [];

  const valeurs: ValeurSaisie[] = ligne.valeurs.map((valeur) => ({
    indicateurId: valeur.indicateurId,
    valeur:
      valeur.valeur !== null
        ? String(valeur.valeur)
        : (valeur.valeurTexte ?? ''),
    nonDisponible: valeur.nonDisponible,
    commentaire: valeur.commentaire ?? '',
  }));

  const completude = evaluerCompletude({
    elementType: ligne.elementType,
    fichiers: ligne.fichiers.map((fichier) => ({
      type: fichier.type as 'PDF' | 'EXCEL' | 'AUTRE',
    })),
    indicateursAffilies: affilies,
    valeurs: ligne.indicateurId ? [] : valeurs,
    valeurPropre: ligne.indicateurId ? valeurs[0] : undefined,
  });

  if (!completude.complet || ligne.statut === 'TELEVERSE') {
    return false;
  }

  await prisma.ligneCalendrier.update({
    where: { id: ligne.id },
    data: { statut: 'TELEVERSE' },
  });

  await notifier(
    await encadrementDe(acteur.organisationId, ligne.calendrier.structureId),
    {
      type: 'LIVRABLE_TELEVERSE',
      titre: 'Livré — en attente de confirmation de publication',
      message: `${ligne.publication?.nom ?? ligne.indicateur?.nom} — ${ligne.libellePeriode} est prêt.`,
      lien: '/produits-charges',
    },
    acteur.id,
  );

  return true;
}

/** Files the deposit form may carry, in the order they are shown. */
const EMPLACEMENTS = [
  { champ: 'fichierPdf', libelle: 'PDF' },
  { champ: 'fichierExcel', libelle: 'Excel' },
] as const;

type FichierDepose = { nom: string; type: string; version: number };

/**
 * Stores one uploaded file and records it.
 *
 * The bucket write happens first: if the row cannot then be created, the object
 * is removed again, because nothing would ever reference it.
 */
async function deposerUnFichier(
  fichier: File,
  ligne: NonNullable<Awaited<ReturnType<typeof chargerLigne>>>,
  acteur: Awaited<ReturnType<typeof exigerActeur>>,
  dejaDeposes: readonly { type: string; version: number }[],
): Promise<{ depose?: FichierDepose; erreur?: string }> {
  const erreurs = validerFichier(
    { nom: fichier.name, taille: fichier.size },
    tailleMax(),
  );

  if (erreurs.length > 0) {
    return { erreur: erreurs[0].message };
  }

  const type = typeDeFichier(fichier.name)!;
  const version = prochaineVersion(
    dejaDeposes.map((existant) => ({
      type: existant.type as 'PDF' | 'EXCEL' | 'AUTRE',
      version: existant.version,
    })),
    type,
  );

  const chemin = cheminStockage({
    organisationId: acteur.organisationId,
    ligneCalendrierId: ligne.id,
    version,
    nomOriginal: fichier.name,
  });

  const resultat = await televerser(
    chemin,
    await fichier.arrayBuffer(),
    fichier.type || 'application/octet-stream',
  );

  if (!resultat.ok) {
    return { erreur: resultat.erreur };
  }

  try {
    await prisma.fichier.create({
      data: {
        ligneCalendrierId: ligne.id,
        type,
        nomOriginal: fichier.name,
        cheminStockage: chemin,
        tailleOctets: fichier.size,
        mimeType: fichier.type || 'application/octet-stream',
        televersePar: acteur.id,
        version,
      },
    });
  } catch (erreur) {
    await supprimer(chemin);
    throw erreur;
  }

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'TELEVERSEMENT_FICHIER',
      entite: 'LigneCalendrier',
      entiteId: ligne.id,
      apres: { nom: fichier.name, type, version, taille: fichier.size },
    },
  });

  return { depose: { nom: fichier.name, type, version } };
}

/**
 * Saves everything the deliverable screen holds, in one go (§6).
 *
 * Files and indicator values used to travel through two separate actions, so a
 * user had to press one button per file and another for the values — and could
 * leave with a file chosen but never sent. One form, one button, one save.
 *
 * Order matters: the files are stored first, so the completeness check that
 * follows sees them. Getting it the other way round would leave a line complete
 * in fact but still "Planifié" until the next save.
 */
export async function enregistrerLivrableAction(
  _etatPrecedent: EtatLivrable,
  donnees: FormData,
): Promise<EtatLivrable> {
  const acteur = await exigerActeur();
  const ligneId = String(donnees.get('ligneId') ?? '');
  const ligne = await chargerLigne(ligneId, acteur);

  if (!ligne) {
    return { erreur: "Cette ligne de calendrier n'existe plus." };
  }

  try {
    assertPermission(acteur, 'livrable:televerser', ligne.calendrier.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  if (ligne.statut === 'MIS_EN_LIGNE') {
    return {
      erreur:
        'Cette publication est déjà en ligne : son contenu ne peut plus être remplacé.',
    };
  }

  // ------------------------------------------------------------- fichiers
  const deposes: FichierDepose[] = [];
  // Versions are numbered per type, so each deposit has to see the previous
  // ones — including a file stored a moment ago in this same call.
  const connus = ligne.fichiers.map((fichier) => ({
    type: fichier.type as string,
    version: fichier.version,
  }));

  for (const emplacement of EMPLACEMENTS) {
    const fichier = donnees.get(emplacement.champ);

    // An untouched file input still submits an empty File; it is not an error,
    // simply nothing to store.
    if (!(fichier instanceof File) || fichier.size === 0) {
      continue;
    }

    const resultat = await deposerUnFichier(fichier, ligne, acteur, connus);

    if (resultat.erreur) {
      return {
        erreur: `Fichier ${emplacement.libelle} : ${resultat.erreur}`,
      };
    }

    if (resultat.depose) {
      deposes.push(resultat.depose);
      connus.push({
        type: resultat.depose.type,
        version: resultat.depose.version,
      });
    }
  }

  // -------------------------------------------------------------- valeurs
  const affilies = ligne.publication?.indicateursAffilies ?? [];
  const cibles = ligne.indicateurId
    ? [{ id: ligne.indicateurId, nom: ligne.indicateur?.nom ?? '' }]
    : affilies;

  const saisies: ValeurSaisie[] = cibles.map((indicateur) => ({
    indicateurId: indicateur.id,
    valeur: String(donnees.get(`valeur_${indicateur.id}`) ?? '').trim(),
    nonDisponible: donnees.get(`indisponible_${indicateur.id}`) === 'on',
    commentaire: String(donnees.get(`commentaire_${indicateur.id}`) ?? '').trim(),
  }));

  for (const saisie of saisies) {
    const numerique = Number(saisie.valeur.replace(',', '.'));
    const estNumerique = saisie.valeur !== '' && Number.isFinite(numerique);

    await prisma.valeurIndicateur.upsert({
      where: {
        ligneCalendrierId_indicateurId: {
          ligneCalendrierId: ligne.id,
          indicateurId: saisie.indicateurId,
        },
      },
      create: {
        ligneCalendrierId: ligne.id,
        indicateurId: saisie.indicateurId,
        valeur: estNumerique ? numerique : null,
        // A value that is not a number is kept as text rather than dropped:
        // "n.d.", "< 0,1" or a range are real answers in statistics.
        valeurTexte: estNumerique ? null : saisie.valeur || null,
        commentaire: saisie.commentaire || null,
        nonDisponible: saisie.nonDisponible,
        saisiPar: acteur.id,
      },
      update: {
        valeur: estNumerique ? numerique : null,
        valeurTexte: estNumerique ? null : saisie.valeur || null,
        commentaire: saisie.commentaire || null,
        nonDisponible: saisie.nonDisponible,
        saisiPar: acteur.id,
        saisiAt: new Date(),
      },
    });
  }

  // -------------------------------------------------------- notifications
  if (deposes.length > 0) {
    await prevenirDuDepot(ligne, acteur, deposes);
  }

  const bascule = await basculerSiComplet(ligne.id, acteur);

  revalidatePath('/calendrier');

  // ------------------------------------------------------------- réponse
  const completude = evaluerCompletude({
    elementType: ligne.elementType,
    fichiers: connus.map((fichier) => ({
      type: fichier.type as 'PDF' | 'EXCEL' | 'AUTRE',
    })),
    indicateursAffilies: affilies,
    valeurs: ligne.indicateurId ? [] : saisies,
    valeurPropre: ligne.indicateurId ? saisies[0] : undefined,
  });

  const resume =
    deposes.length === 0
      ? 'Modifications enregistrées.'
      : `${deposes.length === 1 ? 'Fichier déposé' : `${deposes.length} fichiers déposés`} et modifications enregistrées.`;

  if (bascule) {
    return {
      succes: true,
      message: `${resume} La ligne passe au statut « Livré » et les personnes concernées ont été prévenues.`,
    };
  }

  return {
    succes: true,
    message: resume,
    messagesCompletude: completude.complet ? undefined : completude.messages,
  };
}

/**
 * Tells everyone concerned that a file has just been deposited (§8).
 *
 * "Concerned" means the administrators supervising the structure **and** the
 * other points focaux of that structure: a deputy who does not know the titular
 * has already filed the report will file it a second time. The author is left
 * out by `notifier` — being told about one's own action is noise.
 */
async function prevenirDuDepot(
  ligne: NonNullable<Awaited<ReturnType<typeof chargerLigne>>>,
  acteur: Awaited<ReturnType<typeof exigerActeur>>,
  deposes: readonly FichierDepose[],
): Promise<void> {
  const [encadrement, pointsFocaux] = await Promise.all([
    encadrementDe(acteur.organisationId, ligne.calendrier.structureId),
    pointsFocauxDe(acteur.organisationId, ligne.calendrier.structureId),
  ]);

  const nomElement = ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément';
  const liste = deposes.map((fichier) => fichier.nom).join(', ');

  await notifier(
    [...encadrement, ...pointsFocaux],
    {
      type: 'LIVRABLE_TELEVERSE',
      titre:
        deposes.length === 1 ? 'Nouveau fichier déposé' : 'Nouveaux fichiers déposés',
      message: `${acteur.nomComplet} a déposé ${liste} pour ${nomElement} — ${ligne.libellePeriode}.`,
      // A deposit notification leads to the screen where the deposit can be
      // reviewed and published, not to the calendar it came from.
      lien: '/produits-charges',
    },
    acteur.id,
  );
}

/** Short-lived download link for one file (§6). */
export async function obtenirLienFichierAction(
  fichierId: string,
): Promise<{ url?: string; erreur?: string }> {
  const acteur = await exigerActeur();

  const fichier = await prisma.fichier.findFirst({
    where: {
      id: fichierId,
      deletedAt: null,
      ligneCalendrier: {
        calendrier: { organisationId: acteur.organisationId },
      },
    },
    include: {
      ligneCalendrier: {
        include: { calendrier: { select: { structureId: true } } },
      },
    },
  });

  if (!fichier) {
    return { erreur: "Ce fichier n'existe plus." };
  }

  try {
    assertPermission(
      acteur,
      'catalogue:lire',
      fichier.ligneCalendrier.calendrier.structureId,
    );
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const url = await urlSignee(fichier.cheminStockage);

  if (!url) {
    return { erreur: 'Le lien de téléchargement n’a pas pu être généré.' };
  }

  return { url };
}
