import ExcelJS from 'exceljs';

import { auth } from '@/auth';

/**
 * Downloadable spreadsheet template for the structure import.
 *
 * Giving people a pre-formatted file with a filled-in example removes most of
 * the guesswork about column names and accepted values.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return new Response('Accès refusé', { status: 403 });
  }

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'DIFFUSIO';
  classeur.created = new Date();

  const feuille = classeur.addWorksheet('Structures');

  feuille.columns = [
    { header: 'Nom', key: 'nom', width: 45 },
    { header: 'Sigle', key: 'sigle', width: 14 },
    { header: 'Code', key: 'code', width: 14 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Code parent', key: 'codeParent', width: 16 },
    { header: 'Description', key: 'description', width: 50 },
  ];

  feuille.getRow(1).font = { bold: true };
  feuille.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE4E4E7' },
  };
  feuille.views = [{ state: 'frozen', ySplit: 1 }];

  feuille.addRows([
    {
      nom: 'Ministère du Plan et du Développement',
      sigle: 'MPD',
      code: 'MPD',
      type: 'Ministère',
      codeParent: '',
      description: 'Exemple : structure de plus haut niveau, sans parent',
    },
    {
      nom: 'Direction des Statistiques Démographiques',
      sigle: 'DSD',
      code: 'DSD',
      type: 'Direction',
      codeParent: 'MPD',
      description: 'Exemple : rattachée au ministère par son code',
    },
    {
      nom: 'Service des Enquêtes Ménages',
      sigle: 'SEM',
      code: 'SEM',
      type: 'Service',
      codeParent: 'DSD',
      description: 'Exemple : troisième niveau',
    },
  ]);

  const aide = classeur.addWorksheet('Mode d’emploi');
  aide.columns = [{ width: 100 }];
  aide.addRows([
    ['Comment remplir ce fichier'],
    [''],
    ['1. Remplacez les trois lignes d’exemple par vos propres structures.'],
    ['2. Les colonnes Nom, Sigle et Code sont obligatoires.'],
    ['3. Le Code identifie la structure : il doit être unique et sans espace.'],
    [
      '4. Pour rattacher une structure à une autre, indiquez le CODE du parent dans',
      '',
    ],
    ['   la colonne « Code parent ». Laissez vide pour une structure racine.'],
    ['5. L’ordre des lignes n’a pas d’importance.'],
    [''],
    ['Valeurs acceptées dans la colonne Type :'],
    ['   Ministère, Direction, Sous-direction, Service, Autre'],
    ['   (la casse et les accents sont ignorés ; vide équivaut à « Autre »)'],
    [''],
    ['Avant tout enregistrement, l’application affiche un rapport de contrôle'],
    ['ligne par ligne. Rien n’est créé tant que vous n’avez pas confirmé.'],
  ]);
  aide.getRow(1).font = { bold: true, size: 13 };

  const tampon = await classeur.xlsx.writeBuffer();

  return new Response(tampon as ArrayBuffer, {
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition':
        'attachment; filename="modele-import-structures.xlsx"',
      'cache-control': 'no-store',
    },
  });
}
