import 'dotenv/config';

/**
 * Replays the daily job over a range of days (cahier des charges §11, Phase 7).
 *
 *   npm run simuler:relances -- 2026-02-01 2026-03-05
 *
 * Requires the application to be running (`npm run dev`). Deliberately goes
 * through the HTTP route rather than calling the job directly, so what is
 * verified is exactly what the cron will trigger — secret check included.
 */

const [debutBrut, finBrut] = process.argv.slice(2);

if (!debutBrut) {
  console.error(
    '\nUsage : npm run simuler:relances -- AAAA-MM-JJ [AAAA-MM-JJ]\n' +
      'Exemple : npm run simuler:relances -- 2026-02-01 2026-03-05\n',
  );
  process.exit(1);
}

const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error(
    "\nCRON_SECRET n'est pas défini dans le fichier .env.\n" +
      'Générez une longue chaîne aléatoire et renseignez-la.\n',
  );
  process.exit(1);
}

const base = process.env.AUTH_URL ?? 'http://localhost:3000';
const debut = new Date(`${debutBrut}T12:00:00Z`);
const fin = new Date(`${finBrut ?? debutBrut}T12:00:00Z`);

if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
  console.error('\nDate invalide. Format attendu : AAAA-MM-JJ.\n');
  process.exit(1);
}

if (fin < debut) {
  console.error('\nLa date de fin précède la date de début.\n');
  process.exit(1);
}

const totaux = {
  rappels: 0,
  relances: 0,
  passagesEnRetard: 0,
  doublonsEvites: 0,
};

console.log(
  `\n=== Simulation du ${debutBrut} au ${finBrut ?? debutBrut} ===\n`,
);

for (
  let jour = new Date(debut);
  jour <= fin;
  jour.setUTCDate(jour.getUTCDate() + 1)
) {
  const iso = jour.toISOString().slice(0, 10);

  const reponse = await fetch(
    `${base}/api/cron/notifications?date=${iso}`,
    { method: 'POST', headers: { 'x-cron-secret': secret } },
  );

  // A redirect to the sign-in page returns HTML with a 200: without this
  // check the script would crash on `JSON.parse` with an unreadable error.
  const typeContenu = reponse.headers.get('content-type') ?? '';

  if (!reponse.ok || !typeContenu.includes('application/json')) {
    console.error(
      `${iso} : réponse inattendue (${reponse.status}, ${typeContenu.split(';')[0]}).`,
    );

    if (typeContenu.includes('text/html')) {
      console.error(
        '   La route cron a été interceptée par le middleware d’authentification.\n' +
          '   Vérifiez que « api/cron » figure bien dans les exclusions du matcher.',
      );
    }

    process.exit(1);
  }

  const resultat = (await reponse.json()) as {
    rappelsEnvoyes: number;
    relancesEnvoyees: number;
    passagesEnRetard: number;
    doublonsEvites: number;
    lignesExaminees: number;
  };

  totaux.rappels += resultat.rappelsEnvoyes;
  totaux.relances += resultat.relancesEnvoyees;
  totaux.passagesEnRetard += resultat.passagesEnRetard;
  totaux.doublonsEvites += resultat.doublonsEvites;

  const activite =
    resultat.rappelsEnvoyes +
    resultat.relancesEnvoyees +
    resultat.passagesEnRetard;

  if (activite > 0) {
    const morceaux: string[] = [];
    if (resultat.passagesEnRetard > 0) {
      morceaux.push(`${resultat.passagesEnRetard} passage(s) en retard`);
    }
    if (resultat.rappelsEnvoyes > 0) {
      morceaux.push(`${resultat.rappelsEnvoyes} rappel(s)`);
    }
    if (resultat.relancesEnvoyees > 0) {
      morceaux.push(`${resultat.relancesEnvoyees} relance(s)`);
    }

    console.log(`${iso} : ${morceaux.join(', ')}`);
  }
}

console.log(`
=== Total ===
Passages en retard : ${totaux.passagesEnRetard}
Rappels envoyés    : ${totaux.rappels}
Relances envoyées  : ${totaux.relances}
Doublons évités    : ${totaux.doublonsEvites}
`);

if (totaux.doublonsEvites > 0) {
  console.log(
    'Les doublons évités sont normaux si vous rejouez une période déjà simulée :\n' +
      "c'est la garantie d'unicité du paragraphe 8.4 qui agit.\n",
  );
}
