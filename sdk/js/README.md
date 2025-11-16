# SkillChain SDK

TypeScript SDK for integrating with the SkillChain protocol.

## Installation

```bash
npm install @skillchain/sdk
```

## Usage

### Initialize the client

```typescript
import { SkillChainClient } from '@skillchain/sdk';
import { ApiPromise, WsProvider } from '@polkadot/api';

// Connect to Polkadot node
const wsProvider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider: wsProvider });

// Initialize SkillChain client
const client = new SkillChainClient({
  api,
  contractAddress: 'YOUR_CONTRACT_ADDRESS',
  abi: contractAbi, // Import your contract ABI
});
```

### Create a profile

```typescript
const result = await client.createProfile(
  {
    metadataUri: 'ipfs://QmYourMetadataHash',
  },
  signerAddress
);
```

### Add a claim

```typescript
import { ClaimType } from '@skillchain/sdk';

const result = await client.addClaim(
  {
    receiver: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    claimType: ClaimType.JobCompleted,
    proofHash: '0x1234...',
  },
  signerAddress
);
```

### Approve a claim

```typescript
const result = await client.approveClaim(
  {
    claimId: 1,
  },
  signerAddress
);
```

### Query claims

```typescript
const claims = await client.getClaimsByAddress(
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
);
```

### Query profile

```typescript
const profile = await client.getProfile(
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
);
```


## Arkiv Integration

The SDK includes Arkiv integration for decentralized off-chain data storage with real-time streaming and SQL-like queries.

### Initialize Arkiv client (read-only)

```typescript
import { ArkivClient } from '@skillchain/sdk';

// Read-only client for queries
const arkivClient = new ArkivClient();

// Query entities
const results = await arkivClient.query({
  filters: [{ key: 'type', value: 'profile' }],
  withPayload: true,
  withAttributes: true
});
```

### Initialize Arkiv client (with write access)

```typescript
import { ArkivClient } from '@skillchain/sdk';

// Client with write access (requires private key)
const arkivClient = new ArkivClient({
  privateKey: '0x...' // Your Ethereum private key
});
```

### Store data in Arkiv

```typescript
// Store a user profile
const result = await arkivClient.createEntity({
  payload: {
    name: 'John Doe',
    bio: 'Blockchain developer',
    skills: ['Rust', 'Polkadot', 'Ink!']
  },
  attributes: [
    { key: 'type', value: 'profile' },
    { key: 'userId', value: 'user123' }
  ],
  expiresInMinutes: 1440 // 24 hours
});

console.log('Entity key:', result.entityKey);
console.log('Transaction hash:', result.txHash);
```

### Update data in Arkiv

```typescript
const result = await arkivClient.updateEntity({
  entityKey: '0x...',
  payload: {
    name: 'Jane Doe',
    skills: ['Rust', 'Polkadot', 'Ink!', 'Substrate']
  },
  attributes: [{ key: 'updated', value: 'true' }]
});
```

### Query data from Arkiv

```typescript
// Query with filters
const profiles = await arkivClient.query({
  filters: [
    { key: 'type', value: 'profile' },
    { key: 'userId', value: 'user123' }
  ],
  withPayload: true,
  withAttributes: true,
  limit: 10
});

// Get a single entity by key
const entity = await arkivClient.getEntity('0x...');
if (entity) {
  console.log('Entity payload:', entity.payload);
}
```

### Delete data from Arkiv

```typescript
const result = await arkivClient.deleteEntity('0x...');
```

### Use cases for Arkiv in SkillChain

1. **Off-chain profile metadata**: Store detailed user profiles, bios, avatars
2. **Claim evidence**: Store proof documents and evidence for claims
3. **Temporary data**: Store session data or temporary job postings with expiration
4. **Search and indexing**: Query claims by multiple attributes efficiently

## API Reference

### SkillChainClient

Main client class for interacting with the SkillChain protocol.

#### Methods

- `createProfile(options, signerAddress)` - Create a new on-chain profile
- `addClaim(options, signerAddress)` - Add a new claim
- `approveClaim(options, signerAddress)` - Approve an existing claim
- `getClaimsByAddress(address)` - Get all claims for an address
- `getProfile(address)` - Get profile for an address
- `getTotalClaims()` - Get total number of claims in the system
- `disconnect()` - Cleanup and disconnect

### ArkivClient

Client for interacting with the Arkiv decentralized data layer.

#### Methods

- `createEntity(options)` - Create a new entity in Arkiv (requires private key)
- `updateEntity(options)` - Update an existing entity (requires private key)
- `deleteEntity(entityKey)` - Delete an entity (requires private key)
- `query(options?)` - Query entities with filters
- `getEntity(entityKey)` - Get a single entity by key
- `disconnect()` - Cleanup and disconnect

### Types

See [types.ts](./src/types.ts) for all type definitions.

## Development

### Build

```bash
npm run build
```

### Watch mode

```bash
npm run watch
```

## License

MIT

