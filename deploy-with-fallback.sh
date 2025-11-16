#!/bin/bash

# Script de deployment con fallback de endpoints RPC

CONTRACT=${1:-skillchain}
NETWORK=${2:-paseo}
SURI=${3:-//Alice}

cd "contracts/$CONTRACT"

# Endpoints RPC con fallback
if [ "$NETWORK" == "paseo" ]; then
    ENDPOINTS=(
        "wss://paseo-rpc.dwellir.com"
        "wss://paseo.rpc.amforc.com"
        "wss://paseo-rpc.polkadot.io"
    )
elif [ "$NETWORK" == "rococo" ]; then
    ENDPOINTS=(
        "wss://rococo-contracts-rpc.polkadot.io"
        "wss://rococo-contracts.polkadot.io"
        "wss://rococo-rpc.polkadot.io"
    )
else
    echo "❌ Red no soportada: $NETWORK"
    exit 1
fi

echo "🔍 Probando endpoints RPC..."
for URL in "${ENDPOINTS[@]}"; do
    echo "  Probando: $URL"
    cargo contract upload \
      --suri "$SURI" \
      --url "$URL" \
      --skip-dry-run 2>&1 | head -5
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "✅ Conexión exitosa con: $URL"
        echo ""
        echo "📤 Subiendo código..."
        cargo contract upload \
          --suri "$SURI" \
          --url "$URL" \
          --execute
        
        echo ""
        echo "🎬 Instanciando contrato..."
        cargo contract instantiate \
          --suri "$SURI" \
          --constructor new \
          --url "$URL" \
          --execute
        
        echo "✅ Deployment completado!"
        exit 0
    else
        echo "❌ Falló: $URL"
        echo ""
    fi
done

echo "❌ Todos los endpoints fallaron. Usa Polkadot.js Apps:"
echo "https://polkadot.js.org/apps/?rpc=${ENDPOINTS[0]}#/contracts"

