# Escrow Multi-Release Contract

A smart contract for managing milestone-based escrow payments with dispute resolution capabilities, built with ink! for Polkadot parachains.

## Overview

The **EscrowMultiRelease** contract enables secure, milestone-based payments between clients and freelancers. It supports:

- Multi-milestone payment structures
- Automatic fund locking in escrow
- Milestone-by-milestone payment release
- Mutual cancellation agreements
- Dispute resolution via designated arbiters

This contract is designed for the SkillChain/OFFER-HUB platform to facilitate secure freelance payments on-chain.

**Contract Name:** `EscrowMultiRelease`  
**Language:** Rust (ink! v4+)  
**Target:** WASM  
**Location:** `/contracts/escrow/`

---

## Features

### Core Functionality

1. **Create Escrow**: Clients create escrow agreements with defined milestones
2. **Fund Escrow**: Clients deposit funds that are locked until milestones are released
3. **Release Milestones**: Clients release payments for completed milestones
4. **Cancel Escrow**: Either party can request cancellation
5. **Mutual Cancellation**: Both parties can agree to cancel
6. **Arbitration**: Designated arbiters can resolve disputes

### Security Features

- Funds are locked in the contract until released
- Only authorized parties can perform actions (client, freelancer, arbiter)
- Status validation prevents invalid state transitions
- Automatic completion when all milestones are released

---

## Data Structures

### EscrowStatus

```rust
pub enum EscrowStatus {
    Created,      // Escrow created, waiting for funds
    Funded,       // Funds deposited, work in progress
    Completed,    // All milestones completed
    Cancelled,    // Cancelled by mutual agreement or arbiter
    Disputed,     // In dispute, waiting for arbitration
}
```

### Milestone

```rust
pub struct Milestone {
    pub id: u32,              // Unique identifier within escrow
    pub amount: Balance,      // Payment amount for this milestone
    pub released: bool,       // Whether payment has been released
    pub description: String,  // Description or URI for milestone details
}
```

### Escrow

```rust
pub struct Escrow {
    pub id: u64,                          // Unique escrow identifier
    pub client: AccountId,                // Client (payer) account
    pub freelancer: AccountId,            // Freelancer (payee) account
    pub arbiter: Option<AccountId>,       // Optional arbiter for disputes
    pub total_amount: Balance,             // Total amount (sum of milestones)
    pub deposited: Balance,          // Amount currently deposited
    pub milestones: Vec<Milestone>,       // List of milestones
    pub status: EscrowStatus,            // Current status
    pub cancel_requested_by: Option<AccountId>, // Who requested cancellation
    pub created_at: u64,                 // Creation timestamp
}
```

---

## Public Functions

### 1. `create_escrow`

Create a new escrow agreement with milestones.

**Signature:**
```rust
pub fn create_escrow(
    &mut self,
    freelancer: AccountId,
    milestones: Vec<Milestone>,
    arbiter: Option<AccountId>
) -> Result<u64>
```

**Parameters:**
- `freelancer`: Account of the freelancer who will receive payments
- `milestones`: Vector of milestones defining payment structure
- `arbiter`: Optional arbiter account for dispute resolution

**Returns:**
- `Ok(escrow_id)`: Unique ID of the created escrow
- `Err(EscrowError)`: Error if validation fails

**Errors:**
- `EmptyMilestones`: Milestones vector is empty
- `ZeroAmount`: Total amount of milestones is zero

**Events:**
- `EscrowCreated { escrow_id, client, freelancer, arbiter, total_amount }`

**Example:**
```rust
let milestones = vec![
    Milestone {
        id: 0,
        amount: 1000,
        released: false,
        description: "Design phase".to_string(),
    },
    Milestone {
        id: 1,
        amount: 2000,
        released: false,
        description: "Development phase".to_string(),
    },
];

let escrow_id = contract.create_escrow(
    freelancer_address,
    milestones,
    Some(arbiter_address)
)?;
```

---

### 2. `fund_escrow`

Deposit funds into an escrow. This function is payable and must receive exactly `total_amount`.

**Signature:**
```rust
#[ink(message, payable)]
pub fn fund_escrow(&mut self, escrow_id: u64) -> Result<()>
```

