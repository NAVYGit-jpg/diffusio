import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Document, Image, Line, Link, Page, Polygon, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';

import { DOCUMENTATION, LIBELLES_ROLES, type Bloc, type Role, type Section } from '../../../documentation/contenu';
import reperesJson from '../../../documentation/captures/reperes.json';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { placerReperes, RAYON_PASTILLE, segmentsGras, type ReperesCapture } from '@/lib/documentation/reperes';
import type { Style } from '@react-pdf/types';
import type { ChartePdf } from './charte';
import { Logo, couleursPdf } from './composants';

const { GRIS, GRIS_CLAIR, ENCRE } = couleursPdf;
const REPERES = reperesJson as Record<string, ReperesCapture>;
const LARGEUR = 515;

const s = StyleSheet.create({
  page: { paddingTop: 70, paddingBottom: 54, paddingHorizontal: 40, fontFamily: 'Montserrat', fontSize: 9.5, color: ENCRE, lineHeight: 1.45 },
  entete: { position: 'absolute', top: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1.5 },
  pied: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: GRIS, borderTopWidth: 0.5, borderTopColor: GRIS_CLAIR, paddingTop: 6 },
  paragraphe: { marginBottom: 8 },
});

function Riche({ texte, style }: { texte: string; style?: Style }) {
  return (
    <Text style={style}>
      {segmentsGras(texte).map((morceau, i) => (
        <Text key={i} style={morceau.gras ? { fontWeight: 700 } : undefined}>
          {morceau.texte}
        </Text>
      ))}
    </Text>
  );
}

function Pastille({ charte, numero, taille = 16 }: { charte: ChartePdf; numero: number; taille?: number }) {
  return (
    <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: charte.primaire, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#ffffff', fontSize: taille * 0.55, fontWeight: 700, lineHeight: 1 }}>{numero}</Text>
    </View>
  );
}

