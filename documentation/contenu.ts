/**
 * Documentation de la plateforme DIFFUSIO — source unique.
 *
 * Ce fichier alimente trois choses à la fois :
 *   - la page web /documentation (sommaire interactif, captures annotées) ;
 *   - le PDF téléchargeable (/api/documentation/pdf) ;
 *   - le script de captures (documentation/capturer.mts), qui photographie
 *     chaque écran et mesure la position des repères numérotés.
 *
 * Modifier un texte ici le modifie partout. Après un changement d'écran,
 * relancer `npm run documentation:captures` pour rafraîchir les images.
 *
 * Mise en forme du texte : **gras** uniquement.
 */

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'POINT_FOCAL';

/** Élément d'écran visé par un repère numéroté. Le premier critère trouvé l'emporte. */
export type Cible = {
  css?: string;
  role?: 'button' | 'link' | 'tab' | 'textbox' | 'combobox' | 'checkbox' | 'heading' | 'switch' | 'navigation' | 'dialog';
  nom?: string;
  texte?: string;
  /** Rang de l'occurrence quand plusieurs correspondent (0 par défaut). */
  rang?: number;
};

export type Capture = {
  fichier: string;
  chemin: string;
  legende: string;
  /** Clics à faire avant la photo (ouvrir une boîte de dialogue, typiquement). */
  preparer?: Cible[];
  /** Élément à amener en haut de l'écran avant la photo. */
  defilerVers?: Cible;
  /** Photographier sans session (écran de connexion). */
  sansSession?: boolean;
};

export type Etape = { texte: string; cible?: Cible };

export type Bloc =
  | { type: 'texte'; texte: string }
  | { type: 'etapes'; titre?: string; capture?: Capture; etapes: Etape[] }
  | { type: 'note'; ton: 'info' | 'attention' | 'astuce'; texte: string }
  | { type: 'liste'; titre?: string; elements: string[] }
  | { type: 'tableau'; colonnes: string[]; lignes: string[][] };

export type Section = {
  id: string;
  titre: string;
  icone: string;
  roles: Role[];
  resume: string;
  blocs: Bloc[];
};

export type Partie = { titre: string; sections: Section[] };

const TOUS: Role[] = ['SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL'];
const ENCADREMENT: Role[] = ['SUPER_ADMIN', 'ADMIN'];
const SUPER: Role[] = ['SUPER_ADMIN'];

export const LIBELLES_ROLES: Record<Role, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  POINT_FOCAL: 'Point focal',
};

