# Journal des modifications

Toutes les évolutions notables de DIFFUSIO sont consignées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

---

## [Non publié]

### Phase 0 — Préparation de l'environnement

#### Ajouté
- Initialisation du projet Next.js 15.5 (App Router) + TypeScript + Tailwind CSS 4.
- Configuration de shadcn/ui (base `radix`, preset `nova`, couleur `neutral`,
  thème par variables CSS) et de `lucide-react`.
- Enregistrement du registre `@react-bits` et ajout du composant `BlurText`.
- Installation de Prisma 7, Zod 4 et Vitest 4.
- Fichier `.env.example` documentant toutes les variables d'environnement.
- `prisma/schema.prisma` : datasource PostgreSQL et generator.
- `DECISIONS.md` : journal des arbitrages.
- `CHANGELOG.md` : ce fichier.

#### Modifié
- `BlurText.tsx` : ajout de la directive `'use client'` (le composant utilise
  des hooks React et ne peut pas être un composant serveur).

#### Retiré
- `framer-motion` : doublon de `motion`, déjà présent (voir DEC-002).
- `shadcn` : outil de ligne de commande, n'a pas sa place dans les
  dépendances de production (s'utilise via `npx`).

#### Sécurité
- `.claude/settings.local.json` exclu du suivi Git : le fichier contient une
  clé d'API en clair (voir DEC-003).

### Phase 1 — Base de données

#### Ajouté
- Schéma Prisma complet : 20 modèles couvrant la section 4 du cahier des charges.
- Migration initiale `20260806094639_init`, appliquée en local et sur Supabase.
- `prisma.config.ts` (connexion des migrations) et `src/lib/prisma.ts`
  (connexion applicative via l'adaptateur `@prisma/adapter-pg`).
- Script de seed `prisma/seed.ts` : organisation de démonstration, 10 domaines
  statistiques par défaut, compte super admin à mot de passe aléatoire.
  Le script est idempotent et ne réinitialise jamais un mot de passe existant.
- Hachage des mots de passe en **argon2id** (`@node-rs/argon2`, binaire
  précompilé, aucune compilation requise sous Windows).

#### Base de données
- Développement : PostgreSQL 18.2 portable, `localhost:5433`.
- Production : Supabase PostgreSQL 17.6, région `eu-west-3`, session pooler.

### Phase 2 — Structures et utilisateurs

#### Ajouté
- Coquille applicative : barre latérale filtrée par rôle, en-tête, déconnexion.
- Écran **Structures** : arborescence à N niveaux, création, modification,
  activation/désactivation, état vide pédagogique.
- Écran **Utilisateurs** : points focaux, administrateurs, super administrateurs
  avec compteur de quota, activation/désactivation, renvoi d'invitation.
- Invitations par e-mail avec jeton à usage unique valable 72 heures ; écran
  d'activation de compte. Aucun mot de passe ne circule par e-mail.
- Module d'envoi d'e-mails à deux modes : `test` (console) et `prod` (Brevo).
- **Import Excel** des structures et des utilisateurs, en deux temps :
  rapport de contrôle ligne par ligne, puis confirmation.
- Modèles Excel téléchargeables, avec exemples, mode d'emploi et — pour les
  utilisateurs — la liste des codes de structures disponibles.

#### Tests
148 tests couvrant la matrice des droits, l'arborescence, les règles métier des
utilisateurs et l'analyse des fichiers importés.

#### Corrigé
- React 19 réinitialisait les formulaires après chaque action : une erreur de
  validation vidait tous les champs saisis. Les valeurs soumises sont désormais
  renvoyées et restaurées.
- Le paquet `shadcn`, retiré à tort en Phase 0, cassait la compilation.
- Configuration Vitest ajoutée : l'alias `@/` n'était pas résolu.

---

## Reste à faire en Phase 0

Ces points nécessitent une action manuelle du porteur du projet :

- [ ] Création des comptes GitHub, Supabase, Vercel et Brevo.
- [ ] Transmission de l'URL de connexion PostgreSQL, des clés Supabase et Brevo.
- [ ] Création du dépôt GitHub **privé** et premier `git push`.
