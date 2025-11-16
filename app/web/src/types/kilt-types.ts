/**
 * Types for KILT integration in the web app
 */

export interface KiltUiIdentity {
  did: string | null;
  isLightDid: boolean;
}

export interface KiltProfileState {
  identity: KiltUiIdentity;
  isConnecting: boolean;
  isConnected: boolean;
  isResolving: boolean;
  resolveError: string | null;
  lastResolvedUri?: string | null;
  connectError: string | null;
  actionError: string | null;
}

export interface CreateDidOptions {
  // Placeholder to extend later to match SDK options
}

export interface KiltHookReturn {
  state: KiltProfileState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  createLightDid: (options?: CreateDidOptions) => Promise<void>;
  resolveCurrentDid: () => Promise<void>;
}


