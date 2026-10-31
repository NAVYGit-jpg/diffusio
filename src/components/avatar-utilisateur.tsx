import { cn } from '@/lib/utils';

/** Initials: "Elie N'DOUBA" gives "EN". */
export function initiales(nomComplet: string): string {
  return nomComplet
    .split(/[\s'’-]+/)
    .filter((morceau) => morceau.length > 0)
    .slice(0, 2)
    .map((morceau) => morceau[0].toUpperCase())
    .join('');
}

/**
 * A person's photo, or their initials on the organisation's gradient when no
 * photo was uploaded.
 */
export function AvatarUtilisateur({
  photo,
  nomComplet,
  className,
}: {
  /** `/api/avatar/<id>?v=…`, or null. */
  photo: string | null;
  nomComplet: string;
  className?: string;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt={nomComplet} className={cn('shrink-0 rounded-full object-cover', className)} />
    );
  }

  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ backgroundImage: 'var(--gradient-primaire)' }}
      aria-hidden
    >
      {initiales(nomComplet)}
    </span>
  );
}

export function adressePhoto(utilisateur: {
  id: string;
  photoMimeType: string | null;
  photoMajAt: Date | null;
}): string | null {
  return utilisateur.photoMimeType
    ? `/api/avatar/${utilisateur.id}?v=${utilisateur.photoMajAt?.getTime() ?? 0}`
    : null;
}
