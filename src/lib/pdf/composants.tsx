import type { ReactNode } from 'react';
import path from 'node:path';
import {
  Circle,
  Document,
  Font,
  G,
  Image,
  Line,
  Page,
  Polygon,
  Polyline,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer';

import type { ChartePdf } from './charte';

/**
 * Building blocks of every generated PDF.
 *
 * Documents are composed from the data, never captured from the screen: text
 * stays selectable and searchable, tables split cleanly across pages, and the
 * organisation's colours and logo frame every page.
 */

// Montserrat, the house typeface of every generated document. The files ship
// with the code (next.config traces them into the export functions).
const POLICES = path.join(process.cwd(), 'src/lib/pdf/polices');

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: path.join(POLICES, 'montserrat-latin-400-normal.woff'), fontWeight: 400 },
    { src: path.join(POLICES, 'montserrat-latin-400-italic.woff'), fontWeight: 400, fontStyle: 'italic' },
    { src: path.join(POLICES, 'montserrat-latin-600-normal.woff'), fontWeight: 600 },
    { src: path.join(POLICES, 'montserrat-latin-700-normal.woff'), fontWeight: 700 },
  ],
});

// No hyphenation: French words cut by an English rule read badly.
Font.registerHyphenationCallback((mot) => [mot]);

const GRIS = '#52525b';
const GRIS_CLAIR = '#e4e4e7';
const ENCRE = '#18181b';

const s = StyleSheet.create({
  page: {
    paddingTop: 78,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontFamily: 'Montserrat',
    fontSize: 9.5,
    color: ENCRE,
  },
  entete: {
    position: 'absolute',
    top: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  pied: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: GRIS,
    borderTopWidth: 0.5,
    borderTopColor: GRIS_CLAIR,
    paddingTop: 6,
  },
  titreSection: { fontSize: 13, fontFamily: 'Montserrat', fontWeight: 700, marginBottom: 8, marginTop: 14 },
  sousTitre: { fontSize: 8.5, color: GRIS, marginBottom: 8 },
});

function formatImage(donnees: Buffer): 'png' | 'jpg' {
  return donnees[0] === 0x89 ? 'png' : 'jpg';
}

export function Logo({ charte, hauteur }: { charte: ChartePdf; hauteur: number }) {
  if (!charte.logo) {
    return (
      <Text style={{ fontSize: hauteur * 0.55, fontFamily: 'Montserrat', fontWeight: 700, color: charte.primaire }}>
        {charte.sigle || charte.nom}
      </Text>
    );
  }

  return (
    // react-pdf's Image has no alt attribute: the rule targets HTML <img>.
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      src={{ data: charte.logo, format: formatImage(charte.logo) }}
      style={{ height: hauteur, objectFit: 'contain' }}
    />
  );
}

export function DocumentMarque({
  charte,
  titre,
  children,
}: {
  charte: ChartePdf;
  titre: string;
  children: ReactNode;
}) {
  return (
    <Document title={titre} author={charte.nom} creator="DIFFUSIO" producer="DIFFUSIO">
      {children}
    </Document>
  );
}

export function PageDeGarde({
  charte,
  surtitre,
  titre,
  periode,
  details,
}: {
  charte: ChartePdf;
  surtitre: string;
  titre: string;
  periode: string;
  details: [string, string][];
}) {
  return (
    <Page size="A4" style={{ fontFamily: 'Montserrat', color: ENCRE }}>
      <View style={{ height: 250, backgroundColor: charte.primaire, padding: 44, justifyContent: 'space-between' }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#ffffff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
          <Logo charte={charte} hauteur={34} />
        </View>
        <View>
          <Text style={{ color: '#ffffff', opacity: 0.75, fontSize: 9, letterSpacing: 2 }}>
            {surtitre.toUpperCase()}
          </Text>
          <Text style={{ color: '#ffffff', fontSize: 24, fontFamily: 'Montserrat', fontWeight: 700, marginTop: 8, lineHeight: 1.25 }}>
            {titre}
          </Text>
        </View>
      </View>
      <View style={{ height: 10, backgroundColor: charte.secondaire }} />
      <View style={{ height: 2.5, backgroundColor: charte.accent }} />

      <View style={{ padding: 44 }}>
        <Text style={{ fontSize: 9, color: charte.secondaire, letterSpacing: 1.5, fontWeight: 600 }}>PÉRIODE COUVERTE</Text>
        <Text style={{ fontSize: 22, fontFamily: 'Montserrat', fontWeight: 700, color: charte.primaire, marginTop: 6 }}>
          {periode}
        </Text>

        <View style={{ marginTop: 30, borderTopWidth: 0.5, borderTopColor: GRIS_CLAIR }}>
          {details.map(([libelle, valeur]) => (
            <View key={libelle} style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: GRIS_CLAIR }}>
              <Text style={{ width: 140, color: GRIS }}>{libelle}</Text>
              <Text style={{ flex: 1, fontFamily: 'Montserrat', fontWeight: 700 }}>{valeur}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: 36, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: GRIS }}>
        <Text>{charte.nom}</Text>
        <Text>{charte.slogan}</Text>
      </View>
    </Page>
  );
}

