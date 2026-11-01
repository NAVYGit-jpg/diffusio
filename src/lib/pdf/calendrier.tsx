import { StyleSheet, Text, View } from '@react-pdf/renderer';

import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
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

const NOMS_MOIS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

/** Lines grouped by the month they are due, then by publication. */
function regrouperParMois(lignes: LigneSource[]): { titre: string; groupes: LigneSource[][]; nombre: number }[] {
  const mois = new Map<string, LigneSource[]>();

  for (const ligne of lignes) {
    const date = ligne.dateDiffusionPrevue;
    const cle = `${date.getUTCFullYear()}-${String(date.getUTCMonth()).padStart(2, '0')}`;
    mois.set(cle, [...(mois.get(cle) ?? []), ligne]);
  }

  return [...mois.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cle, siennes]) => {
      const [annee, rang] = cle.split('-').map(Number);
      const parProduit = new Map<string, LigneSource[]>();

      for (const ligne of siennes) {
        const produit = `${ligne.structureSigle}::${ligne.elementType}::${ligne.nomElement}`;
        parProduit.set(produit, [...(parProduit.get(produit) ?? []), ligne]);
      }

      return {
        titre: `${NOMS_MOIS[rang]} ${annee}`,
        nombre: siennes.length,
        groupes: [...parProduit.values()]
          .map((groupe) => [...groupe].sort((a, b) => a.dateDiffusionPrevue.getTime() - b.dateDiffusionPrevue.getTime()))
          .sort((a, b) => a[0].nomElement.localeCompare(b[0].nomElement, 'fr')),
      };
    });
}

/**
 * One publication within a month: its name, structure and periodicity, then
 * each programmed release — period covered and date. Nothing about progress:
 * this is the schedule as announced, not a follow-up report.
 */
function CarteProduit({ charte, lignes }: { charte: ChartePdf; lignes: LigneSource[] }) {
  const premiere = lignes[0];

  return (
    <View style={s.carte} wrap={false}>
      <View style={[s.carteEntete, { backgroundColor: charte.primaireDouce }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.nom}>{premiere.nomElement}</Text>
          <Text style={s.meta}>
            {[premiere.structureNom, premiere.domaine].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
        <Text style={[s.pastille, { backgroundColor: charte.secondaire }]}>
          {LIBELLE_PERIODICITE[premiere.periodicite] ?? premiere.periodicite}
        </Text>
      </View>

      {lignes.map((ligne, rang) => (
        <View
          key={rang}
          style={{
            flexDirection: 'row',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderTopWidth: rang === 0 ? 0 : 0.5,
            borderTopColor: GRIS_CLAIR,
          }}
        >
          <View style={{ width: '50%' }}>
            <Text style={{ fontSize: 7, color: GRIS }}>PÉRIODE COUVERTE</Text>
            <Text style={s.periode}>{ligne.libellePeriode}</Text>
          </View>
          <View style={{ width: '50%' }}>
            <Text style={{ fontSize: 7, color: GRIS }}>DATE DE DIFFUSION</Text>
            <Text style={[s.date, { color: charte.primaire, fontWeight: 700 }]}>
              {formaterJJMMAAAA(ligne.dateDiffusionPrevue)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Release calendar as a PDF: the schedule only. A cover, an overview by
 * periodicity, then one section per month — each publication of the month
 * with its periodicity and release dates — and a glossary of the indicators.
 * No status, no actual release date: a calendar announces, it does not
 * report. Cancelled lines are left out.
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
  const mois = regrouperParMois(lignes);
  const parPeriodicite = SECTIONS.map((section) => {
    const siennes = lignes.filter((ligne) => ligne.periodicite === section.cle);
    return {
      libelle: LIBELLE_PERIODICITE[section.cle],
      diffusions: siennes.length,
      produits: new Set(siennes.map((ligne) => `${ligne.structureSigle}::${ligne.nomElement}`)).size,
    };
  }).filter((part) => part.diffusions > 0);
  const nombreProduits = parPeriodicite.reduce((total, part) => total + part.produits, 0);
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
          ['Publications', `${nombreProduits} publication(s) et indicateur(s)`],
          ['Diffusions programmées', String(lignes.length)],
          ['Édité le', formaterJJMMAAAA(edite)],
          ['Édité par', editeur],
        ]}
      />

      <PageContenu charte={charte} rappel={rappel} edition={edition}>
        <TitreSection charte={charte} sousTitre="Diffusions programmées selon la périodicité des publications.">
          Le calendrier en bref
        </TitreSection>
        <GrilleIndicateurs
          charte={charte}
          indicateurs={parPeriodicite.map((part) => ({
            libelle: part.libelle,
            valeur: String(part.diffusions),
            precision: `${part.produits} publication(s)`,
          }))}
        />

        {mois.map((section, rang) => (
          <View key={section.titre} break={rang === 0}>
            <TitreSection
              charte={charte}
              sousTitre={`${section.nombre} diffusion(s) programmée(s) — ${section.groupes.length} publication(s)`}
            >
              {section.titre}
            </TitreSection>
            {section.groupes.map((groupe, position) => (
              <CarteProduit key={position} charte={charte} lignes={groupe} />
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
