/**
 * KILT Identity Client - Integration with KILT Protocol for decentralized identity
 */

import * as Kilt from '@kiltprotocol/sdk-js';
import type { KiltConfig, KiltIdentity, KiltCredential, CreateLightDidOptions } from './types';

/**
 * Client for interacting with KILT Protocol
 */
export class KiltClient {
  private config: KiltConfig;
  private connected: boolean = false;

  /**
   * Create a new KILT client instance
   * @param config - KILT configuration
   */
  constructor(config: KiltConfig) {
    this.config = config;
  }

  /**
   * Connect to KILT network
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Set a timeout for connection
      const connectPromise = Kilt.connect(this.config.network);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      this.connected = true;
    } catch (error: any) {
      this.connected = false;
      throw new Error(`Failed to connect to KILT network: ${error.message || error}`);
    }
  }

  /**
   * Disconnect from KILT network
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await Kilt.disconnect();
      } catch (error) {
        // Ignore disconnect errors - connection may already be closed
      } finally {
        this.connected = false;
      }
    }
  }

  /**
   * Create a Light DID
   * @param options - Options for creating the DID
   * @returns Light DID document
   */
  async createLightDid(options?: CreateLightDidOptions): Promise<KiltIdentity> {
    await this.ensureConnected();

    try {
      // Generate authentication key if not provided
      let authentication: Kilt.NewLightDidVerificationKey;
      
      if (options?.authentication) {
        // Convert string publicKey to Uint8Array if needed
        const publicKey = typeof options.authentication.publicKey === 'string'
          ? new Uint8Array(Buffer.from(options.authentication.publicKey, 'hex'))
          : options.authentication.publicKey as Uint8Array;
        
        authentication = {
          publicKey,
          type: (options.authentication.type === 'sr25519' || options.authentication.type === 'ed25519')
            ? options.authentication.type
            : 'sr25519',
        } as Kilt.NewLightDidVerificationKey;
      } else {
        // Generate new keypair using Keyring
        const keyring = new Kilt.Utils.Keyring({
          type: 'sr25519',
          ss58Format: 38, // KILT format
        });
        const mnemonic = Kilt.Utils.Crypto.mnemonicGenerate();
        const authenticationKeypair = keyring.addFromMnemonic(mnemonic, {
          name: 'authentication',
        });
        
        authentication = {
          publicKey: authenticationKeypair.publicKey,
          type: 'sr25519',
        };
      }

      // Handle keyAgreement if provided
      let keyAgreement: [Kilt.NewDidEncryptionKey] | undefined;
      if (options?.keyAgreement) {
        const publicKey = typeof options.keyAgreement.publicKey === 'string'
          ? new Uint8Array(Buffer.from(options.keyAgreement.publicKey, 'hex'))
          : options.keyAgreement.publicKey as Uint8Array;
        
        keyAgreement = [{
          publicKey,
          type: options.keyAgreement.type as Kilt.EncryptionKeyType,
        }];
      }

      // Handle service endpoints
      let service: Kilt.DidServiceEndpoint[] | undefined;
      if (options?.service) {
        service = options.service.map(s => ({
          id: s.id.startsWith('#') ? s.id as `#${string}` : `#${s.id}` as `#${string}`,
          type: s.type,
          serviceEndpoint: s.serviceEndpoint,
        }));
      }

      // Create Light DID document
      const lightDidDocument = Kilt.Did.createLightDidDocument({
        authentication: [authentication],
        keyAgreement,
        service,
      });

      return {
        did: lightDidDocument.uri,
        lightDid: true,
      };
    } catch (error: any) {
      throw new Error(`Failed to create Light DID: ${error.message}`);
    }
  }

  /**
   * Link a DID to a SkillChain profile
   * @param did - DID URI to link
   * @param skillchainClient - SkillChain client instance
   * @param signerAddress - Address of the signer
   * @returns Transaction result
   */
  async linkDidToProfile(
    did: string,
    skillchainClient: any, // SkillChainClient type
    signerAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate DID format
      if (!did.startsWith('did:kilt:')) {
        return {
          success: false,
          error: 'Invalid DID format. Must start with "did:kilt:"',
        };
      }

      // Call linkDid on SkillChain contract
      const result = await skillchainClient.linkDid(did, signerAddress);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Verify a KILT credential
   * @param credential - Credential to verify
   * @returns Verification result
   */
  async verifyCredential(credential: any): Promise<{
    valid: boolean;
    revoked: boolean;
    attester?: string;
    error?: string;
  }> {
    await this.ensureConnected();

    try {
      // Verify credential using KILT SDK
      const verificationResult = await Kilt.Credential.verifyCredential(credential);

      return {
        valid: !verificationResult.revoked,
        revoked: verificationResult.revoked,
        attester: verificationResult.attester,
      };
    } catch (error: any) {
      return {
        valid: false,
        revoked: false,
        error: error.message || 'Verification failed',
      };
    }
  }

  /**
   * Resolve a DID and get its document
   * @param did - DID URI to resolve
   * @returns DID document or null
   */
  async resolveDid(did: string): Promise<Kilt.DidDocument | null> {
    await this.ensureConnected();

    try {
      const resolutionResult = await Kilt.Did.resolve(did as Kilt.DidUri);
      if (resolutionResult && resolutionResult.document) {
        return resolutionResult.document;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get DID from a SkillChain account
   * @param accountId - Account ID to query
   * @param skillchainClient - SkillChain client instance
   * @returns DID URI or null
   */
  async getDidFromAccount(
    accountId: string,
    skillchainClient: any // SkillChainClient type
  ): Promise<string | null> {
    try {
      const did = await skillchainClient.getDid(accountId);
      return did;
    } catch (error) {
      return null;
    }
  }

  /**
   * Ensure client is connected to KILT network
   * @private
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
}

