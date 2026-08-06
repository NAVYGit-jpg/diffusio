# DECISIONS.md — Journal des arbitrages

Ce fichier consigne **chaque décision validée** au cours du projet, conformément
à la règle de conduite n° 2 du cahier des charges. Une décision n'est inscrite
ici qu'une fois **confirmée explicitement** par le porteur du projet.

Format : `DEC-nnn` | date | sujet | décision retenue | motif.

---

## Décisions techniques prises pendant la Phase 0

| Réf | Date | Sujet | Décision | Motif |
|---|---|---|---|---|
| DEC-001 | 06/08/2026 | Stack | Next.js 15.5 (App Router) + TypeScript + Tailwind 4 + shadcn/ui (base `radix`, preset `nova`) + `lucide-react` | Conforme au §3 du cahier des charges. Aucune objection technique. |
| DEC-002 | 06/08/2026 | Bibliothèque d'animation | `motion` v12 retenu ; `framer-motion` désinstallé | `framer-motion` est en maintenance ; `motion` est son successeur maintenu et était déjà tiré par shadcn/ui. Éviter deux moteurs d'animation dans le bundle. |
| DEC-003 | 06/08/2026 | Secrets et Git | `.claude/settings.local.json` exclu du suivi Git | Le fichier contient une clé d'API en clair. Conforme au §14 (« ne pas stocker de secret dans le dépôt »). |
| DEC-004 | 06/08/2026 | Serveur MCP anime.js | Écarté | Le paquet npm s'attribue un dépôt GitHub inexistant sous le compte de l'auteur d'anime.js, et sa documentation est figée sur anime.js 3.2.1 alors que la version courante est 4.5.0. Audit du code réalisé : non malveillant, mais inexploitable. |
| DEC-005 | 06/08/2026 | Validation des données | `zod` v4 | Imposé par le §13 (validation client **et** serveur). |
| ~~DEC-011~~ | 06/08/2026 | ~~Retrait du paquet `shadcn`~~ | **DÉCISION ERRONÉE, ANNULÉE** | J'avais retiré `shadcn` des dépendances en le qualifiant d'outil de ligne de commande sans rôle en production. C'était faux : `shadcn init` écrit `@import "shadcn/tailwind.css"` dans `globals.css`, et le paquet fournit cette feuille de style. Le retrait cassait la compilation. Réinstallé en `devDependencies` (il n'intervient qu'au build, pas à l'exécution). |

---

## Décisions métier

Les 14 questions de la section 12 ont été posées et tranchées le 06/08/2026.
Les réponses marquées **(défaut appliqué)** ont été déduites du cahier des
charges lui-même et non arbitrées explicitement : elles restent à confirmer.

| Réf | Question (§12) | Réponse retenue | Statut |
|---|---|---|---|
| DEC-101 | 1. Jours ouvrés ou calendaires ? | **CALENDAIRES** par défaut. Conforme aux exemples du §5.3 : 31/01/2026 + 10 j → 10/02/2026. Le champ `delaiType` reste modifiable élément par élément. | Confirmé |
| DEC-102 | 2. Report au jour ouvré suivant ? | **Non.** `reportSiWeekendOuFerie = false` par défaut, option disponible par élément. | Confirmé |
| DEC-103 | 3. Liste des périodicités | Les 6 du §5.2 : `MENSUELLE`, `TRIMESTRIELLE`, `SEMESTRIELLE`, `ANNUELLE`, `PLURIANNUELLE`, `PONCTUELLE`. | Défaut appliqué |
| DEC-104 | 4. Publication ponctuelle | Aucune ligne générée automatiquement ; saisie manuelle d'une ligne unique (dates de couverture + date de diffusion). | Défaut appliqué |
| DEC-105 | 5. « Instance » | Synonyme de **Structure**. Pas de niveau supplémentaire : l'arborescence `parentId` couvre ministère → direction → service. | Défaut appliqué |
| DEC-106 | 6. Point focal multi-structures ? | **Non**, une seule structure (`Utilisateur.structureId`). | Défaut appliqué |
| DEC-107 | 7. Plusieurs points focaux par structure ? | **Oui** : un titulaire (`estTitulaire = true`) et n suppléants. Les relances automatiques ne partent qu'au titulaire ; les suppléants peuvent saisir et téléverser. | Confirmé |
| DEC-108 | 8. Plage des années | Liste déroulante de **2026 à 2126** (101 années) au lieu des 500 initialement demandées. | Confirmé |
| DEC-109 | 9. Délai variable par période ? | **Non**, unique par élément. La date d'une ligne reste modifiable à la main après génération (`modifieManuellement`). | Confirmé |
| DEC-110 | 10. Points focaux entre eux ? | **Non**, messagerie uniquement avec les admins de leur structure, conformément à la matrice du §2.3. | Défaut appliqué |
| DEC-111 | 11. Volume prévisionnel | Petit : moins de 20 structures, moins de 300 publications. L'offre gratuite Supabase suffit ; pagination serveur néanmoins mise en place dès le départ. | Confirmé |
| DEC-112 | 12. Multi-organisations ? | **Une seule** organisation en production. Le schéma reste multi-locataire (`organisationId` sur chaque table métier) mais aucun sélecteur d'organisation dans l'interface. | Confirmé |
| DEC-113 | 13. Espace public ? | **Oui, dès maintenant.** Calendrier consultable sans compte. Implique : `Organisation.espacePublicActif` + `slugPublic`, `Calendrier.publieEnLigne`, routes non authentifiées séparées, revue de sécurité dédiée. Traité comme un lot à part entière. | Confirmé |
| DEC-114 | 14. Double authentification ? | **Non** pour l'instant. Mot de passe fort + limitation des tentatives. Champs `totpSecret` / `totpActif` créés en base pour permettre l'activation ultérieure sans migration. | Confirmé |

