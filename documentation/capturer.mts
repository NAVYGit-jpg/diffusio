import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type Locator, type Page } from 'playwright';

import { CAPTURES, type Cible } from './contenu.ts';

/**
 * Captures annotées de la documentation.
 *
 *   npm run documentation:captures            (production)
 *   DOC_ADRESSE=http://localhost:3000 npm run documentation:captures
 *
 * Aucun mot de passe n'est manipulé : une fenêtre s'ouvre, vous vous connectez
 * vous-même (compte super administrateur, pour voir tous les écrans), puis le
 * script photographie chaque écran déclaré dans contenu.ts et mesure la
 * position de chaque repère numéroté. Seul le jeton de session est conservé,
 * dans .playwright/ (exclu de Git).
 *
 * Les adresses e-mail affichées sont masquées avant chaque photo.
 */

const ADRESSE = process.env.DOC_ADRESSE ?? 'https://diffusio-rho.vercel.app';
const DOSSIER = path.join('documentation', 'captures');
const SESSION = path.join('.playwright', 'documentation-session.json');
const FENETRE = { width: 1440, height: 900 };

type Boite = { x: number; y: number; l: number; h: number };
type Reperes = Record<string, { largeur: number; hauteur: number; reperes: Record<string, Boite> }>;

async function lancer(): Promise<Browser> {
  for (const canal of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel: canal, headless: false });
    } catch {
      // essayer le suivant
    }
  }
  return chromium.launch({ headless: false });
}

async function existe(chemin: string) {
  try {
    await access(chemin);
    return true;
  } catch {
    return false;
  }
}

function localiser(page: Page, cible: Cible): Locator[] {
  const essais: Locator[] = [];
  if (cible.css) essais.push(page.locator(cible.css));
  if (cible.role) {
    essais.push(
      cible.nom
        ? page.getByRole(cible.role, { name: new RegExp(cible.nom, 'i') })
        : page.getByRole(cible.role),
    );
  }
  if (cible.texte) essais.push(page.getByText(cible.texte, { exact: false }));
  return essais;
}

async function trouver(page: Page, cible: Cible): Promise<Locator | null> {
  for (const essai of localiser(page, cible)) {
    const rang = cible.rang ?? 0;
    const nombre = await essai.count().catch(() => 0);
    const visibles: Locator[] = [];
    for (let i = 0; i < nombre && visibles.length <= rang; i += 1) {
      const element = essai.nth(i);
      if (await element.isVisible().catch(() => false)) visibles.push(element);
    }
    if (visibles[rang]) return visibles[rang];
  }
  return null;
}

async function masquerAdresses(page: Page) {
  await page.evaluate(() => {
    const motif = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
    const parcours = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let noeud: Node | null;
    while ((noeud = parcours.nextNode())) {
      if (noeud.textContent && motif.test(noeud.textContent)) {
        noeud.textContent = noeud.textContent.replace(motif, 'prenom.nom@exemple.ci');
      }
    }
    document.querySelectorAll('input').forEach((champ) => {
      if (motif.test(champ.value)) champ.value = champ.value.replace(motif, 'prenom.nom@exemple.ci');
    });
    document.querySelectorAll('[data-sonner-toaster], nextjs-portal').forEach((e) => e.remove());
  });
}

async function connexion(navigateur: Browser) {
  const contexte = await navigateur.newContext({ viewport: FENETRE });
  const page = await contexte.newPage();
  await page.goto(`${ADRESSE}/connexion`);
  console.log('\n>>> Connectez-vous dans la fenêtre ouverte (compte super administrateur).');
  console.log('>>> Votre mot de passe n’est ni lu ni enregistré. La capture démarre ensuite seule.\n');
  await page.waitForURL((url) => !/\/(connexion|premiere-connexion)/.test(url.pathname), { timeout: 900_000 });
  await mkdir(path.dirname(SESSION), { recursive: true });
  await contexte.storageState({ path: SESSION });
  await contexte.close();
}

