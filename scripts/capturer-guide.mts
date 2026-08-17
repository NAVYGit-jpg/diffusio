import 'dotenv/config';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

/**
 * Screenshots for the user guide (docs/GUIDE-UTILISATION.md).
 *
 * Run with: npm run capturer:guide
 *
 * **No password is ever handled here.** The first run opens a real browser
 * window and waits for a human to sign in; the resulting session is saved and
 * reused on later runs. Storing a password in the environment so a script could
 * type it would put a working credential in a file, to save one manual sign-in
 * a month — a bad trade.
 *
 * Re-running overwrites the images, so the guide can be refreshed after a
 * redesign instead of being re-photographed by hand.
 */

const ADRESSE = process.env.CAPTURE_ADRESSE ?? 'http://localhost:3000';
const DOSSIER = path.join('docs', 'captures');
const SESSION = path.join('.playwright', 'session.json');

/** Wide enough for the navigation column and the filters on one row. */
const FENETRE = { width: 1440, height: 900 };

type Prise = {
  fichier: string;
  chemin: string;
  /** Element to photograph. Absent: the whole page. */
  cible?: string;
  /** Whole scrollable page rather than the visible window. */
  pleinePage?: boolean;
  /** Print stylesheet, for the PDF cover. */
  impression?: boolean;
  /** Clicks needed before the shot — opening a dialog, typically. */
  preparer?: (page: Page) => Promise<void>;
  /** Skipped without failing when the data does not allow it. */
  facultative?: boolean;
};

const PRISES: Prise[] = [
  { fichier: '01-connexion.png', chemin: '/connexion' },

  { fichier: '03-interface-generale.png', chemin: '/tableau-de-bord' },

  { fichier: '04-tableau-de-bord.png', chemin: '/tableau-de-bord' },

  {
    // Deux filtres posés, pour que les jetons soient visibles : une rangée de
    // filtres vide n'apprend rien à personne.
    fichier: '05-filtres-tableau-de-bord.png',
    chemin: '/tableau-de-bord?mois=1&mois=2&mois=3&type=PUBLICATION',
    cible: '[data-filtres-tableau-de-bord]',
  },

  {
    fichier: '06-boutons-rapport.png',
    chemin: '/tableau-de-bord',
    cible: '[data-boutons-rapport]',
  },

  {
    fichier: '07-pdf-page-de-garde.png',
    chemin: '/tableau-de-bord?mois=1',
    cible: '[data-page-de-garde]',
    impression: true,
  },

  { fichier: '08-catalogue.png', chemin: '/catalogue', pleinePage: true },
  { fichier: '09-calendrier.png', chemin: '/calendrier', pleinePage: true },
  { fichier: '10-imminentes.png', chemin: '/imminentes', pleinePage: true },

  {
    fichier: '11-depot-fichiers.png',
    chemin: '/produits-charges',
    cible: '[role="dialog"]',
    facultative: true,
    preparer: async (page) => {
      await page
        .getByRole('button', { name: /Modifier|Consulter/ })
        .first()
        .click();
      await page.waitForSelector('[role="dialog"]');
    },
  },

  { fichier: '12-produits-charges.png', chemin: '/produits-charges', pleinePage: true },

  {
    fichier: '13-publier-le-produit.png',
    chemin: '/produits-charges',
    cible: '[role="dialog"]',
    facultative: true,
    preparer: async (page) => {
      await page
        .getByRole('button', { name: 'Publier le produit' })
        .first()
        .click();
      await page.waitForSelector('[role="dialog"]');
    },
  },

  { fichier: '14-retards.png', chemin: '/retards', pleinePage: true },
  { fichier: '15-equipe.png', chemin: '/equipe', pleinePage: true },
  { fichier: '16-notifications.png', chemin: '/notifications', pleinePage: true },
  { fichier: '17-discussion.png', chemin: '/discussion' },
  { fichier: '18-structures.png', chemin: '/structures', pleinePage: true },
  { fichier: '19-utilisateurs.png', chemin: '/utilisateurs', pleinePage: true },
  { fichier: '20-apparence.png', chemin: '/apparence', pleinePage: true },
  { fichier: '21-profil.png', chemin: '/profil', pleinePage: true },
];

/**
 * Opens a browser, preferring one already installed on the machine.
 *
 * Playwright ships its own Chromium, but on Windows that build needs the
 * Visual C++ runtime and fails with an unhelpful "side-by-side configuration is
 * incorrect" when it is missing. Chrome and Edge carry their own runtime, and
 * Edge is on every Windows 11 machine — driving one of them takes an operating
 * system component out of the prerequisites of a screenshot script.
 *
 * A fresh temporary profile is used either way: the script never touches the
 * bookmarks, the extensions or the open sessions of the installed browser.
 */
async function lancerNavigateur(): Promise<Browser> {
  const demande = process.env.CAPTURE_NAVIGATEUR;
  const canaux = demande ? [demande] : ['chrome', 'msedge'];
  const echecs: string[] = [];

  for (const canal of canaux) {
    try {
      return await chromium.launch({ channel: canal, headless: false });
    } catch (erreur) {
      echecs.push(
        `${canal} : ${erreur instanceof Error ? erreur.message.split('\n')[0] : String(erreur)}`,
      );
    }
  }

  try {
    return await chromium.launch({ headless: false });
  } catch (erreur) {
    echecs.push(
      `chromium fourni : ${erreur instanceof Error ? erreur.message.split('\n')[0] : String(erreur)}`,
    );
  }

  throw new Error(`Aucun navigateur n'a pu démarrer.\n  ${echecs.join('\n  ')}`);
}

