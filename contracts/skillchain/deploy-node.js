#!/usr/bin/env node

/**
 * Programmatic deployment script for SkillChain contract using @polkadot/api
 * Usage: node deploy-node.js
 * 
 * Requires environment variables:
 * - PASEO_SURI: Your seed phrase
 * - PASEO_RPC_WSS: RPC endpoint (optional, defaults to working endpoint)
 */

const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTRACT_BUNDLE_PATH = path.join(__dirname, 'target/ink/skillchain.contract');
const CONTRACT_JSON_PATH = path.join(__dirname, 'target/ink/skillchain.json');
const SEED_PHRASE = process.env.PASEO_SURI || '';
const RPC_ENDPOINTS = [
  'wss://paseo-rpc.dwellir.com',
  'wss://paseo.rpc.amforc.com',
  'wss://asset-hub-paseo.dotters.network',
  'wss://testnet-passet-hub.polkadot.io',
  'wss://passet-hub-paseo.ibp.network'
];
const RPC_URL = process.env.PASEO_RPC_WSS || RPC_ENDPOINTS[0];

async function deploy() {
  if (!SEED_PHRASE) {
    console.error('❌ Error: PASEO_SURI environment variable not set');
    console.error('   export PASEO_SURI="your seed phrase"');
    process.exit(1);
  }

  if (!fs.existsSync(CONTRACT_BUNDLE_PATH)) {
    console.error(`❌ Error: Contract bundle not found at ${CONTRACT_BUNDLE_PATH}`);
    console.error('   Run: cargo contract build --release');
    process.exit(1);
  }

  if (!fs.existsSync(CONTRACT_JSON_PATH)) {
    console.error(`❌ Error: Contract JSON not found at ${CONTRACT_JSON_PATH}`);
    console.error('   Run: cargo contract build --release');
    process.exit(1);
  }

  console.log('📦 Loading contract files...');
  const contractBundle = JSON.parse(fs.readFileSync(CONTRACT_BUNDLE_PATH, 'utf8'));
  const contractMetadata = JSON.parse(fs.readFileSync(CONTRACT_JSON_PATH, 'utf8'));
  
  // Validate contract bundle structure
  if (!contractBundle.source || !contractBundle.source.wasm) {
    throw new Error('Invalid contract bundle: missing source.wasm');
  }
  
  // Try connecting to multiple endpoints
  let api;
  let connectedUrl = RPC_URL;
  
  if (process.env.PASEO_RPC_WSS) {
    // If user specified URL, try only that one
    console.log(`🔗 Connecting to ${RPC_URL}...`);
    const provider = new WsProvider(RPC_URL);
    api = await ApiPromise.create({ provider });
  } else {
    // Try multiple endpoints
    console.log(`🔗 Trying to connect to Paseo endpoints...`);
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        console.log(`   Trying: ${endpoint}`);
        const provider = new WsProvider(endpoint, 5000); // 5s timeout
        api = await ApiPromise.create({ provider });
        connectedUrl = endpoint;
        console.log(`   ✅ Connected to: ${endpoint}`);
        break;
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        continue;
      }
    }
    
    if (!api) {
      throw new Error('Could not connect to any Paseo endpoint');
    }
  }

  console.log('🔑 Setting up account...');
  const keyring = new Keyring({ type: 'sr25519' });
  const account = keyring.addFromMnemonic(SEED_PHRASE);
  console.log(`   Account: ${account.address}`);

  // Check balance
  const { data: balance } = await api.query.system.account(account.address);
  const balanceFree = balance.free.toBigInt();
  console.log(`   Balance: ${balance.free.toHuman()}`);
  
  if (balanceFree === 0n) {
    console.error('\n❌ Error: Account has zero balance');
    console.error('   You need testnet tokens to deploy contracts');
    console.error('   Request tokens from: https://polkadot.js.org/apps/?rpc=' + encodeURIComponent(connectedUrl) + '#/accounts');
    await api.disconnect();
    process.exit(1);
  }

  console.log('\n📤 Creating CodePromise instance...');
  
  // Create CodePromise with metadata JSON and WASM
  // Use the JSON file which has the correct metadata format
  const code = new CodePromise(
    api,
    contractMetadata,
    contractBundle.source.wasm
  );

  console.log('🚀 Deploying contract (upload + instantiate)...');
  
  // Get constructor
  const constructors = code.abi.constructors;
  const constructor = constructors.find(c => c.identifier === 'new');
  
  if (!constructor) {
    throw new Error('Constructor "new" not found');
  }

  // Estimate gas - use high values for safety
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: 500000000000n,
    proofSize: 1000000n,
  });

  // Use CodePromise.tx.new() which handles API differences automatically
  console.log('🚀 Creating deployment transaction...');
  
  const deployTx = code.tx.new(
    {
      gasLimit,
      value: 0,
      storageDepositLimit: null
    },
    {} // constructor args (empty for new())
  );

  const contractAddress = await new Promise((resolve, reject) => {
    deployTx.signAndSend(account, (result) => {
      if (result.status.isInBlock) {
        console.log(`   📦 Transaction included in block: ${result.status.asInBlock}`);
        
        // Look for Instantiated event (contract address)
        result.events.forEach(({ event }) => {
          if (api.events.contracts?.Instantiated?.is(event)) {
            const address = event.data[1].toString();
            console.log(`   ✅ Contract deployed! Address: ${address}`);
            resolve(address);
          }
        });
      } else if (result.status.isFinalized) {
        console.log(`   ✅ Transaction finalized: ${result.status.asFinalized}`);
        
        // Extract contract address from events
        let found = false;
        result.events.forEach(({ event }) => {
          if (api.events.contracts?.Instantiated?.is(event)) {
            const address = event.data[1].toString();
            console.log(`   ✅ Contract deployed! Address: ${address}`);
            resolve(address);
            found = true;
          }
        });
        
        if (!found) {
          reject(new Error('Contract instantiated but address not found in events'));
        }
      } else if (result.isError) {
        reject(new Error('Deployment transaction failed'));
      }
    }).catch(reject);
  });

  console.log('\n✅ Deployment Complete!');
  console.log(`   Contract Address: ${contractAddress}`);
  
  await api.disconnect();
}

deploy().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});

