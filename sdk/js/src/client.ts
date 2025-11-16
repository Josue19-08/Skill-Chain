/**
 * SkillChain Client - Main interface for interacting with SkillChain protocol
 */

import { ApiPromise } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import type {
  SkillChainConfig,
  CreateProfileOptions,
  AddClaimOptions,
  ApproveClaimOptions,
  Profile,
  Claim,
  TransactionResult,
  EscrowConfig,
  CreateEscrowOptions,
  FundEscrowOptions,
  ReleaseMilestoneOptions,
  ResolveDisputeOptions,
  Escrow,
  Milestone,
  EscrowStatusType,
} from './types';
import { EscrowStatus } from './types';

/**
 * SkillChain client for interacting with the protocol smart contract
 */
export class SkillChainClient {
  private api: ApiPromise;
  private contract: ContractPromise;

  /**
   * Create a new SkillChain client instance
   * @param config - Configuration options
   */
  constructor(config: SkillChainConfig) {
    this.api = config.api;
    this.contract = new ContractPromise(
      this.api,
      config.abi,
      config.contractAddress
    );
  }

  /**
   * Create a new profile on-chain
   * @param options - Profile creation options
   * @param signerAddress - Address of the signer
   * @returns Transaction result
   */
  async createProfile(
    options: CreateProfileOptions,
    signerAddress: string
  ): Promise<TransactionResult> {
    // TODO: Implement profile creation logic
    // - Call contract.tx.registerProfile()
    // - Sign and submit transaction
    // - Return transaction result
    throw new Error('Not implemented');
  }

  /**
   * Add a new claim
   * @param options - Claim options
   * @param signerAddress - Address of the signer
   * @returns Transaction result
   */
  async addClaim(
    options: AddClaimOptions,
    signerAddress: string
  ): Promise<TransactionResult> {
    // TODO: Implement claim addition logic
    // - Call contract.tx.addClaim()
    // - Sign and submit transaction
    // - Return transaction result
    throw new Error('Not implemented');
  }

  /**
   * Approve a claim
   * @param options - Approval options
   * @param signerAddress - Address of the signer
   * @returns Transaction result
   */
  async approveClaim(
    options: ApproveClaimOptions,
    signerAddress: string
  ): Promise<TransactionResult> {
    // TODO: Implement claim approval logic
    // - Call contract.tx.approveClaim()
    // - Sign and submit transaction
    // - Return transaction result
    throw new Error('Not implemented');
  }

  /**
   * Get all claims for a specific address
   * @param address - Address to query
   * @returns Array of claims
   */
  async getClaimsByAddress(address: string): Promise<Claim[]> {
    // TODO: Implement claim retrieval logic
    // - Call contract.query.getClaims()
    // - Parse and return results
    return [];
  }

  /**
   * Get profile for a specific address
   * @param address - Address to query
   * @returns Profile data or null if not found
   */
  async getProfile(address: string): Promise<Profile | null> {
    // TODO: Implement profile retrieval logic
    // - Call contract.query.getProfile()
    // - Parse and return results
    return null;
  }

  /**
   * Get total number of claims in the system
   * @returns Total claim count
   */
  async getTotalClaims(): Promise<number> {
    // TODO: Implement total claims query
    // - Call contract.query.getTotalClaims()
    // - Parse and return result
    return 0;
  }

