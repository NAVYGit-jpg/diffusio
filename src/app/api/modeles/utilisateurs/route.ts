import ExcelJS from 'exceljs';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Downloadable template for the user import.
 *
 * The second sheet lists the structure codes actually available in this
 * installation, so nobody has to guess or copy them by hand.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return new Response('Accès refusé', { status: 403 });
  }

  const structures = await prisma.structure.findMany({
    where: {
      organisationId: session.user.organisationId,
      deletedAt: null,
      actif: true,
    },
    select: { code: true, nom: true, sigle: true },
    orderBy: { nom: 'asc' },
  });

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'DIFFUSIO';
  classeur.created = new Date();

  const feuille = classeur.addWorksheet('Utilisateurs');

  feuille.columns = [
    { header: 'Prénoms', key: 'prenoms', width: 20 },
    { header: 'Nom', key: 'nom', width: 20 },
    { header: 'Adresse e-mail', key: 'email', width: 32 },
    { header: 'Profil', key: 'role', width: 22 },
    { header: 'Code structure', key: 'codeStructure', width: 16 },
    { header: 'E-mail du supérieur', key: 'emailSuperieur', width: 32 },
    { header: 'Structures supervisées', key: 'supervisees', width: 26 },
    { header: 'Titulaire', key: 'titulaire', width: 11 },
    { header: 'Téléphone', key: 'telephone', width: 18 },
    { header: 'Fonction', key: 'fonction', width: 26 },
  ];

  feuille.getRow(1).font = { bold: true };
  feuille.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE4E4E7' },
  };
  feuille.views = [{ state: 'frozen', ySplit: 1 }];

  const exemple = structures[0]?.code ?? 'DSD';
  const second = structures[1]?.code ?? 'DSS';

  feuille.addRows([
    {
      prenoms: 'Awa',
      nom: 'Koné',
      email: 'awa.kone@exemple.org',
      role: 'Point focal',
      codeStructure: exemple,
      emailSuperieur: 'directeur@exemple.org',
      supervisees: '',
      titulaire: 'oui',
      telephone: '+225 00 00 00 00',
      fonction: 'Chef de service',
    },
    {
      prenoms: 'Ali',
      nom: 'Traoré',
      email: 'ali.traore@exemple.org',
      role: 'Administrateur',
      codeStructure: '',
      emailSuperieur: '',
      supervisees: `${exemple};${second}`,
      titulaire: '',
      telephone: '',
      fonction: 'Chargé de suivi',
    },
  ]);

  const aide = classeur.addWorksheet('Mode d’emploi');
  aide.columns = [{ width: 100 }];
  aide.addRows([
    ['Comment remplir ce fichier'],
    [''],
    ['1. Remplacez les deux lignes d’exemple par vos propres comptes.'],
    ['2. Prénoms, Nom, Adresse e-mail et Profil sont obligatoires.'],
    ['3. Aucun mot de passe ne se saisit ici : chaque personne recevra une'],
    ['   invitation par e-mail pour choisir le sien.'],
    [''],
    ['Valeurs acceptées dans la colonne Profil :'],
    ['   Point focal, Administrateur, Super administrateur'],
    [''],
    ['Pour un POINT FOCAL :'],
    ['   - « Code structure » est obligatoire (une seule structure)'],
    ['   - « E-mail du supérieur » est obligatoire ; si la personne est son'],
    ['     propre supérieur, indiquez sa propre adresse'],
    ['   - « Titulaire » : oui / vide. Le titulaire reçoit les relances.'],
    [''],
    ['Pour un ADMINISTRATEUR :'],
    ['   - laissez « Code structure » vide'],
    ['   - renseignez « Structures supervisées » avec un ou plusieurs codes'],
    ['     séparés par un point-virgule, par exemple : DSD;DSS'],
    [''],
    ['Pour un SUPER ADMINISTRATEUR :'],
    ['   - laissez les colonnes de structure vides (il voit tout)'],
    ['   - maximum 5 super administrateurs actifs au total'],
    [''],
    ['Avant tout enregistrement, l’application affiche un rapport de contrôle'],
    ['ligne par ligne. Rien n’est créé tant que vous n’avez pas confirmé.'],
  ]);
  aide.getRow(1).font = { bold: true, size: 13 };

  const codes = classeur.addWorksheet('Codes structures');
  codes.columns = [
    { header: 'Code', key: 'code', width: 16 },
    { header: 'Sigle', key: 'sigle', width: 14 },
    { header: 'Nom', key: 'nom', width: 55 },
  ];
  codes.getRow(1).font = { bold: true };

  if (structures.length === 0) {
    codes.addRow({
      code: '',
      sigle: '',
      nom: 'Aucune structure enregistrée : créez-les avant d’importer des utilisateurs.',
    });
  } else {
    codes.addRows(structures);
  }

  const tampon = await classeur.xlsx.writeBuffer();

  return new Response(tampon as ArrayBuffer, {
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition':
        'attachment; filename="modele-import-utilisateurs.xlsx"',
      'cache-control': 'no-store',
    },
  });
}
