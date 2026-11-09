#!/usr/bin/env bash
# DIFFUSIO — mise a jour vers une nouvelle version du code.
# A lancer avec sudo : sudo /opt/diffusio/scripts/mettre-a-jour.sh
# L'ancienne version continue de tourner tant que la nouvelle n'est pas construite.
set -euo pipefail

APP=/opt/diffusio/app
SCRIPTS=/opt/diffusio/scripts

if [ "$(id -u)" -ne 0 ]; then
  echo "Lancez ce script avec sudo." >&2
  exit 1
fi

echo "==> 1/5 Sauvegarde de la base"
sudo -u diffusio "$SCRIPTS/sauvegarder-base.sh"

if [ -d "$APP/.git" ]; then
  echo "==> 2/5 Recuperation du code (git pull)"
  sudo -u diffusio git -C "$APP" pull --ff-only
else
  echo "==> 2/5 Pas de depot Git : le code deja copie dans $APP est utilise"
fi

echo "==> 3/5 Dependances"
sudo -iu diffusio bash -c "cd '$APP' && npm ci"

echo "==> 4/5 Migrations de la base"
sudo -iu diffusio bash -c "cd '$APP' && npx prisma migrate deploy"

echo "==> 5/5 Construction puis redemarrage"
sudo -iu diffusio bash -c "cd '$APP' && npm run build"
systemctl restart diffusio

sleep 5
if systemctl is-active --quiet diffusio; then
  echo "Mise a jour terminee : l'application tourne."
else
  echo "L'application ne demarre pas : sudo journalctl -u diffusio -n 100" >&2
  exit 1
fi
