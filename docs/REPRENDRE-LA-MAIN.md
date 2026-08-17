# Reprendre la main sur DIFFUSIO

Ce document explique comment changer, **sans moi**, l'adresse qui envoie les
e-mails et la base de données qui héberge les données.

Il est écrit pour être suivi ligne à ligne. Chaque commande est à taper dans une
fenêtre de commande ouverte **dans le dossier du projet** (le plus simple :
ouvrir le dossier dans l'explorateur, cliquer dans la barre d'adresse, taper
`cmd`, puis Entrée).

---

## 0. Le principe : un seul fichier commande tout

À la racine du projet se trouve un fichier nommé `.env`. Il n'est pas dans Git,
il ne part jamais sur GitHub, il existe uniquement sur votre ordinateur et sur
le serveur. **C'est lui qui décide à quelle base l'application parle et depuis
quelle adresse elle écrit.** Le code, lui, ne contient aucune adresse ni aucun
mot de passe.

Conséquence pratique : dans la très grande majorité des cas, changer de base ou
d'expéditeur, c'est **modifier une ligne de ce fichier et redémarrer**. Pas de
code à toucher.

| Variable | À quoi elle sert | Si elle est fausse |
|---|---|---|
| `DATABASE_URL` | Connexion de l'application à PostgreSQL | L'application ne démarre pas |
| `DIRECT_URL` | Connexion utilisée par les migrations (`prisma`) | Les mises à jour de structure échouent |
| `AUTH_SECRET` | Signature des sessions de connexion | Tout le monde est déconnecté |
| `AUTH_URL` | Adresse publique du site, mise dans les liens des e-mails | Les liens des e-mails pointent au mauvais endroit |
| `NEXT_PUBLIC_SUPABASE_URL` | Serveur de stockage des fichiers déposés | Le dépôt de fichiers échoue |
| `SUPABASE_SECRET_KEY` | Clé d'accès à ce stockage | Idem |
| `SUPABASE_STORAGE_BUCKET` | Nom du dossier de stockage (`livrables`) | Idem |
| `BREVO_API_KEY` | Clé du prestataire d'envoi d'e-mails | Aucun e-mail ne part |
| `EMAIL_EXPEDITEUR` | Adresse affichée comme expéditeur | Brevo refuse l'envoi |
| `EMAIL_EXPEDITEUR_NOM` | Nom affiché à côté de l'adresse | Cosmétique |
| `EMAIL_MODE` | `test` = rien ne part, `prod` = envoi réel | Des e-mails partent (ou ne partent pas) sans qu'on s'y attende |
| `EMAIL_TEST_DESTINATAIRE` | Adresse de repli en mode test | Les essais n'arrivent nulle part |
| `CRON_SECRET` | Mot de passe de la tâche automatique de nuit | Les relances automatiques ne tournent plus |
| `UPLOAD_TAILLE_MAX_OCTETS` | Taille maximale d'un fichier déposé | Les gros fichiers sont refusés |

**Règle absolue : après toute modification de `.env`, il faut arrêter le serveur
(Ctrl + C dans la fenêtre noire) et le relancer.** Ce fichier n'est lu qu'au
démarrage : tant que le serveur tourne, il garde les anciennes valeurs.

---

## 1. Changer l'adresse qui envoie les e-mails

### 1.1 Le cas courant : garder Brevo, changer l'adresse

Brevo refuse d'envoyer depuis une adresse qui ne lui a pas été déclarée **et**
confirmée. C'est la cause d'échec numéro un, et elle ne se voit qu'au premier
envoi réel. L'ordre des opérations compte donc.

