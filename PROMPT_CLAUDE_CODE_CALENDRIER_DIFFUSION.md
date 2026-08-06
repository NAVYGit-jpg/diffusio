# PROMPT / CAHIER DES CHARGES POUR CLAUDE CODE
## Application web collaborative de suivi du calendrier de diffusion statistique
**Nom de code du projet : `DIFFUSIO`** (à renommer si tu préfères)

---

### COMMENT UTILISER CE DOCUMENT

1. Crée un dossier vide sur ton ordinateur, par exemple `C:\Projets\diffusio`.
2. Place ce fichier dedans sous le nom **`CAHIER_DES_CHARGES.md`**.
3. Ouvre un terminal dans ce dossier et lance `claude`.
4. Colle ce message de démarrage :

> Lis intégralement le fichier `CAHIER_DES_CHARGES.md` à la racine du projet. C'est la spécification complète de l'application que nous allons construire ensemble. Je ne sais pas coder : tu es le développeur, je suis tes mains pour ce que tu ne peux pas faire (créer des comptes, cliquer dans des interfaces web, récupérer des clés API). Commence par me poser les questions de la section « QUESTIONS À CLARIFIER », puis démarre la **Phase 0**. Avance phase par phase, ne passe jamais à la phase suivante sans mon accord explicite, et à chaque étape où j'ai une action manuelle à faire, arrête-toi et donne-moi des instructions numérotées, très simples, comme à un débutant total.

---

# 0. RÔLE ET POSTURE ATTENDUE DE CLAUDE CODE

Tu es un **ingénieur logiciel senior full-stack** spécialisé en applications métier de gestion (SaaS multi-organisations), avec une forte expérience en :
- architecture Next.js / TypeScript / PostgreSQL,
- modélisation de bases de données relationnelles normalisées,
- moteurs de dates et de règles métier (calculs de périodicité, jours ouvrés, échéanciers),
- design d'interfaces sobres, professionnelles et accessibles (institutions publiques),
- déploiement et exploitation sur infrastructures gratuites.

**Règles de conduite non négociables :**

1. **L'utilisateur ne sait pas coder.** Tu ne lui demandes jamais d'écrire du code. Tu écris tout. Quand il doit agir (créer un compte, copier une clé, cliquer sur un bouton), tu produis une consigne numérotée, littérale, avec le nom exact des boutons à cliquer, et tu attends sa confirmation avant de continuer.
2. **Tu n'inventes aucune règle métier.** Si un point de ce cahier des charges est ambigu, tu poses la question au lieu de deviner. Tu tiens à jour un fichier `DECISIONS.md` qui consigne chaque arbitrage validé.
3. **Tu travailles par phases**, avec un livrable testable à la fin de chaque phase. Tu ne commences pas la phase N+1 sans validation de la phase N.
4. **Tu commits à chaque étape** avec des messages clairs en français, et tu maintiens un `README.md` et un `CHANGELOG.md`.
5. **Tout ce qui est visible par l'utilisateur final est en français** (libellés, messages d'erreur, e-mails, dates au format `JJ/MM/AAAA`). Le code, les noms de variables et les commentaires techniques sont en anglais. L'application doit être **prête pour l'internationalisation** (fichiers de traduction `fr.json` / `en.json`), le français étant la langue par défaut.
6. **Tu écris des tests automatisés** pour toute la logique métier de dates et de permissions. Cette logique est le cœur du produit : une erreur y est inacceptable.
7. **Tu expliques en langage simple** ce que tu viens de faire à la fin de chaque étape : quoi, pourquoi, comment le vérifier.

---

# 1. VISION PRODUIT

L'application est un **outil international, générique et multi-organisations** permettant à toute institution (institut national de statistique, ministère, agence, entreprise) de :

