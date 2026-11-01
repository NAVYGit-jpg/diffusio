import { StyleSheet, Text, View } from '@react-pdf/renderer';

import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { libelleStatut, statutAffiche } from '@/lib/calendrier/statuts';
import type { LigneSource } from '@/lib/exports/calendrier-excel';
import type { ChartePdf } from './charte';
import {
  DocumentMarque,
  GrilleIndicateurs,
  PageContenu,
  PageDeGarde,
  TitreSection,
  couleursPdf,
} from './composants';

/** An indicator described in the glossary at the end of the calendar. */
export type EntreeGlossaire = {
  nom: string;
  description: string | null;
  unite: string | null;
  periodicite: string;
  domaine: string | null;
  publication: string | null;
};

/** Sections in reading order, from the most frequent to the rarest. */
const SECTIONS: { cle: string; titre: string }[] = [
  { cle: 'MENSUELLE', titre: 'Publications mensuelles' },
  { cle: 'TRIMESTRIELLE', titre: 'Publications trimestrielles' },
  { cle: 'SEMESTRIELLE', titre: 'Publications semestrielles' },
  { cle: 'ANNUELLE', titre: 'Publications annuelles' },
  { cle: 'PLURIANNUELLE', titre: 'Publications pluriannuelles' },
  { cle: 'PONCTUELLE', titre: 'Publications ponctuelles' },
];

const LIBELLE_PERIODICITE: Record<string, string> = {
  MENSUELLE: 'Mensuelle',
  TRIMESTRIELLE: 'Trimestrielle',
  SEMESTRIELLE: 'Semestrielle',
  ANNUELLE: 'Annuelle',
  PLURIANNUELLE: 'Pluriannuelle',
  PONCTUELLE: 'Ponctuelle',
};

const { GRIS, GRIS_CLAIR, ENCRE } = couleursPdf;

