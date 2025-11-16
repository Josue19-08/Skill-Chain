#!/bin/bash

# Script para probar conexión RPC

echo "🔍 Probando conexiones RPC..."
echo ""

# Paseo endpoints
echo "📡 Paseo RPC Endpoints:"
for endpoint in "wss://paseo-rpc.dwellir.com" "wss://paseo.rpc.amforc.com" "wss://paseo-rpc.polkadot.io"; do
    echo -n "  Testing $endpoint ... "
    cd /Users/kevinbrenes/Skill-Chain/contracts/skillchain
    cargo contract upload --suri "injury hurt blame cram mean daughter agree debate shiver near indoor nut" --url "$endpoint" --dry-run 2>&1 | grep -q "Error\|ERROR" && echo "❌ Failed" || echo "✅ OK"
done

echo ""
echo "📡 Rococo RPC Endpoints:"
for endpoint in "wss://rococo-contracts-rpc.polkadot.io" "wss://rococo-contracts.polkadot.io"; do
    echo -n "  Testing $endpoint ... "
    cd /Users/kevinbrenes/Skill-Chain/contracts/skillchain
    cargo contract upload --suri "injury hurt blame cram mean daughter agree debate shiver near indoor nut" --url "$endpoint" --dry-run 2>&1 | grep -q "Error\|ERROR" && echo "❌ Failed" || echo "✅ OK"
done

