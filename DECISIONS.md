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

---

## Décisions métier

> **En attente.** Les 14 questions de la section 12 du cahier des charges ont été
> posées le 06/08/2026. Aucune ligne de code métier ne sera écrite avant les
> réponses, conformément à la consigne.

| Réf | Question (§12) | Réponse retenue | Date |
|---|---|---|---|
| DEC-101 | 1. Jours ouvrés ou calendaires par défaut ? | _en attente_ | — |
| DEC-102 | 2. Report au jour ouvré suivant ? | _en attente_ | — |
| DEC-103 | 3. Liste complète des périodicités | _en attente_ | — |
| DEC-104 | 4. Saisie d'une publication ponctuelle | _en attente_ | — |
| DEC-105 | 5. « Instance » = structure ? | _en attente_ | — |
| DEC-106 | 6. Point focal multi-structures ? | _en attente_ | — |
| DEC-107 | 7. Plusieurs points focaux par structure ? | _en attente_ | — |
| DEC-108 | 8. Années jusqu'à +500 ? | _en attente_ | — |
| DEC-109 | 9. Délai variable par période ? | _en attente_ | — |
| DEC-110 | 10. Points focaux entre eux ? | _en attente_ | — |
| DEC-111 | 11. Volume prévisionnel | _en attente_ | — |
| DEC-112 | 12. Multi-organisations en production ? | _en attente_ | — |
| DEC-113 | 13. Espace public sans compte ? | _en attente_ | — |
| DEC-114 | 14. Double authentification super admin ? | _en attente_ | — |