const s = StyleSheet.create({
  carte: {
    borderWidth: 1,
    borderColor: GRIS_CLAIR,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  carteEntete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  nom: { fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700, color: ENCRE },
  meta: { fontSize: 8, color: GRIS, marginTop: 2 },
  pastille: {
    fontSize: 7.5,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    color: '#ffffff',
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  echeance: {
    width: '25%',
    padding: 4,
  },
  echeanceInterieur: {
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 7,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: GRIS_CLAIR,
  },
  periode: { fontSize: 8.5, fontFamily: 'Montserrat', fontWeight: 700, color: ENCRE },
  date: { fontSize: 10, marginTop: 2 },
  statut: { fontSize: 7, color: GRIS, marginTop: 2 },
  glossaireEntree: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: GRIS_CLAIR,
  },
});

/** Lines of one element, grouped so each publication reads as one card. */
function regrouperParElement(lignes: LigneSource[]): LigneSource[][] {
  const groupes = new Map<string, LigneSource[]>();

  for (const ligne of lignes) {
    const cle = `${ligne.structureSigle}::${ligne.elementType}::${ligne.nomElement}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), ligne]);
  }

  return [...groupes.values()]
    .map((groupe) => [...groupe].sort((a, b) => a.dateDiffusionPrevue.getTime() - b.dateDiffusionPrevue.getTime()))
    .sort((a, b) => a[0].nomElement.localeCompare(b[0].nomElement, 'fr'));
}

function CarteElement({ charte, lignes, edite }: { charte: ChartePdf; lignes: LigneSource[]; edite: Date }) {
  const premiere = lignes[0];

  return (
    <View style={s.carte} wrap={lignes.length > 16}>
      <View style={[s.carteEntete, { backgroundColor: charte.primaireDouce }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.nom}>{premiere.nomElement}</Text>
          <Text style={s.meta}>
            {[
              premiere.structureNom,
              premiere.domaine,
              premiere.pointFocal ? `Point focal : ${premiere.pointFocal}` : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
        </View>
        <Text style={[s.pastille, { backgroundColor: charte.primaire }]}>
          {`${lignes.length} diffusion(s)`}
        </Text>
      </View>

      <View style={s.grille}>
        {lignes.map((ligne, rang) => {
          const statut = statutAffiche(ligne, edite);
          const publiee = ligne.dateDiffusionReelle !== null;

          return (
            <View key={rang} style={s.echeance} wrap={false}>
              <View
                style={[
                  s.echeanceInterieur,
                  publiee ? { borderColor: '#86efac', backgroundColor: '#f0fdf4' } : {},
                  statut === 'EN_RETARD' ? { borderColor: '#fca5a5', backgroundColor: '#fef2f2' } : {},
                ]}
              >
                <Text style={s.periode}>{ligne.libellePeriode}</Text>
                <Text style={[s.date, { color: charte.primaire }]}>
                  {formaterJJMMAAAA(ligne.dateDiffusionPrevue)}
                </Text>
                <Text style={s.statut}>
                  {publiee
                    ? `Publiée le ${formaterJJMMAAAA(ligne.dateDiffusionReelle!)}`
                    : libelleStatut(statut)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Release calendar as a PDF: a cover, an overview, one section per
 * periodicity with one card per publication, and a glossary of the
 * indicators the calendar contains. Cancelled lines are left out.
 */
export async function genererCalendrierPdf(
  toutesLesLignes: LigneSource[],
  charte: ChartePdf,
  annee: number,
  perimetre: string,
  editeur: string,
  glossaire: EntreeGlossaire[] = [],
): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const edite = new Date();
  const lignes = toutesLesLignes.filter((ligne) => ligne.statut !== 'ANNULE');
  const publiees = lignes.filter((ligne) => ligne.dateDiffusionReelle !== null).length;
  const sections = SECTIONS.map((section) => ({
    ...section,
    groupes: regrouperParElement(lignes.filter((ligne) => ligne.periodicite === section.cle)),
  })).filter((section) => section.groupes.length > 0);
  const nombreProduits = sections.reduce((total, section) => total + section.groupes.length, 0);
  const rappel = `Calendrier ${annee} — ${perimetre}`;
  const edition = `Calendrier édité le ${formaterJJMMAAAA(edite)}`;

  return renderToBuffer(
    <DocumentMarque charte={charte} titre={`Calendrier de diffusion ${annee}`}>
      <PageDeGarde
        charte={charte}
        surtitre="Calendrier de diffusion"
        titre={`Calendrier de diffusion ${annee}`}
        periode={`Année ${annee}`}
        details={[
          ['Périmètre', perimetre],
          ['Produits', `${nombreProduits} publication(s) et indicateur(s)`],
          ['Diffusions prévues', String(lignes.length)],
          ['Déjà publiées', String(publiees)],
          ['Édité le', formaterJJMMAAAA(edite)],
          ['Édité par', editeur],
        ]}
      />

      <PageContenu charte={charte} rappel={rappel} edition={edition}>
        <TitreSection charte={charte} sousTitre="Nombre de diffusions prévues par rythme de publication.">
          Le calendrier en bref
        </TitreSection>
        <GrilleIndicateurs
          charte={charte}
          indicateurs={sections.map((section) => ({
            libelle: section.titre.replace('Publications ', ''),
            valeur: String(section.groupes.reduce((total, groupe) => total + groupe.length, 0)),
            precision: `${section.groupes.length} produit(s)`,
          }))}
        />

        {sections.map((section) => (
          <View key={section.cle} break>
            <TitreSection
              charte={charte}
              sousTitre={`${section.groupes.length} produit(s) — chaque case donne la période couverte et la date de diffusion prévue.`}
            >
              {section.titre}
            </TitreSection>
            {section.groupes.map((groupe, rang) => (
              <CarteElement key={rang} charte={charte} lignes={groupe} edite={edite} />
            ))}
          </View>
        ))}

        {glossaire.length > 0 && (
          <View break>
            <TitreSection
              charte={charte}
              sousTitre="Définition des indicateurs diffusés dans ce calendrier."
            >
              Glossaire des indicateurs
            </TitreSection>
            {[...glossaire]
              .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
              .map((entree, rang) => (
                <View key={rang} style={s.glossaireEntree} wrap={false}>
                  <View style={{ width: 4, backgroundColor: charte.accent, borderRadius: 2, marginRight: 9 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10.5, fontFamily: 'Montserrat', fontWeight: 700, color: charte.primaire }}>
                      {entree.nom}
                      {entree.unite ? <Text style={{ fontFamily: 'Montserrat', color: GRIS }}>{`  (${entree.unite})`}</Text> : null}
                    </Text>
                    <Text style={{ fontSize: 8, color: GRIS, marginTop: 2 }}>
                      {[
                        LIBELLE_PERIODICITE[entree.periodicite] ?? entree.periodicite,
                        entree.domaine,
                        entree.publication ? `Publié dans : ${entree.publication}` : null,
                      ]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </Text>
                    <Text style={{ fontSize: 9.5, marginTop: 4, lineHeight: 1.45 }}>
                      {entree.description?.trim() || 'Description à compléter dans le catalogue.'}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </PageContenu>
    </DocumentMarque>,
  );
}