**Parameters:**
- `escrow_id`: ID of the escrow to fund

**Returns:**
- `Ok(())`: Success
- `Err(EscrowError)`: Error if validation fails

**Errors:**
- `EscrowNotFound`: Escrow doesn't exist
- `Unauthorized`: Caller is not the client
- `InvalidStatus`: Escrow is not in Created status
- `InsufficientFunds`: Transferred amount is less than total_amount

**Events:**
- `EscrowFunded { escrow_id, amount }`

**Example:**
```rust
// Transfer exactly total_amount when calling
ink::env::pay_with_call!(contract.fund_escrow(escrow_id), total_amount)?;
```

---

### 3. `release_milestone`

Release payment for a specific milestone to the freelancer.

**Signature:**
```rust
pub fn release_milestone(
    &mut self,
    escrow_id: u64,
    milestone_id: u32
) -> Result<()>
```

**Parameters:**
- `escrow_id`: ID of the escrow
- `milestone_id`: ID of the milestone to release

**Returns:**
- `Ok(())`: Success
- `Err(EscrowError)`: Error if validation fails

**Errors:**
- `EscrowNotFound`: Escrow doesn't exist
- `Unauthorized`: Caller is not the client
- `InvalidStatus`: Escrow is not in Funded or Disputed status
- `MilestoneNotFound`: Milestone doesn't exist
- `MilestoneAlreadyReleased`: Milestone was already released

**Events:**
- `MilestoneReleased { escrow_id, milestone_id, amount }`

**Side Effects:**
- Transfers milestone amount to freelancer
- Marks milestone as released
- Updates escrow status to `Completed` if all milestones are released

**Example:**
```rust
contract.release_milestone(escrow_id, 0)?; // Release first milestone
```

---

### 4. `request_cancel`

Request cancellation of an escrow. If both parties request, cancellation is automatic.

**Signature:**
```rust
pub fn request_cancel(&mut self, escrow_id: u64) -> Result<()>
```

**Parameters:**
- `escrow_id`: ID of the escrow to cancel

**Returns:**
- `Ok(())`: Success
- `Err(EscrowError)`: Error if validation fails

**Errors:**
- `EscrowNotFound`: Escrow doesn't exist
- `Unauthorized`: Caller is not client or freelancer
- `InvalidStatus`: Escrow is already Completed or Cancelled

**Events:**
- `CancelRequested { escrow_id, requested_by }`
- `EscrowCancelled { escrow_id, refund_to_client, refund_to_freelancer }` (if mutual)

**Behavior:**
- First request: Sets `cancel_requested_by` and optionally moves to `Disputed` status
- Second request (by other party): Automatic cancellation with fund distribution

**Example:**
```rust
// Client requests cancellation
contract.request_cancel(escrow_id)?;

// Freelancer also requests (mutual cancellation)
set_caller(freelancer);
contract.request_cancel(escrow_id)?; // Automatically cancels
```

---

### 5. `approve_cancel`

Approve cancellation when the other party has requested it.

**Signature:**
```rust
pub fn approve_cancel(&mut self, escrow_id: u64) -> Result<()>
```

**Parameters:**
- `escrow_id`: ID of the escrow

**Returns:**
- `Ok(())`: Success
- `Err(EscrowError)`: Error if validation fails

**Errors:**
- `EscrowNotFound`: Escrow doesn't exist
- `Unauthorized`: Caller is not the other party
- `InvalidStatus`: No cancellation was requested

**Events:**
- `EscrowCancelled { escrow_id, refund_to_client, refund_to_freelancer }`

**Side Effects:**
- Refunds unreleased funds to client
- Keeps released funds with freelancer
- Sets status to `Cancelled`

**Example:**
```rust
// Client requested, freelancer approves
contract.approve_cancel(escrow_id)?;
```

---

### 6. `resolve_dispute_by_arbiter`

Resolve a dispute by distributing funds according to arbiter's decision.

**Signature:**
```rust
pub fn resolve_dispute_by_arbiter(
    &mut self,
    escrow_id: u64,
    freelancer_share: Balance,
    client_refund: Balance
) -> Result<()>
```

