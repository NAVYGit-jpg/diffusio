import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

/**
 * Connectivity check for Supabase Storage.
 *
 * Run with: npm run verifier:stockage
 *
 * Never prints the secret key — only whether it works and what it can see.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cleBrute = process.env.SUPABASE_SECRET_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'livrables';

// A key pasted over two lines keeps a newline in the middle, which makes the
// HTTP layer reject the header with a message quoting the value.
const cle = cleBrute?.replace(/\s+/g, '');

/**
 * Removes the secret from a message before printing it.
 *
 * A library error message can quote the value it received — that is exactly how
 * this key first leaked into a console. Nothing gets printed without passing
 * through here.
 */
function expurger(message: string): string {
  let propre = message;

  if (cleBrute) {
    // The value itself, and any fragment of it left by a broken paste.
    for (const morceau of cleBrute.split(/\s+/).filter((m) => m.length >= 4)) {
      propre = propre.split(morceau).join('«clé masquée»');
    }
  }

  // Belt and braces: anything shaped like a Supabase key.
  return propre.replace(/sb_(secret|publishable)_[A-Za-z0-9_\-]*/g, 'sb_***');
}

function echec(message: string): never {
  console.error(`\n❌ ${expurger(message)}\n`);
  process.exit(1);
}

if (!url) {
  echec("NEXT_PUBLIC_SUPABASE_URL n'est pas renseignée dans le fichier .env.");
}

if (!cle) {
  echec("SUPABASE_SECRET_KEY n'est pas renseignée dans le fichier .env.");
}

if (cleBrute !== cle) {
  console.warn(
    [
      '⚠️  La clé contenait un espace ou un retour à la ligne : elle a sans doute',
      '   été collée sur deux lignes. Elle a été recollée pour ce contrôle, mais',
      '   corrigez le fichier .env pour la mettre sur une seule ligne.',
      '',
    ].join('\n'),
  );
}

// A real key is long. A short value almost always means a truncated copy or a
// masked display copied from the dashboard.
if (cle.length < 30) {
  echec(
    `La clé secrète ne fait que ${cle.length} caractères, ce qui est trop court.\n` +
      "   Une clé Supabase complète en compte plusieurs dizaines. Le copier-coller\n" +
      '   a probablement été tronqué, ou la valeur affichée était masquée.',
  );
}

const client = createClient(url, cle, {
  auth: { persistSession: false },
});

console.log('\n=== Vérification du stockage Supabase ===\n');
console.log(`Projet : ${url}`);
console.log(`Bucket attendu : ${bucket}\n`);

const { data: buckets, error } = await client.storage.listBuckets();

if (error) {
  echec(
    `Connexion refusée : ${error.message}\n` +
      "   Vérifiez que la clé provient bien de la section « Secret keys »\n" +
      '   (ou « service_role » dans l’onglet Legacy API Keys).',
  );
}

console.log(`✅ Connexion établie. ${buckets.length} bucket(s) visible(s).`);

for (const existant of buckets) {
  const visibilite = existant.public ? '⚠️  PUBLIC' : '🔒 privé';
  console.log(`   - ${existant.name} : ${visibilite}`);
}

const cible = buckets.find((existant) => existant.name === bucket);

if (!cible) {
  echec(
    `Le bucket « ${bucket} » n'existe pas.\n` +
      '   Créez-le dans Supabase > Storage > New bucket, sans activer « Public bucket ».',
  );
}

if (cible.public) {
  echec(
    `Le bucket « ${bucket} » est PUBLIC.\n` +
      "   N'importe qui connaissant l'adresse d'un fichier pourrait le télécharger,\n" +
      '   ce que le §14 du cahier des charges interdit. Passez-le en privé.',
  );
}

console.log(`\n✅ Le bucket « ${bucket} » existe et il est bien privé.`);

// --- Aller-retour complet -------------------------------------------------
// Vérifier que le bucket existe ne dit rien de ce qui compte vraiment : peut-on
// y déposer un fichier, et le relire par une URL signée sans être authentifié ?
const cheminTest = `_diagnostic/${Date.now()}-controle.txt`;
const contenuTest = 'Fichier de diagnostic DIFFUSIO. Supprimé automatiquement.';

const depot = await client.storage
  .from(bucket)
  .upload(cheminTest, new Blob([contenuTest]), { contentType: 'text/plain' });

if (depot.error) {
  echec(`Dépôt impossible dans le bucket : ${depot.error.message}`);
}

console.log('✅ Dépôt d’un fichier de test réussi.');

const signature = await client.storage.from(bucket).createSignedUrl(cheminTest, 60);

if (signature.error || !signature.data) {
  await client.storage.from(bucket).remove([cheminTest]);
  echec(`URL signée impossible à générer : ${signature.error?.message ?? ''}`);
}

// Fetched without any credential: this is exactly how a browser will read it.
const relecture = await fetch(signature.data.signedUrl);
const relu = await relecture.text();

if (!relecture.ok || relu !== contenuTest) {
  await client.storage.from(bucket).remove([cheminTest]);
  echec(
    `Le fichier déposé n'a pas pu être relu par son URL signée (code ${relecture.status}).`,
  );
}

console.log('✅ Relecture par URL signée réussie, sans authentification.');

// The same path without a signature must be refused: that is what makes the
// bucket private in practice (§14).
const sansSignature = await fetch(
  `${url.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${cheminTest}`,
);

if (sansSignature.ok) {
  await client.storage.from(bucket).remove([cheminTest]);
  echec(
    'ALERTE : le fichier est accessible SANS signature. Le bucket se comporte comme public.',
  );
}

console.log(
  `✅ Accès direct sans signature refusé (code ${sansSignature.status}) : le bucket est réellement privé.`,
);

await client.storage.from(bucket).remove([cheminTest]);
console.log('✅ Fichier de test supprimé.');

console.log('\nLe stockage est opérationnel.\n');