export const DOCUMENTATION: Partie[] = [
  // ===========================================================================
  {
    titre: 'Prendre en main',
    sections: [
      {
        id: 'presentation',
        titre: 'Présentation de DIFFUSIO',
        icone: 'BookOpen',
        roles: TOUS,
        resume: 'À quoi sert la plateforme, et le parcours d’un produit statistique, de la déclaration à la mise en ligne.',
        blocs: [
          {
            type: 'texte',
            texte:
              'DIFFUSIO organise le **calendrier de diffusion** des produits statistiques de l’institution : les publications (rapports, notes, bulletins) et les indicateurs (taux, indices, valeurs chiffrées). La plateforme calcule les dates de diffusion, rappelle les échéances aux responsables, recueille les fichiers et les valeurs, puis suit la mise en ligne.',
          },
          {
            type: 'liste',
            titre: 'Le parcours d’un produit en cinq temps',
            elements: [
              '**Déclarer** la publication ou l’indicateur au **Catalogue**, avec sa périodicité et son délai de mise à disposition.',
              '**Générer** le calendrier de l’année : la plateforme crée une ligne datée par période (douze lignes pour un produit mensuel).',
              '**Être rappelé** : avant chaque échéance, le point focal reçoit un rappel par e-mail et une notification.',
              '**Livrer** : le point focal dépose les fichiers (PDF, Excel) et saisit les valeurs ; la ligne passe à « Livré ».',
              '**Publier** : l’encadrement confirme la mise en ligne avec le lien ; la ligne passe à « Publié » et l’annonce part.',
            ],
          },
          {
            type: 'note',
            ton: 'info',
            texte:
              'Cette documentation s’adapte à votre rôle : le filtre « Afficher pour » en haut du sommaire masque les rubriques qui ne vous concernent pas. Le bouton **Télécharger en PDF** produit la version complète.',
          },
        ],
      },
      {
        id: 'roles',
        titre: 'Les trois rôles',
        icone: 'Users',
        roles: TOUS,
        resume: 'Ce que chacun voit et ce que chacun peut faire.',
        blocs: [
          {
            type: 'tableau',
            colonnes: ['Rôle', 'Périmètre', 'Ce qu’il fait'],
            lignes: [
              ['**Point focal**', 'Sa structure uniquement', 'Déclare ses produits, dépose les fichiers et les valeurs, justifie ses retards, demande une annulation.'],
              ['**Administrateur**', 'Les structures qu’il supervise (et leurs structures rattachées)', 'Suit l’avancement, relance, confirme les mises en ligne, valide ou annule des lignes, gère les comptes de son périmètre.'],
              ['**Super administrateur**', 'Toute l’organisation', 'Tout ce qui précède, plus les structures, tous les comptes, l’apparence du site et les e-mails automatiques.'],
            ],
          },
          {
            type: 'texte',
            texte:
              'Une structure a **un point focal titulaire** et, si besoin, des **suppléants**. Les rappels et relances partent au titulaire ; les suppléants peuvent saisir et déposer comme lui.',
          },
          {
            type: 'note',
            ton: 'info',
            texte:
              'Le cloisonnement est appliqué par le serveur à chaque requête, pas seulement à l’affichage : modifier l’adresse d’une page ne donne jamais accès aux données d’une autre structure.',
          },
          {
            type: 'texte',
            texte:
              'Le **super administrateur principal** est le premier compte, créé avec l’adresse par défaut de la plateforme. Lui seul peut supprimer d’autres super administrateurs.',
          },
        ],
      },
      {
        id: 'connexion',
        titre: 'Se connecter',
        icone: 'LogIn',
        roles: TOUS,
        resume: 'Connexion, invitation, première connexion et mot de passe oublié.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'connexion.jpg', chemin: '/connexion', legende: 'L’écran de connexion', sansSession: true },
            etapes: [
              { texte: 'Saisissez votre **adresse e-mail** de connexion.', cible: { role: 'textbox', nom: 'Adresse e-mail' } },
              { texte: 'Saisissez votre **mot de passe**.', cible: { css: 'input[type="password"]' } },
              { texte: 'Cliquez sur **Se connecter**.', cible: { role: 'button', nom: 'Se connecter' } },
              { texte: 'Mot de passe perdu ? Utilisez le lien **Mot de passe oublié** : un lien de réinitialisation vous est envoyé par e-mail.', cible: { role: 'link', nom: 'oublié' } },
            ],
          },
          {
            type: 'liste',
            titre: 'Votre premier accès',
            elements: [
              'À la création de votre compte, vous recevez **une invitation par e-mail**. Le lien qu’elle contient vous permet de choisir vous-même votre mot de passe. L’administrateur peut aussi vous transmettre ce lien directement.',
              'Le lien a une durée de validité. S’il a expiré, demandez à votre administrateur de **régénérer l’invitation**.',
              'Le compte super administrateur par défaut passe, à sa première connexion, par un écran où il renseigne son nom et remplace le mot de passe initial. **Son adresse de connexion reste fixe** : les comptes réels se créent ensuite depuis l’écran Utilisateurs.',
            ],
          },
          {
            type: 'note',
            ton: 'astuce',
            texte: 'Le message de réinitialisation n’arrive pas ? Regardez dans le dossier des indésirables avant de le redemander.',
          },
        ],
      },
      {
        id: 'interface',
        titre: 'Se repérer dans l’écran',
        icone: 'LayoutPanelLeft',
        roles: TOUS,
        resume: 'La colonne de navigation, la barre du haut, les compteurs et la langue.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'interface.jpg', chemin: '/tableau-de-bord', legende: 'Les zones de l’écran' },
            etapes: [
              { texte: 'La **colonne de navigation** donne accès à toutes les rubriques, rangées en deux groupes : **Suivi** (le travail quotidien) et **Général** (l’organisation et les échanges). La rubrique ouverte est mise en évidence.', cible: { css: 'aside nav, nav[aria-label]' } },
              { texte: 'Un **compteur** apparaît à droite d’une rubrique quand du nouveau s’y trouve depuis votre dernière visite. Il disparaît dès que vous l’ouvrez.', cible: { role: 'link', nom: 'État du calendrier' } },
              { texte: 'Le **choix de la langue** : français, anglais ou portugais. Les titres, rubriques et onglets se traduisent aussitôt.', cible: { css: '[aria-label="Langue"], [aria-label*="angue"]' } },
              { texte: 'La **cloche** indique le nombre de notifications non lues et ouvre la liste.', cible: { css: 'a[href="/notifications"], [aria-label*="otification"]' } },
              { texte: 'Votre **compte** : accès à Mon profil, à la documentation et à la déconnexion.', cible: { css: '[aria-label="Mon compte et préférences"]' } },
            ],
          },
          {
            type: 'tableau',
            colonnes: ['Rubrique', 'Rôles', 'À quoi elle sert'],
            lignes: [
              ['Tableau de bord', 'Tous', 'Où en est-on : indicateurs, graphiques, rapport PDF / Excel.'],
              ['Structures', 'Super administrateur', 'L’organigramme des directions et services.'],
              ['Utilisateurs', 'Super admin., administrateur', 'Les comptes, les rôles et les invitations.'],
              ['Catalogue', 'Tous', 'Les publications et indicateurs déclarés.'],
              ['Calendrier', 'Tous', 'Les dates de diffusion, le dépôt des livrables, les exports.'],
              ['État du calendrier', 'Tous', 'Retards, imminentes, livrées, publiées, annulées.'],
              ['Organigramme', 'Tous', 'La vue d’ensemble des structures et de leurs responsables.'],
              ['Équipe', 'Tous', 'Les personnes prévenues des mises en ligne.'],
              ['Discussion', 'Tous', 'Les échanges entre points focaux et encadrement.'],
            ],
          },
        ],
      },
      {
        id: 'vocabulaire',
        titre: 'Vocabulaire et statuts',
        icone: 'BookA',
        roles: TOUS,
        resume: 'Les mots qui reviennent partout et les six statuts d’une ligne du calendrier.',
        blocs: [
          {
            type: 'liste',
            elements: [
              '**Structure** : une direction, un service, un département. Les structures s’emboîtent sans limite de niveaux ; filtrer sur une structure parente inclut ses structures rattachées.',
              '**Publication** : un document diffusé (rapport, note de conjoncture, bulletin).',
              '**Indicateur** : une valeur chiffrée (taux, indice). Il peut être rattaché à une publication.',
              '**Domaine** : la thématique statistique (Prix, Démographie, Emploi…). La liste s’enrichit depuis le catalogue.',
              '**Périodicité** : le rythme de parution — mensuelle, trimestrielle, semestrielle, annuelle, pluriannuelle ou ponctuelle. Elle fixe le nombre de lignes de l’année.',
              '**Délai de mise à disposition** : le nombre de jours entre la fin de la période couverte et la diffusion, en jours **calendaires** ou **ouvrés**. Un indice de janvier à 20 jours est attendu le 20 février.',
              '**Période de couverture** : ce sur quoi portent les chiffres (janvier, 1er trimestre), à ne pas confondre avec la date de diffusion.',
              '**Ligne du calendrier** : une échéance datée pour un produit et une période.',
            ],
          },
          {
            type: 'tableau',
            colonnes: ['Statut', 'Signification'],
            lignes: [
              ['**Planifié**', 'La ligne existe, l’échéance est encore loin, rien n’est déposé.'],
              ['**À venir**', 'L’échéance approche : la ligne figure parmi les imminentes.'],
              ['**Livré**', 'Fichiers ou valeurs déposés ; la mise en ligne n’est pas encore confirmée.'],
              ['**Publié**', 'La mise en ligne est confirmée : le produit est diffusé.'],
              ['**En retard**', 'L’échéance est passée sans dépôt.'],
              ['**Annulé**', 'La diffusion n’aura pas lieu ; la ligne sort du calendrier et des exports.'],
            ],
          },
          {
            type: 'note',
            ton: 'attention',
            texte: '**Livré n’est pas publié.** « Livré » dit que le point focal a fait son travail ; « Publié » dit que le produit est en ligne pour le public. Entre les deux : la confirmation de l’encadrement.',
          },
        ],
      },
    ],
  },
  // ===========================================================================
  {
    titre: 'Le suivi au quotidien',
    sections: [
      {
        id: 'tableau-de-bord',
        titre: 'Tableau de bord',
        icone: 'LayoutDashboard',
        roles: TOUS,
        resume: 'Les chiffres clés, les filtres et le rapport téléchargeable.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'tableau-de-bord.jpg', chemin: '/tableau-de-bord', legende: 'Le tableau de bord' },
            etapes: [
              { texte: 'Les **filtres** : année, mois, type de produit, structure, domaine, périodicité. Sauf l’année, chacun accepte plusieurs valeurs (cochez janvier, février et mars pour un trimestre). Un filtre vide signifie « tout ».', cible: { css: '[data-filtres-tableau-de-bord]' } },
              { texte: 'Les **indicateurs clés** : taux de respect des délais, retards non publiés, publiés après échéance, échéances à venir.', cible: { css: '[aria-label="Indicateurs clés"]' } },
              { texte: 'Les **volumes** : produits au catalogue, lignes au calendrier, livrées, publiées.', cible: { css: '[aria-label="Volumes"]' } },
              { texte: 'Les boutons **Excel** et **Rapport PDF** téléchargent le rapport complet, avec exactement les filtres affichés.', cible: { css: '[data-boutons-rapport]' } },
            ],
          },
          {
            type: 'liste',
            titre: 'Ce que montre la suite de la page',
            elements: [
              '**Répartition par statut** et **par domaine**, l’évolution mois par mois et le classement des structures.',
              '**Prochaines échéances** : ce qui doit sortir bientôt.',
              '**Activité récente** : les derniers dépôts et mises en ligne.',
              '**Lecture des résultats** : un commentaire rédigé automatiquement qui décrit les chiffres, sans jamais inventer un taux.',
            ],
          },
          {
            type: 'note',
            ton: 'info',
            texte:
              'Le **taux de respect des délais** ne porte que sur les lignes jugeables (échéance passée ou déjà publiées). Quand rien n’est encore mesurable, un tiret s’affiche plutôt qu’un zéro trompeur. Une ligne livrée compte comme livrée, même si elle n’est pas encore publiée.',
          },
          {
            type: 'note',
            ton: 'astuce',
            texte: 'Les filtres s’inscrivent dans l’adresse de la page : copiez-la pour transmettre exactement la même vue à un collègue.',
          },
          {
            type: 'texte',
            texte:
              'Le **rapport PDF** reprend toutes les statistiques du tableau de bord (indicateurs, barres de progression, courbe d’évolution, répartitions, classement, prochaines échéances, liste détaillée) aux couleurs de l’organisation. Le classeur **Excel** contient les mêmes données en feuilles triables.',
          },
        ],
      },
      {
        id: 'catalogue',
        titre: 'Catalogue des publications et indicateurs',
        icone: 'Library',
        roles: TOUS,
        resume: 'Déclarer, modifier, retirer un produit ; gérer les domaines ; exporter le catalogue.',
        blocs: [
          {
            type: 'texte',
            texte: 'Le catalogue est le point de départ : **rien n’apparaît au calendrier qui n’ait d’abord été déclaré ici.**',
          },
          {
            type: 'etapes',
            capture: { fichier: 'catalogue.jpg', chemin: '/catalogue', legende: 'Le catalogue' },
            etapes: [
              { texte: 'Créez une publication avec **Nouvelle publication**…', cible: { role: 'button', nom: 'Nouvelle publication' } },
              { texte: '… ou un indicateur avec **Nouvel indicateur**.', cible: { role: 'button', nom: 'Nouvel indicateur' } },
              { texte: 'Le champ **Rechercher** filtre par nom, domaine ou périodicité.', cible: { css: 'input[placeholder^="Nom, domaine"]' } },
              { texte: 'Les boutons d’export téléchargent le catalogue en **Excel** ou en **PDF**.', cible: { role: 'button', nom: 'Excel' } },
            ],
          },
          {
            type: 'etapes',
            titre: 'Déclarer une publication',
            capture: {
              fichier: 'catalogue-publication.jpg',
              chemin: '/catalogue',
              legende: 'Le formulaire de publication',
              preparer: [{ role: 'button', nom: 'Nouvelle publication' }],
            },
            etapes: [
              { texte: 'Le **nom**, tel qu’il apparaîtra dans les e-mails et le calendrier.', cible: { role: 'textbox', nom: 'Nom de la publication' } },
              { texte: 'Le **domaine statistique**. Absent de la liste ? Le bouton **+** juste à côté l’ajoute sans quitter le formulaire.', cible: { css: '[aria-label="Ajouter un domaine"]' } },
              { texte: 'La **périodicité**, puis le **délai de mise à disposition** et son type (calendaires ou ouvrés). Ce sont eux qui fixent les dates de toute l’année.', cible: { texte: 'Délai de mise à disposition' } },
              { texte: 'Enregistrez. La publication rejoint le catalogue de sa structure.', cible: { css: '[role="dialog"] button[type="submit"]' } },
            ],
          },
          {
            type: 'liste',
            titre: 'Bon à savoir',
            elements: [
              'Un **indicateur** se déclare de la même manière, avec en plus son unité (%, FCFA…) et, s’il y a lieu, sa **publication de rattachement**.',
              'L’affichage se regroupe **par domaine** ou **par périodicité**.',
              'La **corbeille** retire un élément. Elle est refusée tant que des lignes du calendrier de ce produit sont encore en cours ; les produits dont toutes les lignes sont publiées ou annulées se retirent librement. L’historique est conservé.',
              'Le **PDF du catalogue** présente les produits par structure, sans les noms des points focaux.',
            ],
          },
          {
            type: 'note',
            ton: 'attention',
            texte: 'Une erreur de périodicité ou de délai se répercute sur toutes les lignes de l’année. Vérifiez-les avant de générer le calendrier.',
          },
        ],
      },
      {
        id: 'calendrier',
        titre: 'Calendrier de diffusion',
        icone: 'CalendarDays',
        roles: TOUS,
        resume: 'Générer l’année, choisir les lignes, modifier une date, exporter en PDF et Excel.',
        blocs: [
          {
            type: 'etapes',
            titre: 'Générer le calendrier d’une année',
            capture: { fichier: 'calendrier-generation.jpg', chemin: '/calendrier', legende: 'Le bloc de génération' },
            etapes: [
              { texte: 'Choisissez la **structure** et l’**année**.', cible: { texte: 'Année', rang: 0 } },
              { texte: 'Repérez les produits à inclure avec **Rechercher**, puis sélectionnez-les.', cible: { css: '#rechercheElements' } },
              { texte: 'Cliquez sur **Générer**. Un aperçu présente les lignes proposées : rien n’est encore enregistré.', cible: { role: 'button', nom: 'Générer' } },
              { texte: 'Dans l’aperçu, **décochez** les lignes à écarter ou utilisez la case **Tout sélectionner**, puis confirmez.' },
            ],
          },
          {
            type: 'note',
            ton: 'info',
            texte: 'Relancer la génération sur une année existante **ne détruit rien** : les lignes existantes sont conservées, et une ligne livrée ou publiée n’est jamais remplacée.',
          },
          {
            type: 'etapes',
            titre: 'Lire et gérer les lignes',
            capture: {
              fichier: 'calendrier-lignes.jpg',
              chemin: '/calendrier',
              legende: 'Les lignes du calendrier',
              defilerVers: { css: 'table' },
            },
            etapes: [
              { texte: 'Chaque ligne indique le produit, la période couverte, la date de diffusion prévue et le **statut** en couleur.', cible: { css: 'table thead' } },
              { texte: 'Le bouton de **dépôt** ouvre la fenêtre où l’on dépose les fichiers et les valeurs (voir « Déposer un livrable »).', cible: { css: 'table tbody tr button', rang: 0 } },
              { texte: 'L’icône **corbeille** sert à l’annulation : le point focal envoie une **demande d’annulation** motivée ; l’encadrement annule directement ou valide la demande.', cible: { css: 'table tbody tr [title*="nnul"], table tbody tr [aria-label*="nnul"]' } },
            ],
          },
          {
            type: 'liste',
            titre: 'Autres actions',
            elements: [
              '**Modifier la date de diffusion** : possible ligne par ligne, avec une justification. La date modifiée est signalée par une icône.',
              '**Structures rattachées** : sous le calendrier d’une structure parente, chaque structure enfant a son propre panneau.',
              '**Exports** : Excel et PDF du calendrier de la structure, et une version **consolidée** qui inclut les structures rattachées.',
              'Le **PDF du calendrier** est un document de diffusion : il est organisé **mois par mois**, regroupe les produits par périodicité, se termine par un glossaire des indicateurs et **ne montre aucun statut** — il ne révèle ni retard ni avancement. Les lignes annulées n’y figurent pas.',
            ],
          },
        ],
      },
      {
        id: 'depot',
        titre: 'Déposer un livrable',
        icone: 'Upload',
        roles: TOUS,
        resume: 'Le geste central du point focal : fichiers, valeurs et passage au statut « Livré ».',
        blocs: [
          {
            type: 'etapes',
            capture: {
              fichier: 'depot.jpg',
              chemin: '/calendrier',
              legende: 'La fenêtre de dépôt',
              preparer: [{ css: 'table tbody tr button', rang: 0 }],
            },
            etapes: [
              { texte: 'Glissez le **fichier PDF** dans sa zone, ou cliquez pour le choisir. Un aperçu du fichier s’affiche avant l’envoi.', cible: { css: '[role="dialog"] [data-zone-depot], [role="dialog"] label[for]', rang: 0 } },
              { texte: 'Faites de même pour le **fichier Excel** des données.', cible: { css: '[role="dialog"] [data-zone-depot], [role="dialog"] label[for]', rang: 1 } },
              { texte: 'Saisissez les **valeurs** des indicateurs rattachés, présentés sous forme de cartes.', cible: { css: '[role="dialog"] input[type="number"], [role="dialog"] input[inputmode="decimal"]' } },
              { texte: 'Cliquez sur **Enregistrer** : fichiers et valeurs partent ensemble.', cible: { css: '[role="dialog"] button[type="submit"]' } },
            ],
          },
          {
            type: 'liste',
            titre: 'Après l’enregistrement',
            elements: [
              'La ligne passe à **Livré** sur le calendrier et dans « État du calendrier ».',
              'L’encadrement reçoit une notification.',
              'Les fichiers sont conservés dans un espace privé ; chaque téléchargement passe par un lien temporaire.',
            ],
          },
          {
            type: 'note',
            ton: 'astuce',
            texte: 'Une ligne en retard se dépose aussi depuis **État du calendrier › En retard**, avec le bouton **Déposer**.',
          },
        ],
      },
      {
        id: 'etat-calendrier',
        titre: 'État du calendrier',
        icone: 'ListChecks',
        roles: TOUS,
        resume: 'Les cinq onglets du suivi et les demandes d’annulation.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'etat-calendrier.jpg', chemin: '/etat-calendrier?onglet=imminentes', legende: 'Les onglets de l’état du calendrier' },
            etapes: [
              { texte: '**En retard** : échéance passée, rien de livré. On y justifie, on y dépose, on y relance.', cible: { role: 'link', nom: 'En retard' } },
              { texte: '**Imminentes** : ce qui doit sortir prochainement. L’écran à ouvrir en début de semaine.', cible: { role: 'link', nom: 'Imminentes' } },
              { texte: '**Livrées, non publiées** : les livrables déposés qui attendent la confirmation de mise en ligne.', cible: { role: 'link', nom: 'Livrées' } },
              { texte: '**Publiées** : les produits effectivement diffusés.', cible: { role: 'link', nom: 'Publiées' } },
              { texte: '**Annulées** : les lignes annulées et les **demandes d’annulation** en attente.', cible: { role: 'link', nom: 'Annulées' } },
            ],
          },
          {
            type: 'etapes',
            titre: 'Traiter une demande d’annulation (encadrement)',
            etapes: [
              { texte: 'Ouvrez l’onglet **Annulées** : les demandes envoyées par les points focaux y apparaissent avec leur motif.' },
              { texte: '**Acceptez** : la ligne passe à « Annulé » et sort du calendrier et des exports.' },
              { texte: 'Ou **refusez** en indiquant un motif : la ligne reste au calendrier et le point focal est prévenu.' },
            ],
          },
        ],
      },
      {
        id: 'publier',
        titre: 'Confirmer une mise en ligne',
        icone: 'Rocket',
        roles: ENCADREMENT,
        resume: 'Passer un livrable de « Livré » à « Publié » et annoncer la diffusion.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'publier.jpg', chemin: '/etat-calendrier?onglet=livrees', legende: 'Les livrables en attente de mise en ligne' },
            etapes: [
              { texte: 'Dans **État du calendrier › Livrées, non publiées**, repérez le produit et vérifiez ses fichiers.', cible: { role: 'link', nom: 'Livrées' } },
              { texte: 'Cliquez sur **Publier le produit**.', cible: { role: 'button', nom: 'Publier le produit' } },
              { texte: 'Renseignez le **lien vers la publication** en ligne, ajoutez si besoin des **destinataires en copie** et un commentaire.' },
              { texte: 'Cliquez sur **Confirmer la publication** : la ligne passe à « Publié » et l’annonce part au point focal et à l’équipe de diffusion.' },
            ],
          },
          {
            type: 'note',
            ton: 'info',
            texte: 'L’équipe de la structure et ses administrateurs sont **toujours en copie** ; la liste des destinataires ne sert qu’à en ajouter.',
          },
        ],
      },
      {
        id: 'retards',
        titre: 'Gérer les retards',
        icone: 'AlarmClock',
        roles: TOUS,
        resume: 'Justifier un retard, déposer en retard, envoyer une alerte.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'retards.jpg', chemin: '/etat-calendrier?onglet=retard', legende: 'Les publications en retard' },
            etapes: [
              { texte: '**Point focal** : **Justifier le retard** — état d’avancement, justification et nouvelle date prévisionnelle.', cible: { role: 'button', nom: 'Justifier' } },
              { texte: '**Point focal** : **Déposer** ouvre directement la fenêtre de dépôt du livrable.', cible: { role: 'button', nom: 'Déposer' } },
              { texte: '**Encadrement** : **Envoyer une alerte** écrit au point focal un message personnalisé (e-mail et notification).', cible: { role: 'button', nom: 'Envoyer une alerte' } },
            ],
          },
          {
            type: 'note',
            ton: 'attention',
            texte: 'Les trois éléments de justification sont nécessaires : avec une nouvelle date, les relances automatiques sont **suspendues jusqu’à cette date**. Seuls le dépôt ou une justification complète arrêtent les relances.',
          },
        ],
      },
      {
        id: 'notifications',
        titre: 'Notifications',
        icone: 'Bell',
        roles: TOUS,
        resume: 'Retrouver tout ce qui vous a été adressé.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'notifications.jpg', chemin: '/notifications', legende: 'La liste des notifications' },
            etapes: [
              { texte: 'Les notifications **non lues** sont en tête, signalées par une pastille.', cible: { css: '[aria-label="Non lue"]' } },
              { texte: 'Cliquez sur une notification pour ouvrir l’écran concerné (ligne en retard, livrable, discussion…).' },
            ],
          },
          {
            type: 'note',
            ton: 'info',
            texte: 'Chaque e-mail envoyé par la plateforme laisse aussi une notification : même si un message s’égare, vous le retrouvez ici.',
          },
        ],
      },
      {
        id: 'discussion',
        titre: 'Discussion',
        icone: 'MessagesSquare',
        roles: TOUS,
        resume: 'Échanger entre points focaux et encadrement sans quitter la plateforme.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'discussion.jpg', chemin: '/discussion', legende: 'L’espace de discussion' },
            etapes: [
              { texte: 'Lancez un échange avec **Nouvelle discussion** : structure concernée, sujet, premier message.', cible: { role: 'button', nom: 'Nouvelle discussion' } },
              { texte: 'La liste de gauche regroupe vos fils ; les non lus sont signalés.' },
              { texte: 'Écrivez dans la zone de message ; **Entrée** envoie, **Maj + Entrée** passe à la ligne.', cible: { css: 'textarea' } },
            ],
          },
        ],
      },
    ],
  },
  // ===========================================================================
  {
    titre: 'Organisation et administration',
    sections: [
      {
        id: 'structures',
        titre: 'Structures',
        icone: 'Building2',
        roles: SUPER,
        resume: 'Créer, importer, organiser et supprimer les structures.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'structures.jpg', chemin: '/structures', legende: 'La gestion des structures' },
            etapes: [
              { texte: 'Basculez entre la vue **Arborescence** (structures emboîtées) et la vue **Tableau**.', cible: { role: 'button', nom: 'Arborescence' } },
              { texte: 'Le filtre affiche **une structure et toutes ses structures rattachées**.', cible: { css: '[aria-label="Filtrer sur une structure et ses enfants"]' } },
              { texte: '**Nouvelle structure** : nom, sigle, code, type, structure parente, description.', cible: { role: 'button', nom: 'Nouvelle structure' } },
              { texte: '**Importer des structures** depuis un fichier Excel pour en créer plusieurs d’un coup.', cible: { role: 'button', nom: 'Importer' } },
            ],
          },
          {
            type: 'liste',
            titre: 'Supprimer une structure (corbeille)',
            elements: [
              'La suppression emporte **la structure et toutes ses structures rattachées**.',
              'Elle est **refusée** tant que la famille a des lignes de calendrier en cours, ou des publications / indicateurs qui ne sont pas entièrement publiés.',
              'Les utilisateurs rattachés ne bloquent pas : ils sont simplement **détachés** et restent dans la liste des comptes.',
            ],
          },
          {
            type: 'note',
            ton: 'astuce',
            texte: 'Créez les structures **avant** les comptes : un point focal se rattache à une structure qui doit déjà exister.',
          },
        ],
      },
      {
        id: 'organigramme',
        titre: 'Organigramme',
        icone: 'Network',
        roles: TOUS,
        resume: 'La vue d’ensemble de l’organisation.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'organigramme.jpg', chemin: '/organigramme', legende: 'L’organigramme' },
            etapes: [
              { texte: 'Les structures se lisent **de haut en bas**, reliées par des traits à leur structure parente.', cible: { css: '.organigramme' } },
              { texte: 'Chaque carte présente les **superviseurs**, les **points focaux** et le nombre de **publications** et d’**indicateurs** de la structure.' },
            ],
          },
        ],
      },
      {
        id: 'utilisateurs',
        titre: 'Utilisateurs',
        icone: 'UserCog',
        roles: ENCADREMENT,
        resume: 'Créer les comptes, envoyer les invitations, voir les équipes, supprimer.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'utilisateurs.jpg', chemin: '/utilisateurs', legende: 'La gestion des comptes' },
            etapes: [
              { texte: '**Nouvel utilisateur** : nom, prénoms, adresse e-mail, téléphone, fonction, profil (rôle), structure de rattachement.', cible: { role: 'button', nom: 'Nouvel utilisateur' } },
              { texte: '**Importer des utilisateurs** depuis le modèle Excel pour créer plusieurs comptes à la fois.', cible: { role: 'button', nom: 'Importer' } },
              { texte: 'La vue **Équipes** montre chaque superviseur et les points focaux qu’il encadre, reliés par un trait.', cible: { css: '[aria-label="Affichage"]' } },
            ],
          },
          {
            type: 'liste',
            titre: 'À la création d’un compte',
            elements: [
              'Une **invitation** part aussitôt par e-mail ; le lien d’invitation s’affiche aussi, prêt à **copier** et transmettre par un autre canal.',
              'Pour un point focal, cochez **Point focal titulaire** ou laissez-le suppléant.',
              'Pour un administrateur, cochez **les structures qu’il supervise** (leurs structures rattachées sont incluses).',
              'Vous ne choisissez jamais le mot de passe d’autrui : chacun définit le sien.',
            ],
          },
          {
            type: 'liste',
            titre: 'Supprimer un compte',
            elements: [
              'Le super administrateur peut supprimer les comptes qu’il a lui-même créés.',
              'Seul le **super administrateur principal** peut supprimer un autre super administrateur.',
            ],
          },
        ],
      },
      {
        id: 'equipe',
        titre: 'Équipe de diffusion',
        icone: 'Mails',
        roles: TOUS,
        resume: 'La liste des personnes prévenues des mises en ligne, sans compte.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'equipe.jpg', chemin: '/equipe', legende: 'L’équipe de diffusion' },
            etapes: [
              { texte: 'Choisissez l’**équipe affichée** (direction ou structure).', cible: { texte: 'Équipe affichée' } },
              { texte: '**Ajouter un membre** : nom, fonction, adresse e-mail.', cible: { role: 'button', nom: 'Ajouter un membre' } },
              { texte: '**Télécharger le modèle**, remplissez-le, puis **Charger depuis un fichier Excel** pour un ajout en masse.', cible: { role: 'button', nom: 'Télécharger le modèle' } },
            ],
          },
          {
            type: 'note',
            ton: 'info',
            texte: 'Les membres de l’équipe **n’ont pas de compte** : c’est une liste de diffusion, pas une liste d’utilisateurs. Ils reçoivent les annonces de mise en ligne.',
          },
        ],
      },
    ],
  },
  // ===========================================================================
  {
    titre: 'Compte et réglages',
    sections: [
      {
        id: 'profil',
        titre: 'Mon profil',
        icone: 'CircleUser',
        roles: TOUS,
        resume: 'Photo, coordonnées, mot de passe et, pour le super administrateur, les réglages de l’organisation.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'profil.jpg', chemin: '/profil', legende: 'Mon profil' },
            etapes: [
              { texte: 'Cliquez sur la **photo** pour la changer.', cible: { css: '[title="Changer la photo"]' } },
              { texte: '**Documentation** : ouvre ce guide en ligne ou le télécharge en PDF.', cible: { css: '[data-carte-documentation]' } },
              { texte: '**Coordonnées** : nom, prénoms, téléphone, fonction (et, pour un point focal, l’adresse de son supérieur). Enregistrez.', cible: { texte: 'Coordonnées', rang: 0 } },
              { texte: '**Mot de passe** : saisissez l’actuel, puis le nouveau deux fois.', cible: { texte: 'Mot de passe actuel' } },
            ],
          },
          {
            type: 'note',
            ton: 'info',
            texte: 'Votre adresse de connexion ne se modifie pas depuis le profil. Pour la changer, adressez-vous à un administrateur.',
          },
        ],
      },
      {
        id: 'reglages-super-admin',
        titre: 'Réglages du super administrateur',
        icone: 'SlidersHorizontal',
        roles: SUPER,
        resume: 'Adresse de réception des e-mails et pilotage des envois automatiques.',
        blocs: [
          {
            type: 'etapes',
            capture: {
              fichier: 'mails-automatiques.jpg',
              chemin: '/profil',
              legende: 'Le panneau des e-mails automatiques',
              defilerVers: { texte: 'E-mails automatiques', rang: 0 },
            },
            etapes: [
              { texte: 'Le badge résume l’état : combien de types d’envoi sont actifs.', cible: { texte: 'actifs' } },
              { texte: '**Tout suspendre / Tout activer** coupe ou rétablit tous les envois automatiques d’un clic.', cible: { role: 'button', nom: /Tout (suspendre|activer)/.source } },
              { texte: 'Un interrupteur par type : **rappels avant échéance**, **relances de retard**, **avis de mise en ligne**.', cible: { role: 'switch', rang: 0 } },
              { texte: 'Choisissez les **jours de rappel** (J − 30 à J − 1, cinq au plus)…', cible: { role: 'button', nom: 'J − 15' } },
              { texte: '… et la **fréquence des relances** de retard (tous les 1 à 7 jours).', cible: { role: 'button', nom: '2 jours' } },
            ],
          },
          {
            type: 'liste',
            elements: [
              'Chaque changement est **enregistré immédiatement** et s’applique dès l’envoi quotidien suivant (6 h).',
              'Un type suspendu n’envoie ni e-mail ni notification ; les écrans de suivi restent à jour.',
              'Les invitations, réinitialisations de mot de passe et alertes rédigées à la main partent toujours.',
              '**Adresse de réception des e-mails** (bloc Coordonnées) : l’adresse réelle où le super administrateur reçoit les messages. L’adresse de connexion par défaut, fictive, ne reçoit jamais rien.',
            ],
          },
        ],
      },
      {
        id: 'apparence',
        titre: 'Apparence du site',
        icone: 'Palette',
        roles: SUPER,
        resume: 'Logo, couleurs, slogan, police et style, repris dans le site, les e-mails et les rapports.',
        blocs: [
          {
            type: 'etapes',
            capture: { fichier: 'apparence.jpg', chemin: '/apparence', legende: 'Le réglage de l’apparence' },
            etapes: [
              { texte: '**Téléverser un logo** : il apparaît dans la navigation, sur la page de connexion, dans les e-mails et les rapports.', cible: { texte: 'Téléverser un logo' } },
              { texte: '**Couleurs dominantes** : principale, secondaire, accent. La palette peut aussi être déduite automatiquement du logo.', cible: { texte: 'Couleurs dominantes' } },
              { texte: 'Le **slogan**, affiché dans la barre du haut.', cible: { texte: 'Texte du slogan' } },
              { texte: 'L’**aperçu** se met à jour pendant vos choix ; enregistrez pour appliquer à tous.', cible: { css: '[aria-label="Aperçu"]' } },
            ],
          },
          {
            type: 'note',
            ton: 'info',
            texte: 'La lisibilité est garantie : si une couleur est trop claire pour porter du texte blanc, la plateforme assombrit automatiquement les aplats concernés. Les PDF et Excel utilisent la police **Montserrat** et la couleur secondaire de l’organisation.',
          },
        ],
      },
    ],
  },
  // ===========================================================================
  {
    titre: 'Référence',
    sections: [
      {
        id: 'emails',
        titre: 'Les e-mails automatiques',
        icone: 'MailCheck',
        roles: TOUS,
        resume: 'Qui reçoit quoi, et quand.',
        blocs: [
          {
            type: 'tableau',
            colonnes: ['Message', 'Quand', 'Destinataires'],
            lignes: [
              ['**Rappel avant échéance**', 'Aux jours choisis par le super administrateur (par défaut J − 15, 10, 5, 3, 1)', 'Point focal titulaire ; équipe et administrateurs de la structure en copie'],
              ['**Relance de retard**', 'Tous les 2 jours par défaut, tant que rien n’est livré ni justifié', 'Point focal titulaire ; structure en copie'],
              ['**Avis de mise en ligne**', 'À la confirmation de la publication', 'Point focal, équipe de diffusion, copies ajoutées'],
              ['**Alerte manuelle**', 'Quand l’encadrement l’envoie', 'Points focaux de la structure'],
              ['**Invitation**', 'À la création ou régénération d’un compte', 'La personne invitée'],
              ['**Réinitialisation du mot de passe**', 'À la demande', 'Le titulaire du compte'],
            ],
          },
          {
            type: 'liste',
            elements: [
              'Les envois automatiques partent **chaque matin à 6 h** (heure d’Abidjan).',
              'Un même message ne part **jamais deux fois le même jour** pour une même ligne : la garantie est inscrite dans la base de données.',
              'Tous les messages portent le logo et les couleurs de l’organisation, et laissent une **notification** dans la plateforme.',
              'Les rappels cessent dès que la ligne est livrée ; les relances, dès le dépôt ou une justification avec nouvelle date.',
            ],
          },
        ],
      },
      {
        id: 'exports',
        titre: 'Exports PDF et Excel',
        icone: 'FileDown',
        roles: TOUS,
        resume: 'Tous les documents téléchargeables, en un coup d’œil.',
        blocs: [
          {
            type: 'tableau',
            colonnes: ['Où', 'Document', 'Contenu'],
            lignes: [
              ['Tableau de bord', 'Rapport PDF, Excel', 'Toutes les statistiques, selon les filtres affichés.'],
              ['Catalogue', 'PDF, Excel', 'Les publications et indicateurs, par structure.'],
              ['Calendrier', 'PDF, Excel (et version consolidée)', 'Le calendrier de diffusion mois par mois, glossaire inclus, sans statut.'],
              ['Équipe', 'Modèle Excel', 'Le fichier à remplir pour un import en masse.'],
              ['Mon profil', 'Documentation PDF', 'Ce guide, complet.'],
            ],
          },
        ],
      },
      {
        id: 'mois-type',
        titre: 'Le déroulé d’une année type',
        icone: 'Route',
        roles: TOUS,
        resume: 'Situer chaque écran dans le travail réel.',
        blocs: [
          {
            type: 'liste',
            elements: [
              '**En début d’année** : le super administrateur crée les structures et les comptes. Chaque point focal déclare ses produits au **Catalogue**, puis le calendrier de l’année est **généré**.',
              '**Chaque lundi** : le point focal ouvre **État du calendrier › Imminentes** ; l’encadrement consulte le **Tableau de bord**.',
              '**À l’échéance** : le point focal **dépose** PDF, Excel et valeurs. La ligne passe à **Livré**.',
              '**Juste après** : l’encadrement ouvre **Livrées, non publiées**, vérifie et clique sur **Publier le produit**. La ligne passe à **Publié**, l’annonce part.',
              '**Si l’échéance passe** : la ligne bascule en **En retard**, les relances commencent. Le point focal justifie avec une nouvelle date ou dépose.',
              '**En fin de période** : l’encadrement filtre le tableau de bord et télécharge le **rapport PDF** ou **Excel**.',
            ],
          },
        ],
      },
      {
        id: 'faq',
        titre: 'Questions fréquentes',
        icone: 'CircleHelp',
        roles: TOUS,
        resume: 'Les situations les plus courantes et leur solution.',
        blocs: [
          {
            type: 'tableau',
            colonnes: ['Situation', 'Explication'],
            lignes: [
              ['Je ne vois pas une structure qui existe.', 'Vous ne voyez que votre périmètre. Demandez au super administrateur de vérifier votre rattachement ou vos structures supervisées.'],
              ['J’ai déposé mais le statut n’a pas changé.', 'Le statut ne bascule qu’après un enregistrement réussi. Si des indicateurs sont rattachés, leurs valeurs sont attendues aussi.'],
              ['Le taux de respect affiche un tiret.', 'Aucune ligne n’est encore jugeable sur ce périmètre. Ce n’est pas une erreur.'],
              ['Les relances continuent malgré ma justification.', 'Il faut les trois éléments : état d’avancement, justification **et** nouvelle date.'],
              ['Je ne peux pas supprimer une publication.', 'Des lignes du calendrier sont encore en cours. Faites-les publier ou annuler d’abord.'],
              ['Je ne peux pas supprimer une structure.', 'Elle, ou une structure rattachée, a des lignes en cours ou des produits non entièrement publiés.'],
              ['Un membre de l’équipe ne reçoit pas les annonces.', 'Vérifiez son adresse dans **Équipe**. Il n’a pas de compte : rien à activer de son côté.'],
              ['Mon invitation a expiré.', 'Demandez à votre administrateur de régénérer l’invitation, ou de vous transmettre le nouveau lien.'],
              ['Je ne reçois plus de rappels.', 'Le super administrateur a peut-être suspendu ce type d’envoi dans ses réglages.'],
            ],
          },
        ],
      },
    ],
  },
];

/** Toutes les sections, dans l'ordre du sommaire. */
export const SECTIONS: Section[] = DOCUMENTATION.flatMap((partie) => partie.sections);

/** Toutes les captures déclarées, dans l'ordre. */
export const CAPTURES: { capture: Capture; etapes: Etape[] }[] = SECTIONS.flatMap((section) =>
  section.blocs.flatMap((bloc) => (bloc.type === 'etapes' && bloc.capture ? [{ capture: bloc.capture, etapes: bloc.etapes }] : [])),
);
