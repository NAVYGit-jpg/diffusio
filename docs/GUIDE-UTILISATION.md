# DIFFUSIO — Guide d'utilisation

Ce guide accompagne l'utilisation quotidienne de DIFFUSIO, l'application de
gestion du calendrier de diffusion statistique.

Il est écrit pour être lu dans l'ordre la première fois, puis consulté par
écran. Chaque partie commence par ce que l'écran sert à faire, et finit par les
pièges qu'on y rencontre.

---

## Sommaire

1. [Les trois rôles](#1-les-trois-rôles)
2. [Se connecter la première fois](#2-se-connecter-la-première-fois)
3. [Le vocabulaire de l'application](#3-le-vocabulaire-de-lapplication)
4. [Se repérer dans l'écran](#4-se-repérer-dans-lécran)
5. [Le tableau de bord](#5-le-tableau-de-bord)
6. [Publications & indicateurs — le catalogue](#6-publications--indicateurs--le-catalogue)
7. [Le calendrier de diffusion](#7-le-calendrier-de-diffusion)
8. [Publications imminentes](#8-publications-imminentes)
9. [Déposer les fichiers et les valeurs](#9-déposer-les-fichiers-et-les-valeurs)
10. [Produits chargés et mise en ligne](#10-produits-chargés-et-mise-en-ligne)
11. [Publications en retard](#11-publications-en-retard)
12. [Équipe](#12-équipe)
13. [Notifications](#13-notifications)
14. [Discussion](#14-discussion)
15. [Structures](#15-structures--super-administrateur)
16. [Utilisateurs](#16-utilisateurs--super-administrateur)
17. [Logo et slogan](#17-logo-et-slogan--super-administrateur)
18. [Mon profil](#18-mon-profil)
19. [Les messages automatiques](#19-les-messages-automatiques)
20. [Le déroulé d'un mois type](#20-le-déroulé-dun-mois-type)
21. [Questions fréquentes](#21-questions-fréquentes)

---

## 1. Les trois rôles

Tout ce que vous voyez dans l'application dépend de votre rôle. Il y en a trois,
et ils ne se recouvrent pas : chacun voit ce qui le concerne, et rien de plus.

| Rôle | Qui | Ce qu'il voit | Ce qu'il fait |
|---|---|---|---|
| **Point focal** | La personne responsable des publications d'une structure | Uniquement sa structure | Déclare ses publications, dépose les fichiers, justifie ses retards |
| **Administrateur** | L'encadrement d'une ou plusieurs structures | Les structures qu'il supervise | Suit l'avancement, relance, confirme la mise en ligne |
| **Super administrateur** | L'administrateur de la plateforme | Toute l'organisation | Tout ce qui précède, plus les structures, les comptes et l'identité visuelle |

Une structure a **un point focal titulaire** et, si besoin, des **suppléants**.
Les relances automatiques ne partent qu'au titulaire ; les suppléants peuvent
saisir et déposer comme lui.

> Ce cloisonnement n'est pas seulement un affichage. Un point focal qui modifie
> l'adresse d'une page pour demander les chiffres d'une autre structure reçoit
> les siens, pas une erreur : le périmètre est appliqué par le serveur à chaque
> requête.

---

## 2. Se connecter la première fois

![Page de connexion](captures/01-connexion.png)

1. Ouvrez l'adresse de l'application dans votre navigateur.
2. Saisissez votre adresse e-mail et votre mot de passe.
3. Cliquez sur **Se connecter**.

Vous n'avez pas choisi votre mot de passe vous-même : à la création de votre
compte, vous avez reçu **une invitation par e-mail** contenant un lien pour le
définir. Ce lien a une durée de validité ; s'il a expiré, demandez à votre
administrateur de vous renvoyer une invitation.

![Première connexion](captures/02-premiere-connexion.png)

À la toute première connexion, l'application vous demande de vérifier et de
corriger **votre adresse e-mail, votre nom et votre mot de passe** avant d'aller
plus loin. C'est le seul moment où l'adresse de connexion se change en libre
service ; ensuite, il faut passer par un administrateur.

**Mot de passe oublié.** Le lien se trouve sous le formulaire. Vous recevez un
message contenant un lien de réinitialisation. Si le message n'arrive pas,
regardez dans les indésirables avant de le redemander.

---

## 3. Le vocabulaire de l'application

Quelques mots reviennent partout. Les fixer une fois évite bien des
malentendus.

**Structure.** Une direction, un service, un département de votre institution.
Les structures forment un organigramme : une structure peut en contenir
d'autres, sans limite de niveaux.

**Publication** et **indicateur.** Les deux produits que l'application suit. Une
publication est un document — un rapport, une note de conjoncture. Un indicateur
est une valeur chiffrée — un taux, un indice. Ils se déclarent au même endroit
et suivent le même parcours, mais l'application les distingue partout : dans les
filtres, dans les statistiques et jusque dans la formulation des e-mails.

**Domaine.** La thématique statistique : Économie, Démographie, Santé,
Éducation, Emploi, Agriculture, Prix, Commerce extérieur, Environnement,
Finances publiques. La liste est modifiable.

**Périodicité.** À quel rythme le produit paraît : mensuelle, trimestrielle,
semestrielle, annuelle, pluriannuelle ou ponctuelle. C'est elle qui détermine
**combien de lignes** le calendrier créera dans l'année.

**Délai de mise à disposition.** Le nombre de jours entre la fin de la période
couverte et la date de diffusion. Un indice des prix de janvier avec un délai de
20 jours est attendu le 20 février. Le délai se compte en **jours calendaires**
ou en **jours ouvrés**, au choix.

**Période de couverture.** Ce sur quoi portent les chiffres — le mois de
janvier, le premier trimestre — à ne pas confondre avec la date de diffusion,
qui est le jour où ils sortent.

### Les cinq statuts d'une ligne

| Statut | Couleur | Ce qu'il veut dire |
|---|---|---|
| **Planifié** | neutre | La ligne existe, l'échéance n'est pas passée, rien n'a encore été déposé |
| **Livré** | ambre | Les fichiers ou les valeurs ont été déposés, la mise en ligne n'est pas confirmée |
| **Publié** | vert | La mise en ligne a été confirmée : le produit est réellement diffusé |
| **En retard** | rouge | L'échéance est passée et rien n'a été déposé |
| **Annulé** | gris | La diffusion n'aura pas lieu |

> **Livré n'est pas publié.** C'est la distinction la plus importante de
> l'application. « Livré » dit que le point focal a fait son travail ; « Publié »
> dit que le produit est en ligne pour le public. Entre les deux, il y a la
> confirmation d'un administrateur.

---

## 4. Se repérer dans l'écran

![Vue d'ensemble de l'interface](captures/03-interface-generale.png)

L'écran se lit en trois zones.

**La colonne de gauche** porte le logo de votre organisation et la navigation.
Les entrées sont rangées sous deux intitulés : **Suivi**, le travail quotidien,
et **Général**, l'administration et les échanges. L'onglet où vous vous trouvez
porte une pastille teintée et un trait vertical.

**Un compteur** apparaît à droite d'un onglet quand quelque chose de nouveau s'y
est ajouté depuis votre dernière visite. Il disparaît dès que vous ouvrez
l'onglet.

**La barre du haut** porte le slogan de l'organisation, le choix de la langue,
la cloche des notifications avec le nombre de messages non lus, et votre compte.

Cliquez sur votre nom en haut à droite pour accéder à **Mon profil** ou vous
déconnecter.

---

## 5. Le tableau de bord

C'est l'écran d'accueil : où en est-on, et qu'est-ce qui presse.

![Tableau de bord](captures/04-tableau-de-bord.png)

### Les chiffres du haut

**Taux de respect des délais.** La part des lignes diffusées à temps parmi
celles qui peuvent être jugées, c'est-à-dire celles dont l'échéance est passée
ou qui sont déjà publiées. Une ligne dont l'échéance est encore devant n'entre
pas dans le calcul : elle n'est ni en avance ni en retard, elle est en cours.
Quand rien n'est encore mesurable, l'application affiche un tiret plutôt qu'un
zéro — un zéro se lirait comme un résultat.

**En retard, non publiées.** Échéance passée, toujours rien en ligne. C'est le
seul chiffre qui appelle une action aujourd'hui.

**Publiées après échéance.** Des retards, mais soldés. Les additionner aux
précédents masquerait la distinction.

**Échéances à 30 jours.** Ce qui arrive, avec le détail à 7 et 15 jours.

La deuxième rangée compte les volumes : ce qui est au catalogue, ce qui est
inscrit au calendrier, ce qui est livré, ce qui est publié.

### Les filtres

![Filtres du tableau de bord](captures/05-filtres-tableau-de-bord.png)

Six filtres, sur deux rangées : **année**, **mois**, **type de produit**,
**structure**, **domaine**, **périodicité**.

L'année est unique. Tous les autres acceptent **plusieurs valeurs à la fois** :
cochez janvier, février et mars pour un trimestre. Une case vide ne veut jamais
dire « rien » mais « tout ».

Les filtres actifs apparaissent en jetons sous la rangée. Cliquez sur un jeton
pour le retirer, ou sur **Tout réinitialiser**.

> Les filtres s'inscrivent dans l'adresse de la page. Un tableau de bord filtré
> se transmet donc par message tel quel, et le destinataire voit exactement la
> même chose que vous.

### Le commentaire

Sous les graphiques, l'application rédige en quelques phrases ce que disent les
chiffres. Elle **décrit, elle ne conseille pas** : elle ne vous dira jamais quoi
faire, et elle n'énonce jamais un taux qui n'existe pas.

### Télécharger le rapport

![Boutons de téléchargement](captures/06-boutons-rapport.png)

Deux boutons, en haut à droite.

**Télécharger en Excel** produit un classeur de quatre feuilles — Synthèse,
Évolution mensuelle, Répartitions, Classement. Les graphiques y voyagent sous
forme de tableaux avec des barres dans les cellules : de quoi trier, recalculer,
insérer votre propre graphique.

**Télécharger en PDF** passe par l'impression de votre navigateur. Dans la
fenêtre qui s'ouvre, choisissez **Enregistrer au format PDF** comme destination.

![Page de garde du PDF](captures/07-pdf-page-de-garde.png)

Le PDF s'ouvre sur une page de garde qui porte le titre, la période couverte, le
périmètre, la liste des filtres appliqués, le nombre de lignes retenues, la date
d'édition et votre nom. Les pages suivantes portent les chiffres, les
graphiques et le classement.

> **Les deux fichiers reprennent exactement les filtres à l'écran.** Filtré sur
> janvier 2026, le rapport ne contient que janvier 2026 — et le nom du fichier
> le dit : `tableau-de-bord-2026-01.xlsx`.

---

## 6. Publications & indicateurs — le catalogue

Le catalogue est le point de départ de tout. **Rien n'apparaît au calendrier qui
n'ait d'abord été déclaré ici.**

![Catalogue](captures/08-catalogue.png)

### Déclarer une publication

Cliquez sur **Nouvelle publication** et renseignez :

- **Le nom** du produit, tel qu'il sera écrit dans les e-mails et sur le
  calendrier public ;
- **La structure** qui en est responsable ;
- **Le domaine** statistique ;
- **La périodicité** ;
- **Le délai de mise à disposition**, en jours, et son type — calendaires ou
  ouvrés.

Ces deux derniers champs sont ceux qui comptent le plus : **la périodicité et le
délai déterminent à eux seuls les dates que le calendrier calculera**. Une
erreur ici se répercute sur les douze lignes de l'année.

### Déclarer un indicateur

Même formulaire. Un indicateur peut être **rattaché à une publication** : il
sera alors considéré comme livré en même temps qu'elle.

### Modifier ou retirer

Chaque ligne du tableau porte les actions de modification et de suppression. Une
suppression n'efface rien réellement : l'élément est retiré des écrans mais
l'historique est conservé.

---

## 7. Le calendrier de diffusion

C'est ici que le catalogue devient un échéancier daté.

![Calendrier de diffusion](captures/09-calendrier.png)

### Générer le calendrier d'une année

1. Choisissez l'année.
2. Cliquez sur **Générer le calendrier**.
3. L'application affiche **un aperçu** : ce qu'elle propose d'ajouter, ce
   qu'elle laisse en place, ce qui ne correspond plus.
4. Vérifiez, puis confirmez.

**Rien n'est enregistré avant votre confirmation.**

> **La génération ne détruit pas votre travail.** Relancée sur une année qui a
> déjà un calendrier, elle conserve les lignes existantes et vérifie leur
> conformité en comparant le nom du produit et les dates de couverture. Une
> ligne déjà livrée ou publiée n'est jamais remplacée.

### Lire et filtrer le calendrier

Le tableau donne pour chaque ligne le produit, la structure, la période
couverte, la date de diffusion prévue, la date réelle et le statut.

Les filtres permettent de restreindre l'affichage. Le calendrier est également
exportable.

### Le calendrier public

Si votre organisation a activé l'espace public, le calendrier peut être publié à
une adresse consultable sans compte. **Chaque calendrier doit être publié
explicitement** : activer l'espace public ne suffit pas à y faire apparaître
quoi que ce soit.

---

## 8. Publications imminentes

![Publications imminentes](captures/10-imminentes.png)

Ce qui doit sortir **dans les quinze prochains jours**. C'est l'écran à ouvrir en
début de semaine.

Les échéances déjà dépassées ne sont pas ici : elles sont sur « Publications en
retard ».

Chaque ligne porte une action **Contacter le point focal**, qui propose l'e-mail
ou le téléphone selon ce dont vous disposez.

---

## 9. Déposer les fichiers et les valeurs

C'est le geste central du point focal.

![Dépôt des fichiers](captures/11-depot-fichiers.png)

Depuis le calendrier ou depuis « Publications imminentes », ouvrez la ligne
concernée. Vous disposez de :

- **un emplacement pour le fichier PDF** — le document lui-même ;
- **un emplacement pour le fichier Excel** — les données ;
- **les valeurs des indicateurs** rattachés, à saisir directement.

Un **seul bouton d'enregistrement** valide l'ensemble : les fichiers et les
valeurs partent ensemble. Tant que vous n'avez pas cliqué, rien n'est envoyé.

Une fois l'enregistrement effectué :

1. Le statut de la ligne passe à **Livré**, en ambre, sur le calendrier ;
2. **Une notification part** vers votre encadrement et les autres points focaux
   concernés ;
3. La ligne apparaît dans **Produits chargés**.

**Où vont les fichiers ?** Dans un espace de stockage privé. Ils ne sont jamais
accessibles par une adresse permanente : chaque téléchargement passe par un lien
signé qui expire au bout de cinq minutes. C'est voulu — un lien qui circule ne
doit pas rester ouvert.

---

## 10. Produits chargés et mise en ligne

![Produits chargés](captures/12-produits-charges.png)

Tout ce dont les fichiers ont été déposés ou les valeurs renseignées. Filtrable
par **année** et par **structure**.

Ouvrez une ligne pour consulter les fichiers, en déposer une version corrigée ou
rectifier une valeur.

### Confirmer la mise en ligne

C'est l'action réservée à l'encadrement.

![Publier le produit](captures/13-publier-le-produit.png)

1. Ouvrez la ligne, cliquez sur **Publier le produit**.
2. Renseignez **la date de publication**.
3. Renseignez **le lien** vers le produit en ligne.
4. Choisissez, dans la liste déroulante, **les destinataires** parmi l'équipe de
   diffusion.
5. Confirmez.

Le statut passe alors à **Publié**, en vert, et le message de mise en ligne part.

> L'équipe du point focal est **toujours en copie**, sans que vous ayez à la
> sélectionner. La liste déroulante ne sert qu'à ajouter les destinataires de
> l'équipe de la direction.

---

## 11. Publications en retard

![Publications en retard](captures/14-retards.png)

Les lignes dont l'échéance est passée sans dépôt. Elles y arrivent seules.

Le point focal renseigne trois choses :

- **l'état d'avancement** ;
- **une justification** ;
- **une nouvelle date prévisionnelle**.

Renseigner ces trois éléments **suspend les relances automatiques jusqu'à la
nouvelle date**. C'est le seul moyen d'arrêter les rappels sans publier : ni
l'oubli, ni le silence ne les font cesser.

Chaque report est historisé. L'action **Contacter le point focal** est également
disponible ici.

---

## 12. Équipe

![Équipe](captures/15-equipe.png)

Les personnes prévenues par e-mail dès qu'une publication ou un indicateur est
mis en ligne. **Elles reçoivent les messages sans avoir de compte** sur la
plateforme : c'est une liste de diffusion, pas une liste d'utilisateurs.

Pour chaque membre : le **nom**, la **fonction** et l'**adresse e-mail**.

Deux façons de la remplir :

- **une par une**, avec le formulaire ;
- **par import Excel**, en récupérant le modèle proposé sur l'écran, en le
  remplissant puis en le déposant.

Le super administrateur tient l'équipe de la direction ; chaque point focal tient
celle de sa structure.

---

## 13. Notifications

![Notifications](captures/16-notifications.png)

Les deux cents dernières, non lues en premier. La cloche de la barre du haut en
donne le nombre.

**Chaque e-mail envoyé par l'application laisse aussi une notification.** Une
adresse peut être mal saisie, un message peut tomber dans les indésirables : qui
se connecte doit malgré tout retrouver ce qui lui a été adressé.

Cliquer sur une notification ouvre l'écran concerné.

---

## 14. Discussion

![Discussion](captures/17-discussion.png)

Un fil d'échange entre un point focal et les administrateurs qui supervisent sa
structure. Le point focal échange avec son encadrement ; l'administrateur, avec
les points focaux qu'il supervise.

C'est l'endroit où poser une question sur une ligne du calendrier sans sortir de
l'application.

---

## 15. Structures — super administrateur

![Structures](captures/18-structures.png)

L'organigramme de l'institution. Une structure porte un **nom**, un **sigle** et,
éventuellement, une **structure parente**. Il n'y a pas de limite au nombre de
niveaux.

Créez les structures **avant** les comptes : un point focal se rattache à une
structure, qui doit donc exister.

---

## 16. Utilisateurs — super administrateur

![Utilisateurs](captures/19-utilisateurs.png)

Les comptes de la plateforme. Chaque compte créé **reçoit une invitation** pour
choisir son propre mot de passe : vous ne définissez jamais le mot de passe de
quelqu'un d'autre.

Pour chaque compte : nom, prénoms, adresse e-mail, fonction, rôle, structure de
rattachement, et l'adresse du supérieur hiérarchique.

Pour un point focal, une case indique s'il est **titulaire** ou **suppléant**.
Les relances ne partent qu'au titulaire.

Pour un administrateur, vous cochez **les structures qu'il supervise**.

L'import Excel permet de créer plusieurs comptes en une fois : récupérez le
modèle, remplissez-le, déposez-le.

Le tableau indique la dernière connexion de chacun — utile pour repérer un
compte créé mais jamais activé.

---

## 17. Logo et slogan — super administrateur

![Logo et slogan](captures/20-apparence.png)

L'identité visuelle de l'organisation. Les changements s'appliquent à tous les
utilisateurs dès l'enregistrement.

Vous réglez le **logo**, le **slogan**, les **couleurs**, la **police**, le
**style d'interface** et la **densité**. Un aperçu se met à jour pendant que
vous choisissez.

> **La lisibilité est garantie quoi que vous choisissiez.** Si la couleur de
> votre charte est claire — un jaune institutionnel, par exemple — l'application
> assombrit automatiquement la teinte des aplats qui portent du texte blanc. La
> couleur reste la vôtre ; le texte reste lisible.

Le logo apparaît dans la colonne de gauche, sur la page de connexion et sur la
page de garde des rapports PDF.

---

## 18. Mon profil

![Mon profil](captures/21-profil.png)

Vos coordonnées et votre mot de passe. Vous y réglez aussi **la langue** de
l'interface — français, anglais ou portugais — et vos **préférences de
notification**.

Votre adresse de connexion est affichée mais ne se modifie pas ici : demandez à
un administrateur.

---

## 19. Les messages automatiques

L'application écrit à votre place dans cinq situations. Tous les messages
portent le logo de l'organisation, et **chacun laisse aussi une notification**
dans l'application.

**Les rappels avant échéance.** Ils partent au point focal titulaire aux
échéances configurées par le super administrateur — par défaut **15, 10, 5, 3 et
1 jour** avant la date de diffusion. Ils cessent dès que la ligne est livrée.

**Les relances après échéance.** Une fois l'échéance passée sans dépôt, la
relance part **tous les deux jours** par défaut, au point focal et à son
supérieur. Elle ne cesse qu'avec le dépôt, ou avec une justification assortie
d'une nouvelle date.

**L'annonce de mise en ligne.** Au moment où un administrateur confirme la
publication, avec le lien vers le produit.

**L'invitation** à définir son mot de passe, à la création d'un compte.

**La réinitialisation** du mot de passe, à la demande.

> Un même message ne part **jamais deux fois le même jour** pour la même ligne.
> Cette garantie est inscrite dans la base de données elle-même, pas seulement
> dans le code.

---

## 20. Le déroulé d'un mois type

Pour situer chaque écran dans le travail réel.

**Au début de l'année.** Le super administrateur crée les structures et les
comptes. Chaque point focal déclare ses publications et ses indicateurs au
catalogue. Un administrateur génère le calendrier de l'année et le publie.

**Chaque lundi.** Le point focal ouvre **Publications imminentes** : ce qui sort
dans les quinze jours. L'administrateur ouvre le **tableau de bord** : où en est
le taux de respect, combien de lignes sont en retard.

**Au moment de diffuser.** Le point focal ouvre la ligne, dépose le PDF et
l'Excel, saisit les valeurs des indicateurs, enregistre. La ligne passe à
**Livré**. L'encadrement reçoit une notification.

**Juste après.** L'administrateur ouvre **Produits chargés**, vérifie les
fichiers, clique sur **Publier le produit**, renseigne la date et le lien,
choisit les destinataires. La ligne passe à **Publié**, l'annonce part.

**Si l'échéance passe sans dépôt.** La ligne bascule seule en **En retard**. Les
relances commencent. Le point focal justifie et annonce une nouvelle date, ce
qui suspend les relances jusque-là.

**En fin de mois ou de trimestre.** L'administrateur filtre le tableau de bord
sur la période, télécharge le rapport en PDF ou en Excel, et le transmet.

---

## 21. Questions fréquentes

**Je ne vois pas une structure qui existe pourtant.**
Vous ne voyez que votre périmètre. Un point focal voit sa structure ; un
administrateur, celles qu'il supervise. Demandez au super administrateur de
vérifier votre rattachement.

**Le tableau de bord annonce des retards, mais l'écran « Publications en retard »
est vide.**
Vérifiez vos filtres : ils ne sont pas les mêmes d'un écran à l'autre. Le nombre
du tableau de bord porte sur le périmètre filtré à l'écran.

**J'ai déposé mes fichiers mais le statut n'a pas changé.**
Le statut ne bascule qu'après un enregistrement réussi, et seulement si tout ce
qui est attendu pour la ligne est présent. Si un indicateur est rattaché à la
publication, sa valeur est attendue aussi.

**Le taux de respect affiche un tiret.**
Aucune ligne n'est encore jugeable sur ce périmètre : aucune échéance n'est
passée et rien n'est publié. Ce n'est pas une erreur.

**Le rapport PDF contient toute l'année alors que j'ai filtré sur un mois.**
Vérifiez que le filtre est bien actif — les jetons doivent apparaître sous la
rangée de filtres. Le PDF reprend l'écran tel qu'il est au moment où vous
imprimez.

**Un membre de l'équipe ne reçoit pas les annonces.**
L'équipe est une liste de diffusion : vérifiez l'adresse sur l'écran **Équipe**.
Un membre d'équipe n'a pas de compte, donc rien à activer de son côté.

**Les relances continuent alors que j'ai justifié le retard.**
Les trois éléments sont nécessaires : l'état d'avancement, la justification
**et** une nouvelle date. Sans nouvelle date, il n'y a rien jusqu'à quoi
suspendre.

---

*Guide établi pour DIFFUSIO. Pour les questions d'installation, de configuration
et de reprise en main technique, voir [REPRENDRE-LA-MAIN.md](REPRENDRE-LA-MAIN.md).*
