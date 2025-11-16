# SkillChain — On-Chain Professional Reputation Protocol

**SkillChain** is a decentralized professional reputation protocol built on Polkadot, enabling freelancers, developers, and Web3 contributors to register, verify, and publicly showcase validated achievements on-chain.

## 🎯 Overview

This protocol is implemented as an **ink! smart contract** deployed on a WASM-compatible parachain. Validations (e.g., "completed a job", "won a hackathon", "contributed to a repo") are registered as claims that can be approved on-chain by another entity (e.g., a client, a DAO, or OFFER-HUB).

### Built on Polkadot

SkillChain leverages the **Polkadot ecosystem** to provide a decentralized, interoperable reputation system. By deploying on a WASM-compatible parachain, the protocol benefits from:

- **Fast Finality**: Sub-second block times on optimized parachains
- **Low Transaction Costs**: Efficient gas usage with ink! smart contracts
- **Cross-Chain Interoperability**: Native integration with other Polkadot parachains
- **Scalability**: Parachain architecture allows for high throughput
- **Security**: Shared security model through Polkadot's relay chain

The protocol integrates seamlessly with Polkadot's native technologies:
- **ink! 5.0** for smart contract development
- **Substrate** for blockchain infrastructure
- **KILT Protocol** for decentralized identity (native Polkadot parachain)
- **Polkadot.js** for wallet integration and user experience

**OFFER-HUB**, a Web3 freelance platform, is the first official integrator of the protocol, consuming and integrating SkillChain public profiles within its app to display each freelancer's validated history.

### About Offer-Hub

**Offer-Hub** is a decentralized freelance platform that democratizes global financial access using the Polkadot blockchain as its infrastructure. Built on top of SkillChain, it provides:

- **Universal Financial Inclusion**: Enables freelancers worldwide to receive and send payments instantly, with simple wallet creation through Polkadot.js Extension — no KYC friction or bank checks required.

- **Instant Democratic Payments**: Fast transaction processing on Polkadot parachains with milestone-based escrow payments. The platform returns economic power directly to freelancers by removing intermediaries through smart contract automation.

- **Transparent Dispute Resolution**: Conflict resolution via community voting and designated arbiters. Smart contracts automatically execute decisions, eliminating bias and delay compared to opaque centralized systems.

The platform leverages:
- **SkillChain Protocol** for on-chain reputation and verified achievements
- **Escrow Multi-Release Contract** for secure milestone-based payments
- **KILT Protocol** for decentralized identity (DIDs and Verifiable Credentials)
- **Polkadot Ecosystem** for fast, low-cost transactions

## 🏗️ Project Structure

```
offerhub-skillchain/
├── contracts/skillchain/    # ink! smart contract
├── sdk/js/                  # TypeScript SDK for integrations
├── app/web/                 # Next.js frontend application
├── docs/                    # Technical documentation
├── .gitignore
├── LICENSE
├── README.md
└── pop.toml
```

## 🚀 Getting Started

### Prerequisites

- **Rust** (latest stable) with `wasm32-unknown-unknown` target
- **cargo-contract** CLI
- **Node.js** v18+ and npm/yarn/pnpm
- **Pop CLI** (optional, for contract development)

### Setup

1. **Install Rust and cargo-contract:**

```bash
rustup component add rust-src
cargo install cargo-contract --force
```

2. **Install dependencies:**

```bash
# Frontend
cd app/web
npm install

# SDK
cd ../../sdk/js
npm install
```

3. **Build the smart contract:**

```bash
cd contracts/skillchain
cargo contract build --release
```

**✅ Contract compiled successfully!**
- Size: 12.9KB (optimized)
- Artifacts: `target/ink/skillchain.contract`

4. **Deploy the contract:**

```bash
# Local node
./deploy.sh local

# Testnet (Paseo)
./deploy.sh paseo "your seed phrase"
```

See [DEPLOYMENT.md](contracts/skillchain/DEPLOYMENT.md) for detailed instructions.

5. **Run the frontend:**

```bash
cd app/web
npm run dev
```

## 📦 Components

### Smart Contracts

#### SkillChain Registry (`contracts/skillchain/`)

The `SkillChainRegistry` contract provides:
- `register_profile(address, metadata_uri)`
- `add_claim(issuer, receiver, claim_type, proof_hash)`
- `approve_claim(claim_id)`
- `get_claims(address)`
- `link_did(did: String)` - Link KILT DID to profile
- `get_did(account_id)` - Get linked DID from profile

#### Escrow Multi-Release (`contracts/escrow/`)

The `EscrowMultiRelease` contract enables secure freelance payments:
- `create_escrow(freelancer, milestones, arbiter)` - Create milestone-based escrow
- `fund_escrow(escrow_id)` - Lock funds in escrow
- `release_milestone(escrow_id, milestone_id)` - Release payment for completed milestone
- `request_cancel(escrow_id)` - Request cancellation
- `approve_cancel(escrow_id)` - Approve mutual cancellation
- `resolve_dispute_by_arbiter(escrow_id, decision)` - Arbiter resolves disputes

### Frontend (`app/web/`)

Next.js 14 application with:
- Wallet connection (Polkadot.js, Talisman, SubWallet)
- On-chain profile creation
- Achievement visualization
- Claim issuance and approval

### SDK (`sdk/js/`)

TypeScript SDK for external integrations with functions:
- `createProfile()`
- `addClaim()`
- `approveClaim()`
- `getClaimsByAddress()`
- `linkDid()` - Link KILT DID to profile
- `getDid()` - Get linked DID from profile

**KILT Integration:**
- `KiltClient` - Create Light DIDs, verify credentials
- `createLightDid()` - Generate KILT Light DID
- `verifyCredential()` - Verify KILT credentials

## 🛠️ Tech Stack

### Web3 Technologies
- **ink!** - Smart contracts (v5.0) for WASM-compatible parachains
- **Substrate** - Blockchain framework
- **Polkadot** - Multi-chain network
- **KILT Protocol** - Decentralized Identity (DIDs and Verifiable Credentials)
- **Arkiv** - Decentralized storage protocol (planned integration)

### Development Stack
- **Smart Contracts:** Rust, ink! 5.0, cargo-contract
- **Frontend:** Next.js 14, TypeScript, TailwindCSS
- **SDK:** TypeScript, @polkadot/api, @polkadot/api-contract
- **Wallets:** Polkadot.js Extension, Talisman, SubWallet
- **Testing:** Jest, ink_e2e

## 🎯 Hackathon

Developed for **Sub0 Hackathon** (Polkadot):
- Polkadot Main Track
- Hyperbridge SDK bounty
- Marketing Track (GTM + adoption)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📬 Contact

For questions or collaboration opportunities, please open an issue or reach out to the OFFER-HUB team.