function CaptureAnnotee({ charte, fichier, legende, image }: { charte: ChartePdf; fichier: string; legende: string; image: Buffer }) {
  const donnees = REPERES[fichier];
  const hauteur = (LARGEUR * donnees.hauteur) / donnees.largeur;
  const echelle = LARGEUR / donnees.largeur;
  const reperes = placerReperes(donnees);
  const r = RAYON_PASTILLE * echelle * 1.15;

  return (
    <View wrap={false} style={{ marginVertical: 8 }}>
      <View style={{ width: LARGEUR, height: hauteur, borderRadius: 6, borderWidth: 0.75, borderColor: GRIS_CLAIR, overflow: 'hidden' }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={{ data: image, format: "jpg" }} style={{ width: LARGEUR, height: hauteur }} />
        <Svg viewBox={`0 0 ${donnees.largeur} ${donnees.hauteur}`} style={{ position: 'absolute', top: 0, left: 0, width: LARGEUR, height: hauteur }}>
          {reperes.map((repere) => (
            <Rect key={`z${repere.numero}`} x={repere.zone.x - 4} y={repere.zone.y - 4} width={repere.zone.l + 8} height={repere.zone.h + 8} rx={8} ry={8} fill={charte.primaire} fillOpacity={0.08} stroke={charte.primaire} strokeWidth={3} />
          ))}
          {reperes.map((repere) =>
            repere.fleche ? (
              <Line key={`l${repere.numero}`} x1={repere.fleche.x1} y1={repere.fleche.y1} x2={repere.fleche.x2} y2={repere.fleche.y2} stroke={charte.primaire} strokeWidth={4} />
            ) : null,
          )}
          {reperes.map((repere) =>
            repere.fleche ? <Polygon key={`p${repere.numero}`} points={repere.fleche.pointe} fill={charte.primaire} /> : null,
          )}
        </Svg>
        {reperes.map((repere) => (
          <View key={`n${repere.numero}`} style={{ position: 'absolute', left: repere.pastille.x * echelle - r, top: repere.pastille.y * echelle - r }}>
            <Pastille charte={charte} numero={repere.numero} taille={r * 2} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 7.5, color: GRIS, marginTop: 4, textAlign: 'center' }}>{legende}</Text>
    </View>
  );
}

function BlocPdf({ charte, bloc, images }: { charte: ChartePdf; bloc: Bloc; images: Map<string, Buffer> }) {
  switch (bloc.type) {
    case 'texte':
      return <Riche texte={bloc.texte} style={s.paragraphe} />;
    case 'note': {
      const teinte = bloc.ton === 'attention' ? '#b45309' : bloc.ton === 'astuce' ? '#047857' : charte.primaire;
      const libelle = bloc.ton === 'attention' ? 'À retenir' : bloc.ton === 'astuce' ? 'Astuce' : 'Bon à savoir';
      return (
        <View wrap={false} style={{ borderLeftWidth: 3, borderLeftColor: teinte, backgroundColor: charte.primaireDouce, padding: 9, borderRadius: 4, marginVertical: 6 }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: teinte, letterSpacing: 1, marginBottom: 3 }}>{libelle.toUpperCase()}</Text>
          <Riche texte={bloc.texte} />
        </View>
      );
    }
    case 'liste':
      return (
        <View style={{ marginVertical: 4 }}>
          {bloc.titre && <Text style={{ fontWeight: 700, color: charte.secondaire, marginBottom: 4 }}>{bloc.titre}</Text>}
          {bloc.elements.map((element, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }} wrap={false}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: charte.primaire, marginTop: 5, marginRight: 7 }} />
              <Riche texte={element} style={{ flex: 1 }} />
            </View>
          ))}
        </View>
      );
    case 'tableau':
      return (
        <View style={{ marginVertical: 6, borderWidth: 0.5, borderColor: GRIS_CLAIR, borderRadius: 4 }}>
          <View style={{ flexDirection: 'row', backgroundColor: charte.primaire }}>
            {bloc.colonnes.map((colonne) => (
              <Text key={colonne} style={{ flex: 1, color: '#ffffff', fontWeight: 700, fontSize: 8.5, padding: 6 }}>{colonne}</Text>
            ))}
          </View>
          {bloc.lignes.map((ligne, i) => (
            <View key={i} wrap={false} style={{ flexDirection: 'row', backgroundColor: i % 2 ? charte.primaireDouce : '#ffffff', borderTopWidth: 0.5, borderTopColor: GRIS_CLAIR }}>
              {ligne.map((cellule, j) => (
                <Riche key={j} texte={cellule} style={{ flex: 1, fontSize: 8.5, padding: 6 }} />
              ))}
            </View>
          ))}
        </View>
      );
    case 'etapes':
      return (
        <View style={{ marginVertical: 6 }}>
          {bloc.titre && <Text style={{ fontSize: 11, fontWeight: 700, color: charte.secondaire, marginBottom: 4, marginTop: 6 }}>{bloc.titre}</Text>}
          {bloc.capture && REPERES[bloc.capture.fichier] && images.get(bloc.capture.fichier) && (
            <CaptureAnnotee charte={charte} fichier={bloc.capture.fichier} legende={bloc.capture.legende} image={images.get(bloc.capture.fichier)!} />
          )}
          {bloc.etapes.map((etape, i) => (
            <View key={i} wrap={false} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 }}>
              <View style={{ marginRight: 8, marginTop: 1 }}>
                <Pastille charte={charte} numero={i + 1} />
              </View>
              <Riche texte={etape.texte} style={{ flex: 1 }} />
            </View>
          ))}
        </View>
      );
  }
}

function EnTeteSection({ charte, section, numero }: { charte: ChartePdf; section: Section; numero: number }) {
  return (
    <View id={section.id} wrap={false} style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 26, fontWeight: 700, color: charte.secondaire, marginRight: 10 }}>
          {String(numero).padStart(2, '0')}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: 700, color: charte.primaire }}>{section.titre}</Text>
          <Text style={{ fontSize: 7.5, color: GRIS, marginTop: 2 }}>
            {section.roles.length === 3 ? 'Tous les rôles' : section.roles.map((role) => LIBELLES_ROLES[role]).join(' · ')}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <View style={{ flex: 3, height: 3, backgroundColor: charte.primaire }} />
        <View style={{ flex: 1, height: 3, backgroundColor: charte.secondaire }} />
      </View>
      <Text style={{ marginTop: 8, color: GRIS, fontSize: 10 }}>{section.resume}</Text>
    </View>
  );
}

