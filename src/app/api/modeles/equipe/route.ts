import ExcelJS from 'exceljs';

import { auth } from '@/auth';

/**
 * Downloadable template for the team import (cahier des charges §9.3).
 *
 * Three columns and two filled-in examples: the fastest way to explain a file
 * format is to hand over one that already works.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new Response('Authentification requise.', { status: 401 });
  }

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'DIFFUSIO';
  classeur.created = new Date();

  const feuille = classeur.addWorksheet('Équipe');

  feuille.columns = [
    { header: 'Nom', key: 'nom', width: 28 },
    { header: 'Fonction', key: 'fonction', width: 34 },
    { header: 'Adresse e-mail', key: 'email', width: 34 },
  ];

  feuille.getRow(1).font = { bold: true };
  feuille.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE4E4E7' },
  };

  feuille.addRow({
    nom: 'Awa Koné',
    fonction: 'Directrice de cabinet',
    email: 'awa.kone@exemple.ci',
  });
  feuille.addRow({
    nom: 'Yao N’Guessan',
    fonction: 'Chargé de communication',
    email: 'yao.nguessan@exemple.ci',
  });

  const aide = classeur.addWorksheet('Mode d’emploi');
  aide.columns = [{ header: 'À lire avant de remplir', key: 'texte', width: 100 }];
  aide.getRow(1).font = { bold: true };

  for (const texte of [
    'Une ligne par personne à prévenir lors de la mise en ligne d’une publication.',
    'Les trois colonnes sont obligatoires : Nom, Fonction, Adresse e-mail.',
    'Remplacez les deux exemples par vos propres membres avant d’importer.',
    'Une adresse déjà présente dans l’équipe est ignorée, ce n’est pas une erreur.',
    'Les intitulés de colonnes acceptent des variantes : « Email », « Poste », « Nom complet ».',
    'Ces personnes reçoivent les e-mails de mise en ligne ; elles ne se connectent pas à l’application.',
  ]) {
    aide.addRow({ texte });
  }

  const tampon = await classeur.xlsx.writeBuffer();

  return new Response(tampon as ArrayBuffer, {
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="modele-equipe.xlsx"',
      'cache-control': 'no-store',
    },
  });
}
