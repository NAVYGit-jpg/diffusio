'use client';

import {
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  Gauge,
  Hand,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Scan,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { initiales } from '@/components/avatar-utilisateur';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type Personne = {
  nom: string;
  prenoms: string;
  email: string;
  fonction: string | null;
  actif: boolean;
};

export type NoeudStructure = {
  id: string;
  nom: string;
  sigle: string;
  parentId: string | null;
  superviseurs: Personne[];
  pointsFocaux: (Personne & { estTitulaire: boolean })[];
  publications: { id: string; nom: string; periodicite: string; libellePeriodicite: string }[];
  indicateurs: { id: string; nom: string; publication: { nom: string } | null }[];
};

const MAX_LISTE = 5;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1.6;

// ------------------------------------------------------------------ carte

function Pastille({ personne, chef, large }: { personne: Personne; chef?: boolean; large?: boolean }) {
  return (
    <li
      className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5', !personne.actif && 'opacity-50')}
      title={`${personne.email}${personne.fonction ? ` — ${personne.fonction}` : ''}`}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
          chef ? 'bg-foreground text-background' : 'bg-[var(--couleur-primaire-douce)] text-[var(--couleur-primaire-lisible)]',
        )}
      >
        {initiales(`${personne.prenoms} ${personne.nom}`)}
      </span>
      <span className="min-w-0">
        <span className={cn('block font-medium', large ? 'text-sm' : 'truncate text-xs')}>
          {personne.prenoms} {personne.nom}
        </span>
        {large && (
          <span className="block text-xs text-muted-foreground">
            {[personne.fonction, personne.email].filter(Boolean).join(' · ')}
            {!personne.actif && ' · compte désactivé'}
          </span>
        )}
      </span>
    </li>
  );
}

function Rubrique({
  Icone,
  titre,
  nombre,
  children,
}: {
  Icone: typeof FileText;
  titre: string;
  nombre: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border/70 px-3 py-2">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icone className="size-3" aria-hidden />
        {titre}
        <span className="ml-auto rounded-full bg-muted px-1.5 tabular-nums">{nombre}</span>
      </p>
      {nombre === 0 ? <p className="px-2 text-xs text-muted-foreground">—</p> : children}
    </div>
  );
}

function CarteStructure({
  noeud,
  racine,
  complet,
  surligne,
  ouvrir,
}: {
  noeud: NoeudStructure;
  racine: boolean;
  complet: boolean;
  surligne: boolean;
  ouvrir: () => void;
}) {
  const limite = complet ? Infinity : MAX_LISTE;

  return (
    <div
      role="button"
      tabIndex={0}
      data-carte-org={noeud.id}
      onClick={ouvrir}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), ouvrir())}
      className={cn(
        'w-64 cursor-pointer overflow-hidden rounded-2xl border bg-card text-left shadow-[var(--elevation-2)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--elevation-4)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        surligne && 'ring-4 ring-primary/60',
      )}
    >
      <div
        className={cn('px-3 py-3', racine ? 'text-white' : 'bg-[var(--couleur-primaire-douce)]')}
        style={racine ? { backgroundImage: 'var(--gradient-primaire)' } : undefined}
      >
        <span
          className={cn(
            'inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold',
            racine ? 'bg-white/20' : 'bg-card text-[var(--couleur-primaire-lisible)]',
          )}
        >
          {noeud.sigle}
        </span>
        <p className="mt-1 text-sm font-semibold leading-snug">{noeud.nom}</p>
      </div>

      <Rubrique Icone={ShieldCheck} titre="Superviseurs" nombre={noeud.superviseurs.length}>
        <ul>
          {noeud.superviseurs.slice(0, limite).map((personne) => (
            <Pastille key={personne.email} personne={personne} chef />
          ))}
        </ul>
      </Rubrique>

      <Rubrique Icone={UserRound} titre="Points focaux" nombre={noeud.pointsFocaux.length}>
        <ul>
          {noeud.pointsFocaux.slice(0, limite).map((personne) => (
            <Pastille key={personne.email} personne={personne} />
          ))}
          {noeud.pointsFocaux.length > limite && (
            <li className="px-2 text-[11px] text-muted-foreground">+ {noeud.pointsFocaux.length - limite} autre(s)</li>
          )}
        </ul>
      </Rubrique>

      <Rubrique Icone={FileText} titre="Publications" nombre={noeud.publications.length}>
        <ul className="space-y-0.5 px-2">
          {noeud.publications.slice(0, limite).map((publication) => (
            <li key={publication.id} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate" title={publication.nom}>{publication.nom}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{publication.libellePeriodicite}</span>
            </li>
          ))}
          {noeud.publications.length > limite && (
            <li className="text-[11px] text-muted-foreground">+ {noeud.publications.length - limite} autre(s)</li>
          )}
        </ul>
      </Rubrique>

      <Rubrique Icone={Gauge} titre="Indicateurs" nombre={noeud.indicateurs.length}>
        <ul className="space-y-0.5 px-2">
          {noeud.indicateurs.slice(0, limite).map((indicateur) => (
            <li key={indicateur.id} className="truncate text-xs" title={indicateur.nom}>
              {indicateur.nom}
            </li>
          ))}
          {noeud.indicateurs.length > limite && (
            <li className="text-[11px] text-muted-foreground">+ {noeud.indicateurs.length - limite} autre(s)</li>
          )}
        </ul>
      </Rubrique>

      <p className="border-t border-border/70 px-3 py-1.5 text-center text-[11px] font-medium text-primary">
        Voir le détail
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ toile

