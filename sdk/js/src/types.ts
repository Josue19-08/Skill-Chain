/**
 * Type definitions for SkillChain SDK
 */

import type { ApiPromise } from '@polkadot/api';
import type { ContractPromise } from '@polkadot/api-contract';

/**
 * Claim types supported by SkillChain protocol
 */
export enum ClaimType {
  JobCompleted = 'JobCompleted',
  HackathonWin = 'HackathonWin',
  RepoContribution = 'RepoContribution',
  SkillEndorsement = 'SkillEndorsement',
  Other = 'Other',
}

/**
 * Profile data structure
 */
export interface Profile {
  owner: string;
  metadataUri: string;
  createdAt: number;
}

/**
 * Claim data structure
 */
export interface Claim {
  id: number;
  issuer: string;
  receiver: string;
  claimType: ClaimType;
  proofHash: string;
  approved: boolean;
  timestamp: number;
}

/**
 * Configuration for SkillChain client
 */
export interface SkillChainConfig {
  /** Polkadot API instance */
  api: ApiPromise;
  /** Contract address */
  contractAddress: string;
  /** Contract ABI metadata */
  abi: any;
}

/**
 * Options for creating a profile
 */
export interface CreateProfileOptions {
  metadataUri: string;
}

/**
 * Options for adding a claim
 */
export interface AddClaimOptions {
  receiver: string;
  claimType: ClaimType;
  proofHash: string;
}

/**
 * Options for approving a claim
 */
export interface ApproveClaimOptions {
  claimId: number;
}

/**
 * Result of a transaction
 */
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// ========================================
// ESCROW TYPES
// ========================================

/**
 * Escrow status enum
 */
export enum EscrowStatus {
  Created = 'Created',
  Funded = 'Funded',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Disputed = 'Disputed',
}

// Export as both type and value
export type EscrowStatusType = EscrowStatus;

/**
 * Milestone data structure
 */
export interface Milestone {
  id: number;
  amount: string; // Balance as string (BN in Polkadot)
  released: boolean;
  description: string;
}

/**
 * Escrow data structure
 */
export interface Escrow {
  id: number;
  client: string;
  freelancer: string;
  arbiter: string | null;
  totalAmount: string;
  deposited: string;
  milestones: Milestone[];
  status: EscrowStatus;
  cancelRequestedBy: string | null;
  createdAt: number;
}

/**
 * Configuration for Escrow client
 */
export interface EscrowConfig {
  /** Polkadot API instance */
  api: ApiPromise;
  /** Contract address */
  contractAddress: string;
  /** Contract ABI metadata */
  abi: any;
}

/**
 * Options for creating an escrow
 */
export interface CreateEscrowOptions {
  freelancer: string;
  milestones: Array<{
    id: number;
    amount: string;
    description: string;
  }>;
  arbiter?: string;
}

/**
 * Options for funding an escrow
 */
export interface FundEscrowOptions {
  escrowId: number;
  amount: string; // Amount to transfer (should match total_amount)
}

/**
 * Options for releasing a milestone
 */
export interface ReleaseMilestoneOptions {
  escrowId: number;
  milestoneId: number;
}

/**
 * Options for resolving a dispute
 */
export interface ResolveDisputeOptions {
  escrowId: number;
  freelancerShare: string;
  clientRefund: string;
}

// ========================================
// KILT IDENTITY TYPES
// ========================================

/**
 * KILT Identity configuration
 */
export interface KiltConfig {
  /** KILT network endpoint (e.g., "wss://peregrine.kilt.io") */
  network: string;
}

/**
 * KILT Identity data structure
 */
export interface KiltIdentity {
  /** DID URI (e.g., "did:kilt:light:...") */
  did: string;
  /** Whether this is a Light DID */
  lightDid?: boolean;
  /** Optional web3name */
  web3name?: string;
}

/**
 * KILT Credential data structure
 */
export interface KiltCredential {
  /** CTYPE hash */
  ctypeHash: string;
  /** Claim data */
  claim: Record<string, any>;
  /** Attester address */
  attester: string;
  /** Whether credential is revoked */
  revoked: boolean;
}

/**
 * Options for creating a Light DID
 */
export interface CreateLightDidOptions {
  /** Authentication keypair (can be generated) */
  authentication?: {
    publicKey: string;
    type: string;
  };
  /** Encryption keypair (optional) */
  keyAgreement?: {
    publicKey: string;
    type: string;
  };
  /** Service endpoints (optional) */
  service?: Array<{
    id: string;
    type: string[];
    serviceEndpoint: string[];
  }>;
}

