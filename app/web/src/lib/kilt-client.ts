/**
 * KILT Identity Client - Frontend implementation
 * Uses @kiltprotocol/sdk-js directly to avoid SDK build dependency
 */

import * as Kilt from '@kiltprotocol/sdk-js';
import type { KiltIdentity, CreateDidOptions, SkillChainClient } from '@/types/kilt-types';

export interface KiltClientConfig {
  network: string;
}

/**
 * Client for interacting with KILT Protocol
 */
export class KiltClient {
  private config: KiltClientConfig;
  private connected: boolean = false;

  constructor(config: KiltClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
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

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await Kilt.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      } finally {
        this.connected = false;
      }
    }
  }

  async createLightDid(options?: CreateDidOptions): Promise<KiltIdentity> {
    await this.ensureConnected();

    try {
      let authentication: Kilt.NewLightDidVerificationKey;
      
      if (options?.authentication) {
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
        const keyring = new Kilt.Utils.Keyring({
          type: 'sr25519',
          ss58Format: 38,
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

      let service: Kilt.DidServiceEndpoint[] | undefined;
      if (options?.service) {
        service = options.service.map(s => ({
          id: s.id.startsWith('#') ? s.id as `#${string}` : `#${s.id}` as `#${string}`,
          type: s.type,
          serviceEndpoint: s.serviceEndpoint,
        }));
      }

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

  async linkDidToProfile(
    did: string,
    skillchainClient: SkillChainClient,
    signerAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!did.startsWith('did:kilt:')) {
        return {
          success: false,
          error: 'Invalid DID format. Must start with "did:kilt:"',
        };
      }

      const result = await skillchainClient.linkDid(did, signerAddress);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  async verifyCredential(credential: unknown): Promise<{
    valid: boolean;
    revoked: boolean;
    attester?: string;
    error?: string;
  }> {
    await this.ensureConnected();

    try {
      const verificationResult = await Kilt.Credential.verifyCredential(credential as any);

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

  async resolveDid(did: string): Promise<any> {
    await this.ensureConnected();

    try {
      const resolutionResult = await Kilt.Did.resolve(did as Kilt.DidUri);
      if (resolutionResult && resolutionResult.document) {
        return resolutionResult;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getDidFromAccount(
    accountId: string,
    skillchainClient: SkillChainClient
  ): Promise<string | null> {
    try {
      const did = await skillchainClient.getDid(accountId);
      return did;
    } catch (error) {
      return null;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
}

