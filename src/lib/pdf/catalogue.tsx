import { View } from '@react-pdf/renderer';

import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import {
  type ElementCatalogue,
  libellePeriodicite,
  statistiquesCatalogue,
} from '@/lib/catalogue/statistiques';
import type { ChartePdf } from './charte';
import {
  BarresHorizontales,
  DocumentMarque,
  GrilleIndicateurs,
  PageContenu,
  PageDeGarde,
  Tableau,
  TitreSection,
} from './composants';

export function CataloguePdf({
  elements,
  charte,
  editeur,
  edite,
}: {
  elements: ElementCatalogue[];
  charte: ChartePdf;
  editeur: string;
  edite: Date;
}) {
  const stats = statistiquesCatalogue(elements);
  const situation = `Situation au ${formaterJJMMAAAA(edite)}`;
  const publications = elements.filter((element) => element.type === 'PUBLICATION');
  const indicateurs = elements.filter((element) => element.type === 'INDICATEUR');

  return (
    <DocumentMarque charte={charte} titre="Catalogue des publications et indicateurs">
      <PageDeGarde
        charte={charte}
        surtitre="Catalogue"
        titre="Publications et indicateurs statistiques"
        periode={situation}
        details={[
          ['Publications', String(stats.publications)],
          ['Indicateurs', String(stats.indicateurs)],
          ['Structures', String(stats.structuresCouvertes)],
          ['Édité le', formaterJJMMAAAA(edite)],
          ['Édité par', editeur],
        ]}
      />

      <PageContenu charte={charte} rappel={`Catalogue — ${situation}`} edition={`Catalogue édité le ${formaterJJMMAAAA(edite)}`}>
        <TitreSection charte={charte}>Vue d’ensemble</TitreSection>
        <GrilleIndicateurs
          charte={charte}
          indicateurs={[
            { libelle: 'Produits au catalogue', valeur: String(stats.total), precision: `${stats.actifs} actif(s)` },
            { libelle: 'Publications', valeur: String(stats.publications) },
            { libelle: 'Indicateurs', valeur: String(stats.indicateurs) },
            {
              libelle: 'Délai moyen de diffusion',
              valeur: stats.delaiMoyen === null ? '—' : `${stats.delaiMoyen} j`,
              precision: `${stats.domainesCouverts} domaine(s) couvert(s)`,
            },
          ]}
        />

        <TitreSection charte={charte}>Répartition par périodicité</TitreSection>
        <BarresHorizontales charte={charte} parts={stats.parPeriodicite} />
        <TitreSection charte={charte}>Répartition par domaine</TitreSection>
        <BarresHorizontales charte={charte} parts={stats.parDomaine} couleur={charte.accent} />
        <TitreSection charte={charte}>Répartition par structure</TitreSection>
        <BarresHorizontales charte={charte} parts={stats.parStructure} />

        <View break>
          <TitreSection charte={charte} sousTitre={`${publications.length} publication(s)`}>
            Publications
          </TitreSection>
          <Tableau
            charte={charte}
            colonnes={[
              { titre: 'Publication', largeur: 42 },
              { titre: 'Structure', largeur: 14 },
              { titre: 'Domaine', largeur: 20 },
              { titre: 'Périodicité', largeur: 14 },
              { titre: 'Délai', largeur: 10, aDroite: true },
            ]}
            // No point focal: the printed catalogue circulates outside the
            // organisation and names no one.
            lignes={publications.map((element) => [
              element.nom,
              element.structure,
              element.domaine ?? '—',
              libellePeriodicite(element.periodicite),
              `${element.delaiJours} j`,
            ])}
          />
        </View>

        <View break>
          <TitreSection charte={charte} sousTitre={`${indicateurs.length} indicateur(s)`}>
            Indicateurs
          </TitreSection>
          <Tableau
            charte={charte}
            colonnes={[
              { titre: 'Indicateur', largeur: 32 },
              { titre: 'Unité', largeur: 10 },
              { titre: 'Publication', largeur: 22 },
              { titre: 'Structure', largeur: 12 },
              { titre: 'Périodicité', largeur: 14 },
              { titre: 'Délai', largeur: 10, aDroite: true },
            ]}
            lignes={indicateurs.map((element) => [
              element.nom,
              element.unite ?? '—',
              element.publication ?? '—',
              element.structure,
              libellePeriodicite(element.periodicite),
              `${element.delaiJours} j`,
            ])}
          />
        </View>
      </PageContenu>
    </DocumentMarque>
  );
}

export async function genererCataloguePdf(
  elements: ElementCatalogue[],
  charte: ChartePdf,
  editeur: string,
): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');

  return renderToBuffer(
    <CataloguePdf elements={elements} charte={charte} editeur={editeur} edite={new Date()} />,
  );
}
