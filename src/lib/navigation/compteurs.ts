import 'server-only';

import type { ActeurSession } from '@/lib/auth/permissions';
import { perimetreStructures } from '@/lib/auth/permissions';
import { HORIZON_IMMINENT_JOURS } from '@/lib/calendrier/selection';
import { prisma } from '@/lib/prisma';
import { type OngletCompte, ONGLETS_AVEC_COMPTEUR } from './compteurs-regles';

/**
 * How many new items each navigation tab holds (cahier des charges §9.5).
 *
 * Everything is scoped to the reader's perimeter: a point focal must not see a
 * badge counting structures they cannot open. The comparison date is their own
 * last visit to that tab; a tab never opened counts everything, which is what
 * somebody discovering the application should find.
 *
 * All the counts run in one round trip. Ten sequential queries on every page
 * render would make the whole application feel slow for a handful of digits.
 */

export type CompteursOnglets = Partial<Record<OngletCompte, number>>;

export async function chargerCompteursOnglets(
  acteur: ActeurSession & { organisationId: string },
): Promise<CompteursOnglets> {
  const perimetre = perimetreStructures(acteur);
  const maintenant = new Date();

  // `null` means no restriction; an empty list means nothing is visible and
  // must never be turned into "everything".
  const filtreStructure =
    perimetre === null ? {} : { structureId: { in: perimetre } };
  const perimetreVide = perimetre !== null && perimetre.length === 0;

  const visites = await prisma.visiteOnglet.findMany({
    where: { utilisateurId: acteur.id },
    select: { onglet: true, vuAt: true },
  });

  const vuLe = new Map<string, Date>(
    visites.map((visite) => [visite.onglet, visite.vuAt]),
  );

  /** `undefined` in a Prisma filter means "no condition", hence everything. */
  const depuis = (onglet: OngletCompte): { gt: Date } | undefined => {
    const date = vuLe.get(onglet);

    return date ? { gt: date } : undefined;
  };

  const estAdmin = acteur.role !== 'POINT_FOCAL';

  // The imminent window opens fifteen days before the deadline; the overdue one
  // the day after. Rather than computing a date per line, the bounds are
  // shifted once here and compared with the stored deadline.
  const decale = (jours: number) => {
    const date = new Date(maintenant.getTime());
    date.setUTCDate(date.getUTCDate() + jours);

    return date;
  };

  const calendrierDansPerimetre = {
    organisationId: acteur.organisationId,
    ...filtreStructure,
  };

  const [
    structures,
    utilisateurs,
    publications,
    indicateurs,
    lignes,
    imminentes,
    retards,
    fichiers,
    valeurs,
    equipe,
    notifications,
    messages,
  ] = await Promise.all([
    estAdmin && acteur.role === 'SUPER_ADMIN'
      ? prisma.structure.count({
          where: {
            organisationId: acteur.organisationId,
            deletedAt: null,
            createdAt: depuis('/structures'),
          },
        })
      : 0,

    acteur.role === 'SUPER_ADMIN'
      ? prisma.utilisateur.count({
          where: {
            organisationId: acteur.organisationId,
            deletedAt: null,
            createdAt: depuis('/utilisateurs'),
          },
        })
      : 0,

    perimetreVide
      ? 0
      : prisma.publication.count({
          where: {
            organisationId: acteur.organisationId,
            deletedAt: null,
            ...filtreStructure,
            createdAt: depuis('/catalogue'),
          },
        }),

    perimetreVide
      ? 0
      : prisma.indicateur.count({
          where: {
            organisationId: acteur.organisationId,
            deletedAt: null,
            ...filtreStructure,
            createdAt: depuis('/catalogue'),
          },
        }),

    perimetreVide
      ? 0
      : prisma.ligneCalendrier.count({
          where: {
            calendrier: calendrierDansPerimetre,
            createdAt: depuis('/calendrier'),
          },
        }),

    // Lines whose deadline is now within the window — and whose window opened
    // after the last visit, so a line already seen there does not light up
    // again on every page load.
    perimetreVide
      ? 0
      : prisma.ligneCalendrier.count({
          where: {
            calendrier: calendrierDansPerimetre,
            statut: { notIn: ['TELEVERSE', 'MIS_EN_LIGNE', 'ANNULE'] },
            dateDiffusionReelle: null,
            dateDiffusionPrevue: {
              gte: maintenant,
              lte: decale(HORIZON_IMMINENT_JOURS),
              ...(vuLe.get('/imminentes')
                ? {
                    // Entered the window after the visit: deadline later than
                    // (visit + 15 days).
                    gt: new Date(
                      vuLe.get('/imminentes')!.getTime() +
                        HORIZON_IMMINENT_JOURS * 86_400_000,
                    ),
                  }
                : {}),
            },
          },
        }),

    perimetreVide
      ? 0
      : prisma.ligneCalendrier.count({
          where: {
            calendrier: calendrierDansPerimetre,
            statut: { notIn: ['MIS_EN_LIGNE', 'ANNULE'] },
            dateDiffusionReelle: null,
            dateDiffusionPrevue: {
              lt: maintenant,
              // Became late after the last visit.
              ...(vuLe.get('/retards') ? { gte: vuLe.get('/retards') } : {}),
            },
          },
        }),

    perimetreVide
      ? 0
      : prisma.fichier.count({
          where: {
            deletedAt: null,
            ligneCalendrier: { calendrier: calendrierDansPerimetre },
            televerseAt: depuis('/produits-charges'),
          },
        }),

    perimetreVide
      ? 0
      : prisma.valeurIndicateur.count({
          where: {
            ligneCalendrier: { calendrier: calendrierDansPerimetre },
            saisiAt: depuis('/produits-charges'),
          },
        }),

    prisma.membreEquipe.count({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        // The organisation-wide team is visible to everybody; a structure team
        // only to those who may open that structure.
        ...(perimetre === null
          ? {}
          : { OR: [{ structureId: null }, { structureId: { in: perimetre } }] }),
        createdAt: depuis('/equipe'),
      },
    }),

    // Comme les neuf autres : ce qui est arrivé depuis la dernière visite, et
    // non ce qui reste non lu. Les deux notions sont distinctes et le restent —
    // « lu » se règle notification par notification, dans la liste. Compter les
    // non-lues ici rendait la pastille impossible à éteindre : on ouvrait
    // l'écran, on ne cliquait aucune ligne, et le nombre demeurait.
    prisma.notification.count({
      where: {
        destinataireId: acteur.id,
        createdAt: depuis('/notifications'),
      },
    }),

    prisma.message.count({
      where: {
        conversation: {
          organisationId: acteur.organisationId,
          ...(perimetre === null ? {} : { structureId: { in: perimetre } }),
        },
        auteurId: { not: acteur.id },
        createdAt: depuis('/discussion'),
      },
    }),
  ]);

  const compteurs: CompteursOnglets = {
    '/structures': structures,
    '/utilisateurs': utilisateurs,
    '/catalogue': publications + indicateurs,
    '/calendrier': lignes,
    '/imminentes': imminentes,
    '/retards': retards,
    '/produits-charges': fichiers + valeurs,
    '/equipe': equipe,
    '/notifications': notifications,
    '/discussion': messages,
  };

  return compteurs;
}

/** Records that the reader has just opened a tab, clearing its badge. */
export async function marquerOngletVu(
  utilisateurId: string,
  onglet: string,
): Promise<void> {
  if (!(ONGLETS_AVEC_COMPTEUR as readonly string[]).includes(onglet)) {
    return;
  }

  await prisma.visiteOnglet.upsert({
    where: { utilisateurId_onglet: { utilisateurId, onglet } },
    create: { utilisateurId, onglet, vuAt: new Date() },
    update: { vuAt: new Date() },
  });
}
