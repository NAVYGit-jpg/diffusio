import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { libelleStatut, statutAffiche } from '@/lib/calendrier/statuts';
import type { LigneSource } from '@/lib/exports/calendrier-excel';
import type { ChartePdf } from './charte';
import { DocumentMarque, PageContenu, PageDeGarde, Tableau, TitreSection } from './composants';

/** Release calendar as a PDF: one landscape table, sorted like the Excel file. */
export async function genererCalendrierPdf(
  lignes: LigneSource[],
  charte: ChartePdf,
  annee: number,
  perimetre: string,
  editeur: string,
): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const edite = new Date();
  const publiees = lignes.filter((ligne) => ligne.dateDiffusionReelle !== null).length;

  return renderToBuffer(
    <DocumentMarque charte={charte} titre={`Calendrier de diffusion ${annee}`}>
      <PageDeGarde
        charte={charte}
        surtitre="Calendrier de diffusion"
        titre={`Calendrier de diffusion ${annee}`}
        periode={`Année ${annee}`}
        details={[
          ['Périmètre', perimetre],
          ['Lignes', `${lignes.length} diffusion(s) prévue(s)`],
          ['Déjà publiées', String(publiees)],
          ['Édité le', formaterJJMMAAAA(edite)],
          ['Édité par', editeur],
        ]}
      />
      <PageContenu
        charte={charte}
        paysage
        rappel={`Calendrier ${annee} — ${perimetre}`}
        edition={`Calendrier édité le ${formaterJJMMAAAA(edite)}`}
      >
        <TitreSection charte={charte} sousTitre="Trié par structure puis par date de diffusion prévue.">
          Diffusions prévues
        </TitreSection>
        <Tableau
          charte={charte}
          colonnes={[
            { titre: 'Structure', largeur: 9 },
            { titre: 'Produit', largeur: 27 },
            { titre: 'Période', largeur: 13 },
            { titre: 'Prévue le', largeur: 10 },
            { titre: 'Publiée le', largeur: 10 },
            { titre: 'Statut', largeur: 12 },
            { titre: 'Point focal', largeur: 19 },
          ]}
          lignes={lignes.map((ligne) => [
            ligne.structureSigle,
            ligne.nomElement,
            ligne.libellePeriode,
            formaterJJMMAAAA(ligne.dateDiffusionPrevue),
            ligne.dateDiffusionReelle ? formaterJJMMAAAA(ligne.dateDiffusionReelle) : '—',
            libelleStatut(statutAffiche(ligne, edite)),
            ligne.pointFocal ?? '—',
          ])}
        />
      </PageContenu>
    </DocumentMarque>,
  );
}
