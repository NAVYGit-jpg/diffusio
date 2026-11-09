#!/usr/bin/env bash
# DIFFUSIO — sauvegarde complete de la base PostgreSQL.
# Garde les 14 dernieres sauvegardes. Copiez-les aussi hors du serveur !
set -euo pipefail

APP=/opt/diffusio/app
DOSSIER=/opt/diffusio/sauvegardes
mkdir -p "$DOSSIER"

URL=$(grep -E '^DIRECT_URL=' "$APP/.env" | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')
FICHIER="$DOSSIER/diffusio-$(date '+%Y-%m-%d_%H%M').dump"

pg_dump --no-owner --no-privileges --format=custom "$URL" -f "$FICHIER"
chmod 600 "$FICHIER"

# Rotation : on ne garde que les 14 plus recentes.
ls -1t "$DOSSIER"/diffusio-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "Sauvegarde creee : $FICHIER"
