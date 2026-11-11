import { auth } from '@/auth';
import { adresseApplication } from '@/lib/email/adresse';
import { modeleRappel } from '@/lib/email/modeles';
import { prisma } from '@/lib/prisma';

/**
 * Aperçu d'un e-mail automatique (rappel avant échéance), rendu avec la vraie
 * identité de l'organisation : logo, couleurs, adresses des images. Réservé au
 * super administrateur ; rien n'est envoyé.
 */
export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return new Response('Accès refusé.', { status: 403 });
  }

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: session.user.organisationId },
    select: {
      nom: true,
      sigle: true,
      couleurPrimaire: true,
      couleurSecondaire: true,
      logoUrl: true,
      logoMimeType: true,
    },
  });

  const modele = modeleRappel({
    organisation,
    typeProduit: 'PUBLICATION',
    nomElement: 'Indice des prix à la consommation',
    nomPointFocal: 'Prénom Nom',
    periode: 'Octobre 2026',
    dateDebutCouverture: '01/10/2026',
    dateFinCouverture: '31/10/2026',
    dateDiffusionPrevue: '20/11/2026',
    joursRestants: 5,
    lien: `${adresseApplication()}/etat-calendrier?onglet=imminentes`,
  });

  return new Response(modele.corpsHtml, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
