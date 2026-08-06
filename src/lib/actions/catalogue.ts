'use server';

import { revalidatePath } from 'next/cache';

import {
  type ActeurSession,
  PermissionRefusee,
  assertPermission,
} from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import {
  type ValeursPlanification,
  appliquerHeritage,
  heritageADiverge,
  validerPlanification,
} from '@/lib/catalogue/heritage';
import {
  CHAMPS_OBLIGATOIRES_AUTONOME,
  indicateurSchema,
  publicationSchema,
} from '@/lib/catalogue/schemas';
import { prisma } from '@/lib/prisma';

export type EtatCatalogue = {
  succes?: boolean;
  message?: string;
  erreur?: string;
  erreursChamps?: Record<string, string[]>;
  valeurs?: Record<string, string>;
};

/** Echoes the form back, since React 19 resets it once the action resolves. */
function valeursSoumises(donnees: FormData): Record<string, string> {
  const echo: Record<string, string> = {};

  for (const [cle, valeur] of donnees.entries()) {
    if (typeof valeur === 'string') {
      echo[cle] = valeur;
    }
  }

  return echo;
}

function grouperErreurs(
  erreurs: { champ: string; message: string }[],
): Record<string, string[]> {
  const groupees: Record<string, string[]> = {};

  for (const erreur of erreurs) {
    groupees[erreur.champ] = [...(groupees[erreur.champ] ?? []), erreur.message];
  }

  return groupees;
}

/**
 * Point focal to attribute to a catalogue entry.
 *
 * §4.5 states this is never typed in: it is the connected user when they are a
 * point focal, otherwise the titular point focal of the target structure.
 */
