/**
 * Hook: use-kilt-profile
 * - Encapsulates KILT client lifecycle and simple DID actions for My Profile
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { KiltHookReturn, KiltProfileState, CreateDidOptions } from '@/types/kilt-types';

// Import built SDK wrapper from local dist to avoid TS build issues in Next.js
// NOTE: This relies on the repo layout; ensure the path is correct in monorepo
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { KiltClient } from '../../../../sdk/js/dist/kilt-client.js';

const DEFAULT_KILT_NETWORK = process.env.NEXT_PUBLIC_KILT_NETWORK || 'wss://peregrine.kilt.io';

export function useKiltProfile(): KiltHookReturn {
  const clientRef = useRef<any | null>(null);
  const [state, setState] = useState<KiltProfileState>({
    identity: { did: null, isLightDid: false },
    isConnecting: false,
    isConnected: false,
    isResolving: false,
    resolveError: null,
    lastResolvedUri: null,
    connectError: null,
    actionError: null,
  });

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new KiltClient({ network: DEFAULT_KILT_NETWORK });
    }
    return clientRef.current;
  }, []);

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, connectError: null }));
    try {
      await getClient().connect();
      setState(prev => ({ ...prev, isConnected: true }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        connectError: error?.message || 'Failed to connect to KILT',
        isConnected: false,
      }));
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [getClient]);

  const disconnect = useCallback(async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.disconnect();
      }
    } finally {
      setState(prev => ({
        ...prev,
        isConnected: false,
      }));
    }
  }, []);

  const createLightDid = useCallback(
    async (_options?: CreateDidOptions) => {
      setState(prev => ({ ...prev, actionError: null }));
      try {
        if (!state.isConnected) {
          await connect();
        }
        const identity = await getClient().createLightDid();
        setState(prev => ({
          ...prev,
          identity: { did: identity?.did ?? null, isLightDid: !!identity?.lightDid },
        }));
      } catch (error: any) {
        setState(prev => ({ ...prev, actionError: error?.message || 'Failed to create Light DID' }));
      }
    },
    [connect, getClient, state.isConnected]
  );

  const resolveCurrentDid = useCallback(async () => {
    if (!state.identity.did) return;
    setState(prev => ({ ...prev, isResolving: true, resolveError: null }));
    try {
      if (!state.isConnected) {
        await connect();
      }
      const doc = await getClient().resolveDid(state.identity.did);
      if (!doc) {
        // Fallback: Light DIDs can be used directly even if resolution object is null
        if (state.identity.did.startsWith('did:kilt:light:')) {
          setState(prev => ({
            ...prev,
            lastResolvedUri: state.identity.did,
            resolveError: null,
          }));
        } else {
          setState(prev => ({
            ...prev,
            resolveError: 'Unable to resolve DID document',
            lastResolvedUri: null,
          }));
        }
      }
      if (doc?.uri) {
        setState(prev => ({
          ...prev,
          lastResolvedUri: doc.uri,
          resolveError: null,
        }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        resolveError: error?.message || 'Failed to resolve DID',
        lastResolvedUri: null,
      }));
    } finally {
      setState(prev => ({ ...prev, isResolving: false }));
    }
  }, [connect, getClient, state.identity.did, state.isConnected]);

  const linkDidToProfile = useCallback(
    async (skillchainClient: { linkDid: (did: string, signerAddress?: string) => Promise<{ success: boolean; error?: string }> }, signerAddress?: string) => {
      try {
        setState(prev => ({ ...prev, actionError: null }));
        if (!state.identity.did) throw new Error('No DID to link');
        if (!state.isConnected) await connect();
        const res = await getClient().linkDidToProfile(state.identity.did, skillchainClient, signerAddress || '');
        if (!res?.success) {
          throw new Error(res?.error || 'Failed to link DID');
        }
      } catch (e: any) {
        setState(prev => ({ ...prev, actionError: e?.message || 'Failed to link DID' }));
      }
    },
    [connect, getClient, state.identity.did, state.isConnected]
  );

  const getDidFromAccount = useCallback(
    async (accountId: string, skillchainClient: { getDid: (accountId: string) => Promise<string | null> }): Promise<string | null> => {
      try {
        const did = await getClient().getDidFromAccount(accountId, skillchainClient);
        return did;
      } catch {
        return null;
      }
    },
    [getClient]
  );

  const verifyCredential = useCallback(
    async (credential: unknown) => {
      try {
        if (!state.isConnected) await connect();
        const result = await getClient().verifyCredential(credential);
        return result;
      } catch (e: any) {
        return { valid: false, revoked: false, error: e?.message || 'Verification failed' };
      }
    },
    [connect, getClient, state.isConnected]
  );

  return useMemo(
    () => ({
      state,
      connect,
      disconnect,
      createLightDid,
      resolveCurrentDid,
      linkDidToProfile,
      getDidFromAccount,
      verifyCredential,
    }),
    [connect, createLightDid, disconnect, resolveCurrentDid, linkDidToProfile, getDidFromAccount, verifyCredential, state]
  );
}


