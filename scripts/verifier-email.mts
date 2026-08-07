import 'dotenv/config';

/**
 * Connectivity check for the transactional e-mail provider.
 *
 * Run with: npm run verifier:email
 *           npm run verifier:email -- --envoyer   (sends one real test message)
 *
 * Never prints the API key. A provider error message can quote the value it
 * received — that is how a Supabase key once leaked into a console — so every
 * output goes through `expurger` first.
 */

const cleBrute = process.env.BREVO_API_KEY;
const cle = cleBrute?.replace(/\s+/g, '');
const expediteur = process.env.EMAIL_EXPEDITEUR;
const nomExpediteur = process.env.EMAIL_EXPEDITEUR_NOM ?? 'DIFFUSIO';
const mode = process.env.EMAIL_MODE ?? 'test';
const destinataireTest = process.env.EMAIL_TEST_DESTINATAIRE;
const envoyerVraimentUnMessage = process.argv.includes('--envoyer');

function expurger(message: string): string {
  let propre = message;

  if (cleBrute) {
    for (const morceau of cleBrute.split(/\s+/).filter((m) => m.length >= 4)) {
      propre = propre.split(morceau).join('«clé masquée»');
    }
  }

  return propre.replace(/xkeysib-[A-Za-z0-9_\-]*/g, 'xkeysib-***');
}

function echec(message: string): never {
  console.error(`\n❌ ${expurger(message)}\n`);
  process.exit(1);
}

console.log('\n=== Vérification de la messagerie ===\n');

if (!cle) {
  echec(
    "BREVO_API_KEY n'est pas renseignée dans le fichier .env.\n" +
      '   Brevo > menu du compte > Settings > SMTP & API > API Keys & MCP\n' +
      '   > Generate a new API key.',
  );
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

const entetes = { 'api-key': cle, accept: 'application/json' };

// --- 1. La clé est-elle valide ? -------------------------------------------
const compte = await fetch('https://api.brevo.com/v3/account', { headers: entetes });

if (!compte.ok) {
  echec(
    `Brevo refuse la clé (code ${compte.status}).\n` +
      "   Vérifiez qu'elle a été copiée en entier : elle n'est affichée qu'une\n" +
      '   seule fois, au moment de sa création.',
  );
}

const infos = (await compte.json()) as {
  companyName?: string;
  email?: string;
  plan?: { type: string; credits?: number }[];
};

console.log(`✅ Clé valide. Compte : ${infos.companyName ?? infos.email ?? '—'}`);

const forfait = infos.plan?.find((p) => p.type === 'free' || p.credits !== undefined);
if (forfait) {
  console.log(
    `   Forfait : ${forfait.type}${
      forfait.credits !== undefined ? ` — ${forfait.credits} crédit(s)` : ''
    }`,
  );
}

// --- 2. L'expéditeur est-il validé ? ---------------------------------------
// Brevo refuse tout envoi depuis une adresse non vérifiée. C'est la cause
// d'échec la plus fréquente, et elle ne se voit qu'au premier envoi réel.
if (!expediteur) {
  echec("EMAIL_EXPEDITEUR n'est pas renseignée dans le fichier .env.");
}

const reponseExpediteurs = await fetch('https://api.brevo.com/v3/senders', {
  headers: entetes,
});

if (reponseExpediteurs.ok) {
  const { senders = [] } = (await reponseExpediteurs.json()) as {
    senders?: { email: string; active: boolean; name: string }[];
  };

  console.log(`\n✅ ${senders.length} expéditeur(s) déclaré(s) :`);

  for (const declare of senders) {
    console.log(
      `   - ${declare.email} ${declare.active ? '✅ validé' : '⚠️  non validé'}`,
    );
  }

  const correspondant = senders.find(
    (declare) => declare.email.toLowerCase() === expediteur.toLowerCase(),
  );

  if (!correspondant) {
    echec(
      `L'adresse « ${expediteur} » n'est déclarée nulle part chez Brevo.\n` +
        '   Brevo > Settings > Senders, Domains, IPs > Senders > Add a sender,\n' +
        '   puis reprenez exactement cette adresse dans EMAIL_EXPEDITEUR.',
    );
  }

  if (!correspondant.active) {
    echec(
      `L'adresse « ${expediteur} » est déclarée mais pas encore validée.\n` +
        '   Brevo vous a envoyé un message de confirmation : ouvrez-le et\n' +
        '   cliquez sur le lien, sinon tout envoi sera refusé.',
    );
  }

  console.log(`\n✅ L'expéditeur « ${expediteur} » est validé.`);
} else {
  console.warn(
    `\n⚠️  Impossible de lister les expéditeurs (code ${reponseExpediteurs.status}).`,
  );
}

// --- 3. Mode d'envoi --------------------------------------------------------
console.log(`\nMode d'envoi : EMAIL_MODE=${mode}`);

if (mode !== 'prod') {
  console.log(
    [
      '   Les messages restent affichés dans la console du serveur et ne',
      '   partent pas réellement. Pour les envoyer, mettez EMAIL_MODE="prod"',
      '   dans le fichier .env.',
    ].join('\n'),
  );
}

// --- 4. Envoi de contrôle, sur demande explicite ---------------------------
if (envoyerVraimentUnMessage) {
  if (!destinataireTest) {
    echec("EMAIL_TEST_DESTINATAIRE n'est pas renseignée : je ne sais pas où écrire.");
  }

  const envoi = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { ...entetes, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { email: expediteur, name: nomExpediteur },
      to: [{ email: destinataireTest }],
      subject: 'DIFFUSIO — message de contrôle',
      textContent:
        'Si vous lisez ce message, la messagerie de DIFFUSIO est correctement configurée.',
      htmlContent:
        '<p>Si vous lisez ce message, la messagerie de DIFFUSIO est correctement configurée.</p>',
    }),
  });

  if (!envoi.ok) {
    echec(`Envoi refusé (code ${envoi.status}) : ${await envoi.text()}`);
  }

  console.log(`\n✅ Message de contrôle envoyé à ${destinataireTest}.`);
  console.log('   Vérifiez la boîte de réception, et le dossier indésirables.');
}

console.log('\nLa messagerie est prête.\n');