export function PageContenu({
  charte,
  rappel,
  edition,
  children,
  paysage = false,
}: {
  charte: ChartePdf;
  /** Short reminder of the scope, repeated on every page. */
  rappel: string;
  edition: string;
  children: ReactNode;
  paysage?: boolean;
}) {
  return (
    <Page size="A4" orientation={paysage ? 'landscape' : 'portrait'} style={s.page}>
      <View fixed style={[s.entete, { borderBottomColor: charte.primaire }]}>
        <Logo charte={charte} hauteur={22} />
        <Text style={{ fontSize: 8.5, color: GRIS }}>{rappel}</Text>
      </View>
      {children}
      <View fixed style={s.pied}>
        <Text>{`${charte.nom} — ${edition}`}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

export function TitreSection({ charte, children, sousTitre }: { charte: ChartePdf; children: string; sousTitre?: string }) {
  return (
    <View wrap={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
        <View style={{ width: 4, height: 14, backgroundColor: charte.primaire, borderRadius: 2, marginRight: 2 }} />
        <View style={{ width: 4, height: 14, backgroundColor: charte.secondaire, borderRadius: 2, marginRight: 7 }} />
        <Text style={[s.titreSection, { marginTop: 0, marginBottom: 0, color: charte.secondaire }]}>{children}</Text>
      </View>
      {sousTitre ? <Text style={[s.sousTitre, { marginTop: 4 }]}>{sousTitre}</Text> : <View style={{ height: 8 }} />}
    </View>
  );
}

export type Indicateur = { libelle: string; valeur: string; precision?: string; ton?: 'alerte' | 'positif' };

export function GrilleIndicateurs({ charte, indicateurs }: { charte: ChartePdf; indicateurs: Indicateur[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
      {indicateurs.map((indicateur, index) => {
        const enAvant = index <= 1;
        const fond = index === 0 ? charte.primaire : charte.secondaire;
        const couleurValeur = enAvant
          ? '#ffffff'
          : indicateur.ton === 'alerte'
            ? '#b91c1c'
            : indicateur.ton === 'positif'
              ? '#047857'
              : ENCRE;

        return (
          <View key={indicateur.libelle} wrap={false} style={{ width: '25%', padding: 4 }}>
            <View
              style={{
                borderRadius: 8,
                padding: 10,
                minHeight: 74,
                backgroundColor: enAvant ? fond : '#ffffff',
                borderWidth: enAvant ? 0 : 0.75,
                borderColor: GRIS_CLAIR,
                borderTopWidth: enAvant ? 0 : 2.5,
                borderTopColor: index % 2 === 0 ? charte.primaire : charte.secondaire,
              }}
            >
              <Text style={{ fontSize: 7.5, color: enAvant ? '#ffffff' : GRIS }}>{indicateur.libelle}</Text>
              <Text style={{ fontSize: 19, fontFamily: 'Montserrat', fontWeight: 700, marginTop: 5, color: couleurValeur }}>
                {indicateur.valeur}
              </Text>
              {indicateur.precision ? (
                <Text style={{ fontSize: 6.8, marginTop: 4, color: enAvant ? '#ffffff' : GRIS }}>{indicateur.precision}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export type Colonne = { titre: string; largeur: number; aDroite?: boolean };

export function Tableau({ charte, colonnes, lignes }: { charte: ChartePdf; colonnes: Colonne[]; lignes: string[][] }) {
  return (
    <View style={{ borderRadius: 6, borderWidth: 0.75, borderColor: GRIS_CLAIR }}>
      <View fixed style={{ flexDirection: 'row', backgroundColor: charte.primaire, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomWidth: 2.5, borderBottomColor: charte.secondaire }}>
        {colonnes.map((colonne) => (
          <Text
            key={colonne.titre}
            style={{
              width: `${colonne.largeur}%`,
              paddingVertical: 6,
              paddingHorizontal: 6,
              color: '#ffffff',
              fontSize: 7.5,
              fontFamily: 'Montserrat', fontWeight: 700,
              textAlign: colonne.aDroite ? 'right' : 'left',
            }}
          >
            {colonne.titre.toUpperCase()}
          </Text>
        ))}
      </View>
      {lignes.length === 0 ? (
        <Text style={{ padding: 10, color: GRIS }}>Aucune donnée sur ce périmètre.</Text>
      ) : (
        lignes.map((ligne, index) => (
          <View
            key={index}
            wrap={false}
            style={{
              flexDirection: 'row',
              backgroundColor: index % 2 === 1 ? charte.primaireDouce : '#ffffff',
              borderTopWidth: index === 0 ? 0 : 0.5,
              borderTopColor: GRIS_CLAIR,
            }}
          >
            {ligne.map((cellule, colonneIndex) => (
              <Text
                key={colonneIndex}
                style={{
                  width: `${colonnes[colonneIndex].largeur}%`,
                  paddingVertical: 5,
                  paddingHorizontal: 6,
                  fontSize: 8,
                  textAlign: colonnes[colonneIndex].aDroite ? 'right' : 'left',
                }}
              >
                {cellule}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

export function BarresHorizontales({
  charte,
  parts,
  couleur,
}: {
  charte: ChartePdf;
  parts: { libelle: string; nombre: number }[];
  couleur?: string;
}) {
  const maximum = Math.max(1, ...parts.map((part) => part.nombre));

  if (parts.length === 0) {
    return <Text style={{ color: GRIS }}>Aucune donnée.</Text>;
  }

  return (
    <View>
      {parts.map((part) => (
        <View key={part.libelle} wrap={false} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <Text style={{ width: '34%', fontSize: 8, paddingRight: 6 }}>{part.libelle}</Text>
          <View style={{ width: '56%', height: 9, backgroundColor: '#f4f4f5', borderRadius: 4 }}>
            <View
              style={{
                width: `${(part.nombre / maximum) * 100}%`,
                height: 9,
                borderRadius: 4,
                backgroundColor: couleur ?? charte.primaire,
              }}
            />
          </View>
          <Text style={{ width: '10%', textAlign: 'right', fontSize: 8, fontFamily: 'Montserrat', fontWeight: 700 }}>{part.nombre}</Text>
        </View>
      ))}
    </View>
  );
}

export function BarresVerticales({
  charte,
  points,
}: {
  charte: ChartePdf;
  points: { libelle: string; valeur: number | null }[];
}) {
  const HAUTEUR = 110;

  return (
    <View wrap={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: HAUTEUR + 14, borderBottomWidth: 0.75, borderBottomColor: GRIS_CLAIR }}>
        {points.map((point) => (
          <View key={point.libelle} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 6.5, color: GRIS, marginBottom: 2 }}>
              {point.valeur === null ? '—' : `${Math.round(point.valeur)}%`}
            </Text>
            <View
              style={{
                width: '62%',
                height: point.valeur === null ? 0 : Math.max(2, (point.valeur / 100) * HAUTEUR),
                backgroundColor: charte.primaire,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 3 }}>
        {points.map((point) => (
          <Text key={point.libelle} style={{ flex: 1, textAlign: 'center', fontSize: 7, color: GRIS }}>
            {point.libelle}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Encadre({ charte, children }: { charte: ChartePdf; children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: charte.secondaireDouce,
        borderLeftWidth: 3,
        borderLeftColor: charte.secondaire,
        borderRadius: 4,
        padding: 10,
      }}
    >
      {children}
    </View>
  );
}

/** Progress of the period, as on the dashboard. */
export function BarreProgression({ charte, pourcentage, legende }: { charte: ChartePdf; pourcentage: number; legende: string }) {
  const borne = Math.min(100, Math.max(0, pourcentage));

  return (
    <View wrap={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 8.5, color: GRIS }}>{legende}</Text>
        <Text style={{ fontSize: 12, fontWeight: 700, color: charte.primaire }}>{`${borne} %`}</Text>
      </View>
      <View style={{ height: 11, borderRadius: 6, backgroundColor: charte.secondaireDouce }}>
        <View style={{ width: `${borne}%`, height: 11, borderRadius: 6, backgroundColor: charte.primaire }} />
      </View>
    </View>
  );
}

/**
 * Month-by-month curve, drawn as on the dashboard: a line in the primary
 * colour over a soft area, points in the secondary colour. Months without
 * anything to judge break the line instead of dropping it to zero.
 */
export function CourbeEvolution({
  charte,
  points,
}: {
  charte: ChartePdf;
  points: { libelle: string; valeur: number | null }[];
}) {
  const LARGEUR = 500;
  const HAUTEUR = 160;
  const MARGE = 24;
  const pas = points.length > 1 ? (LARGEUR - MARGE * 2) / (points.length - 1) : 0;
  const x = (rang: number) => MARGE + rang * pas;
  const y = (valeur: number) => HAUTEUR - 16 - (valeur / 100) * (HAUTEUR - 36);

  // Consecutive runs of measured months.
  const troncons: { rang: number; valeur: number }[][] = [[]];
  points.forEach((point, rang) => {
    if (point.valeur === null) {
      troncons.push([]);
      return;
    }
    troncons[troncons.length - 1].push({ rang, valeur: point.valeur });
  });

  return (
    <View wrap={false}>
      <Svg width={LARGEUR} height={HAUTEUR} viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}>
        {[0, 25, 50, 75, 100].map((repere) => (
          <G key={repere}>
            <Line x1={MARGE} x2={LARGEUR - MARGE} y1={y(repere)} y2={y(repere)} stroke={GRIS_CLAIR} strokeWidth={0.6} strokeDasharray="3 3" />
            <Text x={0} y={y(repere) + 2.5} style={{ fontSize: 6, fill: GRIS }}>{`${repere}%`}</Text>
          </G>
        ))}
        {troncons
          .filter((troncon) => troncon.length > 0)
          .map((troncon, rang) => {
            const ligne = troncon.map((p) => `${x(p.rang)},${y(p.valeur)}`).join(' ');
            const aire = `${x(troncon[0].rang)},${y(0)} ${ligne} ${x(troncon[troncon.length - 1].rang)},${y(0)}`;

            return (
              <G key={rang}>
                <Polygon points={aire} fill={charte.primaireDouce} />
                <Polyline points={ligne} stroke={charte.primaire} strokeWidth={2} fill="none" />
              </G>
            );
          })}
        {points.map((point, rang) =>
          point.valeur === null ? null : (
            <G key={point.libelle}>
              <Circle cx={x(rang)} cy={y(point.valeur)} r={3.2} fill={charte.secondaire} stroke="#ffffff" strokeWidth={1} />
              <Text x={x(rang) - 7} y={y(point.valeur) - 7} style={{ fontSize: 6.5, fill: charte.secondaire }}>
                {`${Math.round(point.valeur)}%`}
              </Text>
            </G>
          ),
        )}
        {points.map((point, rang) => (
          <Text key={`l-${point.libelle}`} x={x(rang) - 8} y={HAUTEUR - 2} style={{ fontSize: 6.5, fill: GRIS }}>
            {point.libelle}
          </Text>
        ))}
      </Svg>
    </View>
  );
}

/** Breakdown by status, each bar in the status colour used on screen. */
export function BarresColorees({ parts }: { parts: { libelle: string; nombre: number; couleur: string }[] }) {
  const maximum = Math.max(1, ...parts.map((part) => part.nombre));
  const total = parts.reduce((somme, part) => somme + part.nombre, 0);

  return (
    <View>
      {total > 0 && (
        <View wrap={false} style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
          {parts
            .filter((part) => part.nombre > 0)
            .map((part) => (
              <View key={part.libelle} style={{ width: `${(part.nombre / total) * 100}%`, backgroundColor: part.couleur }} />
            ))}
        </View>
      )}
      {parts.map((part) => (
        <View key={part.libelle} wrap={false} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: part.couleur, marginRight: 6 }} />
          <Text style={{ width: '30%', fontSize: 8, paddingRight: 6 }}>{part.libelle}</Text>
          <View style={{ width: '50%', height: 9, backgroundColor: '#f4f4f5', borderRadius: 4 }}>
            <View style={{ width: `${(part.nombre / maximum) * 100}%`, height: 9, borderRadius: 4, backgroundColor: part.couleur }} />
          </View>
          <Text style={{ width: '14%', textAlign: 'right', fontSize: 8, fontWeight: 700 }}>
            {total > 0 ? `${part.nombre} (${Math.round((part.nombre / total) * 100)} %)` : '0'}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const couleursPdf = { GRIS, GRIS_CLAIR, ENCRE };