---

## Décisions techniques prises pendant la Phase 1

| Réf | Date | Sujet | Décision | Motif |
|---|---|---|---|---|
| DEC-006 | 06/08/2026 | Prisma 7 | Connexion via `prisma.config.ts` (migrations, `DIRECT_URL`) et adaptateur `@prisma/adapter-pg` (exécution, `DATABASE_URL`) | Prisma 7 n'accepte plus `url` ni `directUrl` dans `schema.prisma`. La séparation correspond aux deux points de connexion Supabase : pooler port 6543 pour l'applicatif, connexion directe port 5432 pour les migrations (le pooler ne supporte pas les verrous consultatifs de Prisma Migrate). |
| DEC-007 | 06/08/2026 | Anti-doublon des e-mails | Contrainte d'unicité `(ligneCalendrierId, typeEnvoi, jourEnvoi)` sur `JournalEmail` | Le §8.4 exige l'idempotence des envois. Une contrainte en base est plus fiable qu'une vérification applicative, qui peut être contournée par deux exécutions concurrentes du cron. |
| DEC-008 | 06/08/2026 | Base de développement locale | PostgreSQL 18.2 portable dans `C:\Users\USER\.diffusio-pg`, port 5433 | Docker exige WSL, absent de la machine ; son installation demande des droits administrateur et un redémarrage. La version portable ne demande ni l'un ni l'autre. Conservée comme secours et pour travailler hors connexion. |
| DEC-009 | 06/08/2026 | Mode de connexion Supabase | **Session pooler** (`aws-1-eu-west-3.pooler.supabase.com:5432`) pour `DATABASE_URL` **et** `DIRECT_URL` | La connexion directe (`db.<ref>.supabase.co`) ne publie qu'un enregistrement DNS AAAA : elle est inaccessible depuis un réseau IPv4, ce qui est le cas du poste de développement (test TCP en échec). Le transaction pooler (port 6543) est écarté car il ne supporte pas les requêtes préparées, utilisées par l'adaptateur `@prisma/adapter-pg`. Le session pooler est le seul mode compatible à la fois IPv4 et Prisma. |
| DEC-010 | 06/08/2026 | Mot de passe de base contenant `@` | Encodage systématique en `%40` dans les chaînes de connexion | Un `@` non encodé casse l'analyse de l'URL : tout ce qui suit est interprété comme le nom du serveur. Un contrôle automatique réencode le mot de passe à chaque modification du `.env`. |

| DEC-115 | 06/08/2026 | **Années de production d'une publication pluriannuelle** | **Aucune année de production n'est calculée.** L'année est celle choisie dans la liste déroulante au moment de générer le calendrier, et elle vaut pour tous les éléments sélectionnés, pluriannuels compris. Le `nombreAnneesPeriodicite` ne sert plus qu'à déterminer la **période couverte** : du 1er janvier (Y − n + 1) au 31 décembre Y. | Arbitrage du porteur du projet. Le §5.2 parlait d'« année de production » sans la définir ; j'avais provisoirement inventé un ancrage sur l'an 0, ce qui imposait un rythme arbitraire. La réponse retenue est plus simple et plus juste : c'est le calendrier de diffusion d'une année donnée, le point focal coche les éléments qui y figurent. |

> **Écart de version PostgreSQL à surveiller** : développement en 18.2 (local),
> production Supabase en 17.6. Aucune incompatibilité sur le schéma actuel, mais
> éviter toute fonctionnalité introduite en 18 sans vérifier sa disponibilité en 17.
