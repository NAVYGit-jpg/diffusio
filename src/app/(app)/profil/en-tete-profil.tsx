'use client';

import { Building2, Camera, Clock, Loader2, Mail, Trash2 } from 'lucide-react';
import { useActionState, useRef } from 'react';

import { AvatarUtilisateur } from '@/components/avatar-utilisateur';
import { Badge } from '@/components/ui/badge';
import { type EtatPhoto, retirerPhotoAction, televerserPhotoAction } from '@/lib/actions/photo';

/** Profile header: banner, editable photo, identity and key details. */
export function EnTeteProfil({
  photo,
  nomComplet,
  role,
  fonction,
  email,
  structure,
  derniereConnexion,
}: {
  photo: string | null;
  nomComplet: string;
  role: string;
  fonction: string | null;
  email: string;
  structure: string | null;
  derniereConnexion: string | null;
}) {
  const [etat, action, enCours] = useActionState<EtatPhoto, FormData>(televerserPhotoAction, {});
  const formulaire = useRef<HTMLFormElement>(null);

  return (
    <section className="mb-6 overflow-hidden rounded-[1.75rem] verre">
      <div className="relative h-36 sm:h-44" style={{ backgroundImage: 'var(--gradient-primaire)' }}>
        <div className="absolute -right-10 -top-16 size-64 rounded-full bg-white/15 blur-2xl" aria-hidden />
        <div className="absolute bottom-0 left-1/3 size-40 rounded-full bg-black/10 blur-2xl" aria-hidden />
      </div>

      <div className="relative px-6 pb-6 sm:px-8">
        <div className="-mt-16 flex flex-wrap items-end gap-5">
          <form ref={formulaire} action={action} className="relative">
            <AvatarUtilisateur
              photo={photo}
              nomComplet={nomComplet}
              className="size-32 border-4 border-card text-3xl shadow-[var(--elevation-3)]"
            />
            <label
              className="absolute bottom-1 right-1 flex size-10 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105"
              title="Changer la photo"
            >
              {enCours ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
              <span className="sr-only">Changer la photo</span>
              <input
                type="file"
                name="photo"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={() => formulaire.current?.requestSubmit()}
              />
            </label>
          </form>

          <div className="min-w-0 flex-1 pb-1">
            <h1 className="text-3xl font-normal tracking-tight">{nomComplet}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{role}</Badge>
              {fonction && <span className="text-sm text-muted-foreground">{fonction}</span>}
            </div>
          </div>

          {photo && (
            <form action={retirerPhotoAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground shadow-[var(--elevation-1)] transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
                Retirer la photo
              </button>
            </form>
          )}
        </div>

        {etat.erreur && <p className="mt-3 text-sm text-destructive">{etat.erreur}</p>}

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icone: Mail, libelle: 'Adresse de connexion', valeur: email },
            { icone: Building2, libelle: 'Structure', valeur: structure ?? 'Toute l’organisation' },
            {
              icone: Clock,
              libelle: 'Dernière connexion',
              valeur: derniereConnexion ? new Date(derniereConnexion).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '—',
            },
          ].map(({ icone: Icone, libelle, valeur }) => (
            <div key={libelle} className="flex items-center gap-3 rounded-2xl border bg-card/70 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--couleur-primaire-douce)] text-[var(--couleur-primaire-lisible)]">
                <Icone className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{libelle}</dt>
                <dd className="truncate text-sm font-medium">{valeur}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
