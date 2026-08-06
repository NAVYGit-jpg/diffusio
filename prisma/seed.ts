import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Database seed.
 *
 * Creates the minimum a fresh install needs to be usable:
 *   - one demo organisation,
 *   - the default statistical domains,
 *   - one SUPER_ADMIN account with a randomly generated password.
 *
 * The script is idempotent: running it twice never duplicates rows and never
 * silently resets an existing administrator's password.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL n'est pas defini. Copiez .env.example vers .env et renseignez la connexion.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Generates a random password that is strong but still readable aloud over the
 * phone: no characters that are easy to confuse (0/O, 1/l/I).
 */
function genererMotDePasse(longueur = 20): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let motDePasse = '';

  for (let i = 0; i < longueur; i += 1) {
    motDePasse += alphabet[randomInt(alphabet.length)];
  }

  return motDePasse;
}

/** Default statistical domains, editable afterwards by the super admin. */
const DOMAINES_PAR_DEFAUT = [
  { code: 'ECO', nom: 'Économie', description: 'Comptes nationaux, croissance, conjoncture' },
  { code: 'DEM', nom: 'Démographie', description: 'Population, natalité, mortalité, migrations' },
  { code: 'SAN', nom: 'Santé', description: 'Offre de soins, morbidité, couverture sanitaire' },
  { code: 'EDU', nom: 'Éducation', description: 'Effectifs scolaires, taux de scolarisation, résultats' },
  { code: 'EMP', nom: 'Emploi', description: "Population active, chômage, conditions d'emploi" },
  { code: 'AGR', nom: 'Agriculture', description: 'Productions végétales et animales, campagnes agricoles' },
  { code: 'PRX', nom: 'Prix', description: 'Indices de prix à la consommation, inflation' },
  { code: 'CEX', nom: 'Commerce extérieur', description: 'Importations, exportations, balance commerciale' },
  { code: 'ENV', nom: 'Environnement', description: 'Climat, ressources naturelles, assainissement' },
  { code: 'FIN', nom: 'Finances publiques', description: 'Budget, recettes, dépenses, dette' },
];

async function main(): Promise<void> {
  console.log('\n=== Initialisation de la base DIFFUSIO ===\n');

  // ---------------------------------------------------------------- organisation
  let organisation = await prisma.organisation.findFirst({
    where: { deletedAt: null },
  });

  if (organisation) {
    console.log(`Organisation existante conservee : ${organisation.nom}`);
  } else {
    organisation = await prisma.organisation.create({
      data: {
        nom: 'Organisation de démonstration',
        sigle: 'DEMO',
        pays: "Côte d'Ivoire",
        fuseauHoraire: 'Africa/Abidjan',
        emailExpediteur: process.env.EMAIL_EXPEDITEUR ?? 'no-reply@example.org',
        // DEC-101 / DEC-102 : calendar days, no weekend/holiday shift
        delaiTypeParDefaut: 'CALENDAIRES',
        reportSiWeekendOuFerieDefaut: false,
        // DEC-113 : public calendar enabled, but every calendar still has to be
        // published one by one before it shows up there.
        espacePublicActif: true,
        slugPublic: 'demo',
      },
    });
    console.log(`Organisation creee : ${organisation.nom}`);
  }

  // -------------------------------------------------------------------- domaines
  const codesExistants = new Set(
    (
      await prisma.domaine.findMany({
        where: { organisationId: organisation.id },
        select: { code: true },
      })
    ).map((domaine) => domaine.code),
  );

  const manquants = DOMAINES_PAR_DEFAUT.filter(
    (domaine) => !codesExistants.has(domaine.code),
  );

  if (manquants.length > 0) {
    await prisma.domaine.createMany({
      data: manquants.map((domaine) => ({
        ...domaine,
        organisationId: organisation.id,
      })),
    });
  }

  console.log(
    `Domaines : ${manquants.length} cree(s), ${DOMAINES_PAR_DEFAUT.length - manquants.length} deja present(s)`,
  );

  // ----------------------------------------------------------------- super admin
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'super.admin@diffusio.local';
  const existant = await prisma.utilisateur.findUnique({ where: { email } });

  if (existant) {
    console.log(
      `\nCompte super admin deja present (${email}). Mot de passe inchange.\n` +
        "Pour en regenerer un, supprimez ce compte ou utilisez la fonction « mot de passe oublie ».",
    );
    return;
  }

  const motDePasse = genererMotDePasse();

  await prisma.utilisateur.create({
    data: {
      organisationId: organisation.id,
      nom: 'Super',
      prenoms: 'Administrateur',
      email,
      motDePasseHash: await hash(motDePasse),
      role: 'SUPER_ADMIN',
      // §2.2 : the first login must force e-mail, name and password change
      mustChangePassword: true,
      actif: true,
      preferencesNotification: {},
    },
  });

  console.log(`
============================================================
  COMPTE SUPER ADMIN CREE — NOTEZ CES IDENTIFIANTS
============================================================

  Adresse e-mail : ${email}
  Mot de passe   : ${motDePasse}

  Ce mot de passe ne sera plus jamais affiche.
  A la premiere connexion, l'application vous demandera de
  changer votre e-mail, votre nom et votre mot de passe.

============================================================
`);
}

main()
  .catch((erreur: unknown) => {
    console.error("\nEchec de l'initialisation :", erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
