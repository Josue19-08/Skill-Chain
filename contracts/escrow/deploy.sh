#!/bin/bash

# Escrow Multi-Release Contract Deployment Script
# Usage: ./deploy.sh [network] [suri]
# Examples:
#   ./deploy.sh local
#   ./deploy.sh paseo "your twelve word seed phrase"

set -e

# Configuration
NETWORK=${1:-local}
SURI=${2:-//Alice}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine network URL
case $NETWORK in
  local)
    URL="ws://127.0.0.1:9944"
    ;;
  paseo)
    URL="wss://paseo-rpc.dwellir.com"
    ;;
  rococo)
    URL="wss://rococo-contracts-rpc.polkadot.io"
    ;;
  *)
    echo -e "${RED}❌ Unknown network: $NETWORK${NC}"
    echo -e "${YELLOW}Available networks: local, paseo, rococo${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Escrow Multi-Release Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Network:${NC} $NETWORK"
echo -e "${GREEN}RPC URL:${NC} $URL"
echo ""

# Check if contract is built
if [ ! -f "target/ink/escrow.contract" ]; then
    echo -e "${YELLOW}⚠️  Contract not built. Building now...${NC}"
    cargo contract build --release
fi

echo -e "${YELLOW}📤 Step 1: Uploading contract code...${NC}"
cargo contract upload \
  --suri "$SURI" \
  --url "$URL" \
  --execute

echo ""
echo -e "${YELLOW}🎬 Step 2: Instantiating contract...${NC}"
cargo contract instantiate \
  --suri "$SURI" \
  --constructor new \
  --url "$URL" \
  --execute

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Copy the contract address from the output above"
echo "2. Update your frontend .env.local with:"
echo "   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=<address>"
echo "   NEXT_PUBLIC_WS_PROVIDER=$URL"
echo "3. Test the contract functions via Polkadot.js Apps"
echo ""
echo -e "${BLUE}🔗 Polkadot.js Apps:${NC}"
echo "https://polkadot.js.org/apps/?rpc=$URL#/contracts"

