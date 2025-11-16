#!/bin/bash

# SkillChain Contract Deployment Script
# Usage: ./deploy.sh [network] [suri]
# Examples:
#   ./deploy.sh local
#   ./deploy.sh paseo
#
# For Paseo Asset Hub, set environment variables:
#   export PASEO_SURI="your twelve word seed phrase"
#   export PASEO_RPC_WSS="wss://asset-hub-paseo.dotters.network"

# Don't exit on error immediately - we need to check error codes manually
set +e

# Configuration
# Default to rococo (most stable for ink! contracts)
NETWORK=${1:-rococo}
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
  paseo|paseo-asset-hub)
    # Use environment variable if set, otherwise try official Passet Hub endpoints
    if [ -z "$PASEO_RPC_WSS" ]; then
      # Official Passet Hub endpoints (Paseo Asset Hub testnet)
      ENDPOINTS=(
        "wss://testnet-passet-hub.polkadot.io"
        "wss://passet-hub-paseo.ibp.network"
        "wss://sys.ibp.network/asset-hub-paseo"
        "wss://rpc.ibp.network/asset-hub-paseo"
        "wss://asset-hub-paseo-rpc.dwellir.com"
      )
      URL="${ENDPOINTS[0]}"
    else
      URL="$PASEO_RPC_WSS"
    fi
    # Use environment variable for SURI if set
    if [ -z "$SURI" ] || [ "$SURI" = "//Alice" ]; then
      SURI="${PASEO_SURI:-$SURI}"
    fi
    
    # Validate environment variables for Paseo
    if [ -z "$PASEO_SURI" ] && [ "$SURI" = "//Alice" ]; then
      echo -e "${YELLOW}⚠️  Warning: PASEO_SURI not set. Using //Alice (only works for local networks)${NC}"
    fi
    ;;
  rococo|rococo-contracts)
    URL="wss://rococo-contracts-rpc.polkadot.io"
    # Use environment variable for SURI if set
    if [ -z "$SURI" ] || [ "$SURI" = "//Alice" ]; then
      SURI="${PASEO_SURI:-$SURI}"
    fi
    ;;
  *)
    echo -e "${RED}❌ Unknown network: $NETWORK${NC}"
    echo -e "${YELLOW}Available networks: local, paseo, paseo-asset-hub, rococo${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SkillChain Contract Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Network:${NC} $NETWORK"
echo -e "${GREEN}RPC URL:${NC} $URL"
echo ""

# Check if contract is built
if [ ! -f "target/ink/skillchain.contract" ]; then
    echo -e "${YELLOW}⚠️  Contract not built. Building now...${NC}"
    cargo contract build --release
fi

# For Paseo Asset Hub, show info before upload
if [ "$NETWORK" = "paseo" ] || [ "$NETWORK" = "paseo-asset-hub" ]; then
  echo -e "${YELLOW}📊 Uploading to Paseo Asset Hub...${NC}"
fi

echo -e "${YELLOW}📤 Step 1: Uploading contract code...${NC}"
echo -e "${BLUE}Command:${NC} cargo contract upload --suri \"$SURI\" --url \"$URL\" target/ink/skillchain.contract --execute"
echo ""

# Capture both stdout and stderr
UPLOAD_OUTPUT=$(cargo contract upload \
  --suri "$SURI" \
  --url "$URL" \
  target/ink/skillchain.contract \
  --execute 2>&1)
UPLOAD_EXIT_CODE=$?

echo "$UPLOAD_OUTPUT"

# Check for errors
if [ "$UPLOAD_EXIT_CODE" -ne 0 ] || echo "$UPLOAD_OUTPUT" | grep -qi "error\|failed"; then
  echo ""
  echo -e "${RED}❌ Upload failed!${NC}"
  if echo "$UPLOAD_OUTPUT" | grep -qi "503"; then
    echo -e "${YELLOW}⚠️  Endpoint returned 503 (Service Unavailable).${NC}"
    echo -e "${YELLOW}   Try again later or use Polkadot.js Apps UI as alternative.${NC}"
  elif echo "$UPLOAD_OUTPUT" | grep -qi "http version was not 1.1\|WebSocket handshake"; then
    echo -e "${YELLOW}⚠️  WebSocket handshake error detected.${NC}"
    echo -e "${YELLOW}   This usually means:${NC}"
    echo -e "${YELLOW}   1. The endpoint is not responding correctly${NC}"
    echo -e "${YELLOW}   2. There may be a proxy/firewall interfering${NC}"
    echo -e "${YELLOW}   3. The endpoint URL might be incorrect${NC}"
    echo ""
    echo -e "${BLUE}💡 Recommended solution:${NC}"
    echo -e "${BLUE}   Use Polkadot.js Apps UI instead:${NC}"
    echo -e "${BLUE}   1. Go to https://polkadot.js.org/apps/${NC}"
    echo -e "${BLUE}   2. Connect to 'Paseo Asset Hub' network${NC}"
    echo -e "${BLUE}   3. Go to Developer → Contracts${NC}"
    echo -e "${BLUE}   4. Click 'Upload & deploy code'${NC}"
    echo -e "${BLUE}   5. Select: target/ink/skillchain.contract${NC}"
  fi
  exit 1