async function pointFocalDe(
  acteur: ActeurSession,
  structureId: string,
): Promise<string | null> {
  if (acteur.role === 'POINT_FOCAL') {
    return acteur.id;
  }

  const titulaire = await prisma.utilisateur.findFirst({
    where: {
      structureId,
      role: 'POINT_FOCAL',
      actif: true,
      deletedAt: null,
      estTitulaire: true,
    },
    select: { id: true },
  });

  if (titulaire) {
    return titulaire.id;
  }

  // No titular yet: fall back on any point focal of the structure rather than
  // leaving the entry unassigned, which would silently disable its reminders.
  const suppleant = await prisma.utilisateur.findFirst({
    where: { structureId, role: 'POINT_FOCAL', actif: true, deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  return suppleant?.id ?? null;
}

export async function enregistrerPublicationAction(
  _etatPrecedent: EtatCatalogue,
  donnees: FormData,
): Promise<EtatCatalogue> {
  const acteur = await exigerActeur();
  const id = (donnees.get('id') as string | null) || null;

  const analyse = publicationSchema.safeParse({
    nom: donnees.get('nom'),
    description: donnees.get('description') ?? '',
    structureId: donnees.get('structureId') ?? '',
    domaineId: donnees.get('domaineId') ?? '',
    periodicite: donnees.get('periodicite'),
    nombreAnneesPeriodicite: donnees.get('nombreAnneesPeriodicite') ?? '',
    delaiJours: donnees.get('delaiJours') ?? '',
    delaiType: donnees.get('delaiType'),
    reportSiWeekendOuFerie: donnees.get('reportSiWeekendOuFerie') === 'on',
  });

  if (!analyse.success) {
    return {
      erreursChamps: analyse.error.flatten().fieldErrors,
      valeurs: valeursSoumises(donnees),
    };
  }

  const valeurs = analyse.data;

  try {
    assertPermission(acteur, 'catalogue:ecrire', valeurs.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message, valeurs: valeursSoumises(donnees) };
    }
    throw erreur;
  }

  const erreursRegles = validerPlanification(valeurs);

  if (erreursRegles.length > 0) {
    return {
      erreursChamps: grouperErreurs(erreursRegles),
      valeurs: valeursSoumises(donnees),
    };
  }

  const champs = {
    nom: valeurs.nom,
    description: valeurs.description,
    structureId: valeurs.structureId,
    domaineId: valeurs.domaineId,
    periodicite: valeurs.periodicite,
    nombreAnneesPeriodicite: valeurs.nombreAnneesPeriodicite,
    delaiJours: valeurs.delaiJours,
    delaiType: valeurs.delaiType,
    reportSiWeekendOuFerie: valeurs.reportSiWeekendOuFerie,
  };

  if (id === null) {
    const creee = await prisma.publication.create({
      data: {
        ...champs,
        organisationId: acteur.organisationId,
        pointFocalId: await pointFocalDe(acteur, valeurs.structureId),
      },
    });

    await prisma.journalAudit.create({
      data: {
        organisationId: acteur.organisationId,
        utilisateurId: acteur.id,
        action: 'CREATION_PUBLICATION',
        entite: 'Publication',
        entiteId: creee.id,
        apres: champs,
      },
    });

    revalidatePath('/catalogue');

    return { succes: true, message: 'Publication créée.' };
  }

  const avant = await prisma.publication.findFirst({
    where: { id, organisationId: acteur.organisationId, deletedAt: null },
  });

  if (!avant) {
    return { erreur: "Cette publication n'existe plus." };
  }

  try {
    assertPermission(acteur, 'catalogue:ecrire', avant.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  await prisma.publication.update({ where: { id }, data: champs });

  // §4.5 — affiliated indicators are resynchronised, but only when something
  // they actually inherit has moved.
  const aResynchroniser = heritageADiverge(
    avant as unknown as ValeursPlanification,
    champs as unknown as ValeursPlanification,
  );

  let indicateursMisAJour = 0;

  if (aResynchroniser) {
    const resultat = await prisma.indicateur.updateMany({
      where: { publicationId: id, deletedAt: null },
      data: {
        domaineId: champs.domaineId,
        periodicite: champs.periodicite,
        nombreAnneesPeriodicite: champs.nombreAnneesPeriodicite,
        delaiJours: champs.delaiJours,
        delaiType: champs.delaiType,
        reportSiWeekendOuFerie: champs.reportSiWeekendOuFerie,
      },
    });

    indicateursMisAJour = resultat.count;
  }

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'MODIFICATION_PUBLICATION',
      entite: 'Publication',
      entiteId: id,
      avant: {
        nom: avant.nom,
        periodicite: avant.periodicite,
        delaiJours: avant.delaiJours,
        delaiType: avant.delaiType,
        domaineId: avant.domaineId,
      },
      apres: { ...champs, indicateursResynchronises: indicateursMisAJour },
    },
  });

  revalidatePath('/catalogue');

  return {
    succes: true,
    message:
      indicateursMisAJour > 0
        ? `Publication mise à jour. ${indicateursMisAJour} indicateur(s) affilié(s) resynchronisé(s).`
        : 'Publication mise à jour.',
  };
}

export async function enregistrerIndicateurAction(
  _etatPrecedent: EtatCatalogue,
  donnees: FormData,
): Promise<EtatCatalogue> {
  const acteur = await exigerActeur();
  const id = (donnees.get('id') as string | null) || null;

  const publicationBrute = donnees.get('publicationId');
  const publicationId =
    publicationBrute === 'aucune' || publicationBrute === null
      ? ''
      : String(publicationBrute);

  const analyse = indicateurSchema.safeParse({
    nom: donnees.get('nom'),
    description: donnees.get('description') ?? '',
    structureId: donnees.get('structureId') ?? '',
    publicationId,
    domaineId: donnees.get('domaineId') ?? '',
    unite: donnees.get('unite') ?? '',
    sourceDonnees: donnees.get('sourceDonnees') ?? '',
    periodicite: donnees.get('periodicite'),
    nombreAnneesPeriodicite: donnees.get('nombreAnneesPeriodicite') ?? '',
    delaiJours: donnees.get('delaiJours') ?? '',
    delaiType: donnees.get('delaiType'),
    reportSiWeekendOuFerie: donnees.get('reportSiWeekendOuFerie') === 'on',
  });

  if (!analyse.success) {
    return {
      erreursChamps: analyse.error.flatten().fieldErrors,
      valeurs: valeursSoumises(donnees),
    };
  }

  const valeurs = analyse.data;

  try {
    assertPermission(acteur, 'catalogue:ecrire', valeurs.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message, valeurs: valeursSoumises(donnees) };
    }
    throw erreur;
  }

  let publication: ValeursPlanification | null = null;

  if (valeurs.publicationId !== null) {
    const source = await prisma.publication.findFirst({
      where: {
        id: valeurs.publicationId,
        organisationId: acteur.organisationId,
        deletedAt: null,
      },
    });

    if (!source) {
      return {
        erreursChamps: { publicationId: ["Cette publication n'existe pas."] },
        valeurs: valeursSoumises(donnees),
      };
    }

    if (source.structureId !== valeurs.structureId) {
      return {
        erreursChamps: {
          publicationId: [
            'La publication doit appartenir à la même structure que l’indicateur.',
          ],
        },
        valeurs: valeursSoumises(donnees),
      };
    }

    publication = source as unknown as ValeursPlanification;
  }

  // An autonomous indicator carries its own schedule and must therefore have
  // supplied every scheduling field. An affiliated one inherits them, and the
  // browser does not even submit them since they are displayed disabled.
  if (publication === null) {
    const manquants: { champ: string; message: string }[] = [];

    for (const [champ, message] of Object.entries(CHAMPS_OBLIGATOIRES_AUTONOME)) {
      const valeur = valeurs[champ as keyof typeof valeurs];

      if (valeur === null || valeur === undefined || valeur === '') {
        manquants.push({ champ, message });
      }
    }

    if (manquants.length > 0) {
      return {
        erreursChamps: grouperErreurs(manquants),
        valeurs: valeursSoumises(donnees),
      };
    }
  }

  const planification = appliquerHeritage(
    {
      domaineId: valeurs.domaineId,
      periodicite: valeurs.periodicite ?? 'ANNUELLE',
      nombreAnneesPeriodicite: valeurs.nombreAnneesPeriodicite,
      delaiJours: valeurs.delaiJours ?? 0,
      delaiType: valeurs.delaiType ?? 'CALENDAIRES',
      reportSiWeekendOuFerie: valeurs.reportSiWeekendOuFerie,
    },
    publication,
  );

  if (publication === null) {
    const erreursRegles = validerPlanification(planification);

    if (erreursRegles.length > 0) {
      return {
        erreursChamps: grouperErreurs(erreursRegles),
        valeurs: valeursSoumises(donnees),
      };
    }
  }

  const champs = {
    nom: valeurs.nom,
    description: valeurs.description,
    structureId: valeurs.structureId,
    publicationId: valeurs.publicationId,
    unite: valeurs.unite,
    sourceDonnees: valeurs.sourceDonnees,
    ...planification,
  };

  if (id === null) {
    const cree = await prisma.indicateur.create({
      data: {
        ...champs,
        organisationId: acteur.organisationId,
        pointFocalId: await pointFocalDe(acteur, valeurs.structureId),
      },
    });

    await prisma.journalAudit.create({
      data: {
        organisationId: acteur.organisationId,
        utilisateurId: acteur.id,
        action: 'CREATION_INDICATEUR',
        entite: 'Indicateur',
        entiteId: cree.id,
        apres: champs,
      },
    });

    revalidatePath('/catalogue');

    return {
      succes: true,
      message:
        publication !== null
          ? 'Indicateur créé et rattaché à sa publication.'
          : 'Indicateur créé.',
    };
  }

  const avant = await prisma.indicateur.findFirst({
    where: { id, organisationId: acteur.organisationId, deletedAt: null },
  });

  if (!avant) {
    return { erreur: "Cet indicateur n'existe plus." };
  }

  try {
    assertPermission(acteur, 'catalogue:ecrire', avant.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  await prisma.indicateur.update({ where: { id }, data: champs });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'MODIFICATION_INDICATEUR',
      entite: 'Indicateur',
      entiteId: id,
      avant: {
        nom: avant.nom,
        publicationId: avant.publicationId,
        periodicite: avant.periodicite,
        delaiJours: avant.delaiJours,
      },
      apres: champs,
    },
  });

  revalidatePath('/catalogue');

  return { succes: true, message: 'Indicateur mis à jour.' };
}

