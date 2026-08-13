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
import { encadrementDe, notifier } from '@/lib/notifications/destinataires';
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
      lien: `/calendrier?structure=${ligne.calendrier.structureId}&annee=${ligne.calendrier.annee}`,
    },
    acteur.id,
  );

  return true;
}

export async function televerserFichierAction(
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

  const fichier = donnees.get('fichier');

  if (!(fichier instanceof File)) {
    return { erreur: 'Choisissez un fichier.' };
  }

  const erreurs = validerFichier(
    { nom: fichier.name, taille: fichier.size },
    tailleMax(),
  );

  if (erreurs.length > 0) {
    return { erreur: erreurs[0].message };
  }

  const type = typeDeFichier(fichier.name)!;
  const version = prochaineVersion(
    ligne.fichiers.map((existant) => ({
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
    // The object is already in the bucket; without its row nothing would ever
    // reference it again.
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

  const bascule = await basculerSiComplet(ligne.id, acteur);

  revalidatePath('/calendrier');

  const rappelVersion =
    version === 1
      ? ''
      : ` (version ${version} — les précédentes restent consultables)`;

  return {
    succes: true,
    message: bascule
      ? `Fichier déposé${rappelVersion}. La ligne passe au statut « Livré » et vos administrateurs ont été prévenus.`
      : `Fichier déposé${rappelVersion}.`,
  };
}

/**
 * Saves the indicator values of a line and, when everything required is there,
 * moves it to `TELEVERSE` and warns the administrators (§6).
 */
export async function enregistrerValeursAction(
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
    return { erreur: 'Cette publication est déjà en ligne.' };
  }

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

  const completude = evaluerCompletude({
    elementType: ligne.elementType,
    fichiers: ligne.fichiers.map((fichier) => ({
      type: fichier.type as 'PDF' | 'EXCEL' | 'AUTRE',
    })),
    indicateursAffilies: affilies,
    valeurs: ligne.indicateurId ? [] : saisies,
    valeurPropre: ligne.indicateurId ? saisies[0] : undefined,
  });

  if (!completude.complet) {
    revalidatePath('/calendrier');

    return {
      succes: true,
      message: 'Valeurs enregistrées.',
      messagesCompletude: completude.messages,
    };
  }

  const bascule = await basculerSiComplet(ligne.id, acteur);

  revalidatePath('/calendrier');

  return {
    succes: true,
    message: bascule
      ? 'Livrable complet : la ligne passe au statut « Livré ». Vos administrateurs ont été prévenus.'
      : 'Valeurs enregistrées.',
  };
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