fi

# Extract code hash from output (compatible with macOS)
# Try multiple patterns to find the code hash
CODE_HASH=$(echo "$UPLOAD_OUTPUT" | grep -oE "Code hash 0x[a-fA-F0-9]{64}" | sed -E 's/Code hash (0x[a-fA-F0-9]{64})/\1/' | head -1)

# If not found, try JSON format
if [ -z "$CODE_HASH" ]; then
  CODE_HASH=$(echo "$UPLOAD_OUTPUT" | grep -oE '"code_hash"[[:space:]]*:[[:space:]]*"0x[a-fA-F0-9]{64}"' | sed -E 's/.*"code_hash"[[:space:]]*:[[:space:]]*"(0x[a-fA-F0-9]{64})".*/\1/' | head -1)
fi

# If still not found, try looking for any 0x followed by 64 hex chars
if [ -z "$CODE_HASH" ]; then
  CODE_HASH=$(echo "$UPLOAD_OUTPUT" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
fi

if [ -z "$CODE_HASH" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Could not extract code hash automatically from output.${NC}"
  echo -e "${YELLOW}   Please check the output above and look for 'Code hash' or 'code_hash'.${NC}"
  echo -e "${YELLOW}   Enter code hash manually (or press Enter to skip instantiation):${NC}"
  read -r CODE_HASH
fi

if [ -n "$CODE_HASH" ]; then
  echo ""
  echo -e "${YELLOW}🎬 Step 2: Instantiating contract with code hash: $CODE_HASH${NC}"
  echo -e "${BLUE}Command:${NC} cargo contract instantiate --suri \"$SURI\" --url \"$URL\" --code-hash $CODE_HASH --constructor new --salt $(date +%s) --execute"
  echo ""
  
  INSTANTIATE_OUTPUT=$(cargo contract instantiate \
    --suri "$SURI" \
    --url "$URL" \
    --code-hash "$CODE_HASH" \
    --constructor new \
    --salt $(date +%s) \
    --execute 2>&1)
  INSTANTIATE_EXIT_CODE=$?
  
  echo "$INSTANTIATE_OUTPUT"
  
  if [ "$INSTANTIATE_EXIT_CODE" -ne 0 ] || echo "$INSTANTIATE_OUTPUT" | grep -qi "error\|failed"; then
    echo ""
    echo -e "${RED}❌ Instantiation failed!${NC}"
    exit 1
  fi
  
  # Extract contract address if possible
  CONTRACT_ADDRESS=$(echo "$INSTANTIATE_OUTPUT" | grep -oE "Contract instantiated at address: [a-zA-Z0-9]+" | sed -E 's/Contract instantiated at address: //' || echo "")
  
  if [ -n "$CONTRACT_ADDRESS" ]; then
    echo ""
    echo -e "${GREEN}📋 Contract Address:${NC} $CONTRACT_ADDRESS"
  fi
else
  echo ""
  echo -e "${YELLOW}⚠️  Skipping instantiation (no code hash available)${NC}"
  echo -e "${YELLOW}   You can instantiate manually using the code hash from the upload output above.${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
if [ -n "$CONTRACT_ADDRESS" ]; then
  echo -e "${GREEN}✅ Deployment Complete!${NC}"
else
  echo -e "${GREEN}✅ Code Upload Complete!${NC}"
fi
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
if [ -n "$CONTRACT_ADDRESS" ]; then
  echo "1. Contract deployed at: $CONTRACT_ADDRESS"
  echo "2. Update your frontend .env.local with:"
  echo "   NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
  echo "   NEXT_PUBLIC_WS_PROVIDER=$URL"
else
  echo "1. Copy the contract address from the output above"
  echo "2. Update your frontend .env.local with:"
  echo "   NEXT_PUBLIC_CONTRACT_ADDRESS=<address>"
  echo "   NEXT_PUBLIC_WS_PROVIDER=$URL"
fi
echo "3. Test the contract functions via Polkadot.js Apps"
echo ""
if [ "$NETWORK" = "paseo" ] || [ "$NETWORK" = "paseo-asset-hub" ]; then
  echo -e "${BLUE}🔗 Polkadot.js Apps (Asset Hub - Paseo):${NC}"
  # URL encode the WebSocket URL for the browser
  ENCODED_URL=$(echo "$URL" | sed 's|wss://|wss%3A%2F%2F|g' | sed 's|/|%2F|g')
  echo "https://polkadot.js.org/apps/?rpc=$ENCODED_URL#/contracts"
else
  echo -e "${BLUE}🔗 Polkadot.js Apps:${NC}"
  ENCODED_URL=$(echo "$URL" | sed 's|ws://|ws%3A%2F%2F|g' | sed 's|/|%2F|g')
  echo "https://polkadot.js.org/apps/?rpc=$ENCODED_URL#/contracts"
fi