**Parameters:**
- `escrow_id`: ID of the escrow in dispute
- `freelancer_share`: Amount to give to freelancer
- `client_refund`: Amount to refund to client

**Returns:**
- `Ok(())`: Success
- `Err(EscrowError)`: Error if validation fails

**Errors:**
- `EscrowNotFound`: Escrow doesn't exist
- `Unauthorized`: Caller is not the arbiter
- `InvalidStatus`: Escrow is not in Disputed status
- `InvalidArbiter`: No arbiter was set
- `InvalidAmount`: freelancer_share + client_refund != deposited

**Events:**
- `DisputeResolved { escrow_id, freelancer_share, client_refund }`

**Side Effects:**
- Transfers funds according to arbiter's decision
- Sets status to `Cancelled`

**Example:**
```rust
// Arbiter resolves: 60% to freelancer, 40% refund to client
contract.resolve_dispute_by_arbiter(
    escrow_id,
    1800, // freelancer_share
    1200  // client_refund
)?;
```

---

## Query Functions

### `get_escrow`

Get escrow details by ID.

```rust
pub fn get_escrow(&self, escrow_id: u64) -> Option<Escrow>
```

### `get_escrows_by_client`

Get all escrow IDs for a client.

```rust
pub fn get_escrows_by_client(&self, client: AccountId) -> Vec<u64>
```

### `get_escrows_by_freelancer`

Get all escrow IDs for a freelancer.

```rust
pub fn get_escrows_by_freelancer(&self, freelancer: AccountId) -> Vec<u64>
```

### `get_milestones`

Get all milestones for an escrow.

```rust
pub fn get_milestones(&self, escrow_id: u64) -> Vec<Milestone>
```

---

## Events

All events are indexed for efficient off-chain querying:

- **EscrowCreated**: Emitted when escrow is created
- **EscrowFunded**: Emitted when funds are deposited
- **MilestoneReleased**: Emitted when a milestone payment is released
- **CancelRequested**: Emitted when cancellation is requested
- **EscrowCancelled**: Emitted when escrow is cancelled
- **DisputeResolved**: Emitted when arbiter resolves a dispute

---

## Error Types

```rust
pub enum EscrowError {
    EscrowNotFound,
    Unauthorized,
    InvalidStatus,
    InsufficientFunds,
    MilestoneNotFound,
    MilestoneAlreadyReleased,
    InvalidArbiter,
    InvalidAmount,
    EmptyMilestones,
    ZeroAmount,
}
```

---

## Workflow Examples

### Standard Flow

1. **Client creates escrow:**
   ```rust
   let escrow_id = contract.create_escrow(
       freelancer,
       milestones,
       Some(arbiter)
   )?;
   ```

2. **Client funds escrow:**
   ```rust
   // Transfer total_amount
   contract.fund_escrow(escrow_id)?;
   ```

3. **Freelancer completes work** (off-chain)

4. **Client releases milestones:**
   ```rust
   contract.release_milestone(escrow_id, 0)?; // First milestone
   contract.release_milestone(escrow_id, 1)?; // Second milestone
   // Status automatically becomes Completed
   ```

### Cancellation Flow

1. **Client requests cancellation:**
   ```rust
   contract.request_cancel(escrow_id)?;
   ```

2. **Option A - Mutual agreement:**
   ```rust
   // Freelancer approves
   set_caller(freelancer);
   contract.approve_cancel(escrow_id)?;
   ```

3. **Option B - Dispute:**
   ```rust
   // Arbiter resolves
   set_caller(arbiter);
   contract.resolve_dispute_by_arbiter(
       escrow_id,
       freelancer_share,
       client_refund
   )?;
   ```

---

## Compilation

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm target
rustup target add wasm32-unknown-unknown

# Install cargo-contract
cargo install cargo-contract --force
```

### Build

```bash
cd contracts/escrow
cargo contract build --release

# Or use the build script
./build.sh
```

**Build Artifacts:**
- `target/ink/escrow.contract` - Complete contract bundle
- `target/ink/escrow.wasm` - Contract WASM bytecode
- `target/ink/metadata.json` - Contract ABI

---

## Deployment

### Local Development

```bash
# Start local node
substrate-contracts-node --dev --tmp

