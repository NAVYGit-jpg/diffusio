#!/usr/bin/env bash
# DIFFUSIO — declenche l'examen quotidien du calendrier (retards, rappels, relances).
# Appele par cron chaque matin ; peut etre lance a la main sans risque de doublon.
set -euo pipefail

APP=/opt/diffusio/app
JOURNAUX=/opt/diffusio/journaux
mkdir -p "$JOURNAUX"

# Lit CRON_SECRET dans .env sans afficher sa valeur.
SECRET=$(grep -E '^CRON_SECRET=' "$APP/.env" | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')
if [ -z "$SECRET" ]; then
  echo "CRON_SECRET est vide dans $APP/.env" >&2
  exit 1
fi

REPONSE=$(curl -sS --max-time 300 -w '\n%{http_code}' \
  -H "Authorization: Bearer $SECRET" \
  http://127.0.0.1:3000/api/cron/notifications)

CODE=$(echo "$REPONSE" | tail -n1)
CORPS=$(echo "$REPONSE" | sed '$d')

echo "$(date '+%F %T') [$CODE] $CORPS" >> "$JOURNAUX/relances.log"
echo "$CORPS"

if [ "$CODE" != "200" ]; then
  echo "Echec : code HTTP $CODE" >&2
  exit 1
fi
