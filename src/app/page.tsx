import { redirect } from 'next/navigation';

import { auth } from '@/auth';

export default async function PageAccueil() {
  const session = await auth();

  if (!session?.user) {
    redirect('/connexion');
  }

  redirect(
    session.user.mustChangePassword ? '/premiere-connexion' : '/tableau-de-bord',
  );
}
