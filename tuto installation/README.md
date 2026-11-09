# Installer et héberger DIFFUSIO sur votre propre serveur

Ce guide part d'un serveur vide et va jusqu'à une application en ligne, en
HTTPS, qui envoie ses e-mails automatiques et sauvegarde sa base chaque nuit.
On suppose que vous avez **déjà le code source** de l'application (le dossier
qui contient `package.json`, `prisma/`, `src/`…).

Chaque commande est à copier telle quelle. Les valeurs à remplacer sont écrites
en MAJUSCULES entre chevrons, par exemple `<VOTRE_DOMAINE>`.

> Durée : environ 1 h 30 la première fois, dont la moitié à attendre des
> téléchargements et la construction.

---

## Sommaire

1. [Ce qu'il faut avant de commencer](#1-ce-quil-faut-avant-de-commencer)
2. [Comprendre l'architecture](#2-comprendre-larchitecture)
3. [Préparer les services externes (e-mails et fichiers)](#3-préparer-les-services-externes)
4. [Préparer le serveur](#4-préparer-le-serveur)
5. [Installer la base de données PostgreSQL](#5-installer-la-base-de-données-postgresql)
6. [Déposer le code et le configurer](#6-déposer-le-code-et-le-configurer)
7. [Construire l'application et créer la base](#7-construire-lapplication-et-créer-la-base)
8. [Faire tourner l'application en permanence](#8-faire-tourner-lapplication-en-permanence)
9. [Publier sur Internet avec Nginx et HTTPS](#9-publier-sur-internet-avec-nginx-et-https)
10. [Programmer les e-mails automatiques](#10-programmer-les-e-mails-automatiques)
11. [Programmer les sauvegardes](#11-programmer-les-sauvegardes)
12. [Première connexion et mise en service](#12-première-connexion-et-mise-en-service)
13. [Mettre à jour l'application](#13-mettre-à-jour-lapplication)
14. [En cas de problème](#14-en-cas-de-problème)
15. [Liste de contrôle finale](#15-liste-de-contrôle-finale)
16. [Annexe : référence des variables](#16-annexe--référence-des-variables)

Les fichiers prêts à l'emploi cités dans ce guide sont dans le dossier
[`fichiers/`](fichiers/).

---

## 1. Ce qu'il faut avant de commencer

### Le serveur

| Élément | Minimum | Conseillé |
|---|---|---|
| Système | Ubuntu Server 22.04 LTS | **Ubuntu Server 24.04 LTS** |
| Processeur | 2 cœurs | 2 à 4 cœurs |
| Mémoire | 2 Go **+ 2 Go de swap** | 4 Go |
| Disque | 20 Go | 40 Go (sauvegardes comprises) |
| Accès | Un compte avec `sudo`, en SSH | |

La mémoire compte surtout au moment de **construire** l'application (étape 7) :
en dessous de 4 Go, ajoutez du swap (expliqué à l'étape 4).

Le guide est écrit pour Ubuntu. Debian 12 fonctionne avec les mêmes commandes.
Pour Windows Server, voir la note en fin d'étape 8.

### Un nom de domaine

Par exemple `diffusio.votre-institution.ci`. Chez le gestionnaire du domaine,
créez un enregistrement **A** qui pointe vers l'adresse IP publique du serveur.
Faites-le dès maintenant : la propagation peut prendre jusqu'à une heure.

> Un hébergement **uniquement en réseau interne** est possible, mais alors les
> liens contenus dans les e-mails ne fonctionneront que depuis ce réseau, et le
> certificat HTTPS devra être fourni par votre service informatique (étape 9).

### Deux comptes externes gratuits

| Service | Rôle | Pourquoi il est nécessaire |
|---|---|---|
| **Brevo** (brevo.com) | Envoi des e-mails | Rappels, relances, invitations. |
| **Supabase** (supabase.com) | Stockage des fichiers déposés (PDF, Excel) | Le code range les livrables dans un espace de stockage Supabase. La base de données, elle, sera sur **votre** serveur. |

### Le serveur doit pouvoir joindre Internet en sortie

Vers `api.brevo.com` (e-mails), `*.supabase.co` (fichiers), et les dépôts de
paquets (`registry.npmjs.org`, `deb.nodesource.com`, `archive.ubuntu.com`).
Si votre réseau filtre les sorties, faites ouvrir ces adresses en HTTPS (443).

---

## 2. Comprendre l'architecture

```
 Navigateurs des utilisateurs
            │  HTTPS (443)
            ▼
 ┌──────────────────────── votre serveur ────────────────────────┐
 │  Nginx  ──►  DIFFUSIO (Node.js, port 3000, local uniquement)  │
 │                     │                                          │
 │                     ▼                                          │
 │              PostgreSQL (local)        cron 06:00 ─► relances  │
 │                                        cron 02:30 ─► sauvegarde│
 └────────────────────────────────────────────────────────────────┘
            │                                   │
            ▼                                   ▼
   Supabase Storage (fichiers)          Brevo (e-mails)
```

- **Nginx** reçoit le trafic HTTPS et le transmet à l'application.
- **L'application** n'écoute que sur la machine elle-même (127.0.0.1) : elle
  n'est jamais exposée directement.
- **PostgreSQL** contient toutes les données. Il n'écoute, lui aussi, qu'en
  local.
- **Une tâche planifiée** déclenche chaque matin les rappels et relances.

---

## 3. Préparer les services externes

### 3.1 Brevo (e-mails)

1. Créez un compte sur https://www.brevo.com.
2. **Vérifier l'adresse d'expédition** : menu **Expéditeurs, domaines et IP
   dédiées** → **Expéditeurs** → **Ajouter un expéditeur**. Saisissez l'adresse
   qui enverra les messages (par exemple `diffusio@votre-institution.ci`), puis
   cliquez sur le lien de confirmation reçu dans cette boîte.
   Pour une meilleure délivrabilité, authentifiez aussi le **domaine** (même
   menu, onglet **Domaines**) : Brevo vous donne des enregistrements DNS à
   ajouter.
3. **Créer une clé API** : menu de votre compte → **SMTP et API** → onglet
   **Clés API** → **Générer une nouvelle clé API**. Copiez-la immédiatement (elle
   commence par `xkeysib-`) et gardez-la pour l'étape 6.
4. **Autoriser l'adresse IP du serveur** : menu de votre compte → **Sécurité** →
   **IP autorisées**. Ajoutez l'adresse IP publique du serveur, ou désactivez le
   blocage. Sans cela, Brevo refuse les envois avec une erreur 401.

### 3.2 Supabase (stockage des fichiers)

1. Créez un compte sur https://supabase.com puis **New project**. Choisissez la
   région la plus proche. Le mot de passe de base demandé ne servira pas : seul
   le stockage est utilisé.
2. **Créer l'espace de stockage** : menu **Storage** → **New bucket** →
   nom : `livrables` → **laissez « Public bucket » décoché** → **Create**.

   > Ce point est essentiel : un bucket public rendrait chaque livrable
   > téléchargeable par n'importe qui connaissant son adresse.
3. **Relever l'adresse du projet** : **Project Settings** → **Data API** →
   **Project URL** (de la forme `https://xxxxx.supabase.co`).
4. **Créer une clé secrète** : **Project Settings** → **API Keys** → **Secret
   keys** → **Add new secret key**. Copiez la valeur (elle commence par
   `sb_secret_`).

   > Cette clé donne tous les droits sur le projet. Elle ne doit apparaître que
   > dans le fichier `.env` du serveur (étape 6), jamais dans un e-mail ou un
   > dépôt Git.

---

## 4. Préparer le serveur

Connectez-vous au serveur en SSH, puis exécutez les blocs dans l'ordre.

### 4.1 Mettre le système à jour et installer les outils

```bash
sudo apt update && sudo apt -y upgrade
```

```bash
sudo apt -y install curl git unzip ca-certificates nginx postgresql postgresql-contrib
```

### 4.2 Régler le fuseau horaire

Les envois automatiques partent à 6 h. Réglez l'heure du serveur sur celle de
votre organisation (Abidjan = UTC, sans heure d'été) :

```bash
sudo timedatectl set-timezone Africa/Abidjan
```

### 4.3 Installer Node.js 22 (version LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

```bash
sudo apt -y install nodejs
```

Vérifiez : la commande suivante doit afficher `v22.` suivi d'autres chiffres.

```bash
node -v
```

### 4.4 Ajouter du swap (si le serveur a moins de 4 Go de mémoire)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4.5 Créer un utilisateur dédié à l'application

L'application ne tourne jamais sous `root`.

```bash
sudo adduser --system --group --home /opt/diffusio --shell /bin/bash diffusio
```

### 4.6 Fermer tout sauf SSH et le web

```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw --force enable
```

---

## 5. Installer la base de données PostgreSQL

PostgreSQL est déjà installé (étape 4.1). Il reste à créer une base et un
utilisateur.

1. Générez un mot de passe solide et **notez-le** :

   ```bash
   openssl rand -hex 24
   ```

2. Créez l'utilisateur et la base (remplacez `<MOT_DE_PASSE_BASE>` par la valeur
   générée) :

   ```bash
   sudo -u postgres psql -c "CREATE USER diffusio WITH PASSWORD '<MOT_DE_PASSE_BASE>';"
   ```

   ```bash
   sudo -u postgres psql -c "CREATE DATABASE diffusio OWNER diffusio;"
   ```

3. Vérifiez que la connexion fonctionne (le mot de passe vous est demandé) :

   ```bash
   psql "postgresql://diffusio@localhost:5432/diffusio" -c "select version();"
   ```

   La réponse doit afficher `PostgreSQL 14` ou plus récent.

> **Ne créez aucune table à la main.** C'est l'application qui construit toute
> la structure à l'étape 7.

> **Base hébergée ailleurs ?** Tout PostgreSQL 14 ou plus récent convient
> (Supabase, Neon, Scaleway, OVH…). Sautez cette étape et utilisez l'adresse
> fournie par l'hébergeur à l'étape 6, en ajoutant `?sslmode=require` à la fin
> si elle ne contient pas déjà de paramètre SSL. MySQL et SQL Server ne
> conviennent **pas**.

---

## 6. Déposer le code et le configurer

### 6.1 Copier le code sur le serveur

Le code doit se trouver dans `/opt/diffusio/app`. Deux possibilités :

- **Depuis un dépôt Git** :

  ```bash
  sudo -u diffusio git clone <ADRESSE_DU_DEPOT_GIT> /opt/diffusio/app
  ```

- **Depuis une archive** (depuis votre poste, envoyez le dossier zippé avec
  `scp diffusio.zip <UTILISATEUR>@<IP_DU_SERVEUR>:/tmp/`, puis sur le serveur) :

  ```bash
  sudo unzip /tmp/diffusio.zip -d /opt/diffusio/app && sudo chown -R diffusio:diffusio /opt/diffusio
  ```

  Vérifiez que `package.json` est bien **directement** dans `/opt/diffusio/app`
  (et pas dans un sous-dossier) :

  ```bash
  ls /opt/diffusio/app/package.json
  ```

> N'apportez **ni** le dossier `node_modules`, **ni** `.next`, **ni** un fichier
> `.env` venant d'un autre poste : ils seront recréés sur le serveur.

### 6.2 Créer le fichier de configuration `.env`

Toute la configuration tient dans un seul fichier. Un modèle commenté est
fourni : [`fichiers/diffusio.env.exemple`](fichiers/diffusio.env.exemple).

1. Copiez le modèle à sa place :

   ```bash
   sudo -u diffusio cp "/opt/diffusio/app/tuto installation/fichiers/diffusio.env.exemple" /opt/diffusio/app/.env
   ```

2. Générez deux secrets (lancez la commande deux fois et notez les deux
   résultats, un pour `AUTH_SECRET`, un pour `CRON_SECRET`) :

   ```bash
   openssl rand -base64 33
   ```

3. Ouvrez le fichier :

   ```bash
   sudo -u diffusio nano /opt/diffusio/app/.env
   ```

4. Remplissez chaque valeur `<…>` :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` et `DIRECT_URL` | `postgresql://diffusio:<MOT_DE_PASSE_BASE>@localhost:5432/diffusio` — **la même valeur dans les deux** |
   | `AUTH_SECRET` | Le premier secret généré |
   | `AUTH_URL` | `https://<VOTRE_DOMAINE>` (sans `/` final) |
   | `CRON_SECRET` | Le second secret généré |
   | `NEXT_PUBLIC_SUPABASE_URL` | L'adresse du projet Supabase (étape 3.2) |
   | `SUPABASE_SECRET_KEY` | La clé `sb_secret_…` (étape 3.2) |
   | `BREVO_API_KEY` | La clé `xkeysib-…` (étape 3.1) |
   | `EMAIL_EXPEDITEUR` | L'adresse vérifiée dans Brevo |
   | `EMAIL_MODE` | `prod` (voir l'avertissement ci-dessous) |

   Enregistrez avec **Ctrl + O**, **Entrée**, puis quittez avec **Ctrl + X**.

   > **Mot de passe avec caractères spéciaux** : dans `DATABASE_URL`, `@` s'écrit
   > `%40`, `#` s'écrit `%23`, `/` s'écrit `%2F`, `:` s'écrit `%3A`. Le mot de
   > passe généré par `openssl rand -hex` n'en contient pas.

   > **`EMAIL_MODE=prod` est indispensable hors Vercel.** Sans cette ligne,
   > l'application se croit en développement : elle **simule** les envois et
   > n'écrit à personne.

5. Protégez le fichier :

   ```bash
   sudo chmod 600 /opt/diffusio/app/.env
   ```

---

## 7. Construire l'application et créer la base

Toutes les commandes de cette étape s'exécutent **en tant qu'utilisateur
`diffusio`**, dans le dossier de l'application. Ouvrez une session à son nom :

```bash
sudo -iu diffusio
```

```bash
cd /opt/diffusio/app
```

### 7.1 Installer les dépendances

```bash
npm ci
```

Comptez quelques minutes. Des avertissements `deprecated` ou `allow-scripts`
peuvent s'afficher : ils sont sans conséquence. Seule une ligne `npm ERR!`
indique un échec.

### 7.2 Créer toutes les tables

```bash
npx prisma migrate deploy
```

La commande rejoue l'historique des migrations et se termine par
`All migrations have been successfully applied.` Elle peut être relancée sans
risque : elle n'applique que ce qui manque.

> N'utilisez **jamais** `prisma migrate dev` ni `prisma migrate reset` sur le
> serveur : ces commandes de développement peuvent effacer la base.

### 7.3 Créer l'organisation et le compte super administrateur

```bash
npx prisma db seed
```

La commande crée l'organisation, les domaines statistiques de base et **un
compte super administrateur**. Elle affiche :

```
  Adresse e-mail : super.admin@diffusio.local
  Mot de passe   : xxxx-xxxx-xxxx
```

**Notez ce mot de passe immédiatement** : il n'est affiché qu'une seule fois et
n'est enregistré nulle part en clair. Vous le changerez à la première connexion.

> Pour choisir une autre adresse de connexion, renseignez
> `SEED_SUPER_ADMIN_EMAIL` dans `.env` **avant** cette commande. Sur une base
> qui a déjà un super administrateur, la commande ne modifie rien.

### 7.4 Vérifier les services externes

```bash
npm run verifier:stockage
```

```bash
npm run verifier:email
```

Les deux doivent se terminer sans erreur. En cas d'échec, le message indique la
variable à corriger dans `.env`.

### 7.5 Construire l'application

```bash
npm run build
```

Comptez 3 à 8 minutes. La fin affiche la liste des pages et
`○ (Static)  ƒ (Dynamic)…`. Un message `Killed` signifie un manque de mémoire :
ajoutez du swap (étape 4.4) et relancez.

> Les variables qui commencent par `NEXT_PUBLIC_` sont **figées au moment de la
> construction**. Si vous les modifiez plus tard, il faut relancer
> `npm run build`.

### 7.6 Essai rapide

```bash
npm run start -- -H 127.0.0.1 -p 3000
```

Dans **une seconde** session SSH :

```bash
curl -I http://127.0.0.1:3000/connexion
```

La réponse doit commencer par `HTTP/1.1 200 OK`. Revenez dans la première
session et arrêtez l'essai avec **Ctrl + C**, puis quittez la session
`diffusio` :

```bash
exit
```

---

## 8. Faire tourner l'application en permanence

Un service `systemd` démarre l'application au démarrage du serveur et la relance
si elle s'arrête. Le fichier est fourni :
[`fichiers/diffusio.service`](fichiers/diffusio.service).

```bash
sudo cp "/opt/diffusio/app/tuto installation/fichiers/diffusio.service" /etc/systemd/system/diffusio.service
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now diffusio
```

Vérifiez qu'il est actif (`active (running)` en vert) :

```bash
sudo systemctl status diffusio --no-pager
```

Consulter le journal de l'application à tout moment :

```bash
sudo journalctl -u diffusio -f
```

(**Ctrl + C** pour quitter le journal.)

> **Windows Server.** L'application fonctionne aussi sous Windows : installez
> Node.js 22 et PostgreSQL depuis leurs sites officiels, suivez les étapes 6 et
> 7 dans PowerShell, puis faites tourner `npm run start` comme service avec un
> outil tel que NSSM, derrière IIS (module ARR) ou Caddy pour le HTTPS. Cette
> variante n'est pas détaillée ici ; Linux reste le choix recommandé.

---

## 9. Publier sur Internet avec Nginx et HTTPS

### 9.1 Configurer Nginx

Le fichier est fourni : [`fichiers/nginx-diffusio.conf`](fichiers/nginx-diffusio.conf).

1. Copiez-le :

   ```bash
   sudo cp "/opt/diffusio/app/tuto installation/fichiers/nginx-diffusio.conf" /etc/nginx/sites-available/diffusio
   ```

2. Remplacez le nom de domaine (mettez le vôtre à la place de
   `diffusio.exemple.ci` dans la commande) :

   ```bash
   sudo sed -i 's/<VOTRE_DOMAINE>/diffusio.exemple.ci/g' /etc/nginx/sites-available/diffusio
   ```

3. Activez le site et désactivez la page par défaut :

   ```bash
   sudo ln -sf /etc/nginx/sites-available/diffusio /etc/nginx/sites-enabled/diffusio && sudo rm -f /etc/nginx/sites-enabled/default
   ```

4. Vérifiez puis rechargez :

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

   `nginx -t` doit répondre `syntax is ok` et `test is successful`.

### 9.2 Obtenir le certificat HTTPS (gratuit, Let's Encrypt)

Le nom de domaine doit déjà pointer vers le serveur (étape 1).

```bash
sudo apt -y install certbot python3-certbot-nginx
```

```bash
sudo certbot --nginx -d <VOTRE_DOMAINE>
```

Répondez aux questions (adresse e-mail pour les alertes d'expiration,
acceptation des conditions). Certbot modifie la configuration Nginx et
**renouvelle le certificat automatiquement**.

Ouvrez `https://<VOTRE_DOMAINE>` dans un navigateur : la page de connexion
s'affiche avec le cadenas.

> **Réseau interne sans accès Internet entrant** : Let's Encrypt ne pourra pas
> valider le domaine. Demandez un certificat à votre service informatique, puis
> ajoutez dans le bloc `server` les lignes `listen 443 ssl;`,
> `ssl_certificate <chemin du certificat>;` et
> `ssl_certificate_key <chemin de la clé>;`.

---

## 10. Programmer les e-mails automatiques

Chaque matin, l'application doit examiner le calendrier : passer les lignes en
retard, envoyer les rappels avant échéance et les relances. C'est une adresse
interne protégée par `CRON_SECRET`, qu'une tâche planifiée appelle.

1. Installez le script de lancement et la planification :

   ```bash
   sudo mkdir -p /opt/diffusio/scripts && sudo cp "/opt/diffusio/app/tuto installation/fichiers/"*.sh /opt/diffusio/scripts/ && sudo chmod 750 /opt/diffusio/scripts/*.sh && sudo chown -R diffusio:diffusio /opt/diffusio/scripts
   ```

   ```bash
   sudo cp "/opt/diffusio/app/tuto installation/fichiers/diffusio.cron" /etc/cron.d/diffusio && sudo chmod 644 /etc/cron.d/diffusio
   ```

2. Testez tout de suite, sans attendre demain matin :

   ```bash
   sudo -u diffusio /opt/diffusio/scripts/lancer-relances.sh
   ```

   La réponse est un résumé au format JSON, par exemple
   `{"lignesExaminees":42,"passagesEnRetard":0,"rappelsEnvoyes":0,…}`. Une
   réponse `401` signifie que `CRON_SECRET` est vide ou différent dans `.env`.

Le résultat de chaque exécution est ajouté à `/opt/diffusio/journaux/relances.log`.

> Un même message ne part jamais deux fois le même jour pour la même ligne :
> relancer le script à la main est sans danger.

> Le super administrateur peut suspendre chaque type d'envoi depuis **Mon
> profil › E-mails automatiques**, sans toucher au serveur.

---

## 11. Programmer les sauvegardes

La planification installée à l'étape 10 lance aussi, chaque nuit à 2 h 30, une
sauvegarde complète de la base dans `/opt/diffusio/sauvegardes/` et conserve les
14 dernières.

Testez-la :

```bash
sudo -u diffusio /opt/diffusio/scripts/sauvegarder-base.sh && ls -lh /opt/diffusio/sauvegardes/
```

**Copiez régulièrement ces fichiers hors du serveur** (autre machine, disque
externe, stockage objet) : une sauvegarde qui reste sur la machine sauvegardée
ne protège pas d'une panne de disque.

Les fichiers déposés (PDF, Excel) sont, eux, dans Supabase Storage : ils ne
sont pas concernés par cette sauvegarde.

**Restaurer** une sauvegarde (attention : remplace le contenu actuel) :

```bash
sudo systemctl stop diffusio
```

```bash
sudo -u diffusio pg_restore --clean --if-exists --no-owner -d "postgresql://diffusio:<MOT_DE_PASSE_BASE>@localhost:5432/diffusio" /opt/diffusio/sauvegardes/<FICHIER>.dump
```

```bash
sudo systemctl start diffusio
```

---

## 12. Première connexion et mise en service

1. Ouvrez `https://<VOTRE_DOMAINE>`.
2. Connectez-vous avec l'adresse et le mot de passe affichés à l'étape 7.3.
3. L'écran de **première connexion** s'ouvre : renseignez votre nom et choisissez
   un nouveau mot de passe. L'adresse de connexion par défaut reste fixe.
4. **Mon profil** → **Coordonnées** → **Adresse de réception des e-mails** :
   saisissez votre adresse réelle, puis **Enregistrer**. Sans elle, aucun e-mail
   ne vous parvient (l'adresse `…@diffusio.local` n'existe pas).
5. **Mon profil** → **Thème et couleurs du site** → **Personnaliser** : logo,
   couleurs, slogan.
6. **Structures** : créez l'organigramme (ou importez-le depuis Excel).
7. **Utilisateurs** : créez les comptes. Chacun reçoit une invitation par e-mail
   pour choisir son mot de passe.
8. **Publications & indicateurs** puis **Calendrier de diffusion** : la plateforme
   est prête.

Le mode d'emploi complet est disponible dans l'application : **Mon profil** →
**Documentation de la plateforme**.

---

## 13. Mettre à jour l'application

Quand une nouvelle version du code est disponible, le script fourni
[`fichiers/mettre-a-jour.sh`](fichiers/mettre-a-jour.sh) fait tout dans le bon
ordre : sauvegarde, récupération du code (si Git), dépendances, migrations,
construction, redémarrage.

1. Si vous travaillez **sans Git**, remplacez d'abord le contenu de
   `/opt/diffusio/app` par la nouvelle version, **en conservant le fichier
   `.env`**.
2. Lancez :

   ```bash
   sudo /opt/diffusio/scripts/mettre-a-jour.sh
   ```

L'application est indisponible environ une minute, le temps du redémarrage. En
cas d'échec de la construction, l'ancienne version continue de tourner : rien
n'est arrêté avant que la nouvelle soit prête.

---

## 14. En cas de problème

Le premier réflexe : lire le journal.

```bash
sudo journalctl -u diffusio -n 100 --no-pager
```

| Symptôme | Cause probable | Solution |
|---|---|---|
| `502 Bad Gateway` dans le navigateur | L'application est arrêtée | `sudo systemctl restart diffusio`, puis lire le journal |
| `npm run build` s'arrête sur `Killed` | Mémoire insuffisante | Ajouter du swap (étape 4.4) |
| `P1001: Can't reach database server` | PostgreSQL arrêté ou adresse erronée | `sudo systemctl status postgresql` ; vérifier `DATABASE_URL` |
| `P1000: Authentication failed` | Mot de passe de base erroné | Vérifier `DATABASE_URL`, encoder les caractères spéciaux |
| Les migrations échouent : `datasource.url` manquant | `DIRECT_URL` vide | Mettre la même valeur que `DATABASE_URL` |
| La connexion boucle sur la page de connexion | `AUTH_URL` ne correspond pas à l'adresse utilisée, ou `AUTH_SECRET` vide | Corriger `.env`, puis `sudo systemctl restart diffusio` |
| Aucun e-mail ne part, le journal dit « Mode simulation » | `EMAIL_MODE` absent ou `test` | Mettre `EMAIL_MODE=prod`, redémarrer |
| Brevo répond `401` | IP du serveur non autorisée, ou clé erronée | Étape 3.1, point 4 ; vérifier `BREVO_API_KEY` |
| Brevo répond « sender not valid » | Adresse d'expédition non vérifiée | Étape 3.1, point 2 |
| Les liens des e-mails pointent vers `localhost` | `AUTH_URL` vide ou erronée | Mettre `https://<VOTRE_DOMAINE>`, redémarrer |
| Le dépôt d'un fichier échoue | Stockage Supabase mal configuré | `npm run verifier:stockage` (en tant que `diffusio`) |
| Le dépôt d'un gros fichier échoue (`413`) | Limite Nginx | Vérifier `client_max_body_size 25m;` dans la configuration Nginx |
| Le certificat HTTPS est refusé par Certbot | Le domaine ne pointe pas encore vers le serveur | Vérifier l'enregistrement DNS A, attendre, relancer Certbot |
| Mot de passe du super administrateur perdu | | Un autre super administrateur lui renvoie une invitation depuis **Utilisateurs** |

---

## 15. Liste de contrôle finale

- [ ] `https://<VOTRE_DOMAINE>` affiche la page de connexion avec le cadenas.
- [ ] `sudo systemctl status diffusio` indique `active (running)`.
- [ ] Après `sudo reboot`, l'application redémarre seule.
- [ ] `npm run verifier:email` et `npm run verifier:stockage` réussissent.
- [ ] `lancer-relances.sh` renvoie un résumé JSON.
- [ ] Une sauvegarde existe dans `/opt/diffusio/sauvegardes/`.
- [ ] Le super administrateur a renseigné son **adresse de réception des e-mails**.
- [ ] Un compte test reçoit bien son invitation par e-mail.
- [ ] Un fichier PDF se dépose et se télécharge depuis une ligne du calendrier.
- [ ] Le fichier `.env` a les droits `600` et n'est copié nulle part ailleurs.

---

## 16. Annexe : référence des variables

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | Oui | Connexion de l'application à PostgreSQL. |
| `DIRECT_URL` | Oui | Connexion utilisée par les migrations. Identique à `DATABASE_URL` sur un PostgreSQL local. |
| `AUTH_SECRET` | Oui | Signe les sessions. Le changer déconnecte tout le monde. |
| `AUTH_URL` | Oui | Adresse publique du site ; sert aussi à fabriquer les liens des e-mails. |
| `CRON_SECRET` | Oui | Protège l'adresse des envois automatiques. |
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | Adresse du projet Supabase (stockage). Figée à la construction. |
| `SUPABASE_SECRET_KEY` | Oui | Clé secrète du stockage. |
| `SUPABASE_STORAGE_BUCKET` | Non | Nom du bucket (défaut : `livrables`). |
| `BREVO_API_KEY` | Oui | Clé d'envoi Brevo. |
| `EMAIL_EXPEDITEUR` | Oui | Adresse d'expédition, vérifiée dans Brevo. |
| `EMAIL_EXPEDITEUR_NOM` | Non | Nom affiché de l'expéditeur (défaut : `DIFFUSIO`). |
| `EMAIL_MODE` | **Oui hors Vercel** | `prod` pour envoyer réellement ; `test` simule. |
| `EMAIL_TEST_DESTINATAIRE` | Non | Adresse utilisée par `npm run verifier:email -- --envoyer`. |
| `SEED_SUPER_ADMIN_EMAIL` | Non | Adresse du compte créé par `npx prisma db seed` (défaut : `super.admin@diffusio.local`). |
| `EMAIL_ADMIN_PAR_DEFAUT` | Non | Indication grisée sur la page de connexion. **Laisser vide en production.** |
| `UPLOAD_TAILLE_MAX_OCTETS` | Non | Taille maximale d'un fichier déposé (défaut : 20 Mo). |

Après toute modification de `.env` : `sudo systemctl restart diffusio`. Si la
variable modifiée commence par `NEXT_PUBLIC_`, relancez d'abord
`npm run build` (étape 7.5).