export async function basculerActivationCatalogueAction(
  type: 'publication' | 'indicateur',
  id: string,
): Promise<EtatCatalogue> {
  const acteur = await exigerActeur();

  const element =
    type === 'publication'
      ? await prisma.publication.findFirst({
          where: { id, organisationId: acteur.organisationId, deletedAt: null },
          select: { id: true, actif: true, structureId: true },
        })
      : await prisma.indicateur.findFirst({
          where: { id, organisationId: acteur.organisationId, deletedAt: null },
          select: { id: true, actif: true, structureId: true },
        });

  if (!element) {
    return { erreur: "Cet élément n'existe plus." };
  }

  try {
    assertPermission(acteur, 'catalogue:ecrire', element.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  if (type === 'publication') {
    await prisma.publication.update({
      where: { id },
      data: { actif: !element.actif },
    });
  } else {
    await prisma.indicateur.update({
      where: { id },
      data: { actif: !element.actif },
    });
  }

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: element.actif ? 'DESACTIVATION_CATALOGUE' : 'ACTIVATION_CATALOGUE',
      entite: type === 'publication' ? 'Publication' : 'Indicateur',
      entiteId: id,
      avant: { actif: element.actif },
      apres: { actif: !element.actif },
    },
  });

  revalidatePath('/catalogue');

  return {
    succes: true,
    message: element.actif ? 'Élément désactivé.' : 'Élément réactivé.',
  };
}
