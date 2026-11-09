import { auth } from '@/auth';
import { chargerChartePdf } from '@/lib/pdf/charte';
import { genererDocumentationPdf } from '@/lib/pdf/documentation';

export const maxDuration = 60;

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'] as const;

/**
 * The platform documentation as a PDF, built from the same source as the web
 * page (documentation/contenu.ts). `?role=` narrows it to one role's sections;
 * `?role=tous` (or nothing) gives the complete guide.
 */
export async function GET(requete: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return new Response('Authentification requise.', { status: 401 });
  }

  const demande = new URL(requete.url).searchParams.get('role');
  const role = ROLES.find((valeur) => valeur === demande) ?? null;

  const charte = await chargerChartePdf(session.user.organisationId);
  const pdf = await genererDocumentationPdf(charte, role);
  const suffixe = role ? `-${role.toLowerCase().replace('_', '-')}` : '';

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="documentation-diffusio${suffixe}.pdf"`,
      'cache-control': 'private, max-age=300',
    },
  });
}