export async function genererDocumentationPdf(charte: ChartePdf, role: Role | null): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');

  const parties = DOCUMENTATION.map((partie) => ({
    ...partie,
    sections: partie.sections.filter((section) => !role || section.roles.includes(role)),
  })).filter((partie) => partie.sections.length > 0);

  const images = new Map<string, Buffer>();
  const dossier = path.join(process.cwd(), 'documentation', 'captures');
  for (const fichier of Object.keys(REPERES)) {
    try {
      images.set(fichier, await readFile(path.join(dossier, fichier)));
    } catch {
      // capture absente : le texte suffit
    }
  }

  const edition = formaterJJMMAAAA(new Date());
  let numero = 0;
  const numeros = new Map<string, number>();
  parties.forEach((partie) => partie.sections.forEach((section) => numeros.set(section.id, ++numero)));

  const document = (
    <Document title="Documentation DIFFUSIO" author={charte.nom} creator="DIFFUSIO" producer="DIFFUSIO">
      {/* Couverture */}
      <Page size="A4" style={{ fontFamily: 'Montserrat', color: ENCRE }}>
        <View style={{ height: 330, backgroundColor: charte.primaire, padding: 48, justifyContent: 'space-between' }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: '#ffffff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Logo charte={charte} hauteur={36} />
          </View>
          <View>
            <Text style={{ color: '#ffffff', opacity: 0.8, fontSize: 9, letterSpacing: 2.5 }}>DOCUMENTATION DE LA PLATEFORME</Text>
            <Text style={{ color: '#ffffff', fontSize: 34, fontWeight: 700, marginTop: 8 }}>DIFFUSIO</Text>
            <Text style={{ color: '#ffffff', fontSize: 13, marginTop: 6, opacity: 0.92 }}>Guide complet, rubrique par rubrique</Text>
          </View>
        </View>
        <View style={{ height: 10, backgroundColor: charte.secondaire }} />
        <View style={{ height: 2.5, backgroundColor: charte.accent }} />
        <View style={{ padding: 48 }}>
          {[
            ['Organisation', charte.nom],
            ['Version destinée à', role ? LIBELLES_ROLES[role] : 'Tous les rôles'],
            ['Rubriques', String(numero)],
            ['Édition', edition],
          ].map(([libelle, valeur]) => (
            <View key={libelle} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: GRIS_CLAIR }}>
              <Text style={{ width: 150, color: GRIS, fontSize: 10 }}>{libelle}</Text>
              <Text style={{ flex: 1, fontWeight: 700, fontSize: 10 }}>{valeur}</Text>
            </View>
          ))}
        </View>
        <Text style={{ position: 'absolute', bottom: 36, left: 48, right: 48, fontSize: 8, color: GRIS }}>{charte.slogan}</Text>
      </Page>

      {/* Sommaire cliquable */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 20, fontWeight: 700, color: charte.primaire, marginBottom: 14 }}>Sommaire</Text>
        {parties.map((partie) => (
          <View key={partie.titre} style={{ marginBottom: 10 }} wrap={false}>
            <Text style={{ fontSize: 8, letterSpacing: 1.5, color: charte.secondaire, fontWeight: 700, marginBottom: 4 }}>{partie.titre.toUpperCase()}</Text>
            {partie.sections.map((section) => (
              <Link key={section.id} src={`#${section.id}`} style={{ textDecoration: 'none', color: ENCRE }}>
                <View style={{ flexDirection: 'row', paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: GRIS_CLAIR }}>
                  <Text style={{ width: 26, color: charte.primaire, fontWeight: 700 }}>{String(numeros.get(section.id)).padStart(2, '0')}</Text>
                  <Text style={{ flex: 1, fontWeight: 600 }}>{section.titre}</Text>
                  <Text style={{ width: 230, color: GRIS, fontSize: 8 }}>{section.resume}</Text>
                </View>
              </Link>
            ))}
          </View>
        ))}
      </Page>

      {parties.flatMap((partie) =>
        partie.sections.map((section) => (
          <Page key={section.id} size="A4" style={s.page}>
            <View fixed style={[s.entete, { borderBottomColor: charte.primaire }]}>
              <Logo charte={charte} hauteur={20} />
              <Text style={{ fontSize: 8, color: GRIS }}>{`${partie.titre} › ${section.titre}`}</Text>
            </View>
            <EnTeteSection charte={charte} section={section} numero={numeros.get(section.id)!} />
            {section.blocs.map((bloc, i) => (
              <BlocPdf key={i} charte={charte} bloc={bloc} images={images} />
            ))}
            <View fixed style={s.pied}>
              <Text>{`${charte.nom} — Documentation DIFFUSIO — ${edition}`}</Text>
              <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
            </View>
          </Page>
        )),
      )}
    </Document>
  );

  return renderToBuffer(document);
}
