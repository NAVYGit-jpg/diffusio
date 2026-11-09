'use client';

import {
  AlarmClock,
  ArrowUp,
  Bell,
  BookA,
  BookOpen,
  Building2,
  CalendarDays,
  CircleHelp,
  CircleUser,
  Download,
  Expand,
  FileDown,
  ImageOff,
  Info,
  LayoutDashboard,
  LayoutPanelLeft,
  Library,
  Lightbulb,
  ListChecks,
  LogIn,
  MailCheck,
  Mails,
  MessagesSquare,
  Network,
  Palette,
  Rocket,
  Route,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { placerReperes, segmentsGras, type ReperesCapture } from '@/lib/documentation/reperes';
import { cn } from '@/lib/utils';
import {
  DOCUMENTATION,
  LIBELLES_ROLES,
  type Bloc,
  type Capture,
  type Etape,
  type Role,
  type Section,
} from '../../../../documentation/contenu';

const ICONES: Record<string, LucideIcon> = {
  AlarmClock, Bell, BookA, BookOpen, Building2, CalendarDays, CircleHelp, CircleUser, FileDown,
  LayoutDashboard, LayoutPanelLeft, Library, ListChecks, LogIn, MailCheck, Mails, MessagesSquare,
  Network, Palette, Rocket, Route, SlidersHorizontal, Upload, UserCog, Users,
};

type Filtre = Role | 'TOUS';

function Riche({ texte }: { texte: string }) {
  return (
    <>
      {segmentsGras(texte).map((morceau, i) =>
        morceau.gras ? (
          <strong key={i} className="font-semibold text-foreground">{morceau.texte}</strong>
        ) : (
          <span key={i}>{morceau.texte}</span>
        ),
      )}
    </>
  );
}

function texteSection(section: Section): string {
  const morceaux = [section.titre, section.resume];
  for (const bloc of section.blocs) {
    if (bloc.type === 'texte' || bloc.type === 'note') morceaux.push(bloc.texte);
    if (bloc.type === 'liste') morceaux.push(bloc.titre ?? '', ...bloc.elements);
    if (bloc.type === 'tableau') morceaux.push(...bloc.colonnes, ...bloc.lignes.flat());
    if (bloc.type === 'etapes') morceaux.push(bloc.titre ?? '', ...bloc.etapes.map((e) => e.texte));
  }
  return morceaux.join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function sansAccents(texte: string) {
  return texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------------------------------------------------------------- captures

function Superposition({
  donnees,
  actif,
  survoler,
}: {
  donnees: ReperesCapture;
  actif: number | null;
  survoler?: (numero: number | null) => void;
}) {
  const reperes = placerReperes(donnees);
  const { largeur: W, hauteur: H } = donnees;

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        {reperes.map((repere) => {
          const allume = actif === null || actif === repere.numero;
          return (
            <g key={repere.numero} className="transition-opacity duration-300" style={{ opacity: allume ? 1 : 0.18 }}>
              <rect
                x={repere.zone.x - 5}
                y={repere.zone.y - 5}
                width={repere.zone.l + 10}
                height={repere.zone.h + 10}
                rx={10}
                fill="var(--color-primary)"
                fillOpacity={actif === repere.numero ? 0.14 : 0.06}
                stroke="var(--color-primary)"
                strokeWidth={actif === repere.numero ? 4 : 3}
                strokeDasharray={actif === repere.numero ? undefined : '10 6'}
              />
              {repere.fleche && (
                <>
                  <line
                    x1={repere.fleche.x1}
                    y1={repere.fleche.y1}
                    x2={repere.fleche.x2}
                    y2={repere.fleche.y2}
                    stroke="var(--color-primary)"
                    strokeWidth={4.5}
                    strokeLinecap="round"
                  />
                  <polygon points={repere.fleche.pointe} fill="var(--color-primary)" />
                </>
              )}
            </g>
          );
        })}
      </svg>
      {reperes.map((repere) => (
        <span
          key={repere.numero}
          onMouseEnter={() => survoler?.(repere.numero)}
          onMouseLeave={() => survoler?.(null)}
          className={cn(
            'absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg ring-[3px] ring-white transition-transform duration-200',
            actif === repere.numero && 'scale-125',
            actif !== null && actif !== repere.numero && 'opacity-40',
          )}
          style={{ left: `${(repere.pastille.x / W) * 100}%`, top: `${(repere.pastille.y / H) * 100}%` }}
        >
          {repere.numero}
          {actif === repere.numero && <span className="absolute inset-0 animate-ping rounded-full bg-primary/50" />}
        </span>
      ))}
    </>
  );
}

function BlocEtapes({
  titre,
  capture,
  etapes,
  reperes,
}: {
  titre?: string;
  capture?: Capture;
  etapes: Etape[];
  reperes: Record<string, ReperesCapture>;
}) {
  const [actif, setActif] = useState<number | null>(null);
  const [agrandi, setAgrandi] = useState(false);
  const donnees = capture ? reperes[capture.fichier] : undefined;
  const source = capture ? `/api/documentation/captures/${capture.fichier}` : '';

  return (
    <div className="space-y-4">
      {titre && <h3 className="text-base font-semibold">{titre}</h3>}

      {capture && (
        <figure className="group">
          {donnees ? (
            <button
              type="button"
              onClick={() => setAgrandi(true)}
              className="relative block w-full overflow-hidden rounded-xl border bg-muted shadow-[var(--elevation-2)] ring-offset-2 transition-shadow hover:shadow-[var(--elevation-3,var(--elevation-2))] focus-visible:ring-2 focus-visible:ring-ring"
              style={{ aspectRatio: `${donnees.largeur} / ${donnees.hauteur}` }}
              aria-label={`Agrandir : ${capture.legende}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source} alt={capture.legende} loading="lazy" className="absolute inset-0 size-full object-cover" />
              <Superposition donnees={donnees} actif={actif} survoler={setActif} />
              <span className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Expand className="size-3" /> Agrandir
              </span>
            </button>
          ) : (
            <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 text-sm text-muted-foreground">
              <ImageOff className="size-6" />
              Capture en préparation
            </div>
          )}
          <figcaption className="mt-2 text-center text-xs text-muted-foreground">{capture.legende}</figcaption>
        </figure>
      )}

      <ol className="space-y-2">
        {etapes.map((etape, i) => {
          const numero = i + 1;
          const repere = Boolean(donnees?.reperes[String(numero)]);
          return (
            <li
              key={i}
              onMouseEnter={() => repere && setActif(numero)}
              onMouseLeave={() => setActif(null)}
              className={cn(
                'flex gap-3 rounded-xl border border-transparent p-2.5 text-sm leading-relaxed text-muted-foreground transition-colors',
                repere && 'cursor-default hover:border-primary/25 hover:bg-primary/5',
                actif === numero && 'border-primary/25 bg-primary/5',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  repere ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                )}
              >
                {numero}
              </span>
              <span className="pt-0.5"><Riche texte={etape.texte} /></span>
            </li>
          );
        })}
      </ol>

      {capture && donnees && (
        <Dialog open={agrandi} onOpenChange={setAgrandi}>
          <DialogContent className="max-w-[min(96vw,1400px)] p-3 sm:max-w-[min(96vw,1400px)]">
            <DialogTitle className="px-1 text-sm">{capture.legende}</DialogTitle>
            <div className="relative w-full overflow-hidden rounded-lg border" style={{ aspectRatio: `${donnees.largeur} / ${donnees.hauteur}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source} alt={capture.legende} className="absolute inset-0 size-full object-cover" />
              <Superposition donnees={donnees} actif={null} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- blocs

const TONS = {
  info: { icone: Info, libelle: 'Bon à savoir', classe: 'border-sky-500/30 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300' },
  attention: { icone: TriangleAlert, libelle: 'À retenir', classe: 'border-amber-500/35 bg-amber-500/[0.07] text-amber-700 dark:text-amber-300' },
  astuce: { icone: Lightbulb, libelle: 'Astuce', classe: 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300' },
} as const;

function RenduBloc({ bloc, reperes }: { bloc: Bloc; reperes: Record<string, ReperesCapture> }) {
  switch (bloc.type) {
    case 'texte':
      return <p className="text-sm leading-relaxed text-muted-foreground"><Riche texte={bloc.texte} /></p>;
    case 'note': {
      const ton = TONS[bloc.ton];
      const Icone = ton.icone;
      return (
        <div className={cn('flex gap-3 rounded-xl border p-4', ton.classe)}>
          <Icone className="mt-0.5 size-4 shrink-0" />
          <div className="text-sm leading-relaxed">
            <p className="mb-0.5 text-xs font-semibold tracking-wide uppercase">{ton.libelle}</p>
            <p className="text-foreground/80"><Riche texte={bloc.texte} /></p>
          </div>
        </div>
      );
    }
    case 'liste':
      return (
        <div>
          {bloc.titre && <h3 className="mb-2 text-base font-semibold">{bloc.titre}</h3>}
          <ul className="space-y-2">
            {bloc.elements.map((element, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span><Riche texte={element} /></span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'tableau':
      return (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-muted/60 text-left">
                {bloc.colonnes.map((colonne) => (
                  <th key={colonne} className="px-4 py-2.5 text-xs font-semibold tracking-wide text-foreground uppercase">{colonne}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloc.lignes.map((ligne, i) => (
                <tr key={i} className="border-t align-top transition-colors hover:bg-muted/30">
                  {ligne.map((cellule, j) => (
                    <td key={j} className={cn('px-4 py-2.5 leading-relaxed text-muted-foreground', j === 0 && 'w-1/4')}>
                      <Riche texte={cellule} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'etapes':
      return <BlocEtapes titre={bloc.titre} capture={bloc.capture} etapes={bloc.etapes} reperes={reperes} />;
  }
}

// -------------------------------------------------------------------- page

export function VueDocumentation({
  roleActeur,
  reperes,
}: {
  roleActeur: Role;
  reperes: Record<string, ReperesCapture>;
}) {
  const [filtre, setFiltre] = useState<Filtre>(roleActeur === 'SUPER_ADMIN' ? 'TOUS' : roleActeur);
  const [recherche, setRecherche] = useState('');
  const [actif, setActif] = useState<string>('');
  const [progression, setProgression] = useState(0);
  const [sommaireOuvert, setSommaireOuvert] = useState(false);

  const index = useMemo(() => {
    const carte = new Map<string, string>();
    DOCUMENTATION.forEach((partie) => partie.sections.forEach((section) => carte.set(section.id, texteSection(section))));
    return carte;
  }, []);

  const numeros = useMemo(() => {
    const carte = new Map<string, number>();
    let n = 0;
    DOCUMENTATION.forEach((partie) => partie.sections.forEach((section) => carte.set(section.id, ++n)));
    return carte;
  }, []);

  const terme = sansAccents(recherche.trim());
  const parties = DOCUMENTATION.map((partie) => ({
    ...partie,
    sections: partie.sections.filter(
      (section) =>
        (filtre === 'TOUS' || section.roles.includes(filtre)) && (!terme || index.get(section.id)!.includes(terme)),
    ),
  })).filter((partie) => partie.sections.length > 0);
  const visibles = parties.flatMap((partie) => partie.sections);
  const nombreCaptures = Object.keys(reperes).length;

  useEffect(() => {
    const observateur = new IntersectionObserver(
      (entrees) => {
        const visible = entrees.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActif(visible.target.id);
      },
      { rootMargin: '-90px 0px -65% 0px' },
    );
    document.querySelectorAll('[data-section-doc]').forEach((element) => observateur.observe(element));

    const defiler = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgression(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    defiler();
    window.addEventListener('scroll', defiler, { passive: true });
    return () => {
      observateur.disconnect();
      window.removeEventListener('scroll', defiler);
    };
  }, [filtre, recherche]);

  const lienPdf = `/api/documentation/pdf${filtre === 'TOUS' ? '' : `?role=${filtre}`}`;
  const filtres: { cle: Filtre; libelle: string }[] = [
    { cle: 'TOUS', libelle: 'Tous les rôles' },
    { cle: 'SUPER_ADMIN', libelle: LIBELLES_ROLES.SUPER_ADMIN },
    { cle: 'ADMIN', libelle: LIBELLES_ROLES.ADMIN },
    { cle: 'POINT_FOCAL', libelle: LIBELLES_ROLES.POINT_FOCAL },
  ];

  const sommaire = (
    <nav aria-label="Sommaire de la documentation" className="space-y-5">
      {parties.map((partie) => (
        <div key={partie.titre}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{partie.titre}</p>
          <ul className="space-y-0.5">
            {partie.sections.map((section) => {
              const Icone = ICONES[section.icone] ?? BookOpen;
              const courant = actif === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={() => setSommaireOuvert(false)}
                    className={cn(
                      'relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
                      courant ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {courant && <span className="absolute top-1.5 bottom-1.5 -left-0.5 w-[3px] rounded-full bg-primary" />}
                    <Icone className="size-4 shrink-0" />
                    <span className="truncate">{section.titre}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent" aria-hidden>
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progression}%` }} />
      </div>

      {/* En-tête */}
      <header className="relative mb-8 overflow-hidden rounded-3xl p-8 text-white shadow-[var(--elevation-2)] sm:p-10" style={{ backgroundImage: 'var(--gradient-primaire)' }}>
        <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-white/80 uppercase">
              <BookOpen className="size-4" /> Documentation
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Guide de la plateforme DIFFUSIO</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
              Chaque rubrique expliquée pas à pas, avec des captures annotées. Survolez une étape pour la repérer sur l’écran.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{numeros.size} rubriques</span>
              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{nombreCaptures} captures annotées</span>
              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">Vous êtes : {LIBELLES_ROLES[roleActeur]}</span>
            </div>
          </div>
          <a
            href={lienPdf}
            download
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Download className="size-4" />
            Télécharger en PDF
          </a>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[270px_minmax(0,1fr)]">
        {/* Colonne du sommaire */}
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-[var(--elevation-1,0_1px_2px_rgb(0_0_0/0.05))]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher dans la documentation"
                className="pr-8 pl-9"
                aria-label="Rechercher dans la documentation"
              />
              {recherche && (
                <button type="button" onClick={() => setRecherche('')} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Effacer la recherche">
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Afficher pour</p>
              <div className="flex flex-wrap gap-1.5">
                {filtres.map(({ cle, libelle }) => (
                  <button
                    key={cle}
                    type="button"
                    aria-pressed={filtre === cle}
                    onClick={() => setFiltre(cle)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs transition-all',
                      filtre === cle ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {libelle}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSommaireOuvert((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm font-medium lg:hidden"
              aria-expanded={sommaireOuvert}
            >
              Sommaire ({visibles.length})
              <span className={cn('transition-transform', sommaireOuvert && 'rotate-180')}>▾</span>
            </button>
            <div className={cn('lg:block', sommaireOuvert ? 'block' : 'hidden')}>{sommaire}</div>
          </div>
        </aside>

        {/* Contenu */}
        <div className="min-w-0 space-y-6">
          {terme && (
            <p className="text-sm text-muted-foreground">
              {visibles.length} rubrique{visibles.length > 1 ? 's' : ''} pour « {recherche} »
            </p>
          )}

          {visibles.length === 0 && (
            <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              Aucune rubrique ne correspond. Essayez un autre mot, ou affichez tous les rôles.
            </div>
          )}

          {parties.map((partie) => (
            <div key={partie.titre} className="space-y-6">
              <h2 className="flex items-center gap-3 pt-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {partie.titre}
                <span className="h-px flex-1 bg-border" />
              </h2>
              {partie.sections.map((section) => {
                const Icone = ICONES[section.icone] ?? BookOpen;
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    data-section-doc
                    className="surgir scroll-mt-28 rounded-2xl border bg-card p-6 shadow-[var(--elevation-1,0_1px_2px_rgb(0_0_0/0.05))] sm:p-8"
                  >
                    <div className="mb-6 flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[var(--elevation-2)]" style={{ backgroundImage: 'var(--gradient-primaire)' }}>
                        <Icone className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-primary">{String(numeros.get(section.id)).padStart(2, '0')}</p>
                        <h2 className="text-xl font-semibold tracking-tight">{section.titre}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{section.resume}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(section.roles.length === 3 ? ['Tous les rôles'] : section.roles.map((role) => LIBELLES_ROLES[role])).map((libelle) => (
                            <span key={libelle} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{libelle}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {section.blocs.map((bloc, i) => (
                        <RenduBloc key={i} bloc={bloc} reperes={reperes} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {progression > 8 && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed right-6 bottom-6 z-40 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:-translate-y-0.5"
          aria-label="Revenir en haut"
        >
          <ArrowUp className="size-5" />
        </button>
      )}
    </div>
  );
}