export function OrganigrammeInteractif({ noeuds }: { noeuds: NoeudStructure[] }) {
  const ids = new Set(noeuds.map((noeud) => noeud.id));
  const racines = noeuds.filter((noeud) => !noeud.parentId || !ids.has(noeud.parentId));
  const enfantsDe = (id: string) => noeuds.filter((noeud) => noeud.parentId === id);

  const cadre = useRef<HTMLDivElement>(null);
  const contenu = useRef<HTMLDivElement>(null);
  const [vue, setVue] = useState({ x: 0, y: 0, zoom: 1 });
  const [glisse, setGlisse] = useState(false);
  const depart = useRef<{ x: number; y: number; vx: number; vy: number; bouge: boolean } | null>(null);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [complet, setComplet] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [ouverte, setOuverte] = useState<NoeudStructure | null>(null);

  /** Fait tenir tout l'organigramme dans la zone visible. */
  const ajuster = useCallback(() => {
    const zone = cadre.current;
    const arbre = contenu.current;
    if (!zone || !arbre) return;
    const largeur = arbre.scrollWidth;
    const hauteur = arbre.scrollHeight;
    const zoom = Math.min(1, Math.max(ZOOM_MIN, Math.min((zone.clientWidth - 48) / largeur, (zone.clientHeight - 48) / hauteur)));
    setVue({ zoom, x: (zone.clientWidth - largeur * zoom) / 2, y: 24 });
  }, []);

  useEffect(() => {
    const minuterie = setTimeout(ajuster, 50);
    return () => clearTimeout(minuterie);
  }, [ajuster, pleinEcran, complet]);

  /** Zoom autour d'un point de la zone (le curseur, ou le centre). */
  const zoomer = useCallback((facteur: number, px?: number, py?: number) => {
    const zone = cadre.current;
    if (!zone) return;
    setVue((v) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * facteur));
      const cx = px ?? zone.clientWidth / 2;
      const cy = py ?? zone.clientHeight / 2;
      return { zoom, x: cx - ((cx - v.x) * zoom) / v.zoom, y: cy - ((cy - v.y) * zoom) / v.zoom };
    });
  }, []);

  // Molette : défilement ; Ctrl + molette : zoom. Écouteur non passif pour bloquer la page.
  useEffect(() => {
    const zone = cadre.current;
    if (!zone) return;
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = zone.getBoundingClientRect();
        zoomer(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        setVue((v) => ({ ...v, x: v.x - (e.shiftKey ? e.deltaY : e.deltaX), y: v.y - (e.shiftKey ? 0 : e.deltaY) }));
      }
    };
    zone.addEventListener('wheel', molette, { passive: false });
    return () => zone.removeEventListener('wheel', molette);
  }, [zoomer]);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && setPleinEcran(false);
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, []);

  /** Amène une structure au centre et la met en évidence. */
  const centrerSur = (id: string) => {
    const zone = cadre.current;
    const carte = contenu.current?.querySelector<HTMLElement>(`[data-carte-org="${id}"]`);
    if (!zone || !carte || !contenu.current) return;
    const base = contenu.current.getBoundingClientRect();
    const rect = carte.getBoundingClientRect();
    const zoom = Math.max(vue.zoom, 0.85);
    const cx = (rect.left - base.left + rect.width / 2) / vue.zoom;
    const cy = (rect.top - base.top) / vue.zoom;
    setVue({ zoom, x: zone.clientWidth / 2 - cx * zoom, y: 40 - cy * zoom });
  };

  const terme = recherche.trim().toLowerCase();
  const trouvees = terme
    ? noeuds.filter((noeud) => `${noeud.sigle} ${noeud.nom}`.toLowerCase().includes(terme))
    : [];

  const Branche = ({ noeud, racine }: { noeud: NoeudStructure; racine: boolean }) => {
    const enfants = enfantsDe(noeud.id);
    return (
      <li className="noeud">
        <CarteStructure
          noeud={noeud}
          racine={racine}
          complet={complet}
          surligne={trouvees.some((t) => t.id === noeud.id)}
          ouvrir={() => !depart.current?.bouge && setOuverte(noeud)}
        />
        {enfants.length > 0 && (
          <ul className="branches">
            {enfants.map((enfant) => (
              <Branche key={enfant.id} noeud={enfant} racine={false} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  const bouton = 'flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border bg-card/60 shadow-[var(--elevation-1)]',
        pleinEcran && 'fixed inset-3 z-50 rounded-2xl bg-background shadow-2xl',
      )}
    >
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-card/80 px-3 py-2 backdrop-blur">
        <div className="relative w-full max-w-64 sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && trouvees[0] && centrerSur(trouvees[0].id)}
            placeholder="Trouver une structure…"
            className="h-8 pl-8"
            aria-label="Trouver une structure"
          />
        </div>
        {terme && (
          <div className="flex flex-wrap gap-1">
            {trouvees.length === 0 ? (
              <span className="text-xs text-muted-foreground">Aucune structure</span>
            ) : (
              trouvees.slice(0, 6).map((noeud) => (
                <button
                  key={noeud.id}
                  type="button"
                  onClick={() => centrerSur(noeud.id)}
                  className="rounded-full border px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
                >
                  {noeud.sigle || noeud.nom}
                </button>
              ))
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 rounded-xl border bg-background p-0.5">
          <button type="button" className={bouton} onClick={() => zoomer(1 / 1.2)} aria-label="Dézoomer" title="Dézoomer">
            <Minus className="size-4" />
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(vue.zoom * 100)} %</span>
          <button type="button" className={bouton} onClick={() => zoomer(1.2)} aria-label="Zoomer" title="Zoomer">
            <Plus className="size-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <button type="button" className={bouton} onClick={ajuster} aria-label="Tout afficher" title="Tout afficher">
            <Scan className="size-4" />
          </button>
          <button
            type="button"
            className={bouton}
            onClick={() => setComplet((v) => !v)}
            aria-pressed={complet}
            aria-label={complet ? 'Réduire les listes' : 'Déplier toutes les listes'}
            title={complet ? 'Réduire les listes' : 'Déplier toutes les listes'}
          >
            {complet ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
          </button>
          <button
            type="button"
            className={bouton}
            onClick={() => setPleinEcran((v) => !v)}
            aria-label={pleinEcran ? 'Quitter le plein écran' : 'Plein écran'}
            title={pleinEcran ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
          >
            {pleinEcran ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>

      {/* Zone manipulable */}
      <div
        ref={cadre}
        className={cn(
          'relative touch-none overflow-hidden select-none',
          pleinEcran ? 'h-[calc(100%-49px)]' : 'h-[70vh] min-h-[420px]',
          glisse ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{
          backgroundImage: 'radial-gradient(circle, color-mix(in oklab, var(--foreground) 12%, transparent) 1px, transparent 1px)',
          backgroundSize: `${22 * vue.zoom}px ${22 * vue.zoom}px`,
          backgroundPosition: `${vue.x}px ${vue.y}px`,
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          depart.current = { x: e.clientX, y: e.clientY, vx: vue.x, vy: vue.y, bouge: false };
        }}
        onPointerMove={(e) => {
          const d = depart.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.bouge && Math.hypot(dx, dy) > 4) {
            d.bouge = true;
            setGlisse(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (d.bouge) setVue((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
        }}
        onPointerUp={() => {
          setGlisse(false);
          // Laisse passer le clic qui suit, puis oublie le glissement.
          setTimeout(() => (depart.current = null), 0);
        }}
      >
        <div
          ref={contenu}
          className="organigramme absolute top-0 left-0 w-max origin-top-left p-6"
          style={{ transform: `translate(${vue.x}px, ${vue.y}px) scale(${vue.zoom})` }}
        >
          <ul className="branches">
            {racines.map((racine) => (
              <Branche key={racine.id} noeud={racine} racine />
            ))}
          </ul>
        </div>

        <p className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          <Hand className="size-3.5" /> Glisser pour déplacer · Ctrl + molette pour zoomer · Cliquer une structure pour le détail
        </p>
      </div>

      {/* Détail d'une structure */}
      <Dialog open={ouverte !== null} onOpenChange={(o) => !o && setOuverte(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {ouverte && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="rounded-md bg-[var(--couleur-primaire-douce)] px-1.5 py-0.5 text-xs font-bold text-[var(--couleur-primaire-lisible)]">
                    {ouverte.sigle}
                  </span>
                  {ouverte.nom}
                </DialogTitle>
                <DialogDescription>
                  {ouverte.superviseurs.length} superviseur(s) · {ouverte.pointsFocaux.length} point(s) focal(aux) ·{' '}
                  {ouverte.publications.length} publication(s) · {ouverte.indicateurs.length} indicateur(s)
                  {enfantsDe(ouverte.id).length > 0 && ` · ${enfantsDe(ouverte.id).length} structure(s) rattachée(s)`}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <section>
                  <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="size-3.5" /> Superviseurs
                  </h3>
                  {ouverte.superviseurs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun</p>
                  ) : (
                    <ul>{ouverte.superviseurs.map((p) => <Pastille key={p.email} personne={p} chef large />)}</ul>
                  )}
                </section>
                <section>
                  <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <UserRound className="size-3.5" /> Points focaux
                  </h3>
                  {ouverte.pointsFocaux.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun</p>
                  ) : (
                    <ul>
                      {ouverte.pointsFocaux.map((p) => (
                        <div key={p.email} className="flex items-center">
                          <Pastille personne={p} large />
                          {p.estTitulaire && (
                            <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Titulaire</span>
                          )}
                        </div>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="size-3.5" /> Publications ({ouverte.publications.length})
                </h3>
                {ouverte.publications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune</p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {ouverte.publications.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span>{p.nom}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{p.libellePeriodicite}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Gauge className="size-3.5" /> Indicateurs ({ouverte.indicateurs.length})
                </h3>
                {ouverte.indicateurs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun</p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {ouverte.indicateurs.map((i) => (
                      <li key={i.id} className="px-3 py-2 text-sm">
                        {i.nom}
                        {i.publication && <span className="block text-xs text-muted-foreground">Publié dans {i.publication.nom}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
