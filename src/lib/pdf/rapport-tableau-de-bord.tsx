import { Text, View } from '@react-pdf/renderer';

import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { LIBELLE_STATUT_PLURIEL, libelleStatut, statutAffiche } from '@/lib/calendrier/statuts';
import type { Rapport } from '@/lib/tableau-bord/rapport';
import type { ChartePdf } from './charte';
import {
  BarresHorizontales,
  BarresColorees,
  BarreProgression,
  CourbeEvolution,
  DocumentMarque,
  Encadre,
  GrilleIndicateurs,
  PageContenu,
  PageDeGarde,
  Tableau,
  TitreSection,
  couleursPdf,
} from './composants';

/** Status colours of the screen, as hex: the PDF engine reads no CSS variable. */
const COULEUR_STATUT_PDF: Record<string, string> = {
  PLANIFIE: '#94a3b8',
  TELEVERSE: '#e0a526',
  MIS_EN_LIGNE: '#16a34a',
  EN_RETARD: '#dc2626',
  ANNULE: '#71717a',
};

/**
 * Dashboard report, composed from the same `Rapport` as the screen and the
 * Excel file — the three cannot disagree. Every block of the dashboard is
 * here: key figures, progress, the monthly curve, every breakdown, the
 * ranking, the next deadlines and the list of releases.
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
  const { respect, etat, echeances, nombres, avancement, courbe, classement, retards } = rapport;
  const edition = `Rapport édité le ${formaterJJMMAAAA(rapport.genereLe)}`;
  const catalogue = rapport.contexte.catalogue;
  const jour = rapport.genereLe.getTime() - 86_400_000;

  const partsStatut = [
    { cle: 'PLANIFIE', nombre: nombres.planifiees },
    { cle: 'TELEVERSE', nombre: nombres.televersees },
    { cle: 'MIS_EN_LIGNE', nombre: nombres.misesEnLigne },
    { cle: 'EN_RETARD', nombre: nombres.enRetard },
    { cle: 'ANNULE', nombre: nombres.annulees },
  ].map((part) => ({
    libelle: LIBELLE_STATUT_PLURIEL[part.cle as keyof typeof LIBELLE_STATUT_PLURIEL],
    nombre: part.nombre,
    couleur: COULEUR_STATUT_PDF[part.cle],
  }));

  const parDate = [...rapport.lignes].sort(
    (a, b) => a.dateDiffusionPrevue.getTime() - b.dateDiffusionPrevue.getTime(),
  );
  const prochaines = parDate
    .filter((ligne) => ligne.dateDiffusionReelle === null && ligne.statut !== 'ANNULE' && ligne.dateDiffusionPrevue.getTime() >= jour)
    .slice(0, 10);

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
            {
              libelle: 'Retard moyen',
              valeur: retards.moyen === null ? '—' : `${Math.round(retards.moyen)} j`,
              precision: retards.maximum === null ? 'Aucun retard' : `Maximum : ${retards.maximum} jour(s)`,
              ton: retards.nombre > 0 ? 'alerte' : undefined,
            },
            {
              libelle: 'Au catalogue',
              valeur: String(catalogue.publications + catalogue.indicateurs),
              precision: `${catalogue.publications} publication(s), ${catalogue.indicateurs} indicateur(s)`,
            },
            { libelle: 'Lignes prévues', valeur: String(nombres.total), precision: rapport.periode },
            {
              libelle: 'Livrées, à publier',
              valeur: String(nombres.enAttenteDePublication),
              precision: 'Fichiers déposés, mise en ligne à confirmer',
            },
            {
              libelle: 'Publiées',
              valeur: String(nombres.misesEnLigne),
              precision: `Dont ${nombres.misesEnLigne - etat.publieesApresEcheance} dans les délais`,
              ton: nombres.misesEnLigne > 0 ? 'positif' : undefined,
            },
            {
              libelle: 'Échéances à 30 jours',
              valeur: String(echeances.j30),
              precision: `${echeances.j7} à 7 jours · ${echeances.j15} à 15 jours`,
            },
            {
              libelle: 'Annulées',
              valeur: String(nombres.annulees),
              precision: 'Retirées du calendrier',
            },
          ]}
        />

        <TitreSection charte={charte} sousTitre={`${nombres.misesEnLigne} ligne(s) mise(s) en ligne sur ${nombres.total} inscrite(s) au calendrier.`}>
          {`Avancement — ${rapport.periode}`}
        </TitreSection>
        <BarreProgression charte={charte} pourcentage={avancement} legende="Part des diffusions déjà publiées" />

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

        <View break>
          <TitreSection
            charte={charte}
            sousTitre="Chaque ligne est comptée dans le mois où elle était attendue. Les mois sans échéance jugeable coupent la courbe."
          >
            Évolution mensuelle du taux de respect
          </TitreSection>
          <CourbeEvolution
            charte={charte}
            points={courbe.map((point) => ({ libelle: point.libelle, valeur: point.taux }))}
          />
          <Tableau
            charte={charte}
            colonnes={[
              { titre: 'Mois', largeur: 40 },
              { titre: 'Lignes jugeables', largeur: 30, aDroite: true },
              { titre: 'Taux de respect', largeur: 30, aDroite: true },
            ]}
            lignes={courbe
              .filter((point) => point.base > 0)
              .map((point) => [point.libelle, String(point.base), point.taux === null ? '—' : `${point.taux} %`])}
          />

          <TitreSection charte={charte} sousTitre={`État actuel des ${nombres.total + nombres.annulees} ligne(s) du calendrier.`}>
            Répartition par statut
          </TitreSection>
          <BarresColorees parts={partsStatut} />
        </View>

        <View break>
          <TitreSection charte={charte}>Répartition par domaine</TitreSection>
          <BarresHorizontales charte={charte} parts={rapport.parDomaine} couleur={charte.secondaire} />

          <TitreSection charte={charte}>Répartition par périodicité</TitreSection>
          <BarresHorizontales charte={charte} parts={rapport.parPeriodicite} />

          <TitreSection charte={charte}>Répartition par type de produit</TitreSection>
          <BarresHorizontales charte={charte} parts={rapport.parType} couleur={charte.secondaire} />

          {rapport.parStructure.length > 1 && (
            <View>
              <TitreSection charte={charte}>Répartition par structure</TitreSection>
              <BarresHorizontales charte={charte} parts={rapport.parStructure} />
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

        <View break>
          <TitreSection charte={charte} sousTitre="Les diffusions attendues les plus proches, non encore mises en ligne.">
            Prochaines échéances
          </TitreSection>
          <Tableau
            charte={charte}
            colonnes={[
              { titre: 'Produit', largeur: 40 },
              { titre: 'Période', largeur: 18 },
              { titre: 'Structure', largeur: 26 },
              { titre: 'Prévue le', largeur: 16, aDroite: true },
            ]}
            lignes={prochaines.map((ligne) => [
              ligne.nomElement ?? '—',
              ligne.libellePeriode ?? '—',
              ligne.structureNom,
              formaterJJMMAAAA(ligne.dateDiffusionPrevue),
            ])}
          />

          <TitreSection charte={charte} sousTitre="Toutes les diffusions du périmètre et de la période, par date prévue.">
            Liste des publications
          </TitreSection>
          <Tableau
            charte={charte}
            colonnes={[
              { titre: 'Produit', largeur: 30 },
              { titre: 'Période', largeur: 14 },
              { titre: 'Structure', largeur: 18 },
              { titre: 'Prévue le', largeur: 12 },
              { titre: 'Publiée le', largeur: 12 },
              { titre: 'Statut', largeur: 14 },
            ]}
            lignes={parDate.map((ligne) => [
              ligne.nomElement ?? '—',
              ligne.libellePeriode ?? '—',
              ligne.structureNom,
              formaterJJMMAAAA(ligne.dateDiffusionPrevue),
              ligne.dateDiffusionReelle ? formaterJJMMAAAA(ligne.dateDiffusionReelle) : '—',
              libelleStatut(statutAffiche(ligne, rapport.genereLe)),
            ])}
          />
        </View>
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
