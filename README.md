# 🚀 n8n Custom Nodes — Deploy em VPS do Zero

Tutorial completo: da VPS virgem até rodar e publicar nodes personalizados no n8n com Docker.

---

## 📋 Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configuração inicial da VPS](#2-configuração-inicial-da-vps)
3. [Instalação do Docker](#3-instalação-do-docker)
4. [Instalação do Node.js e pnpm](#4-instalação-do-nodejs-e-pnpm)
5. [Clone dos repositórios](#5-clone-dos-repositórios)
6. [Configuração do n8n (n8n-latest-pure)](#6-configuração-do-n8n-n8n-latest-pure)
7. [Ajuste do docker-compose.yml](#7-ajuste-do-docker-composeyml)
8. [Subir o n8n](#8-subir-o-n8n)
9. [Estrutura do repositório de nodes](#9-estrutura-do-repositório-de-nodes)
10. [O script deploy.sh](#10-o-script-deploysh)
11. [Fluxo de desenvolvimento](#11-fluxo-de-desenvolvimento)
12. [Verificação e troubleshooting](#12-verificação-e-troubleshooting)

---

## 1. Pré-requisitos

### Na sua máquina local
- Git instalado
- Acesso SSH à VPS (chave ou senha)
- Forks dos repositórios no GitHub:
  - `seu-user/n8n-latest-pure` — infraestrutura do n8n
  - `seu-user/n8n-nodes-starter-with-deploy` — template para criar nodes

### Na VPS
- Ubuntu 22.04 LTS ou superior
- Mínimo 1 GB RAM (recomendado 2 GB)
- Acesso root ou sudo

---

## 2. Configuração inicial da VPS

Conecte via SSH e execute os passos abaixo.

### Atualizar o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar dependências essenciais

```bash
sudo apt install -y \
  curl \
  wget \
  git \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release \
  build-essential
```

### Criar usuário de deploy (opcional mas recomendado)

Se estiver logado como `root`, crie um usuário dedicado:

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

---

## 3. Instalação do Docker

### Adicionar repositório oficial do Docker

```bash
# Chave GPG
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
```

### Instalar Docker Engine e Compose

```bash
sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

### Adicionar seu usuário ao grupo docker

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Verificar instalação

```bash
docker --version
docker compose version
```

Saída esperada:
```
Docker version 26.x.x, build ...
Docker Compose version v2.x.x
```

---

## 4. Instalação do Node.js e pnpm

O Node.js é necessário para buildar os nodes localmente (na VPS ou na sua máquina, dependendo do seu fluxo).

### Instalar Node.js via nvm (recomendado)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recarregar o shell
source ~/.bashrc

# Instalar Node.js LTS
nvm install --lts
nvm use --lts
```

### Verificar

```bash
node --version   # v22.x.x ou superior
npm --version
```

### Instalar pnpm

```bash
npm install -g pnpm
pnpm --version
```

---

## 5. Clone dos repositórios

```bash
cd ~

# Repositório da infraestrutura n8n
git clone https://github.com/henrysssilveira/n8n-latest-pure.git

# Repositório do template de nodes
git clone https://github.com/henrysssilveira/n8n-nodes-starter-with-deploy.git
```

> **Substitua `seu-user` pelo seu usuário do GitHub.**

---

## 6. Configuração do n8n (n8n-latest-pure)

```bash
cd ~/n8n-latest-pure
```

### Criar o arquivo .env

```bash
cp .env.example .env
nano .env
```

Preencha as variáveis:

```env
POSTGRES_USER=n8n_user
POSTGRES_PASSWORD=uma_senha_forte_aqui
POSTGRES_DB=n8n_db

N8N_ENCRYPTION_KEY=gere_uma_chave_aleatoria_aqui
N8N_USER_MANAGEMENT_JWT_SECRET=outro_valor_aleatorio_aqui

N8N_PORT=5678
```

> **Dica para gerar chaves seguras:**
> ```bash
> openssl rand -hex 32
> ```
> Execute duas vezes — um valor para cada chave.

### Criar os diretórios necessários

```bash
# Diretório para nodes customizados (bind mount)
mkdir -p ~/n8n-latest-pure/n8n/custom
mkdir -o ~/n8n-latest-pure/shared

# Corrigir permissão para o usuário 'node' do container (UID 1000)
sudo chown -R 1000:1000 ~/n8n-latest-pure/n8n/custom

# Diretório shared (já existe, mas garantir permissão)
sudo chown -R 1000:1000 ~/n8n-latest-pure/shared
```

---

## 7. Ajuste do docker-compose.yml

Edite o `docker-compose.yml` para adicionar o bind mount do diretório `custom`:

```bash
nano ~/n8n-latest-pure/docker-compose.yml
```

Localize o serviço `n8n` e adicione a linha marcada abaixo na seção `volumes`:

```yaml
  n8n:
    <<: *service-n8n
    hostname: n8n
    container_name: n8n
    restart: unless-stopped
    ports:
      - "${N8N_PORT:-5678}:5678"
    volumes:
      - n8n_storage:/home/node/.n8n
      - ./n8n/demo-data:/demo-data
      - ./shared:/data/shared
      - ./n8n/custom:/home/node/.n8n/custom    # ← ADICIONE ESTA LINHA
    depends_on:
      postgres:
        condition: service_healthy
      n8n-import:
        condition: service_completed_successfully
```

Salve e feche (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 8. Subir o n8n

```bash
cd ~/n8n-latest-pure
docker compose up -d
```

### Verificar se está rodando

```bash
docker ps
```

Saída esperada:
```
CONTAINER ID   IMAGE                COMMAND       CREATED   STATUS          PORTS                    NAMES
xxxxxxxxxxxx   n8nio/n8n:latest     "tini -- …"   ...       Up X minutes    0.0.0.0:5678->5678/tcp   n8n
xxxxxxxxxxxx   postgres:16-alpine   "docker-…"    ...       Up X minutes    5432/tcp                 n8n-latest-pure-postgres-1
```

### Acessar a interface

Abra no navegador: `http://IP_DA_SUA_VPS:5678`

> **Dica de segurança:** Em produção, configure um reverse proxy (Nginx ou Caddy) com HTTPS. Não exponha a porta 5678 diretamente na internet sem autenticação.

---

## 9. Estrutura do repositório de nodes

```
n8n-nodes-starter-with-deploy/
├── src/
│   └── nodes/
│       └── MeuNode/
│           ├── MeuNode.node.ts       ← lógica do node
│           └── meunode.svg           ← ícone
├── dist/                             ← gerado pelo build
├── package.json
├── tsconfig.json
└── deploy.sh                         ← script de deploy
```

### package.json — campos obrigatórios

O n8n identifica nodes pelo campo `n8n` no `package.json`. Certifique-se que está assim:

```json
{
  "name": "n8n-nodes-meu-node",
  "version": "0.1.0",
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [],
    "nodes": [
      "dist/nodes/MeuNode/MeuNode.node.js"
    ]
  },
  "scripts": {
    "build": "tsc && npm run copy-icons",
    "copy-icons": "copyfiles -u 1 'src/**/*.svg' dist/",
    "dev": "tsc --watch"
  }
}
```

---

## 10. O script deploy.sh

O `deploy.sh` no repositório de nodes faz tudo automaticamente:
1. Builda o TypeScript
2. Copia os arquivos compilados para o diretório `custom` do n8n na VPS
3. Reinicia o container n8n
4. Exibe os logs

### Conteúdo do deploy.sh

```bash
#!/bin/bash
set -e

# ─── Configuração ─────────────────────────────────────────────────────────────
# Caminho absoluto para o diretório custom do n8n na VPS
# Ajuste conforme seu ambiente
N8N_CUSTOM_DIR="${N8N_CUSTOM_DIR:-/home/ubuntu/n8n-latest-pure/n8n/custom}"

# ─── Verificações ─────────────────────────────────────────────────────────────
echo "🔍 Verificando pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "pnpm não encontrado. Instalando..."
    npm install -g pnpm
fi

PACKAGE_NAME=$(node -p "require('./package.json').name")
[ -z "$PACKAGE_NAME" ] && echo "❌ Erro: nome do pacote não encontrado." && exit 1

echo "📦 Pacote: $PACKAGE_NAME"
echo "📁 Destino: $N8N_CUSTOM_DIR/$PACKAGE_NAME"

# ─── Build ────────────────────────────────────────────────────────────────────
echo ""
echo "🔨 Buildando..."
pnpm install
pnpm run build

# ─── Deploy ───────────────────────────────────────────────────────────────────
echo ""
echo "📤 Copiando para o diretório custom do n8n..."
mkdir -p "$N8N_CUSTOM_DIR/$PACKAGE_NAME"
cp -r dist/. "$N8N_CUSTOM_DIR/$PACKAGE_NAME/"
cp package.json "$N8N_CUSTOM_DIR/$PACKAGE_NAME/"

# ─── Restart ──────────────────────────────────────────────────────────────────
echo ""
echo "🔄 Reiniciando n8n..."
docker restart n8n

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📋 Logs do n8n (Ctrl+C para sair)..."
docker logs -f n8n
```

### Tornar executável

```bash
chmod +x deploy.sh
```

### Variável de ambiente N8N_CUSTOM_DIR

O script usa `N8N_CUSTOM_DIR` para saber onde copiar os arquivos. Você pode:

**Opção A — exportar no shell antes de rodar:**
```bash
export N8N_CUSTOM_DIR=/home/ubuntu/n8n-latest-pure/n8n/custom
./deploy.sh
```

**Opção B — criar um `.env.local` no repo de nodes e carregar no script** (adicione no início do `deploy.sh`):
```bash
[ -f .env.local ] && source .env.local
```

E crie o `.env.local` (não commitar no git):
```bash
echo "N8N_CUSTOM_DIR=/home/ubuntu/n8n-latest-pure/n8n/custom" > .env.local
echo ".env.local" >> .gitignore
```

---

## 11. Fluxo de desenvolvimento

### Primeira vez (setup completo na VPS)

```bash
# 1. Clonar o repositório de nodes na VPS
cd ~
git clone https://github.com/henrysssilveira/n8n-nodes-starter-with-deploy.git
cd n8n-nodes-starter-with-deploy

# 2. Configurar o caminho de destino
echo "N8N_CUSTOM_DIR=/home/ubuntu/n8n-latest-pure/n8n/custom" > .env.local
echo ".env.local" >> .gitignore

# 3. Primeiro deploy
./deploy.sh
```

### Ciclo de desenvolvimento do dia a dia

```bash
# 1. Editar o código do node
nano src/nodes/MeuNode/MeuNode.node.ts

# 2. Commitar (opcional, mas recomendado)
git add . && git commit -m "feat: adiciona campo X"

# 3. Fazer deploy
./deploy.sh
```

O n8n vai reiniciar e carregar o node atualizado automaticamente.

### Verificar se o node foi carregado

Após o restart, procure nos logs:

```bash
docker logs n8n 2>&1 | grep -i "custom\|node\|loaded"
```

Ou acesse a interface do n8n → busque pelo nome do seu node na paleta de nodes.

---

## 12. Verificação e troubleshooting

### Checar se o diretório custom está montado corretamente

```bash
docker exec -it n8n ls -la /home/node/.n8n/custom/
```

Você deve ver a pasta do seu pacote listada.

### Checar o conteúdo do pacote dentro do container

```bash
docker exec -it n8n ls -la /home/node/.n8n/custom/n8n-nodes-meu-node/
```

Deve conter os arquivos `.js` compilados e o `package.json`.

### Node não aparece na interface

Verifique se o `package.json` dentro do `custom/` tem o campo `n8n` corretamente preenchido:

```bash
docker exec -it n8n cat /home/node/.n8n/custom/n8n-nodes-meu-node/package.json
```

### Erro de permissão ao copiar

```bash
# Reaplica a permissão correta
sudo chown -R 1000:1000 ~/n8n-latest-pure/n8n/custom
```

### Logs detalhados do n8n

```bash
docker logs n8n --tail 100
```

### Reiniciar tudo do zero (sem perder dados)

```bash
cd ~/n8n-latest-pure
docker compose restart n8n
```

### Reiniciar completamente (mantém volumes/dados)

```bash
cd ~/n8n-latest-pure
docker compose down
docker compose up -d
```

---

## 📁 Estrutura final de diretórios na VPS

```
~/ (home do ubuntu)
├── n8n-latest-pure/                  ← infraestrutura
│   ├── .env                          ← variáveis de ambiente (não commitar)
│   ├── docker-compose.yml
│   ├── n8n/
│   │   ├── custom/                   ← nodes compilados ficam aqui
│   │   │   └── n8n-nodes-meu-node/   ← criado pelo deploy.sh
│   │   │       ├── package.json
│   │   │       └── nodes/
│   │   │           └── MeuNode/
│   │   │               └── MeuNode.node.js
│   │   └── demo-data/
│   └── shared/
│
└── n8n-nodes-starter-with-deploy/    ← código-fonte dos nodes
    ├── src/
    ├── dist/                         ← gerado pelo build
    ├── package.json
    ├── deploy.sh
    └── .env.local                    ← caminho do custom (não commitar)
```

---

## 🔒 Dicas de segurança para produção

- Configure um domínio com HTTPS usando **Caddy** ou **Nginx + Certbot**
- Não exponha a porta `5678` diretamente — use reverse proxy
- Mantenha o `.env` fora do controle de versão (já está no `.gitignore`)
- Use senhas fortes e únicas para `POSTGRES_PASSWORD` e `N8N_ENCRYPTION_KEY`
- Habilite autenticação no n8n (`N8N_BASIC_AUTH_ACTIVE=true` ou configure usuários pela interface)

---
