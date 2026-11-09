'use client';

import { BellRing, CircleCheck, Clock3, LoaderCircle, MailCheck, Pause, Play, TriangleAlert } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { enregistrerMailsAutomatiquesAction, type ReglagesMails } from '@/lib/actions/mails-automatiques';
import { cn } from '@/lib/utils';

const JOURS_PROPOSES = [30, 15, 10, 7, 5, 3, 2, 1];
const FREQUENCES = [1, 2, 3, 5, 7];

type Cle = 'mailsRappelsActifs' | 'mailsRetardsActifs' | 'mailsMiseEnLigneActifs';

const TYPES: { cle: Cle; titre: string; description: string; icone: typeof BellRing; teinte: string }[] = [
  {
    cle: 'mailsRappelsActifs',
    titre: 'Rappels avant échéance',
    description: 'Préviennent le point focal, avec sa structure en copie, que la date de diffusion approche.',
    icone: BellRing,
    teinte: 'bg-sky-500/12 text-sky-600',
  },
  {
    cle: 'mailsRetardsActifs',
    titre: 'Relances de retard',
    description: 'Relancent le point focal tant qu’une publication attendue n’est pas livrée.',
    icone: TriangleAlert,
    teinte: 'bg-amber-500/12 text-amber-600',
  },
  {
    cle: 'mailsMiseEnLigneActifs',
    titre: 'Avis de mise en ligne',
    description: 'Annoncent la publication à son point focal et à la liste de diffusion.',
    icone: MailCheck,
    teinte: 'bg-emerald-500/12 text-emerald-600',
  },
];

export function ReglagesMailsAutomatiques({ initial }: { initial: ReglagesMails }) {
  const [reglages, setReglages] = useState(initial);
  const [enCours, demarrer] = useTransition();

  const actifs = TYPES.filter((type) => reglages[type.cle]).length;

  function enregistrer(suivant: ReglagesMails, message: string) {
    const precedent = reglages;
    setReglages(suivant);
    demarrer(async () => {
      const resultat = await enregistrerMailsAutomatiquesAction(suivant);
      if (resultat.erreur) {
        setReglages(precedent);
        toast.error(resultat.erreur);
      } else {
        toast.success(message);
      }
    });
  }

  function basculer(cle: Cle, valeur: boolean) {
    const titre = TYPES.find((type) => type.cle === cle)!.titre;
    enregistrer({ ...reglages, [cle]: valeur }, `${titre} : ${valeur ? 'activés' : 'suspendus'}.`);
  }

  function basculerJour(jour: number) {
    const present = reglages.joursRappel.includes(jour);
    if (present && reglages.joursRappel.length === 1) {
      toast.error('Gardez au moins un jour de rappel, ou suspendez les rappels.');
      return;
    }
    if (!present && reglages.joursRappel.length >= 5) {
      toast.error('Cinq jours de rappel au plus.');
      return;
    }
    const jours = present
      ? reglages.joursRappel.filter((j) => j !== jour)
      : [...reglages.joursRappel, jour].sort((a, b) => b - a);
    enregistrer({ ...reglages, joursRappel: jours }, 'Jours de rappel enregistrés.');
  }

  const toutActif = actifs === TYPES.length;

  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="space-y-5 py-1">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[var(--elevation-2)]"
            style={{ backgroundImage: 'var(--gradient-primaire)' }}
            aria-hidden
          >
            <MailCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium">
              E-mails automatiques
              {enCours && <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />}
            </p>
            <p className="text-sm text-muted-foreground">
              Choisissez ce que l’application envoie seule. Chaque changement s’applique dès
              l’envoi quotidien suivant (6 h).
            </p>
          </div>
          <Badge variant={actifs === 0 ? 'destructive' : 'secondary'} className="gap-1">
            {actifs === 0 ? <Pause className="size-3" /> : <CircleCheck className="size-3" />}
            {actifs === 0 ? 'Tout est suspendu' : `${actifs} sur ${TYPES.length} actifs`}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={enCours}
            onClick={() =>
              enregistrer(
                { ...reglages, mailsRappelsActifs: !toutActif, mailsRetardsActifs: !toutActif, mailsMiseEnLigneActifs: !toutActif },
                toutActif ? 'Tous les e-mails automatiques sont suspendus.' : 'Tous les e-mails automatiques sont actifs.',
              )
            }
          >
            {toutActif ? <Pause className="size-4" /> : <Play className="size-4" />}
            {toutActif ? 'Tout suspendre' : 'Tout activer'}
          </Button>
        </div>

        <ul className="divide-y rounded-xl border bg-card">
          {TYPES.map(({ cle, titre, description, icone: Icone, teinte }) => {
            const actif = reglages[cle];
            return (
              <li key={cle} className={cn('p-4 transition-opacity', !actif && 'opacity-70')}>
                <div className="flex items-start gap-3">
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', teinte)} aria-hidden>
                    <Icone className="size-4" />
                  </span>
                  <label htmlFor={cle} className="min-w-0 flex-1 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {titre}
                      {!actif && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                          Suspendu
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
                  </label>
                  <Switch id={cle} checked={actif} disabled={enCours} onCheckedChange={(valeur) => basculer(cle, valeur)} />
                </div>

                {cle === 'mailsRappelsActifs' && actif && (
                  <div className="mt-3 pl-12">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Envoyer un rappel à J − … (5 au plus)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {JOURS_PROPOSES.map((jour) => {
                        const choisi = reglages.joursRappel.includes(jour);
                        return (
                          <button
                            key={jour}
                            type="button"
                            disabled={enCours}
                            aria-pressed={choisi}
                            onClick={() => basculerJour(jour)}
                            className={cn(
                              'h-8 min-w-12 rounded-full border px-3 text-xs font-medium transition-all',
                              choisi
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
                            )}
                          >
                            J − {jour}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {cle === 'mailsRetardsActifs' && actif && (
                  <div className="mt-3 pl-12">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Clock3 className="size-3.5" /> Relancer tous les…
                    </p>
                    <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
                      {FREQUENCES.map((jours) => {
                        const choisi = reglages.frequenceRelanceRetardJours === jours;
                        return (
                          <button
                            key={jours}
                            type="button"
                            disabled={enCours}
                            aria-pressed={choisi}
                            onClick={() =>
                              enregistrer(
                                { ...reglages, frequenceRelanceRetardJours: jours },
                                `Relance tous les ${jours === 1 ? 'jours' : `${jours} jours`}.`,
                              )
                            }
                            className={cn(
                              'h-7 rounded-md px-3 text-xs font-medium transition-all',
                              choisi ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {jours === 1 ? '1 jour' : `${jours} jours`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-muted-foreground">
          Les invitations, réinitialisations de mot de passe et alertes que vous rédigez vous-même
          partent toujours. Les écrans de suivi (État du calendrier) restent à jour, même suspendus.
        </p>
      </CardContent>
    </Card>
  );
}
