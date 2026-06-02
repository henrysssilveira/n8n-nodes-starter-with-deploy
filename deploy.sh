#!/bin/bash
set -e

# ─── Config ───────────────────────────────────────────────────────────────────
N8N_CUSTOM_DIR="$(cd "$(dirname "$0")/../n8n-latest-pure/n8n/custom" && pwd)"
# Se o deploy.sh estiver dentro do repo do node, ajusta o path acima para
# apontar pro diretório custom do teu n8n-latest-pure no servidor.
# Alternativamente, usa uma variável de ambiente:
N8N_CUSTOM_DIR="${N8N_CUSTOM_DIR:-/home/ubuntu/n8n-latest-pure/n8n/custom}"

# ─── Checks ───────────────────────────────────────────────────────────────────
echo "Checking for pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

PACKAGE_NAME=$(node -p "require('./package.json').name")
[ -z "$PACKAGE_NAME" ] && echo "Error: package name not found." && exit 1

echo "Package: $PACKAGE_NAME"
echo "Destination: $N8N_CUSTOM_DIR/$PACKAGE_NAME"

# ─── Build ────────────────────────────────────────────────────────────────────
echo "Building..."
pnpm run build

# ─── Deploy ───────────────────────────────────────────────────────────────────
echo "Copying to n8n custom dir..."
mkdir -p "$N8N_CUSTOM_DIR/$PACKAGE_NAME"
cp -r dist/. "$N8N_CUSTOM_DIR/$PACKAGE_NAME/"

# Garante que o package.json do node vai junto (n8n precisa dele)
cp package.json "$N8N_CUSTOM_DIR/$PACKAGE_NAME/"

# ─── Restart ──────────────────────────────────────────────────────────────────
echo "Restarting n8n..."
docker restart n8n

echo "Done. Watching logs..."
docker logs -f n8n
