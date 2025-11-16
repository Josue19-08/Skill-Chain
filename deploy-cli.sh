#!/bin/bash

# Script de Deployment con Fallback Automático
# Uso: ./deploy-cli.sh [contract] [network] [suri]

set -e

CONTRACT=${1:-skillchain}
NETWORK=${2:-local}
SURI=${3:-"injury hurt blame cram mean daughter agree debate shiver near indoor nut"}

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment CLI: $CONTRACT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Validar contrato
if [ "$CONTRACT" != "skillchain" ] && [ "$CONTRACT" != "escrow" ]; then
    echo -e "${RED}❌ Contrato inválido: $CONTRACT${NC}"
    exit 1
fi

# Definir endpoints a probar
declare -a RPC_URLS

case $NETWORK in
  local)
    RPC_URLS=("ws://127.0.0.1:9944")
    ;;
  paseo)
    RPC_URLS=(
      "wss://paseo-rpc.dwellir.com"
      "wss://paseo.rpc.amforc.com"
      "wss://paseo-rpc.polkadot.io"
    )
    ;;
  rococo)
    RPC_URLS=(
      "wss://rococo-contracts-rpc.polkadot.io"
      "wss://rococo-contracts.polkadot.io"
    )
    ;;
  *)
    echo -e "${RED}❌ Red desconocida: $NETWORK${NC}"
    exit 1
    ;;
esac

# Verificar cargo-contract
if ! command -v cargo-contract &> /dev/null; then
    echo -e "${RED}❌ cargo-contract no está instalado${NC}"
    exit 1
fi

# Ir al directorio del contrato
cd "contracts/$CONTRACT"

# Verificar compilación
if [ ! -f "target/ink/$CONTRACT.contract" ]; then
    echo -e "${YELLOW}⚠️  Compilando contrato...${NC}"
    cargo contract build --release --optimization-passes=0
fi

echo -e "${GREEN}✅ Contrato compilado${NC}"
echo ""

# Función para probar conexión
test_connection() {
    local url=$1
    echo -e "${YELLOW}🔍 Probando: $url${NC}"
    
    # Intentar upload con dry-run para probar conexión
    if cargo contract upload \
        --suri "$SURI" \
        --url "$url" \
        --execute \
        --dry-run \
        &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Probar endpoints hasta encontrar uno que funcione
WORKING_URL=""
for URL in "${RPC_URLS[@]}"; do
    if test_connection "$URL"; then
        WORKING_URL="$URL"
        echo -e "${GREEN}✅ Conexión exitosa con: $URL${NC}"
        echo ""
        break
    else
        echo -e "${RED}❌ Falló: $URL${NC}"
    fi
done

if [ -z "$WORKING_URL" ]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ No se pudo conectar a ningún endpoint${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Posibles soluciones:${NC}"
    echo "1. Verifica tu conexión a internet"
    echo "2. Verifica tu configuración DNS (puede estar bloqueando dominios .polkadot.io)"
    echo "3. Intenta usar un VPN"
    echo "4. Usa use.ink para deployment: https://use.ink/getting-started/deploy-your-contract"
    echo ""
    echo -e "${BLUE}Alternativa: Deployment via use.ink${NC}"
    echo "1. Ve a: https://use.ink/getting-started/deploy-your-contract"
    echo "2. Conecta tu wallet"
    echo "3. Sube el archivo: contracts/$CONTRACT/target/ink/$CONTRACT.contract"
    echo "4. Instancia con constructor: new"
    exit 1
fi

# Deployment
echo -e "${YELLOW}📤 Paso 1: Subiendo código del contrato...${NC}"
UPLOAD_OUTPUT=$(cargo contract upload \
    --suri "$SURI" \
    --url "$WORKING_URL" \
    --execute 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en upload:${NC}"
    echo "$UPLOAD_OUTPUT"
    exit 1
fi

# Extraer code hash del output
CODE_HASH=$(echo "$UPLOAD_OUTPUT" | grep -i "code hash" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

if [ -z "$CODE_HASH" ]; then
    echo -e "${YELLOW}⚠️  No se pudo extraer code hash, intentando sin él...${NC}"
    CODE_HASH=""
fi

echo -e "${GREEN}✅ Código subido${NC}"
echo ""

echo -e "${YELLOW}🎬 Paso 2: Instanciando contrato...${NC}"
if [ -n "$CODE_HASH" ]; then
    INSTANTIATE_OUTPUT=$(cargo contract instantiate \
        --constructor new \
        --code-hash "$CODE_HASH" \
        --suri "$SURI" \
        --url "$WORKING_URL" \
        --execute 2>&1)
else
    INSTANTIATE_OUTPUT=$(cargo contract instantiate \
        --constructor new \
        --suri "$SURI" \
        --url "$WORKING_URL" \
        --execute 2>&1)
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en instanciación:${NC}"
    echo "$INSTANTIATE_OUTPUT"
    exit 1
fi

# Extraer contract address
CONTRACT_ADDRESS=$(echo "$INSTANTIATE_OUTPUT" | grep -iE "contract|address" | grep -oE "5[a-zA-Z0-9]{47}" | head -1)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Completado!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ -n "$CONTRACT_ADDRESS" ]; then
    echo -e "${BLUE}📍 Dirección del Contrato:${NC}"
    echo -e "${GREEN}$CONTRACT_ADDRESS${NC}"
    echo ""
fi

echo -e "${BLUE}📝 Próximos pasos:${NC}"
if [ -n "$CONTRACT_ADDRESS" ]; then
    echo "1. Actualiza app/web/.env.local con:"
    if [ "$CONTRACT" == "skillchain" ]; then
        echo "   NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
    else
        echo "   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
    fi
    echo "   NEXT_PUBLIC_WS_PROVIDER=$WORKING_URL"
    echo ""
fi

echo -e "${BLUE}🔗 Ver en Polkadot.js Apps:${NC}"
echo "https://polkadot.js.org/apps/?rpc=${WORKING_URL//wss:/ws:}#/contracts"
echo ""