  /**
   * Link a KILT DID to the caller's profile
   * @param did - DID URI to link
   * @param signerAddress - Address of the signer
   * @returns Transaction result
   */
  async linkDid(did: string, signerAddress: string): Promise<TransactionResult> {
    try {
      // Estimate gas first
      const { gasRequired } = await this.contract.query.linkDid(
        signerAddress,
        { value: 0, gasLimit: -1 },
        did
      );

      // Execute transaction
      const result = await this.contract.tx
        .linkDid(
          {
            value: 0,
            gasLimit: gasRequired,
          },
          did
        )
        .signAndSend(signerAddress);

      return {
        success: true,
        txHash: result.toString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get the DID linked to a profile
   * @param accountId - Account ID to query
   * @returns DID URI or null
   */
  async getDid(accountId: string): Promise<string | null> {
    try {
      const { output } = await this.contract.query.getDid(
        this.contract.address,
        { value: 0, gasLimit: -1 },
        accountId
      );

      if (output) {
        const data = output.toHuman() as any;
        if (data && typeof data === 'object') {
          if (data.Some) {
            return data.Some;
          } else if (!data.None) {
            return data;
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Disconnect and cleanup resources
   */
  async disconnect(): Promise<void> {
    // Cleanup if needed
  }
}

// ========================================
// ESCROW CLIENT
// ========================================

/**
 * Escrow client for interacting with the Escrow Multi-Release smart contract
 */
export class EscrowClient {
  private api: ApiPromise;
  private contract: ContractPromise;

  /**
   * Create a new Escrow client instance
   * @param config - Configuration options
   */
  constructor(config: EscrowConfig) {
    this.api = config.api;
    this.contract = new ContractPromise(
      this.api,
      config.abi,
      config.contractAddress
    );
  }

  /**
   * Create a new escrow with milestones
   * @param options - Escrow creation options
   * @param signerAddress - Address of the signer (client)
   * @returns Transaction result with escrow ID
   */
  async createEscrow(
    options: CreateEscrowOptions,
    signerAddress: string
  ): Promise<TransactionResult & { escrowId?: number }> {
    try {
      const milestones = options.milestones.map((m) => ({
        id: m.id,
        amount: m.amount,
        released: false,
        description: m.description,
      }));

      // Estimate gas first
      const { gasRequired } = await this.contract.query.createEscrow(
        signerAddress,
        { value: 0, gasLimit: -1 },
        options.freelancer,
        milestones,
        options.arbiter || null
      );

      // Execute transaction
      const result = await this.contract.tx
        .createEscrow(
          {
            value: 0,
            gasLimit: gasRequired,
          },
          options.freelancer,
          milestones,
          options.arbiter || null
        )
        .signAndSend(signerAddress);

      return {
        success: true,
        txHash: result.toString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Fund an escrow with the required amount
   * @param options - Funding options
   * @param signerAddress - Address of the signer (client)
   * @returns Transaction result
   */
  async fundEscrow(
    options: FundEscrowOptions,
    signerAddress: string
  ): Promise<TransactionResult> {
    try {
      // Estimate gas first
      const { gasRequired } = await this.contract.query.fundEscrow(
        signerAddress,
        { value: options.amount, gasLimit: -1 },
        options.escrowId
      );

      // Execute transaction
      const result = await this.contract.tx
        .fundEscrow(
          {
            value: options.amount,
            gasLimit: gasRequired,
          },
          options.escrowId
        )
        .signAndSend(signerAddress);

      return {
        success: true,
        txHash: result.toString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Release payment for a specific milestone
   * @param options - Release options
   * @param signerAddress - Address of the signer (client)
   * @returns Transaction result
   */
  async releaseMilestone(
    options: ReleaseMilestoneOptions,
    signerAddress: string
  ): Promise<TransactionResult> {
    try {
      // Estimate gas first
      const { gasRequired } = await this.contract.query.releaseMilestone(
        signerAddress,
        { value: 0, gasLimit: -1 },
        options.escrowId,
        options.milestoneId
      );

      // Execute transaction
      const result = await this.contract.tx
        .releaseMilestone(
          {
            value: 0,
            gasLimit: gasRequired,
          },
          options.escrowId,
          options.milestoneId
        )
        .signAndSend(signerAddress);

      return {
        success: true,
        txHash: result.toString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Request cancellation of an escrow
   * @param escrowId - ID of the escrow to cancel
   * @param signerAddress - Address of the signer (client or freelancer)
   * @returns Transaction result
   */
  async requestCancel(
    escrowId: number,
    signerAddress: string
  ): Promise<TransactionResult> {
    try {
      // Estimate gas first
      const { gasRequired } = await this.contract.query.requestCancel(
        signerAddress,
        { value: 0, gasLimit: -1 },
        escrowId
      );

      // Execute transaction
      const result = await this.contract.tx
        .requestCancel(
          {
            value: 0,
            gasLimit: gasRequired,
          },
          escrowId
        )
        .signAndSend(signerAddress);

      return {
        success: true,
        txHash: result.toString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Approve cancellation (mutual agreement)
   * @param escrowId - ID of the escrow
   * @param signerAddress - Address of the signer (other party)
   * @returns Transaction result
   */
  async approveCancel(
    escrowId: number,
    signerAddress: string
  ): Promise<TransactionResult> {
    try {
      // Estimate gas first
      const { gasRequired } = await this.contract.query.approveCancel(
        signerAddress,
        { value: 0, gasLimit: -1 },
        escrowId
      );

      // Execute transaction
      const result = await this.contract.tx
        .approveCancel(
          {
            value: 0,
            gasLimit: gasRequired,
          },
          escrowId
        )
        .signAndSend(signerAddress);

      return {
        success: true,
        txHash: result.toString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Resolve a dispute by the designated arbiter
   * @param options - Dispute resolution options
   * @param signerAddress - Address of the signer (arbiter)
   * @returns Transaction result
   */
  async resolveDisputeByArbiter(
    options: ResolveDisputeOptions,
    signerAddress: string
  ): Promise<TransactionResult> {
    try {
      // Estimate gas first
      const { gasRequired } = await this.contract.query.resolveDisputeByArbiter(
        signerAddress,
        { value: 0, gasLimit: -1 },
        options.escrowId,
        options.freelancerShare,
        options.clientRefund
      );

      // Execute transaction
      const result = await this.contract.tx
        .resolveDisputeByArbiter(
          {
            value: 0,
            gasLimit: gasRequired,
          },
          options.escrowId,
          options.freelancerShare,
          options.clientRefund
        )
        .signAndSend(signerAddress);

      return {
        success: true,
        txHash: result.toString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get escrow details by ID
   * @param escrowId - ID of the escrow
   * @returns Escrow data or null if not found
   */
  async getEscrow(escrowId: number): Promise<Escrow | null> {
    try {
      const { output } = await this.contract.query.getEscrow(
        this.contract.address,
        { value: 0, gasLimit: -1 },
        escrowId
      );

      if (output) {
        const data = output.toHuman() as any;
        if (data && typeof data === 'object') {
          // Handle Option<Escrow> - could be None or Some(Escrow)
          if (data.Some) {
            return this.parseEscrow(data.Some);
          } else if (data.Ok) {
            return this.parseEscrow(data.Ok);
          } else if (!data.None) {
            // Direct Escrow object
            return this.parseEscrow(data);
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all escrow IDs for a client
   * @param client - Address of the client
   * @returns Array of escrow IDs
   */
  async getEscrowsByClient(client: string): Promise<number[]> {
    try {
      const { output } = await this.contract.query.getEscrowsByClient(
        this.contract.address,
        { value: 0, gasLimit: -1 },
        client
      );

      if (output) {
        const data = output.toHuman() as any;
        if (data && Array.isArray(data)) {
          return data.map((id: any) => {
            if (typeof id === 'string') {
              return Number(id.replace(/,/g, ''));
            }
            return Number(id);
          });
        }
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all escrow IDs for a freelancer
   * @param freelancer - Address of the freelancer
   * @returns Array of escrow IDs
   */
  async getEscrowsByFreelancer(freelancer: string): Promise<number[]> {
    try {
      const { output } = await this.contract.query.getEscrowsByFreelancer(
        this.contract.address,
        { value: 0, gasLimit: -1 },
        freelancer
      );

      if (output) {
        const data = output.toHuman() as any;
        if (data && Array.isArray(data)) {
          return data.map((id: any) => {
            if (typeof id === 'string') {
              return Number(id.replace(/,/g, ''));
            }
            return Number(id);
          });
        }
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all milestones for an escrow
   * @param escrowId - ID of the escrow
   * @returns Array of milestones
   */
  async getMilestones(escrowId: number): Promise<Milestone[]> {
    try {
      const { output } = await this.contract.query.getMilestones(
        this.contract.address,
        { value: 0, gasLimit: -1 },
        escrowId
      );

      if (output) {
        const data = output.toHuman() as any;
        if (data && Array.isArray(data)) {
          return data.map((m: any) => ({
            id: typeof m.id === 'string' ? Number(m.id.replace(/,/g, '')) : Number(m.id),
            amount: typeof m.amount === 'string' ? m.amount.replace(/,/g, '') : (m.amount?.toString() || '0'),
            released: m.released === true || m.released === 'true' || m.released === 'True',
            description: m.description || '',
          }));
        }
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse escrow data from contract output
   * @private
   */
  private parseEscrow(data: any): Escrow {
    return {
      id: Number(data.id),
      client: data.client || '',
      freelancer: data.freelancer || '',
      arbiter: data.arbiter || null,
      totalAmount: data.totalAmount?.toString() || '0',
      deposited: data.deposited?.toString() || '0',
      milestones: Array.isArray(data.milestones)
        ? data.milestones.map((m: any) => ({
            id: Number(m.id),
            amount: m.amount?.toString() || '0',
            released: m.released === true || m.released === 'true',
            description: m.description || '',
          }))
        : [],
      status: this.parseEscrowStatus(data.status),
      cancelRequestedBy: data.cancelRequestedBy || null,
      createdAt: Number(data.createdAt || 0),
    };
  }

  /**
   * Parse escrow status from contract output
   * @private
   */
  private parseEscrowStatus(status: any): EscrowStatus {
    if (typeof status === 'string') {
      return status as EscrowStatus;
    }
    if (status && typeof status === 'object') {
      const key = Object.keys(status)[0];
      return key as EscrowStatus;
    }
    return EscrowStatus.Created;
  }

  /**
   * Disconnect and cleanup resources
   */
  async disconnect(): Promise<void> {
    // Cleanup if needed
  }
}

