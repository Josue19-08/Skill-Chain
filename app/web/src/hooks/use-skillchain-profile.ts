/**
 * Hook: use-skillchain-profile
 * - Adapter minimal para invocar el contrato SkillChain desde el UI
 * - Expone métodos esperados por el SDK KILT (linkDid, getDid)
 */

import { useCallback, useMemo } from 'react';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/usePolkadot';

interface LinkResult {
  success: boolean;
  error?: string;
}

export function useSkillchainProfile() {
  const { contract, isReady, error: contractError } = useContract();
  const { api, selectedAccount, getSigner } = useWallet();

  const linkDid = useCallback(
    async (did: string, signerAddress?: string): Promise<LinkResult> => {
      try {
        if (!contract || !api) {
          return { success: false, error: 'Contract/API not ready' };
        }
        const address = signerAddress || selectedAccount?.address;
        if (!address) {
          return { success: false, error: 'No signer address' };
        }
        const signer = await getSigner();
        // Ejecutar y esperar inclusión en bloque o finalización
        const tx = contract.tx.linkDid({ value: 0, gasLimit: -1 }, did);
        await new Promise<void>(async (resolve, reject) => {
          const unsub = await tx.signAndSend(
            address,
            { signer },
            (result: any) => {
              if (result.dispatchError) {
                // Decode module error if possible
                let errMsg = result.dispatchError.toString();
                try {
                  // @ts-ignore - Polkadot API types
                  if ((result.dispatchError as any).isModule) {
                    // @ts-ignore - Polkadot API types
                    const metaError = (api as any).registry.findMetaError((result.dispatchError as any).asModule);
                    errMsg = `${metaError.section}.${metaError.name}: ${metaError.docs?.join(' ') || ''}`;
                  }
                } catch {
                  // ignore decode failure
                }
                unsub();
                reject(new Error(errMsg));
                return;
              }
              if (result.status?.isInBlock || result.status?.isFinalized) {
                unsub();
                resolve();
              }
            }
          );
        });
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || 'linkDid tx failed' };
      }
    },
    [contract, api, getSigner, selectedAccount?.address]
  );

  const getDid = useCallback(
    async (accountId: string): Promise<string | null> => {
      try {
        if (!contract) return null;
        // El primer argumento de query.* es el caller (origin). Usamos la cuenta seleccionada si existe.
        const caller = selectedAccount?.address || accountId;
        const { result, output } = await contract.query.getDid(
          caller,
          { value: 0, gasLimit: -1 },
          accountId
        );
        if (result.isOk && output) {
          // Dependiendo del metadata, output puede ser string o Option<string>
          const value = (output as any).toString?.() ?? String(output);
          return value || null;
        }
        return null;
      } catch {
        return null;
      }
    },
    [contract, selectedAccount?.address]
  );

  return useMemo(
    () => ({
      isReady,
      contractError,
      linkDid,
      getDid,
    }),
    [contractError, getDid, isReady, linkDid]
  );
}