- déclarer son organigramme (structures) et ses agents (points focaux),
- constituer le catalogue de ses **publications** et de ses **indicateurs**,
- **générer automatiquement** le calendrier annuel de diffusion à partir de la périodicité et du délai de mise à disposition,
- **suivre en temps réel** le respect des échéances,
- **relancer automatiquement** par e-mail et notification les responsables en retard ou proches de l'échéance,
- **centraliser les livrables** (PDF, Excel, valeurs d'indicateurs),
- **notifier officiellement la mise en ligne** d'une publication (lien + QR code) à une liste de diffusion,
- **piloter** l'ensemble par des tableaux de bord.

Elle n'est liée à aucune institution particulière. Les exemples ci-dessous (direction, agence de statistique) ne sont que des illustrations.

---

# 2. ACTEURS, RÔLES ET PÉRIMÈTRES

## 2.1 Les trois profils

| Profil | Rattachement | Périmètre | Plafond |
|---|---|---|---|
| **SUPER_ADMIN** | Aucun (niveau central) | Tout le système, toutes les structures, tous les paramètres | **5 maximum** (le compte initial + 4 créés par lui) |
| **ADMIN** | Aucun (niveau central) | Uniquement les structures qui lui sont affectées (une ou plusieurs) | Illimité |
| **POINT_FOCAL** | Une **seule** structure | Uniquement les données de sa structure | Illimité |

## 2.2 Compte initial

- Au tout premier démarrage, l'application dispose d'un **compte Super Admin par défaut** créé par un script de seed (identifiants affichés dans la console et documentés dans le README).
- À la première connexion, l'application **force** la modification de l'e-mail, du nom et du mot de passe (flag `must_change_password`). Impossible d'accéder au reste tant que ce n'est pas fait.
- Le mot de passe par défaut doit être aléatoire, pas `admin/admin`.

## 2.3 Droits détaillés (matrice à implémenter strictement)

| Action | SUPER_ADMIN | ADMIN | POINT_FOCAL |
|---|:--:|:--:|:--:|
| Créer / modifier / désactiver des structures | ✅ | ❌ | ❌ |
| Créer / modifier / désactiver des points focaux | ✅ | ❌ | ❌ |
| Créer / modifier des ADMIN et leur affecter des structures | ✅ | ❌ | ❌ |
| Créer d'autres SUPER_ADMIN (max 5 au total) | ✅ | ❌ | ❌ |
| Personnaliser le logo, les couleurs, l'ergonomie | ✅ | ❌ | ❌ |
| Paramétrer domaines, jours fériés, modèles d'e-mails | ✅ | ❌ | ❌ |
| Voir toutes les structures | ✅ | Ses structures | Sa structure |
| Saisir publications / indicateurs | ✅ (toutes) | ✅ (ses structures) | ✅ (sa structure) |
| Générer / mettre à jour un calendrier | ✅ | ✅ | ✅ (sa structure) |
| **Valider** un calendrier | ✅ | ✅ | ❌ |
| Modifier un calendrier **validé** | ✅ | ✅ | ❌ (doit demander l'autorisation) |
| Téléverser fichiers / valeurs d'indicateurs | ✅ | ✅ | ✅ |
| **Confirmer la mise en ligne** (bouton « Mis en ligne ») | ✅ | ✅ | ❌ |
| Envoyer des alertes manuelles | ✅ | ✅ | ❌ |
| Messagerie interne | ✅ | ✅ | ✅ (avec ses admins) |
| Tableau de bord global | ✅ | Périmètre affecté | Sa structure |
| Journal d'audit | ✅ | Lecture sur son périmètre | ❌ |

> ⚠️ Les contrôles de permission doivent être appliqués **côté serveur** sur chaque requête (jamais uniquement en masquant des boutons dans l'interface). Écris une fonction centrale `canAccessStructure(user, structureId)` et une fonction `assertPermission(user, action, resource)` utilisées partout.

---

# 3. STACK TECHNIQUE IMPOSÉE

Choisis cette stack, sauf objection technique majeure que tu m'expliqueras :

| Couche | Techno | Pourquoi |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Front + back dans un seul projet, déploiement gratuit simple |
| UI | **Tailwind CSS + shadcn/ui** + `lucide-react` | Composants pro, thème dynamique par variables CSS |
| Base de données | **PostgreSQL hébergé sur Supabase** (offre gratuite) | Gratuit, fiable, inclut le stockage de fichiers |
| ORM | **Prisma** | Migrations sûres, typage fort |
| Authentification | **Auth.js (NextAuth v5)**, provider Credentials, hachage **argon2** ou **bcrypt** | Sessions sécurisées |
| Stockage fichiers | **Supabase Storage** (bucket privé + URL signées) | Vercel n'a pas de disque persistant |
| E-mails transactionnels | **Brevo** (300 e-mails/jour gratuits) — alternative : **Resend** | Volume de relances potentiellement élevé |
| Tâches planifiées | **GitHub Actions** (cron) appelant une route API protégée par un secret | Fiable et gratuit, contourne les limites de cron de Vercel Hobby |
| QR codes | `qrcode` (npm), généré en PNG base64 embarqué dans l'e-mail | Pas de service externe |
| Graphiques | **Recharts** | Léger, suffisant |
| Tableaux | **TanStack Table** | Tri, filtres, pagination |
| Export | `exceljs` (Excel), `@react-pdf/renderer` ou Puppeteer (PDF) | Export du calendrier |
| Tests | **Vitest** (logique métier) + **Playwright** (parcours critiques) | Fiabilité du moteur de dates |
| Hébergement | **Vercel** (offre Hobby gratuite) | Déploiement en 1 clic depuis GitHub |
| Versionnement | **GitHub** (dépôt privé) | Sauvegarde + déclencheur de déploiement |

**Points d'attention à me signaler explicitement :**
- L'offre Vercel Hobby est réservée à un usage **non commercial**. Si le projet devient commercial, prévoir Vercel Pro, ou migrer vers Render / Railway / Fly.io / un VPS. Documente cette contrainte dans le README.
- L'offre gratuite Supabase met le projet en pause après une période d'inactivité : documente la procédure de réveil et prévois un ping hebdomadaire via GitHub Actions.
- Prévois dès le départ un script d'export/sauvegarde de la base (`npm run backup`) que je pourrai lancer.

---

# 4. MODÈLE DE DONNÉES

Implémente ce schéma Prisma. Tous les identifiants sont des `cuid()`. Toutes les tables ont `createdAt`, `updatedAt`, et un `deletedAt` (suppression logique) quand la donnée est référencée ailleurs.

## 4.1 Organisation (locataire / tenant)

```
Organisation
  id, nom, sigle, pays, fuseauHoraire (défaut "Africa/Abidjan")
  logoUrl, couleurPrimaire, couleurSecondaire, couleurAccent,
  police, densiteInterface (COMPACTE|CONFORTABLE), radiusInterface,
  emailExpediteur, signatureEmail,
  delaiTypeParDefaut (CALENDAIRES|OUVRES),
  actif
```
> L'application est conçue **multi-organisations dès le départ** (une seule organisation sera créée au démarrage, mais le schéma le permet). Chaque table métier porte un `organisationId`.

## 4.2 Structure

```
Structure
  id, organisationId, nom, sigle, code (unique par organisation),
  type (libre : DIRECTION | SOUS_DIRECTION | MINISTERE | SERVICE | AUTRE),
  parentId (auto-référence, arborescence à N niveaux),
  description, actif
```

## 4.3 Utilisateur

```
Utilisateur
  id, organisationId, nom, prenoms, email (unique), telephone,
  motDePasseHash, role (SUPER_ADMIN|ADMIN|POINT_FOCAL),
  structureId (obligatoire si POINT_FOCAL, null sinon),
  emailSuperieur (obligatoire pour POINT_FOCAL ; si le point focal est
     lui-même son supérieur, on y met sa propre adresse),
  fonction, avatarUrl,
  mustChangePassword (bool), actif, derniereConnexion,
  preferencesNotification (JSON : email on/off par type)
```

```
AdminStructure   // relation N-N : quelles structures un ADMIN supervise
  adminId, structureId
```

Contraintes à faire respecter par le code **et** par la base :
- au maximum **5** utilisateurs actifs avec `role = SUPER_ADMIN` par organisation ;
- un `POINT_FOCAL` a exactement **une** structure ;
- un `SUPER_ADMIN` / `ADMIN` n'a **jamais** de `structureId`.

## 4.4 Référentiels

```
Domaine        // domaines statistiques : Économie, Démographie, Santé, Éducation...
  id, organisationId, nom, code, description, actif

JourFerie      // pour le calcul en jours ouvrés
  id, organisationId, date, libelle, recurrentAnnuel (bool)
```
Livre un jeu de domaines par défaut, modifiable, et une liste de jours fériés vide à remplir.

## 4.5 Catalogue : publications et indicateurs

```
Publication
  id, organisationId, structureId,
  nom, description, domaineId,
  periodicite (MENSUELLE|TRIMESTRIELLE|SEMESTRIELLE|ANNUELLE|PLURIANNUELLE|PONCTUELLE),
  nombreAnneesPeriodicite (si PLURIANNUELLE, ex. 5),
  delaiJours          // nombre de jours de mise à disposition après la fin de couverture
  delaiType           // CALENDAIRES | OUVRES (hérite du défaut de l'organisation)
  pointFocalId        // clé secondaire renseignée AUTOMATIQUEMENT
  actif
```

```
Indicateur
  id, organisationId, structureId,
  nom, description,
  publicationId (nullable)   // si renseigné → indicateur AFFILIÉ
  domaineId, periodicite, nombreAnneesPeriodicite, delaiJours, delaiType,
  unite, sourceDonnees,
  pointFocalId, actif
```

**Règle d'héritage (essentielle) :**
- Si `publicationId` est renseigné → `domaineId`, `periodicite`, `nombreAnneesPeriodicite`, `delaiJours` et `delaiType` sont **repris automatiquement de la publication**, affichés en lecture seule (grisés) dans le formulaire, et **resynchronisés** si la publication change.
- Si `publicationId` est vide → ces champs sont saisis manuellement et obligatoires.
- Dans **tous les cas**, `pointFocalId` est renseigné automatiquement à partir de l'utilisateur connecté (ou du point focal de la structure si la saisie est faite par un admin). Le nom, le téléphone et l'e-mail du supérieur restent accessibles par jointure — ne les duplique pas.

## 4.6 Calendrier de diffusion

```
Calendrier
  id, organisationId, structureId, annee,
  statut (BROUILLON | SOUMIS | VALIDE),
  generePar, generatedAt, validePar, valideAt,
  commentaireValidation
  @@unique([structureId, annee])
```

```
LigneCalendrier
  id, calendrierId,
  elementType (PUBLICATION | INDICATEUR),
  publicationId | indicateurId,      // un seul des deux renseigné
  libellePeriode                     // "Janvier 2026", "T1 2026", "2026"...
  dateDebutCouverture, dateFinCouverture,
  dateDiffusionPrevue,               // = dateFinCouverture + délai
  dateDiffusionInitiale,             // trace de la 1re valeur générée
  dateDiffusionReelle,               // remplie à la mise en ligne
  statut (PLANIFIE | A_VENIR | TELEVERSE | MIS_EN_LIGNE | EN_RETARD | ANNULE),
  lienPublication, qrCodeUrl,
  modifieManuellement (bool),        // protège la ligne lors d'une régénération
  commentaire
```

## 4.7 Livrables

```
Fichier
  id, ligneCalendrierId, type (PDF | EXCEL | AUTRE),
  nomOriginal, cheminStockage, tailleOctets, mimeType,
  televersePar, televerseAt, version
```

```
ValeurIndicateur
  id, ligneCalendrierId, indicateurId,
  valeur (Decimal), valeurTexte, unite, commentaire,
  saisiPar, saisiAt
```
> Pour une **publication ayant des indicateurs affiliés**, la ligne de calendrier de la publication attend : le(s) fichier(s) PDF et/ou Excel **plus** la dernière valeur de **chacun** des indicateurs affiliés. L'interface doit lister ces indicateurs et bloquer la soumission tant qu'ils ne sont pas tous renseignés (avec possibilité de cocher « non disponible » + justification).

## 4.8 Suivi des retards

```
Retard
  id, ligneCalendrierId (unique),
  detecteAt,
  statutAvancement (EN_COURS | NON_DEBUTEE | null tant que non renseigné),
  justification,
  prochaineDateDiffusion,
  publie (bool, défaut false), datePublication,
  nombreRelancesEnvoyees, derniereRelanceAt, relancesSuspendues (bool)
```

## 4.9 Communication

```
Notification
  id, destinataireId, type, titre, message, lien, lu, luAt, createdAt

Conversation            // fil entre un point focal / une structure et les admins
  id, organisationId, structureId, sujet, dernierMessageAt

Message
  id, conversationId, auteurId, contenu, pieceJointeUrl, lu, createdAt

ListeDiffusionEmail     // mémorisée par élément pour les notifications de mise en ligne
  id, elementType, elementId, emails (String[]), majPar, majAt
  @@unique([elementType, elementId])

JournalEmail            // idempotence des envois automatiques
  id, ligneCalendrierId, typeEnvoi (RAPPEL_J15|RAPPEL_J10|RAPPEL_J5|RAPPEL_J3|RAPPEL_J1|RELANCE_RETARD|MISE_EN_LIGNE|ALERTE_MANUELLE),
  destinataires, sujet, statut (ENVOYE|ECHEC), erreur, envoyeAt

JournalAudit
  id, organisationId, utilisateurId, action, entite, entiteId,
  avant (JSON), apres (JSON), adresseIp, createdAt
```

---

# 5. MOTEUR DE GÉNÉRATION DU CALENDRIER (cœur du système)

## 5.1 Principe

Le calendrier est généré à partir de **trois informations** portées par la publication ou l'indicateur non affilié :
1. la **périodicité**,
2. le **nombre de jours de mise à disposition** (`delaiJours`), saisi **au moment de la création de la publication / de l'indicateur** (et non au moment de la génération),
3. l'**année** sélectionnée lors de la génération.

> ⚠️ **Le calendrier ne consomme que** : (a) les **publications**, et (b) les **indicateurs NON affiliés** à une publication. Un indicateur affilié n'a **jamais** de ligne propre : il hérite des dates de la ligne de sa publication et sa valeur est saisie sur cette même ligne.

## 5.2 Découpage des périodes pour une année Y

| Périodicité | Nb de lignes | Début de couverture | Fin de couverture |
|---|---|---|---|
| MENSUELLE | 12 | 1er jour du mois | dernier jour du mois |
| TRIMESTRIELLE | 4 | 1er jour du 1er mois du trimestre | dernier jour du 3e mois du trimestre |
| SEMESTRIELLE | 2 | 1er janvier / 1er juillet | 30 juin / 31 décembre |
| ANNUELLE | 1 | 1er janvier Y | 31 décembre Y |
| PLURIANNUELLE (n) | 1 si Y est une année de production, 0 sinon | 1er janvier (Y−n+1) | 31 décembre Y |
| PONCTUELLE | 0 en automatique | — | saisie manuelle d'une ligne unique (dates + date de diffusion) |

Gère correctement les **années bissextiles** (29 février).

## 5.3 Calcul de la date de diffusion

```
dateDiffusionPrevue = ajouterDelai(dateFinCouverture, delaiJours, delaiType)
```

- `delaiType = CALENDAIRES` → simple addition de `delaiJours` jours.
- `delaiType = OUVRES` → on avance de `delaiJours` jours en **ignorant samedis, dimanches et jours fériés** de la table `JourFerie`.

> **⚠️ POINT À ME FAIRE CONFIRMER AVANT DE CODER.** Dans mes exemples, j'ai dit « jours ouvrés » mais les résultats correspondent à des **jours calendaires** :
> - mensuel, 10 jours : fin de couverture 31/01/2026 → diffusion annoncée **10/02/2026** (= +10 jours calendaires ; en jours ouvrés ce serait le 13/02/2026) ;
> - trimestriel, 10 jours : fin de couverture 31/03/2026 → diffusion annoncée **10/04/2026** (= +10 jours calendaires ; en jours ouvrés ce serait le 14/04/2026).
>
> **Solution à implémenter :** le champ `delaiType` (CALENDAIRES | OUVRES) est proposé sur chaque publication/indicateur, avec une valeur par défaut définie au niveau de l'organisation. Pose-moi la question et applique ma réponse comme défaut. Affiche dans l'interface une **prévisualisation** de la première date calculée avant validation, pour lever toute ambiguïté.
>
> Option supplémentaire à prévoir : `reportSiWeekendOuFerie` (si la date obtenue tombe un samedi, dimanche ou jour férié, la reporter au jour ouvré suivant). Désactivée par défaut.

## 5.4 Parcours utilisateur de génération

1. Le point focal a saisi ses publications et indicateurs (avec périodicité + délai).
2. Onglet **Calendrier de diffusion** → bouton **« Générer le calendrier de diffusion »**.
3. Sélection de l'**année** : liste déroulante de l'année en cours jusqu'à **année en cours + 500** (je maintiens cette exigence ; utilise une liste virtualisée ou un champ de saisie avec autocomplétion pour rester performant).
4. **Sélection des éléments** : tableau à cases à cocher de toutes les publications et de tous les indicateurs non affiliés de la structure, avec :
   - une **barre de recherche** filtrant en temps réel (nom, domaine, périodicité) au fur et à mesure de la frappe,
   - filtres par domaine et par périodicité,
   - une case « Tout sélectionner »,
   - l'affichage, pour chaque élément, de sa périodicité, de son délai et du **nombre de lignes qui seront générées**.
5. Bouton **« Générer »** → écran de **prévisualisation** du calendrier proposé (avant enregistrement), avec le total de lignes.
6. Confirmation → enregistrement en base, statut `BROUILLON`.

## 5.5 Édition et mise à jour

- Le calendrier généré est **éditable tant qu'il n'est pas validé** : suppression de lignes, modification manuelle d'une date de diffusion (la ligne passe alors `modifieManuellement = true` et affiche une icône).
- **« Mettre à jour le calendrier »** : si le point focal modifie la périodicité ou le délai d'un élément, il sélectionne **uniquement les éléments modifiés** + l'année, et le système **remplace** les lignes correspondantes en recalculant les dates.
  - Les lignes déjà `TELEVERSE` ou `MIS_EN_LIGNE` ne sont **jamais** écrasées : elles sont conservées et signalées dans un rapport de mise à jour (« 3 lignes conservées car déjà traitées »).
  - Les lignes `modifieManuellement = true` déclenchent une demande de confirmation avant écrasement.
  - Un **rapport de différences** (lignes ajoutées / modifiées / supprimées) est affiché avant application.

## 5.6 Validation

- Quand le calendrier d'une année est finalisé, le point focal clique sur **« Soumettre pour validation »** → statut `SOUMIS`.
- Une **notification** part immédiatement vers **tous les admins supervisant cette structure** (+ les super admins) : « Le calendrier de diffusion {année} a été créé par la structure {nom}. »
- L'admin consulte, puis **valide** (statut `VALIDE`) ou **renvoie pour correction** (retour en `BROUILLON` avec commentaire).
- Une fois **validé**, le calendrier n'est **plus modifiable par le point focal**. Il dispose d'un bouton **« Demander une autorisation de modification »** qui envoie une demande à l'admin ; l'admin peut débloquer le calendrier (retour en `BROUILLON`, tracé dans le journal d'audit) ou modifier lui-même.

---

# 6. TÉLÉVERSEMENT DES LIVRABLES

Quand la date de diffusion approche ou est atteinte, le point focal ouvre son calendrier et clique sur la ligne concernée :

- **Publication** → téléverser un **PDF** (obligatoire) et, en option, un ou plusieurs **fichiers Excel**.
- **Indicateur non affilié** → saisir la **valeur** (+ unité, commentaire), et éventuellement joindre un Excel et/ou un PDF.
- **Publication avec indicateurs affiliés** → PDF/Excel **plus** la dernière valeur de **chaque** indicateur affilié, saisie dans un sous-formulaire listant tous ces indicateurs.

Contraintes techniques :
- taille max par fichier : 20 Mo (paramétrable), types autorisés : `.pdf`, `.xlsx`, `.xls`, `.csv` ;
- versionnement : un nouveau téléversement crée une nouvelle version, l'ancienne reste consultable ;
- stockage dans un **bucket privé**, accès uniquement par **URL signée à durée limitée** ;
- la ligne passe au statut `TELEVERSE` et une **notification part vers les admins** du périmètre : « En attente de confirmation de mise en ligne. »

---

# 7. CONFIRMATION DE MISE EN LIGNE (workflow admin)

C'est une étape **obligatoire et réservée aux admins**.

1. Dans « Suivi des structures », l'admin voit les lignes au statut `TELEVERSE` et un bouton **« Mis en ligne »** en face de chacune.
2. Un clic ouvre une **fenêtre modale** demandant :
   - le **lien** vers la publication ou l'indicateur en ligne (URL, validée),
   - la **liste des e-mails** destinataires du message d'information, sous forme de champ à jetons (saisie séparée par virgule, point-virgule, entrée, ou collage en masse ; validation du format ; import possible depuis un fichier).
   - Cette liste est **préremplie automatiquement** si une `ListeDiffusionEmail` existe déjà pour cet élément (même publication/indicateur, autre période).
3. Bouton **« Notifier »** :
   - la liste d'e-mails est **enregistrée par défaut** pour cet élément (créée ou mise à jour) et réapparaîtra automatiquement aux périodes suivantes ;
   - un **QR code** pointant vers le lien est généré ;
   - la ligne passe au statut `MIS_EN_LIGNE`, `dateDiffusionReelle = maintenant`, `lienPublication` enregistré ;
   - si la ligne était en retard, `Retard.publie = true` et `datePublication` renseignée ;
   - l'**e-mail d'information** part **au point focal en destinataire principal**, avec **la liste des e-mails en copie**.

**Contenu obligatoire de l'e-mail de mise en ligne :**
- le **nom** de la publication ou de l'indicateur,
- la **période de couverture** (du … au …),
- la **date de diffusion prévue**,
- la **date de diffusion réelle**,
- le **lien** cliquable,
- le **QR code** (image intégrée),
- (pour un indicateur) sa **valeur** et son unité,
- le logo et les couleurs de l'organisation.

---

# 8. SYSTÈME AUTOMATIQUE DE RAPPELS ET DE RELANCES

Une tâche planifiée quotidienne (GitHub Actions → route `POST /api/cron/notifications` protégée par `CRON_SECRET`) exécute, dans le fuseau horaire de l'organisation :

## 8.1 Rappels avant échéance

Pour toute ligne dont le statut n'est ni `TELEVERSE` ni `MIS_EN_LIGNE`, envoi d'un **e-mail au point focal + notification dans l'application** :

| Rappel | Déclenchement |
|---|---|
| n° 1 | **15 jours** avant la date de diffusion |
| n° 2 | **10 jours** avant |
| n° 3 | **5 jours** avant |
| n° 4 | **3 jours** avant |
| n° 5 | **1 jour** avant |

Chaque message **précise le nombre de jours restants** avant la date de diffusion, ainsi que le nom de l'élément, sa périodicité, sa période de couverture et la date attendue.

## 8.2 Relances en cas de retard

- Dès que `dateDiffusionPrevue < aujourd'hui` et qu'aucun téléversement n'a eu lieu :
  - la ligne passe au statut `EN_RETARD`,
  - un enregistrement `Retard` est créé et la ligne apparaît dans la **base des publications en retard**,
  - un e-mail + une notification de relance partent **tous les 2 jours** à compter de la date de diffusion dépassée.
- Le message rappelle le nom de l'élément, sa périodicité, la date non respectée, le nombre de jours de retard, et invite le point focal à transmettre la publication ou l'information dans les meilleurs délais.
- **Suspension des relances :** dans la base des publications en retard, le point focal clique sur la ligne et renseigne :
  - l'**état d'avancement** (liste déroulante : « En cours » / « Non débutée »),
  - une **justification** (obligatoire),
  - une **prochaine date de diffusion** prévisionnelle (obligatoire, future).
  → Les relances automatiques **cessent**.
- **Reprise des relances :** si la prochaine date de diffusion annoncée est à son tour dépassée sans téléversement, les relances **reprennent 2 jours après** cette date, tous les 2 jours. Le point focal peut à nouveau justifier et repousser (chaque report est historisé et le nombre de reports est visible par l'admin).
- Colonne **« Publiée »** dans la base des retards : `Publié` / `Non publié`, mise à jour automatiquement lors de la mise en ligne. Elle alimente directement les tableaux de bord.

## 8.3 Alertes manuelles

Dans « Suivi des structures », l'admin voit la liste des retards et dispose d'un bouton **« Envoyer une alerte »** : message libre, envoyé par e-mail (point focal + son supérieur en copie) et en notification, tracé dans `JournalEmail`.

## 8.4 Robustesse des envois

- **Idempotence** : avant tout envoi, vérifier dans `JournalEmail` qu'un envoi du même type pour la même ligne n'a pas déjà eu lieu ce jour-là. Aucun doublon, jamais.
- **File d'attente** et limitation de débit pour respecter les quotas du fournisseur d'e-mails ; réessai automatique en cas d'échec (3 tentatives, backoff exponentiel).
- **Mode test** (`EMAIL_MODE=test`) qui redirige tous les e-mails vers une adresse unique — indispensable pour la recette.
- Modèles d'e-mails **modifiables** par le super admin (éditeur simple avec variables `{{nom_element}}`, `{{jours_restants}}`, `{{date_diffusion}}`, `{{periode}}`, `{{lien}}`…).
- Chaque e-mail contient un lien de connexion directe vers la ligne concernée dans l'application.

---

# 9. INTERFACES PAR PROFIL

Structure générale : barre latérale de navigation + en-tête avec logo de l'organisation, **cloche de notifications** (compteur non lus), recherche globale, menu du compte.

## 9.1 Espace POINT FOCAL

| Onglet | Contenu |
|---|---|
| **Tableau de bord** | Prochaines échéances (30 jours), retards en cours, taux de respect des délais de sa structure, avancement de l'année, activité récente |
| **Publications & indicateurs** | Tableau du catalogue, recherche, filtres, ajout / modification / suppression, import Excel en masse, export |
| **Calendrier de diffusion** | Vue tableau + vue calendrier mensuel, par année ; boutons Générer / Mettre à jour / Soumettre ; édition des lignes ; téléversement |
| **Publications en retard** | Base des retards, saisie de la justification et de la prochaine date, statut publié / non publié |
| **Notifications** | Historique, marquage lu/non lu, filtres |
| **Discussion** | Messagerie avec les admins de sa structure |
| **Mon profil** | Coordonnées, e-mail du supérieur, mot de passe, préférences de notification |

## 9.2 Espace ADMIN

| Onglet | Contenu |
|---|---|
| **Tableau de bord** | Consolidé sur ses structures : taux de respect, retards, échéances à venir, classement des structures, éléments en attente de confirmation de mise en ligne |
| **Suivi des structures** | Cœur du poste : par structure → calendrier, liste des publications, liste des indicateurs, fichiers téléversés, valeurs saisies, bouton **« Mis en ligne »**, envoi d'alertes, validation des calendriers, accès direct à la discussion |
| **Publications en retard** | Vue consolidée, relances manuelles, suivi des justifications et des reports |
| **Notifications** / **Discussion** | Idem |
| **Rapports** | Exports Excel/PDF, calendrier consolidé de ses structures |

## 9.3 Espace SUPER ADMIN

Tout ce qui précède sur **l'ensemble** du système, plus :

| Onglet | Contenu |
|---|---|
| **Structures** | Arborescence, création/modification, import Excel en masse |
| **Utilisateurs** | Points focaux (structure, nom, e-mail, téléphone, e-mail du supérieur), admins (nom, e-mail, téléphone + affectation de structures), super admins (compteur « 3/5 utilisés ») ; réinitialisation de mot de passe, activation/désactivation |
| **Calendrier global** | **Consolidation automatique de tous les calendriers de toutes les structures**, filtres par structure / domaine / périodicité / statut / période, export |
| **Paramètres** | Identité (logo, nom, sigle), **thème** (couleurs, police, densité, arrondis), domaines, jours fériés, délai par défaut, modèles d'e-mails, paramètres de relance (délais J-15/J-10/J-5/J-3/J-1 et fréquence de relance rendus **paramétrables**) |
| **Journal d'audit** | Toutes les actions, filtrables, exportables |

## 9.4 Personnalisation de l'apparence (exigence explicite)

Le super admin peut modifier **le logo, les couleurs du thème et l'ergonomie** ; ces changements sont **immédiatement visibles dans l'espace de tous les acteurs** du système.

Implémentation : stocker les valeurs dans `Organisation`, les injecter en **variables CSS** (`--couleur-primaire`, etc.) au niveau du layout racine, avec un **aperçu en direct** avant enregistrement et un bouton « Rétablir le thème par défaut ». Vérifie automatiquement le **contraste** (WCAG AA) et avertis si une couleur choisie rend le texte illisible. Prévois aussi un mode clair / sombre.

## 9.5 Exigences transversales d'interface

- **Responsive** : utilisable sur ordinateur, tablette et téléphone (les points focaux consultent souvent depuis un mobile).
- **Accessibilité** : navigation clavier, libellés ARIA, contrastes conformes.
- **États vides pédagogiques** : quand une liste est vide, expliquer la prochaine action à faire.
- **Confirmations** avant toute suppression, avec rappel des conséquences.
- **Chargements** : squelettes, jamais d'écran figé.
- **Messages d'erreur en français, compréhensibles**, jamais de trace technique brute.
- **Aide contextuelle** : petite icône « ? » expliquant chaque notion métier (périodicité, délai de mise à disposition, indicateur affilié…).
- **Assistant de première utilisation** : à la première connexion du super admin, un parcours guidé en 5 étapes (organisation → structures → points focaux → domaines → premier calendrier).

---

# 10. TABLEAUX DE BORD — INDICATEURS À CALCULER

Chaque profil voit les mêmes indicateurs, **restreints à son périmètre** (super admin : tout ; admin : ses structures ; point focal : sa structure).

- **Taux de respect des délais** = lignes mises en ligne à la date prévue ou avant / total des lignes échues (%)
- **Nombre de publications et d'indicateurs** au catalogue
- **Lignes prévues / téléversées / mises en ligne / en retard** sur la période
- **Retard moyen** (en jours) et **retard maximum**
- **Prochaines échéances** à 7 / 15 / 30 jours
- **Répartition par domaine, par périodicité, par structure**
- **Évolution mensuelle** du taux de respect (courbe sur 12 mois)
- **Classement des structures** par taux de respect (visible admin/super admin uniquement)
- **Publications en retard non publiées** vs **publiées après échéance**
- **Activité récente** (flux des dernières actions du périmètre)

Filtres communs : année, structure, domaine, périodicité, statut, plage de dates. Export Excel et PDF de chaque tableau de bord.

---

# 11. PLAN DE DÉVELOPPEMENT EN PHASES

À chaque **🛑 ACTION UTILISATEUR**, tu t'arrêtes, tu donnes des instructions numérotées ultra-simples, et tu attends ma confirmation.

### Phase 0 — Préparation de l'environnement
- Vérifier Node.js (≥ 20), Git, un éditeur.
- 🛑 **ACTION UTILISATEUR** : installer Node.js et Git si absents (donne-moi les liens et la marche à suivre) ; créer un compte **GitHub**, un compte **Supabase**, un compte **Vercel**, un compte **Brevo** ; me guider pour récupérer et te transmettre : URL de connexion PostgreSQL, clés API Supabase, clé API Brevo.
- Initialiser le projet Next.js + TypeScript + Tailwind + shadcn/ui + Prisma, créer le dépôt GitHub privé, créer `.env.example` (jamais de secret dans Git).
- **Livrable** : page d'accueil qui s'affiche en local sur `http://localhost:3000`.

### Phase 1 — Base de données et authentification
- Schéma Prisma complet, migrations, script de seed (organisation de démonstration + super admin par défaut + domaines).
- Auth.js, connexion / déconnexion, changement forcé du mot de passe, mot de passe oublié par e-mail, middleware de protection des routes, matrice RBAC.
- **Livrable** : je me connecte avec le compte par défaut, je change mon mot de passe, j'accède à un tableau de bord vide.

### Phase 2 — Structures et utilisateurs
- CRUD des structures (arborescence), CRUD des points focaux, des admins (avec affectation de structures), des super admins (plafond de 5), import Excel en masse, e-mail d'invitation avec lien de création de mot de passe.
- **Livrable** : je crée 3 structures et 3 points focaux qui reçoivent leur invitation et se connectent.

### Phase 3 — Catalogue publications / indicateurs
- CRUD complet, règle d'héritage des indicateurs affiliés, recherche, filtres, import/export Excel, contrôles de cohérence.
- **Livrable** : un point focal saisit 5 publications et 10 indicateurs (dont des affiliés) sans erreur.

### Phase 4 — Moteur de dates + génération du calendrier ⭐
- Module `lib/calendrier/` isolé et **entièrement testé** (Vitest) : découpage des périodes, ajout de délai calendaire/ouvré, jours fériés, années bissextiles, cas limites.
- Écrans : sélection d'année, sélection des éléments avec recherche, prévisualisation, génération, édition, mise à jour partielle avec rapport de différences.
- **Livrable** : je génère un calendrier 2026 et je vérifie ligne par ligne que les dates correspondent à mes exemples.

### Phase 5 — Soumission, validation, notifications internes
- Workflow BROUILLON → SOUMIS → VALIDE, verrouillage, demande d'autorisation de modification, centre de notifications, cloche temps réel.
- **Livrable** : le point focal soumet, l'admin reçoit la notification et valide, le point focal ne peut plus modifier.

### Phase 6 — Téléversement et mise en ligne
- Stockage Supabase, téléversement PDF/Excel, saisie des valeurs d'indicateurs, versionnement, bouton « Mis en ligne », modale lien + liste d'e-mails mémorisée, génération du QR code, e-mail de mise en ligne mis en forme.
- **Livrable** : cycle complet d'une publication, de la saisie à l'e-mail reçu avec QR code fonctionnel.

### Phase 7 — Relances automatiques et base des retards
- Route cron sécurisée, rappels J-15/J-10/J-5/J-3/J-1, relances tous les 2 jours, base des retards, justification et report, suspension/reprise, alertes manuelles, `JournalEmail`, mode test.
- Fournis-moi une **commande de test** permettant de simuler une date donnée pour vérifier les envois sans attendre.
- **Livrable** : simulation d'un mois entier, vérification que chaque e-mail part au bon moment et une seule fois.

### Phase 8 — Tableaux de bord, messagerie, exports
- Tous les indicateurs de la section 10, graphiques, filtres, exports Excel/PDF, messagerie interne, calendrier global consolidé.
- **Livrable** : tableaux de bord cohérents pour les trois profils.

### Phase 9 — Personnalisation, finitions, sécurité
- Thème et logo, mode clair/sombre, journal d'audit, limitation du nombre de tentatives de connexion, en-têtes de sécurité, validation de toutes les entrées (Zod), gestion des erreurs, optimisation des requêtes, tests Playwright des parcours critiques, accessibilité, assistant de première utilisation.
- **Livrable** : recette complète sur la base d'une checklist que tu rédigeras.

### Phase 10 — Déploiement et transfert de compétences
- 🛑 **ACTION UTILISATEUR** : connexion de GitHub à Vercel, saisie des variables d'environnement, configuration du domaine, activation du cron GitHub Actions.
- Déploiement en production, migration de la base de production, création du premier super admin réel, sauvegarde automatique.
- **Livrables documentaires** (en français, pour non-informaticien) :
  - `README.md` (installation, architecture, variables d'environnement),
  - `GUIDE_ADMINISTRATEUR.md` (paramétrage, gestion des comptes, dépannage courant),
  - `GUIDE_UTILISATEUR.md` (pas à pas illustré pour les points focaux),
  - `EXPLOITATION.md` (sauvegardes, restauration, surveillance, quotas des offres gratuites, procédure de mise à jour),
  - `DECISIONS.md` (tous les arbitrages retenus).

---

# 12. QUESTIONS À CLARIFIER AVANT DE CODER

Pose-moi ces questions **au début**, et n'écris pas une ligne de code métier avant mes réponses :

1. **Jours ouvrés ou jours calendaires ?** (mes exemples correspondent à des jours calendaires — voir § 5.3). Quelle valeur par défaut ?
2. Faut-il **reporter au jour ouvré suivant** une date de diffusion tombant un week-end ou un jour férié ?
3. Ma liste de périodicités mentionnait « annuelle, mensuelle, ponctuelle, pluriannuelle », mais mes exemples utilisent aussi le **trimestriel**. Confirmes-tu la liste complète du § 5.2 ?
4. Une publication **ponctuelle** : comment renseigner sa date de diffusion (saisie manuelle unique) ?
5. Le terme **« instance »** que j'ai employé désigne-t-il bien la **structure** (direction, sous-direction, ministère) ? Sinon, faut-il un niveau supplémentaire au-dessus ?
6. Un point focal peut-il gérer **plusieurs structures** ? (Ma règle actuelle : non, une seule.)
7. Une structure peut-elle avoir **plusieurs points focaux** ? (Recommandation : oui, avec un titulaire et des suppléants.)
8. La liste déroulante des années jusqu'à **+500 ans** est-elle réellement souhaitée, ou une saisie libre avec des raccourcis suffit-elle ?
9. Le **délai de mise à disposition** peut-il varier d'une période à l'autre pour un même élément, ou est-il unique par élément ?
10. Les **points focaux** doivent-ils pouvoir échanger entre eux, ou uniquement avec les admins ?
11. Quel **volume prévisionnel** (nombre de structures, de publications, d'utilisateurs) ? Cela conditionne le dimensionnement.
12. L'application doit-elle gérer **plusieurs organisations** dès la mise en production, ou une seule pour commencer ?
13. Souhaites-tu un **espace public** (calendrier de diffusion consultable sans compte, comme le fait un institut national) ? À prévoir ou non dès l'architecture.
14. Faut-il une **authentification à deux facteurs** pour les super admins ?

---

# 13. CRITÈRES DE QUALITÉ — DÉFINITION DU « TERMINÉ »

Une fonctionnalité n'est terminée que si :
- [ ] elle fonctionne pour les **trois profils**, avec les bonnes restrictions de périmètre vérifiées côté serveur ;
- [ ] toutes les entrées sont **validées** (Zod) côté client **et** serveur ;
- [ ] les erreurs sont gérées et affichées en français compréhensible ;
- [ ] elle est **responsive** et navigable au clavier ;
- [ ] la logique métier associée est **couverte par des tests** ;
- [ ] les actions sensibles sont **tracées** dans le journal d'audit ;
- [ ] la documentation utilisateur est mise à jour ;
- [ ] j'ai pu la **tester moi-même** en suivant tes instructions et je l'ai validée.

---

# 14. CE QUE TU NE DOIS PAS FAIRE

- Ne pas stocker de mot de passe en clair, ni de secret dans le dépôt Git.
- Ne pas envoyer d'e-mail réel pendant les phases de développement (mode test obligatoire).
- Ne pas rendre un fichier téléversé accessible par une URL publique permanente.
- Ne pas écraser des données déjà téléversées lors d'une régénération de calendrier.
- Ne pas dépendre du système de fichiers local en production (Vercel est éphémère).
- Ne pas produire une interface générique et fade : le rendu doit être **sobre, institutionnel et soigné** (typographie lisible, densité maîtrisée, hiérarchie claire, pas de dégradés criards).
- Ne pas me livrer un bloc de code à copier-coller sans m'expliquer où et pourquoi.

---

*Fin du cahier des charges. Commence par les questions de la section 12, puis la Phase 0.*
