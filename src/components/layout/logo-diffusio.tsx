import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * DIFFUSIO wordmark, in its light-background and dark-background versions.
 *
 * The two files are swapped by CSS rather than by JavaScript: reading the
 * current theme in React would need the component to mount first, and the wrong
 * logo would flash on every page load. `dark:` classes are resolved by the
 * browser before anything paints.
 *
 * Both are rendered, one of them hidden — the cost is one extra cached image,
 * against a visible flicker on every navigation.
 */
export function LogoDiffusio({
  hauteur = 28,
  className,
  priorite = false,
}: {
  hauteur?: number;
  className?: string;
  /** Set on the sign-in screen, where the logo is the main visual element. */
  priorite?: boolean;
}) {
  const largeur = Math.round(hauteur * 5);
  const commun = 'w-auto object-contain';

  return (
    <>
      <Image
        src="/logo-diffusio.png"
        alt="DIFFUSIO"
        width={largeur}
        height={hauteur}
        priority={priorite}
        className={cn(commun, 'dark:hidden', className)}
        style={{ height: hauteur, width: 'auto' }}
      />
      <Image
        src="/logo-diffusio-blanc.png"
        alt="DIFFUSIO"
        width={largeur}
        height={hauteur}
        priority={priorite}
        aria-hidden
        className={cn(commun, 'hidden dark:block', className)}
        style={{ height: hauteur, width: 'auto' }}
      />
    </>
  );
}