1. Se connecter sur [app.brevo.com](https://app.brevo.com).
2. Menu du compte (en haut à droite) → **Settings** → **Senders, Domains, IPs**.
3. Onglet **Senders** → bouton **Add a sender**.
4. Saisir le nom à afficher (par exemple `DIFFUSIO — ANStat`) et la nouvelle
   adresse. Valider.
5. Brevo envoie un message de confirmation **à cette nouvelle adresse**. Ouvrir
   la boîte de réception correspondante et cliquer sur le lien. Tant que ce
   clic n'a pas eu lieu, l'adresse reste marquée « non validée » et tout envoi
   sera refusé.
6. Ouvrir le fichier `.env` du projet avec le Bloc-notes.
7. Remplacer la valeur entre guillemets :
   ```
   EMAIL_EXPEDITEUR="nouvelle.adresse@exemple.org"
   EMAIL_EXPEDITEUR_NOM="DIFFUSIO"
   ```
8. Enregistrer, fermer, arrêter le serveur (Ctrl + C) et le relancer
   (`demarrer.bat`).
9. Contrôler, sans rien envoyer :
   ```bash
   npm run verifier:email
   ```
   Ce contrôle interroge Brevo, liste les expéditeurs déclarés, dit lesquels
   sont validés, et refuse de passer si la nouvelle adresse n'y figure pas.
10. Envoyer un message d'essai réel à l'adresse indiquée dans
    `EMAIL_TEST_DESTINATAIRE` :
    ```bash
    npm run verifier:email -- --envoyer
    ```
    Vérifier la boîte de réception **et le dossier « indésirables »**.

### 1.2 Point important sur l'adresse actuelle

Aujourd'hui l'application écrit depuis une adresse `@gmail.com`. Cela
fonctionne, mais avec deux limites qu'il faut connaître :

- Google publie une règle publique (DMARC) qui dit en substance : « un message
  se réclamant de `gmail.com` mais expédié par un autre serveur que le nôtre
  doit être rejeté ». Brevo n'est pas un serveur Google. Une partie des
  destinataires — surtout les administrations et les grandes entreprises —
  classera donc ces messages en indésirables, voire les refusera.
- Une adresse personnelle en expéditeur d'un outil institutionnel vieillit mal :
  le jour où la personne change de poste, l'expéditeur reste.

La solution durable est une adresse sur le domaine de l'organisation, par
exemple `no-reply@stat.plan.gouv.ci`, avec **authentification du domaine** chez
Brevo :

1. Brevo → **Settings** → **Senders, Domains, IPs** → onglet **Domains** →
   **Add a domain**.
2. Brevo affiche trois enregistrements DNS à créer (un `TXT` de vérification,
   une clé `DKIM`, un enregistrement `SPF`).
3. Ces enregistrements doivent être créés par la personne qui administre le
   domaine `stat.plan.gouv.ci` — c'est la direction informatique, pas
   l'application. Il suffit de lui transmettre la page telle quelle.
4. Une fois les enregistrements en place, Brevo affiche le domaine comme
   authentifié, et **toute** adresse de ce domaine devient utilisable comme
   expéditeur sans validation individuelle.

C'est la seule manière d'obtenir une délivrabilité correcte en production.

### 1.3 Changer de compte Brevo

1. Créer ou ouvrir le nouveau compte.
2. Menu du compte → **Settings** → **SMTP & API** → onglet **API Keys** →
   **Generate a new API key**.
3. Copier la clé **immédiatement** : elle n'est affichée qu'une seule fois.
4. Dans `.env`, remplacer la valeur de `BREVO_API_KEY` — sur **une seule
   ligne**, sans espace ni retour à la ligne au milieu (un collage sur deux
   lignes est une panne classique ; le script de contrôle sait la détecter et
   la signale).
5. Redéclarer l'expéditeur dans ce nouveau compte (étapes 1 à 5 du §1.1) : les
   expéditeurs validés ne suivent pas d'un compte à l'autre.
6. Redémarrer, puis `npm run verifier:email`.

### 1.4 Quitter Brevo pour un autre prestataire

Tout l'envoi passe par **une seule fonction**, `envoyerViaBrevo`, dans
`src/lib/email/envoyer.ts`. Elle reçoit un message déjà entièrement préparé et
répond simplement « envoyé » ou « échoué, voici pourquoi ».

Tout le reste — les trois modèles de message, la mise en copie de l'équipe, le
journal des envois, la protection contre les doublons, la notification dans
l'application — est en dehors et n'a pas à être touché. Changer de prestataire,
c'est réécrire cette seule fonction.

Ce qu'il faut fournir au remplaçant, quel qu'il soit : l'adresse expéditrice, le
nom, la liste des destinataires, la liste des copies, le sujet, le corps HTML et
le corps texte.

Cas concrets :

- **Mailjet, SendGrid, Amazon SES, Postmark** : même principe exactement (une
  requête HTTP avec une clé). Une trentaine de lignes à changer.
- **Le serveur SMTP de l'organisation** : il faut ajouter la bibliothèque
  `nodemailer` et remplacer la requête HTTP par un envoi SMTP, avec quatre
  nouvelles variables dans `.env` (serveur, port, identifiant, mot de passe).
  C'est souvent la meilleure option pour une administration : les messages
  partent du domaine officiel, sans prestataire extérieur ni quota.

Dans les deux cas, dites-le-moi et je fais la modification : ce n'est pas long,
mais cela reste du code, et les tests existants doivent être adaptés en même
temps.

---

## 2. Changer de base de données

### 2.1 D'abord, comprendre ce qui est lié à Supabase

C'est le point le plus important du document, et la bonne nouvelle du projet.
**Supabase intervient à deux endroits totalement indépendants :**

| | Ce que c'est | Lien avec Supabase |
|---|---|---|
| **La base de données** | Toutes les données : comptes, structures, calendrier, valeurs des indicateurs, notifications, journal | **Aucun.** C'est du PostgreSQL standard. Le code ne nomme Supabase nulle part : il lit `DATABASE_URL`, un point c'est tout. |
| **Le stockage des fichiers** | Uniquement les PDF et Excel déposés par les points focaux | **Réel**, mais confiné à un seul fichier : `src/lib/livrables/stockage.ts` (trois fonctions). |

Autrement dit : **la base peut déménager n'importe où sans toucher une ligne de
code.** Seul le stockage des fichiers demande un peu de travail, et seulement
si vous voulez aussi quitter Supabase pour cette partie-là.

À noter : le logo de l'organisation n'est **pas** dans le stockage, il est dans
la base. Il suit donc la base automatiquement.

### 2.2 Vers un autre projet Supabase

1. Créer le nouveau projet sur [supabase.com](https://supabase.com). Choisir la
   région la plus proche (`eu-west-3`, Paris) et **noter le mot de passe de la
   base** : il n'est affiché qu'à la création.
2. Dans le nouveau projet : **Connect** (en haut) → **Session pooler** → copier
   la chaîne `postgresql://…`.
3. Dans `.env`, mettre cette chaîne dans `DATABASE_URL` **et** dans
   `DIRECT_URL`. Remplacer `[YOUR-PASSWORD]` par le mot de passe noté.
   Attention : si le mot de passe contient un caractère spécial, il doit être
   encodé — `@` s'écrit `%40`, `#` s'écrit `%23`, `/` s'écrit `%2F`.
4. Créer toutes les tables dans la nouvelle base :
   ```bash
   npx prisma migrate deploy
   ```
5. **Soit** repartir d'une base vide avec un compte super administrateur :
   ```bash
   npx prisma db seed
   ```
   Le mot de passe généré s'affiche une seule fois dans la fenêtre : le noter.
   **Soit** reprendre les données existantes, voir §2.4.
6. Recréer le stockage : **Storage** → **New bucket** → nom `livrables` →
   **laisser « Public bucket » décoché**. Ce point n'est pas cosmétique : un
   bucket public rendrait chaque livrable téléchargeable par n'importe qui
   connaissant l'adresse.
7. **Settings** → **API Keys** → créer une *secret key* (`sb_secret_…`) et
   relever l'URL du projet dans **Settings** → **Data API**.
8. Reporter les deux valeurs dans `NEXT_PUBLIC_SUPABASE_URL` et
   `SUPABASE_SECRET_KEY`.
9. Redémarrer, puis contrôler :
   ```bash
   npm run verifier:stockage
   ```
10. Les fichiers déjà déposés dans l'ancien bucket **ne suivent pas tout seuls**.
    Il faut les télécharger depuis l'ancien projet et les redéposer dans le
    nouveau, en conservant exactement les mêmes chemins — la base garde le
    chemin de chaque fichier. S'il y en a beaucoup, dites-le-moi : cela
    s'automatise en un petit script.

### 2.3 Vers un PostgreSQL hors Supabase

Fonctionnent tels quels : Neon, Railway, Render, Scaleway, OVH, Amazon RDS, ou
un serveur PostgreSQL installé dans les locaux de l'organisation.

Conditions à vérifier avant de choisir :

- PostgreSQL **version 14 ou supérieure** ;
- connexion chiffrée disponible (ajouter `?sslmode=require` à la fin de
  l'adresse si l'hébergeur ne le fait pas) ;
- un utilisateur ayant le droit de créer des tables ;
- la base doit être **joignable depuis l'endroit où tourne l'application**. Un
  serveur PostgreSQL enfermé dans le réseau interne du ministère ne pourra pas
  être atteint par une application hébergée chez Vercel : dans ce cas
  l'application doit être hébergée en interne elle aussi.

La marche à suivre :

1. Dans `.env`, remplacer `DATABASE_URL` et `DIRECT_URL` par l'adresse fournie
   par l'hébergeur. S'il n'y a pas de « pooler », les deux valeurs sont
   identiques — c'est déjà le cas aujourd'hui.
2. ```bash
   npx prisma migrate deploy
   ```
3. ```bash
   npx prisma db seed
   ```
   (ou reprise des données, §2.4)
4. Redémarrer et se connecter.

Le stockage des fichiers, lui, **continue de fonctionner avec Supabase** : les
deux sont indépendants. C'est d'ailleurs une configuration parfaitement viable —
base chez l'hébergeur de votre choix, fichiers chez Supabase — et le stockage
Supabase reste gratuit jusqu'à 1 Go.

Si vous voulez malgré tout quitter Supabase entièrement, voir §2.6.

### 2.4 Emporter les données existantes

Pour transférer le contenu d'une base vers une autre, sans passer par
l'application :

```bash
pg_dump --no-owner --no-privileges --format=custom "ANCIENNE_DIRECT_URL" -f diffusio.dump
```

```bash
pg_restore --no-owner --no-privileges --no-comments -d "NOUVELLE_DIRECT_URL" diffusio.dump
```

Remplacer les deux `…_DIRECT_URL` par les chaînes de connexion complètes, entre
guillemets.

Deux avertissements :

- `pg_dump` n'est pas installé par défaut sur Windows. Il vient avec PostgreSQL
  (installateur sur postgresql.org) ; seuls les outils en ligne de commande sont
  nécessaires, pas le serveur.
- La version de `pg_dump` doit être **au moins égale** à celle du serveur
  d'origine, sinon il refuse de travailler. En cas de doute, installer la
  version la plus récente.

Alternative sans rien installer, si la base est encore petite : dans Supabase,
**Database** → **Backups** → télécharger une sauvegarde, puis la restaurer dans
le nouveau projet.

### 2.5 Ce qu'il ne faut pas faire : MySQL ou SQL Server

La base doit rester du **PostgreSQL**. Le modèle de données utilise des
colonnes qui contiennent une liste de valeurs (les adresses e-mail d'une équipe,
les destinataires d'un envoi) et des types énumérés, qui n'existent pas ailleurs.
Passer à MySQL ou SQL Server ne serait pas un réglage : ce serait une réécriture
du modèle de données et de la moitié des requêtes, avec les tests à refaire.

Ce n'est pas une contrainte lourde : PostgreSQL est disponible gratuitement chez
tous les hébergeurs et s'installe sur n'importe quel serveur Windows ou Linux.

### 2.6 Remplacer aussi le stockage des fichiers

Le fichier `src/lib/livrables/stockage.ts` expose exactement trois fonctions :

- `televerser` — enregistre un fichier et renvoie son chemin ;
- `urlSignee` — fabrique un lien de téléchargement **valable 5 minutes** ;
- `supprimer` — efface un fichier (utilisé seulement pour nettoyer après une
  erreur).

N'importe quelle implémentation respectant ce contrat convient. Les deux
options réalistes :

- **Un dossier sur le serveur.** Simple, gratuit, adapté à un hébergement
  interne. Attention : un dossier ne sait pas fabriquer de lien temporaire ; il
  faut ajouter une route qui vérifie les droits de la personne avant de servir
  le fichier. Ce n'est pas un détail — sans cela, tout livrable deviendrait
  téléchargeable par n'importe qui. À proscrire sur un hébergement Vercel, dont
  le disque est effacé à chaque déploiement.
- **Un stockage compatible S3** (Amazon S3, Scaleway Object Storage, MinIO
  installé en interne). Les liens temporaires existent nativement, la traduction
  est presque mot à mot.

Comptez une demi-journée de travail dans les deux cas, tests compris. Dites-moi
laquelle vous voulez et je la fais.

---

## 3. Liste de contrôle après tout changement

Dans l'ordre, sans en sauter :

1. Le serveur a bien été arrêté puis relancé.
2. ```bash
   npm run verifier:email
   ```
3. ```bash
   npm run verifier:stockage
   ```
4. ```bash
   npm test
   ```
5. Se connecter à l'application.
6. Ouvrir le calendrier de diffusion : les lignes doivent s'afficher.
7. Déposer un fichier sur une ligne, enregistrer : le statut passe à « Livré ».
8. Publier ce produit depuis « Produits chargés » : l'e-mail part, la
   notification apparaît.

Si l'étape 6 échoue, le problème est la base. Si c'est l'étape 7, le stockage.
Si c'est l'étape 8, la messagerie. Cette séparation permet de savoir tout de
suite quoi corriger.

---

## 4. Les secrets : ce qu'il faut changer, et quand

Le fichier `.env` contient des mots de passe. Quatre règles :

- Ne jamais l'envoyer par e-mail, WhatsApp ou Slack. Pour le transmettre à un
  collègue, le remettre sur clé USB ou dicter les valeurs.
- Ne jamais le mettre dans Git. Il en est déjà exclu, ne pas défaire cette
  exclusion.
- Sur un hébergement (Vercel, autre), ne pas déposer le fichier : recopier les
  variables une à une dans l'écran de configuration de l'hébergeur.
- Une clé qui a été affichée quelque part est une clé à remplacer, même sans
  preuve d'utilisation malveillante.

**À faire dès maintenant, avant toute mise en production :**

1. Supabase → **Settings** → **API Keys** : révoquer la clé secrète actuelle et
   en créer une nouvelle. L'ancienne a été affichée en clair dans une console
   pendant le développement.
2. Brevo → **Settings** → **SMTP & API** : révoquer la clé actuelle, en créer
   une nouvelle.
3. Changer `AUTH_SECRET` :
   ```bash
   npx auth secret
   ```
   Conséquence unique : toutes les personnes connectées devront se reconnecter.
   Aucune donnée n'est perdue.
4. Changer `CRON_SECRET` par n'importe quelle longue suite de caractères
   aléatoires, et reporter la même valeur dans la configuration de la tâche
   planifiée.

---

## 5. En cas de doute

Les deux scripts de contrôle sont conçus pour être lancés autant de fois que
nécessaire : ils ne modifient rien, ils lisent et rapportent. Ils masquent
systématiquement les clés dans leur affichage, y compris dans les messages
d'erreur renvoyés par les prestataires.

```bash
npm run verifier:email
```

```bash
npm run verifier:stockage
```

Et pour revenir en arrière sur une modification de `.env` : le fichier
`.env.example`, lui, est versionné dans Git et contient la liste complète des
variables attendues, avec un commentaire pour chacune.