async function main() {
  await mkdir(DOSSIER, { recursive: true });
  const navigateur = await lancer();

  if (process.argv.includes('--reconnexion') || !(await existe(SESSION))) {
    await connexion(navigateur);
  }

  const resultat: Reperes = {};
  const manquants: string[] = [];

  const seulement = process.argv.find((a) => a.startsWith("--seulement="))?.slice(12).split(",");
  for (const { capture, etapes } of CAPTURES.filter(({ capture: c }) => !seulement || seulement.includes(c.fichier))) {
    const contexte = await navigateur.newContext({
      viewport: capture.fenetre ?? FENETRE,
      deviceScaleFactor: 1.5,
      locale: 'fr-FR',
      ...(capture.sansSession ? {} : { storageState: SESSION }),
    });
    const page = await contexte.newPage();

    try {
      await page.goto(`${ADRESSE}${capture.chemin}`, { waitUntil: 'networkidle', timeout: 60_000 });
      if (!capture.sansSession && new URL(page.url()).pathname.startsWith('/connexion')) {
        throw new Error('session expirée — relancez avec --reconnexion');
      }
      if (capture.zoom) {
        await page.evaluate((z) => { document.documentElement.style.zoom = String(z); }, capture.zoom);
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(900);

      for (const clic of capture.preparer ?? []) {
        const element = await trouver(page, clic);
        if (!element) throw new Error(`préparation impossible (${JSON.stringify(clic)})`);
        await element.click();
        await page.waitForTimeout(900);
      }

      if (capture.defilerVers) {
        const element = await trouver(page, capture.defilerVers);
        await element?.evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.mouse.wheel(0, -80);
        await page.waitForTimeout(500);
      }

      await masquerAdresses(page);

      const F = capture.fenetre ?? FENETRE;
      const reperes: Record<string, Boite> = {};
      for (const [indice, etape] of etapes.entries()) {
        if (!etape.cible) continue;
        const element = await trouver(page, etape.cible);
        const boite = element ? await element.boundingBox() : null;
        if (!boite || boite.y + boite.height < 0 || boite.y > F.height || boite.x > F.width - 8 || boite.x + boite.width < 0) {
          manquants.push(`${capture.fichier} · repère ${indice + 1}`);
          continue;
        }
        const x = Math.max(0, boite.x);
        const y = Math.max(0, boite.y);
        reperes[String(indice + 1)] = {
          x: (x / F.width) * 100,
          y: (y / F.height) * 100,
          l: (Math.min(boite.width, F.width - x) / F.width) * 100,
          h: (Math.min(boite.height, F.height - y) / F.height) * 100,
        };
      }

      await page.screenshot({ path: path.join(DOSSIER, capture.fichier), type: 'jpeg', quality: 82 });
      resultat[capture.fichier] = { largeur: F.width, hauteur: F.height, reperes };
      console.log(`✓ ${capture.fichier} (${Object.keys(reperes).length} repères)`);
    } catch (erreur) {
      console.log(`✗ ${capture.fichier} : ${erreur instanceof Error ? erreur.message.split('\n')[0] : erreur}`);
    } finally {
      await contexte.close();
    }
  }

  // Lancement partiel (--seulement=…) : on conserve les repères des autres captures.
  const precedents = seulement
    ? JSON.parse(await readFile(path.join(DOSSIER, 'reperes.json'), 'utf8').catch(() => '{}'))
    : {};
  await writeFile(path.join(DOSSIER, 'reperes.json'), `${JSON.stringify({ ...precedents, ...resultat }, null, 2)}\n`);
  await navigateur.close();

  if (manquants.length) {
    console.log(`\nRepères introuvables (non affichés) :\n  ${manquants.join('\n  ')}`);
  }
  console.log(`\n${Object.keys(resultat).length} / ${CAPTURES.length} captures enregistrées dans ${DOSSIER}.`);
}

void main();
