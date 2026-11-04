import { Mail, ShieldCheck, UserRound } from 'lucide-react';

import { initiales } from '@/components/avatar-utilisateur';
import { cn } from '@/lib/utils';

type Personne = {
  id: string;
  nom: string;
  prenoms: string;
  email: string;
  fonction: string | null;
  role: string;
  actif: boolean;
  structureId: string | null;
  estTitulaire?: boolean;
  structure?: { sigle: string } | null;
};

type Superviseur = Personne & { structuresAdmin: string[] };

/**
 * Supervisors and the points focaux they answer for.
 *
 * Being administrator of a structure makes one the superior of its points
 * focaux: each supervisor heads a branch, and a line runs from them to every
 * point focal of their structures — the same reading as the structure tree.
 */
export function HierarchieEquipes({
  superviseurs,
  pointsFocaux,
  sigles,
}: {
  superviseurs: Superviseur[];
  pointsFocaux: Personne[];
  sigles: Map<string, string>;
}) {
  const rattaches = new Set<string>();
  const branches = superviseurs.map((superviseur) => {
    const equipe = pointsFocaux.filter(
      (pointFocal) => pointFocal.structureId !== null && superviseur.structuresAdmin.includes(pointFocal.structureId),
    );
    equipe.forEach((pointFocal) => rattaches.add(pointFocal.id));
    return { superviseur, equipe };
  });
  const orphelins = pointsFocaux.filter((pointFocal) => !rattaches.has(pointFocal.id));

  const Carte = ({ personne, chef }: { personne: Personne; chef?: boolean }) => (
    <div
      className={cn(
        'surgir flex w-full max-w-xl items-center gap-3 rounded-2xl border bg-card p-3 shadow-[var(--elevation-1)]',
        chef && 'shadow-[var(--elevation-2)]',
        !personne.actif && 'opacity-55',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          chef ? 'text-white' : 'bg-[var(--couleur-primaire-douce)] text-[var(--couleur-primaire-lisible)]',
        )}
        style={chef ? { backgroundImage: 'var(--gradient-primaire)' } : undefined}
      >
        {initiales(`${personne.prenoms} ${personne.nom}`)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold">
            {personne.prenoms} {personne.nom}
          </span>
          {chef ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
              <ShieldCheck className="size-3" aria-hidden />
              Superviseur
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {personne.estTitulaire ? 'Titulaire' : 'Suppléant'}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {personne.fonction && <span>{personne.fonction}</span>}
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3" aria-hidden />
            {personne.email}
          </span>
          {chef
            ? (personne as Superviseur).structuresAdmin.map((id) => (
                <span key={id} className="rounded-md bg-[var(--couleur-primaire-douce)] px-1.5 font-bold text-[var(--couleur-primaire-lisible)]">
                  {sigles.get(id) ?? '—'}
                </span>
              ))
            : personne.structure && (
                <span className="rounded-md bg-[var(--couleur-primaire-douce)] px-1.5 font-bold text-[var(--couleur-primaire-lisible)]">
                  {personne.structure.sigle}
                </span>
              )}
        </span>
      </span>
    </div>
  );

  const Equipe = ({ membres }: { membres: Personne[] }) =>
    membres.length === 0 ? (
      <p className="ml-5 mt-3 border-l-2 border-dashed border-border pl-6 text-sm text-muted-foreground">
        Aucun point focal sur ses structures.
      </p>
    ) : (
      <ul className="ml-5 mt-3 space-y-3 border-l-2 border-border pl-6">
        {membres.map((membre) => (
          <li key={membre.id} className="relative">
            <span aria-hidden className="absolute -left-6 top-7 h-px w-6 bg-border" />
            <Carte personne={membre} />
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-8 rounded-3xl border bg-card/60 p-6">
      {branches.length === 0 && orphelins.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun utilisateur à afficher.</p>
      )}
      {branches.map(({ superviseur, equipe }) => (
        <div key={superviseur.id}>
          <Carte personne={superviseur} chef />
          <Equipe membres={equipe} />
        </div>
      ))}
      {orphelins.length > 0 && (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <UserRound className="size-4" aria-hidden />
            Points focaux sans superviseur
          </p>
          <Equipe membres={orphelins} />
        </div>
      )}
    </div>
  );
}
