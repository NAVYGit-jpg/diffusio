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

---

## Reste à faire en Phase 0

Ces points nécessitent une action manuelle du porteur du projet :

- [ ] Création des comptes GitHub, Supabase, Vercel et Brevo.
- [ ] Transmission de l'URL de connexion PostgreSQL, des clés Supabase et Brevo.
- [ ] Création du dépôt GitHub **privé** et premier `git push`.
