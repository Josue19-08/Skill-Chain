#!/bin/bash

# Build script for Escrow Multi-Release ink! smart contract

echo "🔨 Building Escrow contract..."

# Check if cargo-contract is installed
if ! command -v cargo-contract &> /dev/null
then
    echo "❌ cargo-contract not found. Please install it:"
    echo "   cargo install cargo-contract --force"
    exit 1
fi

# Build the contract
cargo contract build --release

if [ $? -eq 0 ]; then
    echo "✅ Contract built successfully!"
    echo ""
    echo "📦 Artifacts generated:"
    echo "   - target/ink/escrow.contract"
    echo "   - target/ink/escrow.wasm"
    echo "   - target/ink/metadata.json"
else
    echo "❌ Build failed!"
    exit 1
fi

