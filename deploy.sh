#!/bin/bash

# Parar o script se qualquer comando falhar
set -e

echo "Checking for pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "pnpm could not be found. Installing it globally..."
    npm install -g pnpm
fi

# Pegar o nome do pacote do package.json
echo "Getting package name from package.json..."
PACKAGE_NAME=$(node -p "require('./package.json').name")

if [ -z "$PACKAGE_NAME" ]; then
    echo "Error: Could not determine package name from package.json."
    exit 1
fi

# Definir caminhos locais e do container
LOCAL_DIR="$(pwd)/dist"
VOLUME_NAME="self-hosted-ai-starter-kit_n8n_storage"
CONTAINER_PATH="/custom/$PACKAGE_NAME"

echo "Detected package name: '$PACKAGE_NAME'"
echo "Local directory: '$LOCAL_DIR'"
echo "Container destination path: '$CONTAINER_PATH'"

# Passo 1: Build do Nó
echo "Building the node..."
pnpm run build

# Passo 2: Limpar qualquer container temporário antigo
echo "Cleaning up any existing temporary container..."
docker rm -f deploy-temp1 2>/dev/null || true

# Passo 3: Criar o container temporário montando o volume do n8n
echo "Creating temporary container..."
docker run -dit --name deploy-temp1 -v "$VOLUME_NAME":/data busybox

# Passo 4: Copiar os arquivos compilados da pasta 'dist' para dentro do volume
echo "Copying files into volume..."
# Garante que a pasta de destino exista dentro do volume antes de copiar
docker exec deploy-temp1 mkdir -p "/data$CONTAINER_PATH"
docker cp "$LOCAL_DIR/." "deploy-temp1:/data$CONTAINER_PATH"

# Passo 5: Limpar o container temporário
echo "Cleaning up container..."
docker rm -f deploy-temp1

# Passo 6: Reiniciar o n8n para carregar o novo nó
echo "Restarting n8n..."
docker container restart n8n

echo "Deployment complete."

# Passo 7: Mostrar os logs do n8n
echo "Showing n8n logs (Press Ctrl+C to exit)..."
docker logs -f n8n
