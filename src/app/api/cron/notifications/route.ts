import { executerRelances } from '@/lib/relances/executer';

/**
 * Daily reminders and chases (cahier des charges §8).
 *
 * Called by a GitHub Actions cron. Protected by a shared secret rather than a
 * session: there is no user behind this request.
 *
 * `?date=AAAA-MM-JJ` replays the job for another day — the simulation command
 * asked for in §11 Phase 7. It is refused in production, where replaying a past
 * day would resend real messages.
 */
export async function POST(requete: Request): Promise<Response> {
  const secretAttendu = process.env.CRON_SECRET;

  if (!secretAttendu) {
    return Response.json(
      { erreur: "CRON_SECRET n'est pas configuré sur le serveur." },
      { status: 500 },
    );
  }

  const fourni =
    requete.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    requete.headers.get('x-cron-secret') ??
    '';

  // Constant-time-ish: compare lengths first so a wrong secret never reveals
  // how much of it was right through timing.
  if (fourni.length !== secretAttendu.length || fourni !== secretAttendu) {
    return Response.json({ erreur: 'Accès refusé.' }, { status: 401 });
  }

  const parametreDate = new URL(requete.url).searchParams.get('date');
  let date = new Date();

  if (parametreDate) {
    if (process.env.NODE_ENV === 'production') {
      return Response.json(
        {
          erreur:
            'La simulation de date est désactivée en production : elle renverrait de vrais messages.',
        },
        { status: 400 },
      );
    }

    const simulee = new Date(`${parametreDate}T12:00:00Z`);

    if (Number.isNaN(simulee.getTime())) {
      return Response.json(
        { erreur: 'Date invalide. Format attendu : AAAA-MM-JJ.' },
        { status: 400 },
      );
    }

    date = simulee;
  }

  try {
    const resultat = await executerRelances(date);

    return Response.json(resultat);
  } catch (erreur) {
    return Response.json(
      {
        erreur: 'Échec du traitement.',
        detail: erreur instanceof Error ? erreur.message : String(erreur),
      },
      { status: 500 },
    );
  }
}