async function existe(chemin: string): Promise<boolean> {
  try {
    await access(chemin);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens a window and waits for the human to sign in.
 *
 * Detection is on leaving the sign-in page rather than on a fixed delay: a
 * first sign-in goes through the "change your details" screen, which takes as
 * long as it takes.
 */
async function ouvrirLaSession(navigateur: Browser): Promise<void> {
  const contexte = await navigateur.newContext({ viewport: FENETRE });
  const page = await contexte.newPage();

  await page.goto(`${ADRESSE}/connexion`);

  console.log(`
┌──────────────────────────────────────────────────────────────
│  CONNECTEZ-VOUS DANS LA FENÊTRE QUI VIENT DE S'OUVRIR
├──────────────────────────────────────────────────────────────
│  Utilisez un compte SUPER ADMINISTRATEUR : trois écrans du
│  guide ne sont visibles que par lui.
│
│  Votre mot de passe n'est ni lu ni enregistré par ce script.
│  Seul le jeton de session le sera, dans ${SESSION},
│  qui est exclu de Git.
│
│  La capture démarre toute seule une fois la connexion faite.
└──────────────────────────────────────────────────────────────
`);

  // Un quart d'heure : la connexion demande une présence humaine, et se faire
  // renvoyer une invitation ou retrouver un mot de passe prend le temps que
  // cela prend.
  const ATTENTE = 900_000;

  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/connexion'), {
      timeout: ATTENTE,
    });

    // La première connexion impose de changer ses coordonnées : on attend
    // d'être réellement dans l'application, pas sur l'écran intermédiaire.
    await page.waitForURL(
      (url) => !url.pathname.startsWith('/premiere-connexion'),
      { timeout: ATTENTE },
    );
  } catch {
    await contexte.close();
    await navigateur.close();

    throw new Error(
      "Personne ne s'est connecté dans le quart d'heure.\n" +
        '   Cette étape demande votre présence : relancez « npm run capturer:guide »\n' +
        '   au moment où vous pourrez saisir vos identifiants dans la fenêtre.',
    );
  }

  await mkdir(path.dirname(SESSION), { recursive: true });
  await contexte.storageState({ path: SESSION });
  await contexte.close();

  console.log('✅ Session enregistrée.\n');
}

async function main(): Promise<void> {
  await mkdir(DOSSIER, { recursive: true });

  const forcer = process.argv.includes('--reconnexion');
  const navigateur = await lancerNavigateur();

  if (forcer || !(await existe(SESSION))) {
    await ouvrirLaSession(navigateur);
  }

  const contexte = await navigateur.newContext({
    viewport: FENETRE,
    // Deux fois la densité : une capture affichée en pleine largeur dans un
    // document reste nette, et supporte l'impression du guide.
    deviceScaleFactor: 2,
    storageState: SESSION,
    locale: 'fr-FR',
  });

  const page = await contexte.newPage();
  const reussies: string[] = [];
  const echouees: { fichier: string; raison: string }[] = [];

  for (const prise of PRISES) {
    const destination = path.join(DOSSIER, prise.fichier);

    try {
      await page.goto(`${ADRESSE}${prise.chemin}`, { waitUntil: 'networkidle' });

      // La page de connexion signale une session expirée, sauf quand c'est
      // précisément elle qu'on photographie.
      if (
        prise.chemin !== '/connexion' &&
        new URL(page.url()).pathname.startsWith('/connexion')
      ) {
        throw new Error(
          'session expirée — relancez avec --reconnexion',
        );
      }

      if (prise.preparer) {
        await prise.preparer(page);
      }

      if (prise.impression) {
        await page.emulateMedia({ media: 'print' });
      }

      // Les graphiques arrivent après le rendu initial ; sans cette pause, la
      // capture les attrape à mi-animation.
      await page.waitForTimeout(1200);

      if (prise.cible) {
        const element = page.locator(prise.cible).first();
        await element.waitFor({ state: 'visible', timeout: 10_000 });
        await element.screenshot({ path: destination });
      } else {
        await page.screenshot({ path: destination, fullPage: prise.pleinePage });
      }

      if (prise.impression) {
        await page.emulateMedia({ media: 'screen' });
      }

      // Une boîte de dialogue laissée ouverte masquerait la capture suivante.
      await page.keyboard.press('Escape');

      reussies.push(prise.fichier);
      console.log(`  ✅ ${prise.fichier}`);
    } catch (erreur) {
      const raison = erreur instanceof Error ? erreur.message.split('\n')[0] : String(erreur);

      echouees.push({ fichier: prise.fichier, raison });
      console.log(
        `  ${prise.facultative ? '⏭️ ' : '❌'} ${prise.fichier} — ${raison}`,
      );
    }
  }

  await contexte.close();
  await navigateur.close();

  console.log(`
────────────────────────────────────────────────────────────────
  ${reussies.length} capture(s) enregistrée(s) dans ${DOSSIER}
  ${echouees.length} manquante(s)
────────────────────────────────────────────────────────────────
`);

  if (echouees.length > 0) {
    for (const echec of echouees) {
      console.log(`  ${echec.fichier} : ${echec.raison}`);
    }
    console.log('');
  }
}

// Une trace d'appel Node n'apprend rien à qui lance une capture d'écran : on
// n'affiche que la phrase utile, et le détail seulement s'il y en a un.
try {
  await main();
} catch (erreur) {
  console.error(
    `\n❌ ${erreur instanceof Error ? erreur.message : String(erreur)}\n`,
  );
  process.exit(1);
}
