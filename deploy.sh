#!/bin/bash

# Script de Deployment Unificado para SkillChain
# Uso: ./deploy.sh [contract] [network] [suri]
# Ejemplos:
#   ./deploy.sh skillchain local
#   ./deploy.sh escrow paseo "tu seed phrase"

set -e

CONTRACT=${1:-skillchain}
NETWORK=${2:-local}
SURI=${3:-//Alice}

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Validar contrato
if [ "$CONTRACT" != "skillchain" ] && [ "$CONTRACT" != "escrow" ]; then
    echo -e "${RED}❌ Contrato inválido: $CONTRACT${NC}"
    echo -e "${YELLOW}Contratos disponibles: skillchain, escrow${NC}"
    exit 1
fi

# Determinar URL de red
case $NETWORK in
  local)
    URL="ws://127.0.0.1:9944"
    ;;
  paseo)
    # Probar múltiples endpoints de Paseo
    URL="wss://paseo-rpc.dwellir.com"
    # Alternativas: wss://paseo.rpc.amforc.com, wss://paseo-rpc.polkadot.io
    ;;
  rococo)
    # Endpoint oficial de Rococo Contracts
    URL="wss://rococo-contracts-rpc.polkadot.io"
    # Alternativa: wss://rococo-contracts.polkadot.io
    ;;
  *)
    echo -e "${RED}❌ Red desconocida: $NETWORK${NC}"
    echo -e "${YELLOW}Redes disponibles: local, paseo, rococo${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment: $CONTRACT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Contrato:${NC} $CONTRACT"
echo -e "${GREEN}Red:${NC} $NETWORK"
echo -e "${GREEN}RPC URL:${NC} $URL"
echo ""

# Verificar cargo-contract
if ! command -v cargo-contract &> /dev/null; then
    echo -e "${RED}❌ cargo-contract no está instalado${NC}"
    echo -e "${YELLOW}Instalando cargo-contract...${NC}"
    echo -e "${YELLOW}Esto puede tomar 5-10 minutos...${NC}"
    cargo install cargo-contract --force --locked
    echo -e "${GREEN}✅ cargo-contract instalado${NC}"
    echo ""
fi

# Ir al directorio del contrato
cd "contracts/$CONTRACT"

# Verificar si está compilado
if [ ! -f "target/ink/$CONTRACT.contract" ]; then
    echo -e "${YELLOW}⚠️  Contrato no compilado. Compilando ahora...${NC}"
    cargo contract build --release
    echo -e "${GREEN}✅ Contrato compilado${NC}"
    echo ""
fi

# Deployment
echo -e "${YELLOW}📤 Paso 1: Subiendo código del contrato...${NC}"
cargo contract upload \
  --suri "$SURI" \
  --url "$URL" \
  --execute

echo ""
echo -e "${YELLOW}🎬 Paso 2: Instanciando contrato...${NC}"
cargo contract instantiate \
  --suri "$SURI" \
  --constructor new \
  --url "$URL" \
  --execute

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Completado!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo "1. Copia la dirección del contrato del output arriba"
echo "2. Actualiza app/web/.env.local con:"
if [ "$CONTRACT" == "skillchain" ]; then
    echo "   NEXT_PUBLIC_CONTRACT_ADDRESS=<dirección>"
else
    echo "   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=<dirección>"
fi
echo "   NEXT_PUBLIC_WS_PROVIDER=$URL"
echo ""
echo -e "${BLUE}🔗 Polkadot.js Apps:${NC}"
echo "https://polkadot.js.org/apps/?rpc=$URL#/contracts"

