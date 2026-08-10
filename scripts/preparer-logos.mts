import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

/**
 * Prepares the DIFFUSIO logo from the two source files.
 *
 * The originals are flat images: dark ink on white, and white ink on black.
 * Placed as-is on a page they would show a visible rectangle, so the
 * background of each is turned transparent and the surrounding margin trimmed.
 *
 * Run with: npm run preparer:logos
 */

const SOURCE = 'logo ELIE';
const CIBLE = 'public';

/**
 * Turns the background into transparency.
 *
 * The source is a photographed/exported flat image, so the background is not
 * exactly #FFFFFF or #000000: a hard equality test would leave a grey halo.
 * Each pixel's alpha therefore follows how far it is from the background,
 * which also keeps the anti-aliased edges smooth.
 */
async function detourer(
  fichierSource: string,
  fichierCible: string,
  fond: 'clair' | 'sombre',
): Promise<void> {
  const image = sharp(fichierSource).ensureAlpha();
  const { width, height } = await image.metadata();

  if (!width || !height) {
    throw new Error(`Dimensions illisibles pour ${fichierSource}.`);
  }

  const { data } = await image.raw().toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    const luminosite = (data[index] + data[index + 1] + data[index + 2]) / 3;

    // On a light source the ink is dark, so opacity grows as luminance drops.
    const opacite =
      fond === 'clair' ? (255 - luminosite) / 255 : luminosite / 255;

    // Below this the pixel is background noise rather than ink.
    const alpha = opacite < 0.12 ? 0 : Math.min(255, Math.round(opacite * 255));

    data[index + 3] = alpha;

    // Normalise the ink to pure black or pure white: the sources are slightly
    // washed out, which shows once the background is gone.
    const encre = fond === 'clair' ? 0 : 255;
    data[index] = encre;
    data[index + 1] = encre;
    data[index + 2] = encre;
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .resize({ width: 720, withoutEnlargement: true })
    .toFile(fichierCible);

  const controle = await sharp(fichierCible).metadata();
  console.log(
    `✅ ${fichierCible} — ${controle.width}×${controle.height}, fond transparent`,
  );
}

await mkdir(CIBLE, { recursive: true });

// Dark ink: readable on a light background.
await detourer(`${SOURCE}/BW.png`, `${CIBLE}/logo-diffusio.png`, 'clair');

// White ink: readable on a dark background.
await detourer(`${SOURCE}/WB.png`, `${CIBLE}/logo-diffusio-blanc.png`, 'sombre');

// Square mark for the browser tab, cropped on the "D".
await sharp(`${CIBLE}/logo-diffusio.png`)
  .resize({ height: 256, withoutEnlargement: false })
  .extract({ left: 0, top: 0, width: 256, height: 256 })
  .png()
  .toFile(`${CIBLE}/icone-diffusio.png`);

console.log(`✅ ${CIBLE}/icone-diffusio.png — 256×256`);
console.log('\nLogos prêts.\n');
