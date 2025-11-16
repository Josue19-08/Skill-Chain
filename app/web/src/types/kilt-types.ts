/**
 * Local type definitions for KILT integration
 * These types match the SDK types but are defined locally to avoid build issues
 */

export interface KiltIdentity {
  /** DID URI (e.g., "did:kilt:light:...") */
  did: string;
  /** Whether this is a Light DID */
  lightDid?: boolean;
  /** Optional web3name */
  web3name?: string;
}

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

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Minimal KiltClient interface for component props
 */
export interface KiltClient {
  createLightDid(options?: any): Promise<KiltIdentity>;
  verifyCredential(credential: any): Promise<{
    valid: boolean;
    revoked: boolean;
    attester?: string;
    error?: string;
  }>;
  linkDidToProfile(did: string, skillchainClient: any, signerAddress: string): Promise<{ success: boolean; error?: string }>;
  getDidFromAccount(accountId: string, skillchainClient: any): Promise<string | null>;
  resolveDid(did: string): Promise<any>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * Minimal SkillChainClient interface for component props
 */
export interface SkillChainClient {
  linkDid(did: string, signerAddress: string): Promise<TransactionResult>;
  getDid(accountId: string): Promise<string | null>;
}

/**
 * Options for creating a DID
 */
export interface CreateDidOptions {
  authentication?: {
    publicKey: string;
    type: string;
  };
  keyAgreement?: {
    publicKey: string;
    type: string;
  };
  service?: Array<{
    id: string;
    type: string[];
    serviceEndpoint: string[];
  }>;
}

/**
 * State for KILT profile hook
 */
export interface KiltProfileState {
  identity: {
    did: string | null;
    isLightDid: boolean;
  };
  isConnecting: boolean;
  isConnected: boolean;
  isResolving: boolean;
  resolveError: string | null;
  lastResolvedUri: string | null;
  connectError: string | null;
  actionError: string | null;
}

/**
 * Return type for useKiltProfile hook
 */
export interface KiltHookReturn {
  state: KiltProfileState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  createLightDid: (options?: CreateDidOptions) => Promise<void>;
  resolveCurrentDid: () => Promise<void>;
  linkDidToProfile: (
    skillchainClient: SkillChainClient,
    signerAddress?: string
  ) => Promise<void>;
  getDidFromAccount: (
    accountId: string,
    skillchainClient: SkillChainClient
  ) => Promise<string | null>;
  verifyCredential: (credential: unknown) => Promise<{
    valid: boolean;
    revoked: boolean;
    attester?: string;
    error?: string;
  }>;
}
