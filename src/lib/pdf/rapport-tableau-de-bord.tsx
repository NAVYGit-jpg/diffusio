import { Text, View } from '@react-pdf/renderer';

import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { LIBELLE_STATUT_PLURIEL } from '@/lib/calendrier/statuts';
import type { Rapport } from '@/lib/tableau-bord/rapport';
import type { ChartePdf } from './charte';
import {
  BarresHorizontales,
  BarresVerticales,
  DocumentMarque,
  Encadre,
  GrilleIndicateurs,
  PageContenu,
  PageDeGarde,
  Tableau,
  TitreSection,
  couleursPdf,
} from './composants';

/**
 * Dashboard report, composed from the same `Rapport` as the screen and the
 * Excel file — the three cannot disagree.
 */
export function RapportTableauDeBordPdf({
  rapport,
  charte,
  editeur,
}: {
  rapport: Rapport;
  charte: ChartePdf;
  editeur: string;
}) {
  const { respect, etat, echeances, nombres, avancement, courbe, classement } = rapport;
  const edition = `Rapport édité le ${formaterJJMMAAAA(rapport.genereLe)}`;

  const partsStatut = [
    { libelle: LIBELLE_STATUT_PLURIEL.PLANIFIE, nombre: nombres.planifiees },
    { libelle: LIBELLE_STATUT_PLURIEL.TELEVERSE, nombre: nombres.televersees },
    { libelle: LIBELLE_STATUT_PLURIEL.MIS_EN_LIGNE, nombre: nombres.misesEnLigne },
    { libelle: LIBELLE_STATUT_PLURIEL.EN_RETARD, nombre: nombres.enRetard },
    { libelle: LIBELLE_STATUT_PLURIEL.ANNULE, nombre: nombres.annulees },
  ].filter((part) => part.nombre > 0);

  return (
    <DocumentMarque charte={charte} titre={`Rapport de diffusion — ${rapport.periode}`}>
      <PageDeGarde
        charte={charte}
        surtitre="Rapport de suivi"
        titre="Tableau de bord du calendrier de diffusion"
        periode={rapport.periode}
        details={[
          ['Périmètre', rapport.perimetre],
          ['Filtres', rapport.filtresLisibles.length === 0 ? 'Aucun — tout le périmètre' : rapport.filtresLisibles.join(' ; ')],
          ['Lignes retenues', `${nombres.total} ligne(s) du calendrier`],
          ['Édité le', formaterJJMMAAAA(rapport.genereLe)],
          ['Édité par', editeur],
        ]}
      />

      <PageContenu charte={charte} rappel={`${rapport.periode} — ${rapport.perimetre}`} edition={edition}>
        <TitreSection charte={charte} sousTitre="Chiffres clés du périmètre et de la période retenus.">
          Synthèse
        </TitreSection>
        <GrilleIndicateurs
          charte={charte}
          indicateurs={[
            {
              libelle: 'Taux de respect des délais',
              valeur: respect.taux === null ? '—' : `${respect.taux} %`,
              precision: respect.base === 0 ? 'Aucune échéance passée' : `${respect.respectees} sur ${respect.base} ligne(s) jugeable(s)`,
            },
            {
              libelle: 'Taux de publication',
              valeur: `${avancement} %`,
              precision: `${nombres.misesEnLigne} publiée(s) sur ${nombres.total}`,
              ton: avancement >= 80 ? 'positif' : avancement < 50 ? 'alerte' : undefined,
            },
            {
              libelle: 'En retard, non publiées',
              valeur: String(etat.nonPubliees),
              precision: 'Échéance passée, rien en ligne',
              ton: etat.nonPubliees > 0 ? 'alerte' : 'positif',
            },
            {
              libelle: 'Publications imminentes',
              valeur: String(echeances.j15),
              precision: `Dont ${echeances.j7} sous sept jours`,
              ton: echeances.j7 > 0 ? 'alerte' : undefined,
            },
            {
              libelle: 'Publiées après échéance',
              valeur: String(etat.publieesApresEcheance),
              precision: `Sur ${etat.total} ligne(s) en retard`,
            },
            { libelle: 'Lignes prévues', valeur: String(nombres.total), precision: rapport.periode },
            {
              libelle: 'Livrées, à publier',
              valeur: String(nombres.enAttenteDePublication),
              precision: 'Mise en ligne à confirmer',
            },
            {
              libelle: 'Publiées',
              valeur: String(nombres.misesEnLigne),
              precision: `Dont ${nombres.misesEnLigne - etat.publieesApresEcheance} dans les délais`,
              ton: nombres.misesEnLigne > 0 ? 'positif' : undefined,
            },
          ]}
        />

        {rapport.commentaire.length > 0 && (
          <View>
            <TitreSection charte={charte}>Lecture des résultats</TitreSection>
            <Encadre charte={charte}>
              {rapport.commentaire.map((observation, index) => (
                <Text
                  key={index}
                  style={{
                    fontSize: 9,
                    lineHeight: 1.45,
                    marginBottom: 4,
                    color: observation.ton === 'alerte' ? '#b91c1c' : observation.ton === 'positif' ? '#047857' : couleursPdf.ENCRE,
                  }}
                >
                  {`•  ${observation.texte}`}
                </Text>
              ))}
            </Encadre>
          </View>
        )}

        <TitreSection
          charte={charte}
          sousTitre="Chaque ligne est comptée dans le mois où elle était attendue. Un tiret signale un mois sans échéance jugeable."
        >
          Taux de respect des délais par mois
        </TitreSection>
        <BarresVerticales
          charte={charte}
          points={courbe.map((point) => ({ libelle: point.libelle, valeur: point.taux }))}
        />

        <View break>
          <TitreSection charte={charte}>Répartition par statut</TitreSection>
          <BarresHorizontales charte={charte} parts={partsStatut} />

          <TitreSection charte={charte}>Répartition par domaine</TitreSection>
          <BarresHorizontales charte={charte} parts={rapport.parDomaine} couleur={charte.accent} />

          <TitreSection charte={charte}>Répartition par périodicité</TitreSection>
          <BarresHorizontales charte={charte} parts={rapport.parPeriodicite} />

          {rapport.parStructure.length > 1 && (
            <View>
              <TitreSection charte={charte}>Répartition par structure</TitreSection>
              <BarresHorizontales charte={charte} parts={rapport.parStructure} couleur={charte.accent} />
            </View>
          )}
        </View>

        {rapport.contexte.classementVisible && classement.length > 1 && (
          <View break>
            <TitreSection
              charte={charte}
              sousTitre="Par taux de respect des délais. Une structure sans échéance passée n'est pas encore mesurable."
            >
              Classement des structures
            </TitreSection>
            <Tableau
              charte={charte}
              colonnes={[
                { titre: 'Rang', largeur: 8 },
                { titre: 'Structure', largeur: 44 },
                { titre: 'Jugeables', largeur: 12, aDroite: true },
                { titre: 'Respectées', largeur: 12, aDroite: true },
                { titre: 'En retard', largeur: 12, aDroite: true },
                { titre: 'Taux', largeur: 12, aDroite: true },
              ]}
              lignes={classement.map((rang, index) => [
                rang.taux === null ? '—' : String(index + 1),
                rang.structureNom,
                String(rang.base),
                String(rang.respectees),
                String(rang.retards),
                rang.taux === null ? 'Non mesurable' : `${rang.taux} %`,
              ])}
            />
          </View>
        )}
      </PageContenu>
    </DocumentMarque>
  );
}

export async function genererRapportTableauDeBordPdf(
  rapport: Rapport,
  charte: ChartePdf,
  editeur: string,
): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');

  return renderToBuffer(
    <RapportTableauDeBordPdf rapport={rapport} charte={charte} editeur={editeur} />,
  );
}