# Deploy contract
./deploy.sh local
```

### Testnet (Paseo)

```bash
./deploy.sh paseo "your twelve word seed phrase"
```

### Using Polkadot.js Apps

1. Navigate to: https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944#/contracts
2. Click "Upload & deploy code"
3. Upload `escrow.contract` file
4. Select constructor: `new()`
5. Click "Deploy"
6. Copy the contract address

---

## Testing

### Unit Tests

```bash
cd contracts/escrow
cargo test
```

### Test Coverage

The contract includes comprehensive unit tests covering:

- ✅ Escrow creation (success and validation)
- ✅ Funding escrow (success, unauthorized, insufficient funds)
- ✅ Milestone release (success, unauthorized, already released)
- ✅ Completion detection (all milestones released)
- ✅ Cancellation requests (mutual and single)
- ✅ Cancellation approval
- ✅ Dispute resolution by arbiter
- ✅ Query functions
- ✅ Edge cases and error conditions

---

## Security Considerations

### Access Control

- **Create Escrow**: Only client can create
- **Fund Escrow**: Only client can fund
- **Release Milestone**: Only client can release
- **Request Cancel**: Client or freelancer
- **Approve Cancel**: Other party only
- **Resolve Dispute**: Only designated arbiter

### Validation

- Milestone IDs must be sequential (0, 1, 2, ...)
- Total amount must match sum of milestone amounts
- Funded amount must exactly match total_amount
- Status transitions are validated
- Arbiter must be set for dispute resolution

### Best Practices

1. **Milestone Descriptions**: Store detailed descriptions off-chain (IPFS/Arweave)
2. **Arbiter Selection**: Choose trusted, neutral arbiters
3. **Amount Validation**: Always verify amounts before funding
4. **Event Monitoring**: Monitor events for escrow state changes

---

## Gas Optimization

The contract is optimized for gas efficiency:

- Uses `Mapping` for O(1) lookups
- Minimal storage writes
- Efficient event emission
- No unnecessary clones

**Estimated Gas Costs** (approximate):

| Operation | Gas Cost |
|-----------|----------|
| `create_escrow` | ~80K |
| `fund_escrow` | ~50K |
| `release_milestone` | ~60K |
| `request_cancel` | ~40K |
| `approve_cancel` | ~50K |
| `resolve_dispute_by_arbiter` | ~60K |
| Query functions | ~10-20K |

---

## Integration with SDK

The contract is integrated with the SkillChain SDK. See `sdk/js/src/client.ts` for the `EscrowClient` class.

**Example Usage:**

```typescript
import { EscrowClient } from '@skillchain/sdk';
import { ApiPromise, WsProvider } from '@polkadot/api';

const api = await ApiPromise.create({
  provider: new WsProvider('ws://127.0.0.1:9944')
});

const client = new EscrowClient({
  api,
  contractAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  abi: escrowAbi
});

// Create escrow
const result = await client.createEscrow({
  freelancer: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  milestones: [
    { id: 0, amount: '1000000000000', description: 'Design' },
    { id: 1, amount: '2000000000000', description: 'Development' }
  ],
  arbiter: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3XBUq'
}, clientAddress);

// Fund escrow
await client.fundEscrow({
  escrowId: result.escrowId!,
  amount: '3000000000000'
}, clientAddress);

// Release milestone
await client.releaseMilestone({
  escrowId: result.escrowId!,
  milestoneId: 0
}, clientAddress);
```

---

## Future Enhancements

Potential improvements for future versions:

1. **PSP22 Token Support**: Support for custom tokens instead of native balance
2. **Timeouts**: Automatic cancellation after deadline
3. **Multiple Arbiters**: DAO-based arbitration
4. **Milestone Dependencies**: Sequential milestone requirements
5. **Partial Releases**: Release percentage of milestone amount
6. **Integration with SkillChain**: Auto-create claims on milestone completion
7. **Reputation System**: Track escrow completion rates

---

## License

MIT License - See LICENSE file for details.

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Contract Version:** 0.1.0

